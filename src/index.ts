import { DurableObject } from "cloudflare:workers";
import {
  ROOM_LIMIT,
  VOTE_OPTIONS,
  renderCreatePanel,
  renderJoinPage,
  renderJoinPanel,
  renderLanding,
  renderMessagePage,
  renderRoom,
  renderRoomPage,
  type Participant,
  type RoomState,
} from "./html";

interface Env {
  ROOMS: DurableObjectNamespace;
}

interface RoomRow {
  code: string;
  name: string;
  round: number;
  revealed: number;
}

interface ParticipantRow {
  id: string;
  name: string;
  vote: string | null;
  connected: number;
  joined_at: number;
}

interface Subscriber {
  participantId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

const SESSION_COOKIE = "pp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const INACTIVE_TTL_MS = 2 * 60 * 1000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const encoder = new TextEncoder();

function securityHeaders(contentType: string): Headers {
  return new Headers({
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: securityHeaders("text/html; charset=utf-8") });
}

function scriptResponse(script: string, status = 200): Response {
  return new Response(script, { status, headers: securityHeaders("text/javascript; charset=utf-8") });
}

function emptyResponse(status = 204): Response {
  return new Response(null, { status, headers: securityHeaders("text/plain; charset=utf-8") });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

async function readFields(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const value: unknown = await request.json();
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    }
    const result: Record<string, string> = {};
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      (await request.formData()).forEach((value, key) => {
        if (typeof value === "string") result[key] = value;
      });
      return result;
    }
    new URLSearchParams(await request.text()).forEach((value, key) => {
      result[key] = value;
    });
    return result;
  } catch {
    return {};
  }
}

function isDatastarRequest(request: Request): boolean {
  return request.headers.get("datastar-request") === "true";
}

function randomToken(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

function randomRoomCode(): string {
  const random = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(random);
  return Array.from(random, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join("");
}

function normalizeRoomCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

function readSession(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    const value = rest.join("=");
    if (name === SESSION_COOKIE && /^[a-f0-9]{32}$/.test(value)) return value;
  }
  return null;
}

function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

function withCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function navigateResponse(request: Request, path: string): Response {
  if (!isDatastarRequest(request)) {
    return new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
  }
  return scriptResponse(`location.assign(${JSON.stringify(path)})`);
}

function roomStub(env: Env, code: string): DurableObjectStub {
  return env.ROOMS.get(env.ROOMS.idFromName(code));
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const fields = await readFields(request);
  const creatorName = cleanText(fields.name, 40);
  const requestedName = cleanText(fields.roomName, 60);

  if (!creatorName) {
    return isDatastarRequest(request)
      ? htmlResponse(renderCreatePanel("Enter your name to create a room."))
      : htmlResponse(renderLanding("Enter your name to create a room."), 400);
  }

  const token = readSession(request) ?? randomToken();
  const roomName = requestedName || `${creatorName}’s planning room`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomRoomCode();
    const response = await roomStub(env, code).fetch(new Request("https://room.internal/internal/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Room-Code": code,
        "X-Session-Id": token,
      },
      body: JSON.stringify({ creatorName, roomName }),
    }));

    if (response.status === 201) {
      return withCookie(navigateResponse(request, `/r/${code}`), sessionCookie(token, request));
    }
    if (response.status !== 409) break;
  }

  return htmlResponse(renderMessagePage("Couldn’t create the room", "Please try again in a moment."), 503);
}

async function forwardRoomRequest(request: Request, env: Env, code: string): Promise<Response> {
  let token = readSession(request);
  let shouldSetCookie = false;
  if (!token) {
    token = randomToken();
    shouldSetCookie = true;
  }

  const headers = new Headers(request.headers);
  headers.set("X-Room-Code", code);
  headers.set("X-Session-Id", token);
  const response = await roomStub(env, code).fetch(new Request(request, { headers }));
  return shouldSetCookie ? withCookie(response, sessionCookie(token, request)) : response;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") return htmlResponse(renderLanding());

    if (request.method === "GET" && url.pathname === "/join") {
      const code = normalizeRoomCode(url.searchParams.get("code") ?? "");
      return code
        ? Response.redirect(`${url.origin}/r/${code}`, 302)
        : htmlResponse(renderLanding("Enter a valid six-character room code."), 400);
    }

    if (request.method === "POST" && url.pathname === "/rooms") return createRoom(request, env);

    const roomMatch = url.pathname.match(/^\/r\/([A-Za-z0-9]{6})(?:\/|$)/);
    if (roomMatch?.[1]) {
      const code = normalizeRoomCode(roomMatch[1]);
      if (code) return forwardRoomRequest(request, env, code);
    }

    return htmlResponse(renderMessagePage("Page not found", "That page or planning room doesn’t exist.", "ERROR / 404"), 404);
  },
} satisfies ExportedHandler<Env>;

export class PlanningRoom extends DurableObject<Env> {
  private readonly sql: SqlStorage;
  private readonly subscribers = new Map<number, Subscriber>();
  private nextSubscriberId = 0;
  private heartbeatId: number | undefined;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS room (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        round INTEGER NOT NULL DEFAULT 1,
        revealed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vote TEXT,
        connected INTEGER NOT NULL DEFAULT 0,
        joined_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      );
    `);
    this.sql.exec("UPDATE participants SET connected = 0");
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = request.headers.get("x-room-code") ?? "";
    const participantId = request.headers.get("x-session-id") ?? "";

    if (url.pathname === "/internal/create" && request.method === "POST") return this.create(request);

    if (!this.isInitialized()) {
      return htmlResponse(renderMessagePage("Room not found", "Check the room code or ask for a fresh invite link.", "ROOM / MISSING"), 404);
    }

    if (!/^[A-Z0-9]{6}$/.test(code) || !/^[a-f0-9]{32}$/.test(participantId)) return emptyResponse(400);

    if (url.pathname === `/r/${code}` && request.method === "GET") {
      this.pruneInactive();
      const state = this.getState(code);
      const participant = state.participants.find((person) => person.id === participantId);
      if (!participant) return htmlResponse(renderJoinPage(state));
      this.touch(participantId);
      return htmlResponse(renderRoomPage(state, participantId));
    }

    if (url.pathname === `/r/${code}/join` && request.method === "POST") {
      return this.join(request, code, participantId);
    }

    if (url.pathname === `/r/${code}/events` && request.method === "GET") {
      return this.subscribe(request, code, participantId);
    }

    if (!this.hasParticipant(participantId)) return emptyResponse(401);

    if (url.pathname === `/r/${code}/vote` && request.method === "POST") {
      const fields = await readFields(request);
      const vote = cleanText(fields.vote, 4);
      if (!VOTE_OPTIONS.includes(vote as (typeof VOTE_OPTIONS)[number])) return emptyResponse(400);
      const room = this.roomRow();
      if (!room || Boolean(room.revealed)) return emptyResponse(409);
      this.sql.exec("UPDATE participants SET vote = ?, last_seen = ? WHERE id = ?", vote, Date.now(), participantId);
      this.broadcast();
      return emptyResponse();
    }

    if (url.pathname === `/r/${code}/reveal` && request.method === "POST") {
      const result = this.sql.exec("SELECT COUNT(*) AS count FROM participants WHERE vote IS NOT NULL").toArray()[0] as { count: number } | undefined;
      if ((result?.count ?? 0) === 0) return emptyResponse(409);
      this.sql.exec("UPDATE room SET revealed = 1 WHERE id = 1");
      this.touch(participantId);
      this.broadcast();
      return emptyResponse();
    }

    if (url.pathname === `/r/${code}/new-round` && request.method === "POST") {
      this.ctx.storage.transactionSync(() => {
        this.sql.exec("UPDATE room SET round = round + 1, revealed = 0 WHERE id = 1");
        this.sql.exec("UPDATE participants SET vote = NULL");
      });
      this.touch(participantId);
      this.broadcast();
      return emptyResponse();
    }

    if (url.pathname === `/r/${code}/leave` && request.method === "POST") {
      this.sql.exec("DELETE FROM participants WHERE id = ?", participantId);
      this.broadcast(participantId);
      return navigateResponse(request, "/");
    }

    return emptyResponse(404);
  }

  private async create(request: Request): Promise<Response> {
    if (this.isInitialized()) return emptyResponse(409);

    const fields = await readFields(request);
    const creatorName = cleanText(fields.creatorName, 40);
    const roomName = cleanText(fields.roomName, 60);
    const participantId = request.headers.get("x-session-id") ?? "";
    const code = request.headers.get("x-room-code") ?? "";
    if (!creatorName || !roomName || !/^[A-Z0-9]{6}$/.test(code) || !/^[a-f0-9]{32}$/.test(participantId)) return emptyResponse(400);

    const now = Date.now();
    this.ctx.storage.transactionSync(() => {
      this.sql.exec("INSERT INTO room (id, code, name, round, revealed, created_at) VALUES (1, ?, ?, 1, 0, ?)", code, roomName, now);
      this.sql.exec(
        "INSERT INTO participants (id, name, vote, connected, joined_at, last_seen) VALUES (?, ?, NULL, 0, ?, ?)",
        participantId,
        creatorName,
        now,
        now,
      );
    });
    return emptyResponse(201);
  }

  private async join(request: Request, code: string, participantId: string): Promise<Response> {
    const fields = await readFields(request);
    const name = cleanText(fields.name, 40);
    this.pruneInactive();

    if (!name) {
      const state = this.getState(code);
      return isDatastarRequest(request)
        ? htmlResponse(renderJoinPanel(state, "Enter a display name to join."))
        : htmlResponse(renderJoinPage(state, "Enter a display name to join."), 400);
    }

    const existing = this.hasParticipant(participantId);
    if (!existing && this.participantCount() >= ROOM_LIMIT) {
      const state = this.getState(code);
      return isDatastarRequest(request)
        ? htmlResponse(renderJoinPanel(state, "This room is currently full."))
        : htmlResponse(renderJoinPage(state, "This room is currently full."), 409);
    }

    const now = Date.now();
    if (existing) {
      this.sql.exec("UPDATE participants SET name = ?, last_seen = ? WHERE id = ?", name, now, participantId);
    } else {
      this.sql.exec(
        "INSERT INTO participants (id, name, vote, connected, joined_at, last_seen) VALUES (?, ?, NULL, 0, ?, ?)",
        participantId,
        name,
        now,
        now,
      );
    }
    this.broadcast();
    return navigateResponse(request, `/r/${code}`);
  }

  private subscribe(request: Request, code: string, participantId: string): Response {
    if (!this.hasParticipant(participantId)) return emptyResponse(401);

    this.sql.exec("UPDATE participants SET connected = 1, last_seen = ? WHERE id = ?", Date.now(), participantId);
    const initialState = this.getState(code);
    const subscriberId = ++this.nextSubscriberId;
    let cleanedUp = false;

    const cleanup = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      this.removeSubscriber(subscriberId, participantId, true);
    };

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.subscribers.set(subscriberId, { participantId, controller });
        controller.enqueue(encoder.encode(`retry: 1000\n${ssePatch(renderRoom(initialState, participantId))}`));
        request.signal.addEventListener("abort", cleanup, { once: true });
        this.startHeartbeat();
      },
      cancel: cleanup,
    });

    this.broadcast(participantId);
    return new Response(stream, {
      headers: securityHeaders("text/event-stream; charset=utf-8"),
    });
  }

  private isInitialized(): boolean {
    return this.sql.exec("SELECT id FROM room WHERE id = 1").toArray().length === 1;
  }

  private roomRow(): RoomRow | null {
    return (this.sql.exec("SELECT code, name, round, revealed FROM room WHERE id = 1").toArray()[0] as RoomRow | undefined) ?? null;
  }

  private hasParticipant(participantId: string): boolean {
    return this.sql.exec("SELECT id FROM participants WHERE id = ?", participantId).toArray().length === 1;
  }

  private participantCount(): number {
    const row = this.sql.exec("SELECT COUNT(*) AS count FROM participants").toArray()[0] as { count: number } | undefined;
    return row?.count ?? 0;
  }

  private touch(participantId: string): void {
    this.sql.exec("UPDATE participants SET last_seen = ? WHERE id = ?", Date.now(), participantId);
  }

  private pruneInactive(): void {
    this.sql.exec(
      "DELETE FROM participants WHERE connected = 0 AND last_seen < ?",
      Date.now() - INACTIVE_TTL_MS,
    );
  }

  private getState(code: string): RoomState {
    const room = this.roomRow();
    if (!room) throw new Error("Room is not initialized");
    const rows = this.sql.exec(
      "SELECT id, name, vote, connected, joined_at FROM participants ORDER BY connected DESC, joined_at ASC",
    ).toArray() as unknown as ParticipantRow[];
    const participants: Participant[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      vote: row.vote,
      connected: Boolean(row.connected),
      joinedAt: row.joined_at,
    }));
    return {
      code,
      name: room.name,
      round: room.round,
      revealed: Boolean(room.revealed),
      participants,
    };
  }

  private broadcast(skipParticipantId?: string): void {
    if (this.subscribers.size === 0) return;
    const roomCode = this.currentRoomCode();
    if (!roomCode) return;
    const state = this.getState(roomCode);

    for (const [subscriberId, subscriber] of this.subscribers) {
      if (subscriber.participantId === skipParticipantId) continue;
      if (!state.participants.some((participant) => participant.id === subscriber.participantId)) continue;
      try {
        subscriber.controller.enqueue(encoder.encode(ssePatch(renderRoom(state, subscriber.participantId))));
      } catch {
        this.removeSubscriber(subscriberId, subscriber.participantId, false);
      }
    }
  }

  private currentRoomCode(): string | null {
    return this.roomRow()?.code ?? null;
  }

  private removeSubscriber(subscriberId: number, participantId: string, shouldBroadcast: boolean): void {
    this.subscribers.delete(subscriberId);
    const hasAnotherConnection = [...this.subscribers.values()].some((subscriber) => subscriber.participantId === participantId);
    if (!hasAnotherConnection) {
      try {
        this.sql.exec("UPDATE participants SET connected = 0, last_seen = ? WHERE id = ?", Date.now(), participantId);
      } catch {
        // Stream cancellation can race object shutdown; startup resets stale presence.
      }
    }
    if (this.subscribers.size === 0) this.stopHeartbeat();
    if (shouldBroadcast) {
      try {
        this.broadcast(participantId);
      } catch {
        // There is nothing left to notify once the object is shutting down.
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatId !== undefined) return;
    this.heartbeatId = setInterval(() => {
      for (const [subscriberId, subscriber] of this.subscribers) {
        try {
          subscriber.controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          this.removeSubscriber(subscriberId, subscriber.participantId, false);
        }
      }
      if (this.subscribers.size === 0) this.stopHeartbeat();
    }, 20_000) as unknown as number;
  }

  private stopHeartbeat(): void {
    if (this.heartbeatId === undefined) return;
    clearInterval(this.heartbeatId);
    this.heartbeatId = undefined;
  }
}

function ssePatch(html: string): string {
  const data = html.split("\n").map((line) => `data: elements ${line}`).join("\n");
  return `event: datastar-patch-elements\n${data}\n\n`;
}
