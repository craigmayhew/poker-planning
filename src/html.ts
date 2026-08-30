export const ROOM_LIMIT = 20;
export const VOTE_OPTIONS = ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕"] as const;

export type Vote = (typeof VOTE_OPTIONS)[number];

export interface Participant {
  id: string;
  name: string;
  vote: string | null;
  connected: boolean;
  joinedAt: number;
}

export interface RoomState {
  code: string;
  name: string;
  round: number;
  revealed: boolean;
  participants: Participant[];
}

const styles = String.raw`
:root {
  color-scheme: light;
  --ink: #1d1d1f;
  --muted: #6e6b66;
  --paper: #fffaf2;
  --panel: #fffefb;
  --line: #ded8cd;
  --soft: #f4ede2;
  --accent: #f05a2a;
  --accent-dark: #c53f17;
  --lime: #d9f99d;
  --green: #20744a;
  --shadow: 0 24px 70px rgba(51, 38, 24, .11);
  --radius: 22px;
}
* { box-sizing: border-box; }
html { min-height: 100%; background: var(--paper); }
body {
  min-height: 100vh;
  margin: 0;
  color: var(--ink);
  background:
    radial-gradient(circle at 8% 6%, rgba(240, 90, 42, .13), transparent 29rem),
    radial-gradient(circle at 93% 88%, rgba(154, 205, 50, .14), transparent 27rem),
    var(--paper);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
body::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: "";
  opacity: .14;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E");
}
a { color: inherit; }
button, input { font: inherit; }
button { color: inherit; }
button, a, input { -webkit-tap-highlight-color: transparent; }
button:focus-visible, a:focus-visible, input:focus-visible {
  outline: 3px solid rgba(240, 90, 42, .28);
  outline-offset: 3px;
}
button:disabled { cursor: not-allowed; opacity: .55; }
.shell { width: min(1180px, calc(100% - 40px)); margin-inline: auto; }
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88px;
  gap: 20px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: .95rem;
  font-weight: 800;
  letter-spacing: -.02em;
  text-decoration: none;
}
.brand-mark {
  display: grid;
  width: 39px;
  height: 39px;
  place-items: center;
  border-radius: 12px;
  background: var(--ink);
  color: var(--paper);
  box-shadow: 0 7px 20px rgba(29, 29, 31, .15);
}
.brand-mark svg { width: 23px; height: 23px; }
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 14px;
  color: var(--accent-dark);
  font-size: .76rem;
  font-weight: 850;
  letter-spacing: .13em;
  text-transform: uppercase;
}
.eyebrow::before { width: 24px; height: 2px; content: ""; background: currentColor; }
h1, h2, h3, p { margin-top: 0; }
h1, h2, h3 { letter-spacing: -.045em; }
.landing-main { padding: 70px 0 86px; }
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(330px, .72fr);
  align-items: center;
  gap: clamp(54px, 8vw, 112px);
}
.hero-copy {
  max-width: 620px;
  margin-bottom: 35px;
  color: var(--muted);
  font-size: clamp(1.08rem, 2vw, 1.32rem);
  line-height: 1.55;
  text-wrap: pretty;
}
.proof-row { display: flex; flex-wrap: wrap; gap: 14px 25px; padding: 0; margin: 0; list-style: none; }
.proof-row li { display: flex; align-items: center; gap: 8px; color: #4d4944; font-size: .9rem; font-weight: 700; }
.proof-dot { width: 8px; height: 8px; border-radius: 99px; background: var(--green); box-shadow: 0 0 0 4px rgba(32, 116, 74, .1); }
.create-card, .join-card, .message-card {
  position: relative;
  overflow: hidden;
  padding: clamp(25px, 4vw, 38px);
  border: 1px solid rgba(120, 101, 79, .22);
  border-radius: 28px;
  background: rgba(255, 254, 251, .91);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
}
.create-card::after {
  position: absolute;
  top: -54px;
  right: -48px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: var(--lime);
  content: "";
  opacity: .62;
  filter: blur(1px);
}
.card-number { position: relative; z-index: 1; margin-bottom: 22px; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .73rem; font-weight: 700; letter-spacing: .08em; }
.create-card h2, .join-card h1, .message-card h1 { position: relative; z-index: 1; margin-bottom: 9px; font-size: clamp(1.8rem, 3.6vw, 2.55rem); }
.card-copy { position: relative; z-index: 1; margin-bottom: 27px; color: var(--muted); line-height: 1.55; }
.field { position: relative; z-index: 1; display: grid; gap: 8px; margin-bottom: 16px; }
.field label { font-size: .78rem; font-weight: 800; }
.field input {
  width: 100%;
  height: 51px;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #fff;
  color: var(--ink);
  transition: border-color .15s, box-shadow .15s;
}
.field input::placeholder { color: #aaa39a; }
.field input:focus { border-color: var(--accent); outline: 0; box-shadow: 0 0 0 4px rgba(240, 90, 42, .1); }
.btn {
  display: inline-flex;
  min-height: 49px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 19px;
  border: 0;
  border-radius: 13px;
  cursor: pointer;
  font-weight: 800;
  text-decoration: none;
  transition: transform .15s, background .15s, box-shadow .15s;
}
.btn:not(:disabled):hover { transform: translateY(-2px); }
.btn-primary { width: 100%; margin-top: 4px; background: var(--ink); color: #fff; box-shadow: 0 10px 24px rgba(29, 29, 31, .17); }
.btn-primary:not(:disabled):hover { background: #343438; }
.btn-accent { background: var(--accent); color: #fff; box-shadow: 0 9px 23px rgba(240, 90, 42, .23); }
.btn-accent:not(:disabled):hover { background: var(--accent-dark); }
.btn-soft { border: 1px solid var(--line); background: #fff; }
.btn-soft:not(:disabled):hover { background: var(--soft); }
.btn-ghost { min-height: 40px; padding-inline: 12px; background: transparent; color: var(--muted); font-size: .84rem; }
.btn-ghost:hover { color: var(--ink); }
.btn svg { width: 17px; height: 17px; }
.form-error { position: relative; z-index: 1; padding: 11px 13px; margin: 0 0 16px; border: 1px solid #f2b7a5; border-radius: 10px; background: #fff1ec; color: #973714; font-size: .84rem; font-weight: 700; }
.room-code-form { display: flex; max-width: 360px; gap: 8px; margin-top: 31px; }
.room-code-form input { min-width: 0; height: 45px; flex: 1; padding: 0 13px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.72); text-transform: uppercase; }
.room-code-form button { min-height: 45px; }
.feature-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin-top: 100px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--line);
}
.feature { min-height: 155px; padding: 27px; background: rgba(255, 254, 251, .78); }
.feature strong { display: block; margin-bottom: 8px; font-size: 1rem; }
.feature p { margin: 0; color: var(--muted); font-size: .88rem; line-height: 1.55; }
.feature-icon { display: grid; width: 36px; height: 36px; margin-bottom: 22px; place-items: center; border-radius: 10px; background: var(--soft); color: var(--accent-dark); font-weight: 900; }
.simple-main { display: grid; min-height: calc(100vh - 176px); place-items: center; padding: 40px 0 90px; }
.join-wrap { width: min(500px, 100%); }
.join-card { overflow: visible; }
.room-token { display: inline-flex; padding: 7px 10px; margin-bottom: 19px; border-radius: 9px; background: var(--soft); color: #57514b; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .73rem; font-weight: 800; letter-spacing: .13em; }
.capacity { display: flex; align-items: center; gap: 9px; margin: -12px 0 24px; color: var(--muted); font-size: .82rem; }
.capacity-meter { display: flex; gap: 3px; }
.capacity-meter i { width: 5px; height: 13px; border-radius: 3px; background: var(--line); }
.capacity-meter i.filled { background: var(--green); }
.back-link { display: inline-flex; align-items: center; gap: 7px; margin-top: 21px; color: var(--muted); font-size: .84rem; font-weight: 700; text-decoration: none; }
.back-link:hover { color: var(--ink); }
.room-page { min-height: 100vh; }
.room-header { border-bottom: 1px solid rgba(107, 93, 75, .17); background: rgba(255, 250, 242, .76); backdrop-filter: blur(16px); }
.room-header-inner { display: flex; min-height: 76px; align-items: center; justify-content: space-between; gap: 20px; }
.room-meta { display: flex; min-width: 0; align-items: center; gap: 14px; }
.room-meta-text { min-width: 0; }
.room-meta-text strong { display: block; overflow: hidden; font-size: .95rem; text-overflow: ellipsis; white-space: nowrap; }
.room-meta-text span { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .7rem; font-weight: 700; letter-spacing: .1em; }
.header-actions { display: flex; align-items: center; gap: 5px; }
.room-main { padding: 34px 0 44px; }
.room-grid { display: grid; grid-template-columns: minmax(0, 1fr) 285px; align-items: start; gap: 24px; }
.game-panel { min-width: 0; }
.round-banner { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 10px 4px 26px; }
.round-banner h1 { margin-bottom: 5px; font-size: clamp(2rem, 4vw, 3.15rem); }
.round-banner p { margin: 0; color: var(--muted); font-size: .92rem; }
.round-kicker { margin-bottom: 7px; color: var(--accent-dark); font-size: .72rem; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
.vote-count { flex: 0 0 auto; text-align: right; }
.vote-count strong { display: block; font-size: 1.5rem; letter-spacing: -.04em; }
.vote-count span { color: var(--muted); font-size: .73rem; font-weight: 700; }
.card-panel { padding: clamp(19px, 3vw, 30px); border: 1px solid var(--line); border-radius: var(--radius); background: rgba(255, 254, 251, .84); box-shadow: 0 12px 38px rgba(59, 45, 28, .07); }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 21px; }
.section-heading h2 { margin: 0; font-size: 1.1rem; }
.section-heading span { color: var(--muted); font-size: .76rem; }
.vote-grid { display: grid; grid-template-columns: repeat(7, minmax(64px, 1fr)); gap: 11px; }
.vote-card {
  position: relative;
  aspect-ratio: .72;
  min-height: 92px;
  border: 1px solid #d5cec3;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  font-size: clamp(1rem, 2vw, 1.27rem);
  font-weight: 850;
  box-shadow: 0 5px 0 #e1d9ce;
  transition: transform .14s, border-color .14s, box-shadow .14s, background .14s;
}
.vote-card::before { position: absolute; top: 8px; left: 9px; color: #b8afa3; content: attr(data-value); font-size: .58rem; }
.vote-card:not(:disabled):hover { z-index: 1; border-color: var(--accent); transform: translateY(-5px) rotate(-1deg); box-shadow: 0 10px 0 #f1c3b4; }
.vote-card.selected { border-color: var(--accent); background: #fff0ea; color: var(--accent-dark); box-shadow: 0 5px 0 #f0a68e; }
.game-actions { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding-top: 22px; }
.game-hint { margin: 0; color: var(--muted); font-size: .8rem; }
.presence-panel { position: sticky; top: 20px; padding: 20px; border: 1px solid var(--line); border-radius: var(--radius); background: rgba(255, 254, 251, .76); }
.presence-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.presence-header h2 { margin: 0; font-size: .93rem; }
.presence-header span { padding: 4px 8px; border-radius: 20px; background: var(--soft); color: var(--muted); font-size: .68rem; font-weight: 800; }
.people { display: grid; gap: 5px; padding: 0; margin: 0; list-style: none; }
.person { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 45px; padding: 5px 6px; border-radius: 11px; }
.person.you { background: var(--soft); }
.person.away { opacity: .56; }
.avatar { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; background: #eae2d5; color: #574c40; font-size: .66rem; font-weight: 900; }
.person:nth-child(3n+2) .avatar { background: #e4edd0; color: #47592e; }
.person:nth-child(3n+3) .avatar { background: #f4dcd3; color: #7b3b25; }
.person-name { overflow: hidden; font-size: .79rem; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.person-name small { color: var(--muted); font-size: .65rem; font-weight: 650; }
.vote-status { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 8px; background: var(--soft); color: #948a7f; font-size: .7rem; font-weight: 900; }
.vote-status.done { background: #dff3cc; color: var(--green); }
.vote-status.revealed { min-width: 30px; width: auto; padding-inline: 7px; background: var(--ink); color: white; }
.presence-note { padding-top: 16px; margin: 16px 0 0; border-top: 1px solid var(--line); color: var(--muted); font-size: .7rem; line-height: 1.45; }
.results-intro { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 22px; }
.result-callout { display: inline-flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 10px; background: var(--lime); color: #334b17; font-size: .78rem; font-weight: 850; }
.result-metric { color: var(--muted); font-size: .78rem; }
.result-metric strong { color: var(--ink); font-size: 1rem; }
.distribution { display: grid; gap: 11px; }
.distribution-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) 28px; align-items: center; gap: 10px; }
.distribution-row > strong { font-size: .8rem; text-align: right; }
.distribution-track { height: 12px; overflow: hidden; border-radius: 20px; background: var(--soft); }
.distribution-bar { width: var(--share); height: 100%; min-width: 9px; border-radius: inherit; background: var(--accent); }
.distribution-row > span { color: var(--muted); font-size: .72rem; }
.results-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 24px; margin-top: 24px; border-top: 1px solid var(--line); }
.result-person { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 11px; border-radius: 11px; background: var(--soft); }
.result-person span { overflow: hidden; font-size: .75rem; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.result-person strong { display: grid; min-width: 27px; height: 27px; padding-inline: 6px; place-items: center; border-radius: 8px; background: #fff; font-size: .72rem; }
.empty-state { padding: 40px 20px; color: var(--muted); text-align: center; }
.room-footer { padding: 0 0 30px; color: #8a8279; font-size: .7rem; text-align: center; }
.live-dot { display: inline-block; width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; background: #50a86f; box-shadow: 0 0 0 4px rgba(80, 168, 111, .11); }
@media (max-width: 900px) {
  .hero-grid { grid-template-columns: 1fr; }
  .hero { max-width: 760px; }
  .create-card { max-width: 580px; }
  .feature-strip { margin-top: 70px; }
  .room-grid { grid-template-columns: 1fr; }
  .presence-panel { position: static; }
  .people { grid-template-columns: repeat(2, 1fr); }
  .presence-note { grid-column: 1 / -1; }
}
@media (max-width: 680px) {
  .shell { width: min(100% - 24px, 1180px); }
  .site-header { min-height: 72px; }
  .landing-main { padding-top: 42px; }
  .feature-strip { grid-template-columns: 1fr; }
  .feature { min-height: 0; }
  .room-header-inner { min-height: 68px; }
  .room-meta .brand > span, .room-meta-text span, .header-actions .btn-ghost { display: none; }
  .room-main { padding-top: 22px; }
  .round-banner { align-items: flex-start; }
  .vote-grid { grid-template-columns: repeat(4, 1fr); }
  .vote-card { min-height: 88px; }
  .game-actions { align-items: stretch; flex-direction: column; }
  .game-actions .btn { width: 100%; }
  .game-hint { text-align: center; }
  .results-list { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 440px) {
  .proof-row { display: grid; }
  .create-card, .join-card, .message-card { border-radius: 21px; }
  .people { grid-template-columns: 1fr; }
  .results-list { grid-template-columns: 1fr; }
  .room-code-form { max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function logo(): string {
  return `<a class="brand" href="/" aria-label="Pocket Plan home">
    <span class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor"/><path d="M8 16V8h5.2a3 3 0 0 1 0 6H8m0-3h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </span>
    <span>Pocket Plan</span>
  </a>`;
}

function page(title: string, content: string, description: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#fffaf2">
  <title>${escapeHtml(title)} · Pocket Plan</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>${styles}</style>
  <script type="module" src="/datastar-1.0.3.js"></script>
</head>
<body>${content}</body>
</html>`;
}

function header(): string {
  return `<header class="site-header shell">${logo()}<span class="eyebrow" style="margin:0">Planning poker</span></header>`;
}

export function renderCreatePanel(error = ""): string {
  return `<section id="create-panel" class="create-card">
    <div class="card-number">ROOM / NEW</div>
    <h2>Start a room</h2>
    <p class="card-copy">Name it, invite your team, and estimate. No accounts or setup.</p>
    <form method="post" action="/rooms" data-on:submit="@post('/rooms', {contentType: 'form'})" data-indicator:creating data-attr:aria-busy="$creating">
      ${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}
      <div class="field">
        <label for="creator-name">Your name</label>
        <input id="creator-name" name="name" autocomplete="name" maxlength="40" required placeholder="Ada Lovelace">
      </div>
      <div class="field">
        <label for="room-name">Room name <span style="color:var(--muted);font-weight:600">(optional)</span></label>
        <input id="room-name" name="roomName" maxlength="60" placeholder="Monday sprint">
      </div>
      <button class="btn btn-primary" type="submit" data-attr:disabled="$creating">
        <span data-text="$creating ? 'Creating room…' : 'Create room'">Create room</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  </section>`;
}

export function renderLanding(error = ""): string {
  const content = `${header()}
  <main class="landing-main shell">
    <div class="hero-grid">
      <section class="hero">
        <p class="eyebrow">Fast, calm estimation</p>
        <p class="hero-copy">Lightweight planning poker for teams that want a decision—not another tool to manage.</p>
        <ul class="proof-row" aria-label="Key benefits">
          <li><span class="proof-dot"></span>No signups</li>
          <li><span class="proof-dot"></span>Live results</li>
          <li><span class="proof-dot"></span>Up to ${ROOM_LIMIT} people</li>
        </ul>
        <form class="room-code-form" method="get" action="/join">
          <input name="code" aria-label="Room code" minlength="6" maxlength="6" pattern="[A-Za-z0-9]{6}" placeholder="ROOM CODE" required>
          <button class="btn btn-soft" type="submit">Join</button>
        </form>
      </section>
      ${renderCreatePanel(error)}
    </div>
    <section class="feature-strip" aria-label="Features">
      <article class="feature"><span class="feature-icon">01</span><strong>Instant rooms</strong><p>One short form. Share the link and start estimating in seconds.</p></article>
      <article class="feature"><span class="feature-icon">02</span><strong>Everyone stays in sync</strong><p>Votes and reveals update live with tiny server-sent HTML patches.</p></article>
      <article class="feature"><span class="feature-icon">03</span><strong>State that lasts</strong><p>Each room is backed by its own strongly consistent Durable Object.</p></article>
    </section>
  </main>`;
  return page("Planning poker", content, "Quick, anonymous planning poker for teams of up to 20 people.");
}

function capacityMeter(count: number): string {
  return Array.from({ length: 10 }, (_, index) => `<i class="${index < Math.ceil(count / 2) ? "filled" : ""}"></i>`).join("");
}

export function renderJoinPanel(state: RoomState, error = ""): string {
  const full = state.participants.length >= ROOM_LIMIT;
  return `<section id="join-panel" class="join-card">
    <span class="room-token">${escapeHtml(state.code)}</span>
    <h1>${full ? "Room at capacity" : "Join the room"}</h1>
    <p class="card-copy">${full ? `${escapeHtml(state.name)} already has ${ROOM_LIMIT} participants. Try again when someone leaves.` : `You’ve been invited to <strong>${escapeHtml(state.name)}</strong>. Pick a display name to join.`}</p>
    <div class="capacity"><span class="capacity-meter" aria-hidden="true">${capacityMeter(state.participants.length)}</span><span>${state.participants.length} of ${ROOM_LIMIT} places used</span></div>
    ${full ? "" : `<form method="post" action="/r/${state.code}/join" data-on:submit="@post('/r/${state.code}/join', {contentType: 'form'})" data-indicator:joining data-attr:aria-busy="$joining">
      ${error ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>` : ""}
      <div class="field">
        <label for="display-name">Your name</label>
        <input id="display-name" name="name" autocomplete="name" maxlength="40" required autofocus placeholder="Grace Hopper">
      </div>
      <button class="btn btn-primary" type="submit" data-attr:disabled="$joining"><span data-text="$joining ? 'Joining…' : 'Join room'">Join room</span><span aria-hidden="true">→</span></button>
    </form>`}
    <a class="back-link" href="/">← Create a different room</a>
  </section>`;
}

export function renderJoinPage(state: RoomState, error = ""): string {
  return page(`Join ${state.name}`, `${header()}<main class="simple-main shell"><div class="join-wrap">${renderJoinPanel(state, error)}</div></main>`, `Join the ${state.name} planning poker room.`);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}` : name.slice(0, 2)).toUpperCase();
}

function renderPeople(state: RoomState, viewerId: string): string {
  return state.participants.map((participant) => {
    const isYou = participant.id === viewerId;
    const status = state.revealed
      ? `<span class="vote-status revealed" title="Vote">${escapeHtml(participant.vote ?? "—")}</span>`
      : `<span class="vote-status ${participant.vote ? "done" : ""}" title="${participant.vote ? "Vote submitted" : "Waiting for vote"}">${participant.vote ? "✓" : "·"}</span>`;
    return `<li class="person ${isYou ? "you" : ""} ${participant.connected ? "" : "away"}">
      <span class="avatar" aria-hidden="true">${escapeHtml(initials(participant.name))}</span>
      <span class="person-name">${escapeHtml(participant.name)} ${isYou ? "<small>(you)</small>" : ""}${participant.connected ? "" : " <small>away</small>"}</span>
      ${status}
    </li>`;
  }).join("");
}

function numericVote(vote: string): number | null {
  if (vote === "½") return 0.5;
  if (!/^\d+$/.test(vote)) return null;
  return Number(vote);
}

function renderResults(state: RoomState): string {
  const cast = state.participants.filter((participant) => participant.vote !== null);
  if (cast.length === 0) return `<div class="empty-state">No votes were cast this round.</div>`;

  const totals = new Map<string, number>();
  for (const participant of cast) totals.set(participant.vote!, (totals.get(participant.vote!) ?? 0) + 1);
  const ordered = [...totals.entries()].sort((a, b) => VOTE_OPTIONS.indexOf(a[0] as Vote) - VOTE_OPTIONS.indexOf(b[0] as Vote));
  const consensus = totals.size === 1 && cast.length === state.participants.length ? cast[0]?.vote : null;
  const numeric = cast.map((participant) => numericVote(participant.vote!)).filter((value): value is number => value !== null);
  const average = numeric.length ? (numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(1).replace(/\.0$/, "") : null;

  return `<div class="results-intro">
      ${consensus ? `<span class="result-callout">✓ Consensus on ${escapeHtml(consensus)}</span>` : `<span class="result-callout" style="background:var(--soft);color:var(--muted)">Votes revealed</span>`}
      ${average ? `<span class="result-metric">Numeric average <strong>${average}</strong></span>` : ""}
    </div>
    <div class="distribution">
      ${ordered.map(([vote, count]) => `<div class="distribution-row"><strong>${escapeHtml(vote)}</strong><div class="distribution-track"><div class="distribution-bar" style="--share:${Math.round(count / cast.length * 100)}%"></div></div><span>${count}</span></div>`).join("")}
    </div>
    <div class="results-list">
      ${state.participants.map((participant) => `<div class="result-person"><span>${escapeHtml(participant.name)}</span><strong>${escapeHtml(participant.vote ?? "—")}</strong></div>`).join("")}
    </div>`;
}

function renderVoting(state: RoomState, viewerId: string): string {
  const me = state.participants.find((participant) => participant.id === viewerId);
  return `<div class="section-heading"><h2>Choose your estimate</h2><span>Your vote stays hidden</span></div>
    <div class="vote-grid">
      ${VOTE_OPTIONS.map((vote) => `<button class="vote-card ${me?.vote === vote ? "selected" : ""}" type="button" data-value="${escapeHtml(vote)}" aria-label="Vote ${escapeHtml(vote)}" aria-pressed="${me?.vote === vote}" data-on:click="@post('/r/${state.code}/vote', {payload: {vote: '${vote}'}})">${escapeHtml(vote)}</button>`).join("")}
    </div>`;
}

export function renderRoom(state: RoomState, viewerId: string): string {
  const voted = state.participants.filter((participant) => participant.vote !== null).length;
  const canReveal = voted > 0 && !state.revealed;
  return `<div id="room-shell" class="room-page" data-signals="{copied: false}" data-init="@get('/r/${state.code}/events', {retry: 'always', retryMaxCount: 1000, retryMaxWait: 10000})">
    <header class="room-header">
      <div class="room-header-inner shell">
        <div class="room-meta">${logo()}<div class="room-meta-text"><strong>${escapeHtml(state.name)}</strong><span>ROOM ${state.code}</span></div></div>
        <div class="header-actions">
          <button class="btn btn-ghost" type="button" data-on:click="navigator.clipboard.writeText(location.href).then(() => { $copied = true; setTimeout(() => $copied = false, 1600) })" data-text="$copied ? 'Copied' : 'Copy link'">Copy link</button>
          <button class="btn btn-ghost" type="button" data-on:click="@post('/r/${state.code}/leave', {payload: {}})">Leave</button>
        </div>
      </div>
    </header>
    <main class="room-main shell">
      <div class="room-grid">
        <section class="game-panel">
          <div class="round-banner">
            <div><div class="round-kicker">Round ${state.round}</div><h1>${state.revealed ? "The votes are in." : "What’s your estimate?"}</h1><p>${state.revealed ? "Compare the spread, discuss, then start a fresh round." : "Choose the effort this work deserves."}</p></div>
            <div class="vote-count"><strong>${voted}/${state.participants.length}</strong><span>votes submitted</span></div>
          </div>
          <div class="card-panel">
            ${state.revealed ? renderResults(state) : renderVoting(state, viewerId)}
            <div class="game-actions">
              <p class="game-hint">${state.revealed ? "Ready when the conversation is." : voted === state.participants.length ? "Everyone has voted—time to reveal." : "You can change your vote until cards are revealed."}</p>
              ${state.revealed
                ? `<button class="btn btn-accent" type="button" data-on:click="@post('/r/${state.code}/new-round', {payload: {}})">Start new round <span aria-hidden="true">↻</span></button>`
                : `<button class="btn btn-accent" type="button" ${canReveal ? "" : "disabled"} data-on:click="@post('/r/${state.code}/reveal', {payload: {}})">Reveal cards <span aria-hidden="true">✦</span></button>`}
            </div>
          </div>
        </section>
        <aside class="presence-panel" aria-label="Room participants">
          <div class="presence-header"><h2>In the room</h2><span>${state.participants.length} / ${ROOM_LIMIT}</span></div>
          <ul class="people">${renderPeople(state, viewerId)}</ul>
          <p class="presence-note"><span class="live-dot"></span>Live room state is synced from Cloudflare Durable Objects.</p>
        </aside>
      </div>
    </main>
    <footer class="room-footer shell">No accounts. No tracking. Just the room.</footer>
  </div>`;
}

export function renderRoomPage(state: RoomState, viewerId: string): string {
  return page(state.name, renderRoom(state, viewerId), `${state.name} planning poker room.`);
}

export function renderMessagePage(title: string, message: string, status = "ROOM / NOTICE"): string {
  const content = `${header()}<main class="simple-main shell"><div class="join-wrap"><section class="message-card"><div class="card-number">${escapeHtml(status)}</div><h1>${escapeHtml(title)}</h1><p class="card-copy">${escapeHtml(message)}</p><a class="btn btn-primary" href="/">Create a room</a></section></div></main>`;
  return page(title, content, message);
}
