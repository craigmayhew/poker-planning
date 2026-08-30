import { SELF, env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

interface CreatedRoom {
  code: string;
  cookie: string;
}

async function createRoom(name = "Ada", roomName = "Sprint planning"): Promise<CreatedRoom> {
  const response = await SELF.fetch("https://example.com/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Datastar-Request": "true",
    },
    body: new URLSearchParams({ name, roomName }),
  });
  const script = await response.text();
  const code = script.match(/\/r\/([A-Z0-9]{8})/)?.[1];
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/javascript");
  expect(code).toBeTruthy();
  expect(cookie).toMatch(/^pp_session=[a-f0-9]{32}$/);
  return { code: code!, cookie: cookie! };
}

async function roomAction(code: string, cookie: string, action: string, payload: object): Promise<Response> {
  return SELF.fetch(`https://example.com/r/${code}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Datastar-Request": "true",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
}

async function readSseEvent(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let event = "";
  while (!event.includes("\n\n")) {
    const chunk = await reader.read();
    if (chunk.done) break;
    event += decoder.decode(chunk.value, { stream: true });
  }
  return event;
}

describe("planning poker worker", () => {
  it("serves the landing page and pinned Datastar client", async () => {
    const page = await SELF.fetch("https://example.com/");
    const html = await page.text();
    expect(page.status).toBe(200);
    const nonce = html.match(/data-nonce="([a-f0-9]{32})"/)?.[1];
    expect(nonce).toBeTruthy();
    expect(html).toContain(`nonce="${nonce}"`);
    expect(page.headers.get("content-security-policy")).toContain(`script-src 'nonce-${nonce}' 'strict-dynamic'`);
    expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(html).toContain("Fast, calm estimation");
    expect(html).toContain("Lightweight planning poker for teams that want a decision—not another tool to manage.");
    expect(html).not.toContain('aria-label="Pocket Plan home"');
    expect(html).toContain("/datastar-1.0.3.js");
    expect(html).toContain('href="https://github.com/craigmayhew/poker-planning"');
    expect(html).toContain('rel="noopener noreferrer"');

    const datastar = await SELF.fetch("https://example.com/datastar-1.0.3.js");
    expect(datastar.status).toBe(200);
    expect(await datastar.text()).toContain("Datastar v1.0.3");

    const shortCode = await SELF.fetch("https://example.com/join?code=ABCDEF");
    expect(shortCode.status).toBe(400);
  });

  it("creates an anonymous room and persists a complete round", async () => {
    const { code, cookie } = await createRoom();

    const room = await SELF.fetch(`https://example.com/r/${code}`, { headers: { Cookie: cookie } });
    const initialHtml = await room.text();
    expect(room.status).toBe(200);
    expect(initialHtml).toContain("Sprint planning");
    expect(initialHtml).toContain("What’s your estimate?");
    expect(initialHtml).toContain("Ada");

    expect((await roomAction(code, cookie, "new-round", {})).status).toBe(409);
    expect((await roomAction(code, cookie, "vote", { vote: "5" })).status).toBe(204);
    expect((await roomAction(code, cookie, "reveal", {})).status).toBe(204);
    expect((await roomAction(code, cookie, "reveal", {})).status).toBe(409);

    const revealed = await SELF.fetch(`https://example.com/r/${code}`, { headers: { Cookie: cookie } });
    const revealedHtml = await revealed.text();
    expect(revealedHtml).toContain("The votes are in.");
    expect(revealedHtml).toContain("Consensus on 5");

    expect((await roomAction(code, cookie, "new-round", {})).status).toBe(204);
    const nextRound = await SELF.fetch(`https://example.com/r/${code}`, { headers: { Cookie: cookie } });
    const nextRoundHtml = await nextRound.text();
    expect(nextRoundHtml).toContain("Round 2");
    expect(nextRoundHtml).toContain("What’s your estimate?");
  });

  it("streams personalized Datastar patches after room changes", async () => {
    const { code, cookie } = await createRoom();
    const response = await SELF.fetch(`https://example.com/r/${code}/events`, {
      headers: { Cookie: cookie },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const reader = response.body!.getReader();
    const initialEvent = await readSseEvent(reader);
    expect(initialEvent).toContain("event: datastar-patch-elements");
    expect(initialEvent).toContain("data: elements <div id=\"room-shell\"");

    const secondConnection = await SELF.fetch(`https://example.com/r/${code}/events`, { headers: { Cookie: cookie } });
    expect(secondConnection.status).toBe(200);
    const excessConnection = await SELF.fetch(`https://example.com/r/${code}/events`, { headers: { Cookie: cookie } });
    expect(excessConnection.status).toBe(429);
    await secondConnection.body!.cancel();

    expect((await roomAction(code, cookie, "vote", { vote: "8" })).status).toBe(204);
    const updateEvent = await readSseEvent(reader);
    expect(updateEvent).toContain("vote-card selected");
    expect(updateEvent).toContain("aria-label=\"Vote 8\"");
    await reader.cancel();
  });

  it("escapes participant and room names", async () => {
    const { code, cookie } = await createRoom("<script>Ada</script>", "<img src=x onerror=alert(1)>");
    const response = await SELF.fetch(`https://example.com/r/${code}`, { headers: { Cookie: cookie } });
    const html = await response.text();
    expect(html).toContain("&lt;script&gt;Ada&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<script>Ada</script>");
  });

  it("bounds request bodies and rejects cross-origin mutations", async () => {
    const crossOrigin = await SELF.fetch("https://example.com/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://attacker.example",
      },
      body: new URLSearchParams({ name: "Mallory" }),
    });
    expect(crossOrigin.status).toBe(403);

    const oversized = await SELF.fetch("https://example.com/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ name: "A".repeat(5_000) }),
    });
    expect(oversized.status).toBe(413);
  });

  it("truncates persisted names and room names at their server-side limits", async () => {
    const { code, cookie } = await createRoom("A".repeat(200), "R".repeat(200));
    const response = await SELF.fetch(`https://example.com/r/${code}`, { headers: { Cookie: cookie } });
    const html = await response.text();
    expect(html).toContain("A".repeat(40));
    expect(html).not.toContain("A".repeat(41));
    expect(html).toContain("R".repeat(60));
    expect(html).not.toContain("R".repeat(61));
  });

  it("rate limits repeated room mutations", async () => {
    const { code, cookie } = await createRoom();
    for (let index = 0; index < 10; index++) {
      const response = await roomAction(code, cookie, "vote", { vote: index % 2 ? "1" : "2" });
      expect(response.status).toBe(204);
    }
    const limited = await roomAction(code, cookie, "vote", { vote: "3" });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("10");
  });

  it("schedules idle room expiry", async () => {
    const { code } = await createRoom();
    const rooms = (env as unknown as { ROOMS: DurableObjectNamespace }).ROOMS;
    const stub = rooms.get(rooms.idFromName(code));
    const alarm = await runInDurableObject(stub, (_instance, state) => state.storage.getAlarm());
    expect(alarm).not.toBeNull();
    expect(alarm!).toBeGreaterThan(Date.now());
  });

  it("enforces a maximum of 20 participants", async () => {
    const { code } = await createRoom("Person 1", "Capacity test");

    for (let number = 2; number <= 20; number++) {
      const response = await SELF.fetch(`https://example.com/r/${code}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Datastar-Request": "true",
        },
        body: new URLSearchParams({ name: `Person ${number}` }),
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(`location.assign("/r/${code}")`);
    }

    const full = await SELF.fetch(`https://example.com/r/${code}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Datastar-Request": "true",
      },
      body: new URLSearchParams({ name: "Person 21" }),
    });
    const html = await full.text();
    expect(full.status).toBe(200);
    expect(html).toContain("Room at capacity");
    expect(html).toContain("20 of 20 places used");
  });
});
