import { SELF } from "cloudflare:test";
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
  const code = script.match(/\/r\/([A-Z0-9]{6})/)?.[1];
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
    expect(html).toContain("Fast, calm estimation");
    expect(html).toContain("/datastar-1.0.3.js");

    const datastar = await SELF.fetch("https://example.com/datastar-1.0.3.js");
    expect(datastar.status).toBe(200);
    expect(await datastar.text()).toContain("Datastar v1.0.3");
  });

  it("creates an anonymous room and persists a complete round", async () => {
    const { code, cookie } = await createRoom();

    const room = await SELF.fetch(`https://example.com/r/${code}`, { headers: { Cookie: cookie } });
    const initialHtml = await room.text();
    expect(room.status).toBe(200);
    expect(initialHtml).toContain("Sprint planning");
    expect(initialHtml).toContain("What’s your estimate?");
    expect(initialHtml).toContain("Ada");

    expect((await roomAction(code, cookie, "vote", { vote: "5" })).status).toBe(204);
    expect((await roomAction(code, cookie, "reveal", {})).status).toBe(204);

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
