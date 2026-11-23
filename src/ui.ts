import { DIFFS, LEVELS, type Diff, type Level } from "./content";
import { Round } from "./engine";
import { t, type Key } from "./i18n";
import { store } from "./store";
import { music, setMuted, sfx, unlockAudio } from "./audio";
import type { createScene } from "./scene";

type World = ReturnType<typeof createScene>;
const app = document.getElementById("app")!;
let world: World;
let cleanup: (() => void) | null = null;
let tab: Diff = "easy";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const tr = (k: Key) => t(store.lang, k);
const lvlName = (l: Level) => l.title?.[store.lang] ?? `${tr("level")} ${l.n}`;
const stars = (n: number, total = 3) => "★".repeat(n) + `<span class="off">${"★".repeat(total - n)}</span>`;

function show(html: string, onMount?: (root: HTMLElement) => void) {
  cleanup?.();
  cleanup = null;
  app.innerHTML = `<div class="screen">${html}</div>`;
  const root = app.firstElementChild as HTMLElement;
  root.querySelector<HTMLElement>("[data-focus]")?.focus();
  onMount?.(root);
}
const on = (root: HTMLElement, sel: string, fn: () => void) =>
  root.querySelector(sel)?.addEventListener("click", () => { sfx.click(); fn(); });

const toolbar = () => `
  <div class="toolbar">
    <button class="ghost" data-act="lang" aria-label="${tr("lang")}">${store.lang === "es" ? "EN" : "ES"}</button>
    <button class="ghost" data-act="sound" aria-label="${tr("sound")}" aria-pressed="${!store.muted}">${store.muted ? "🔇" : "🔊"}</button>
  </div>`;

function wireToolbar(root: HTMLElement, rerender: () => void) {
  root.querySelector('[data-act="lang"]')?.addEventListener("click", () => {
    store.lang = store.lang === "es" ? "en" : "es";
    document.documentElement.lang = store.lang;
    rerender();
  });
  root.querySelector('[data-act="sound"]')?.addEventListener("click", () => {
    store.muted = !store.muted;
    setMuted(store.muted);
    if (!store.muted) { unlockAudio(); music.start(); }
    rerender();
  });
}

export function home() {
  world.theme("menu");
  world.mode("menu");
  show(`${toolbar()}
    <main class="center plain">
      <h1 class="logo">VECTORCITOS<span>RUN<i class="cursor"></i></span></h1>
      <p class="tag">${tr("tagline")}</p>
      <button class="btn big" id="play" data-focus>${tr("play")}</button>
    </main>`, (r) => {
    wireToolbar(r, home);
    on(r, "#play", () => { unlockAudio(); music.start(); profile(); });
  });
}

function profile() {
  const names = store.names;
  show(`${toolbar()}
    <main class="center">
      <h2>${tr("who")}</h2>
      ${store.current && names.includes(store.current) ? `<button class="btn" id="resume">${tr("resume")} ${esc(store.current)}</button>` : ""}
      <form id="f" class="stack">
        <input id="name" class="field" maxlength="16" autocomplete="nickname" placeholder="${tr("name")}" aria-label="${tr("name")}" ${names.length ? "" : "data-focus"} />
        <button class="btn" type="submit">${tr("start")}</button>
        <p class="hint">${tr("nameHint")}</p>
      </form>
      ${names.length ? `<div class="chips">${names.map((n) => `<button class="chip" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : ""}
      <button class="ghost" id="back">${tr("back")}</button>
    </main>`, (r) => {
    wireToolbar(r, profile);
    const go = (n: string) => { store.login(n); levelMap(); };
    on(r, "#resume", () => go(store.current));
    on(r, "#back", home);
    r.querySelectorAll<HTMLElement>(".chip").forEach((c) => c.addEventListener("click", () => { sfx.click(); go(c.dataset.n!); }));
    r.querySelector("#f")!.addEventListener("submit", (e) => {
      e.preventDefault();
      const n = (r.querySelector("#name") as HTMLInputElement).value.trim().slice(0, 16);
      if (n) { sfx.click(); go(n); }
    });
  });
}

function levelMap() {
  world.theme(tab);
  world.mode("menu");
  const done = LEVELS.filter((l) => store.best(l.id)).length;
  show(`${toolbar()}
    <main class="wide">
      <header class="bar"><h2>${tr("pick")}</h2><span class="who">${esc(store.current)} · ${done}/${LEVELS.length}</span></header>
      <button class="ghost" id="prog" style="align-self:flex-start">📈 ${tr("progress")}</button>
      <div class="tabs" role="tablist">${DIFFS.map((d) => `<button role="tab" class="tab" aria-selected="${d === tab}" data-d="${d}">${tr(d)}</button>`).join("")}</div>
      <div class="grid">${LEVELS.filter((l) => l.diff === tab).map((l) => {
        const open = store.unlocked(l.id), b = store.best(l.id);
        return `<button class="lvl ${open ? "open" : "closed"}" data-id="${l.id}" ${open ? "" : "disabled"} aria-label="${lvlName(l)}, ${open ? tr("open") : tr("locked")}">
          <i>${open ? "🎮" : "🚫"}</i><b>${lvlName(l)}</b><span class="st">${b ? stars(b.stars) : ""}</span></button>`;
      }).join("")}</div>
      <button class="ghost" id="back">${tr("back")}</button>
    </main>`, (r) => {
    wireToolbar(r, levelMap);
    on(r, "#back", profile);
    on(r, "#prog", progress);
    r.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.addEventListener("click", () => { sfx.click(); tab = b.dataset.d as Diff; levelMap(); }));
    r.querySelectorAll<HTMLElement>(".lvl.open").forEach((b) => b.addEventListener("click", () => { sfx.click(); info(LEVELS.find((l) => l.id === +b.dataset.id!)!); }));
  });
}

function chart(vals: number[], max: number, title: string) {
  const W = 600, H = 170, px = 34, py = 22;
  const x = (i: number) => px + (vals.length < 2 ? (W - 2 * px) / 2 : (i * (W - 2 * px)) / (vals.length - 1));
  const y = (v: number) => H - py - (v / max) * (H - 2 * py);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const grid = [0, 0.5, 1].map((k) => `<line x1="${px}" x2="${W - px}" y1="${y(max * k)}" y2="${y(max * k)}" class="gl"/><text x="${px - 6}" y="${y(max * k) + 4}" class="gt" text-anchor="end">${Math.round(max * k)}</text>`).join("");
  const last = vals.length - 1;
  return `<figure class="chart"><figcaption>${title}</figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}: ${vals.join(", ")}">${grid}
      ${vals.length > 1 ? `<polyline points="${pts.join(" ")}" class="ln"/>` : ""}
      ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === last ? 5 : 3}" class="pt"/>`).join("")}
      <text x="${x(last)}" y="${y(vals[last]) - 10}" class="gt hi" text-anchor="middle">${vals[last]}</text>
    </svg></figure>`;
}

function progress() {
  const runs = store.runs;
  const recent = runs.slice(-20);
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const totalStars = LEVELS.reduce((n, l) => n + (store.best(l.id)?.stars ?? 0), 0);
  const miss: Record<string, number> = {};
  runs.slice(-50).forEach((r) => Object.entries(r.miss).forEach(([k, v]) => { miss[k] = (miss[k] ?? 0) + v; }));
  const hardest = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const fmt = new Intl.DateTimeFormat(store.lang, { day: "numeric", month: "short" });
  const rows = runs.slice(-8).reverse().map((r) => {
    const lv = LEVELS.find((x) => x.id === r.id)!;
    return `<li><span>${fmt.format(r.ts)}</span><span>${lvlName(lv)} · ${tr(lv.diff)}</span><b>${r.wpm}</b><span>${r.acc}%</span><span class="st">${stars(r.stars)}</span></li>`;
  }).join("");
  show(`${toolbar()}
    <main class="wide">
      <header class="bar"><h2>${tr("progress")}</h2><span class="who">${esc(store.current)}</span></header>
      ${runs.length === 0 ? `<p class="tag" style="margin:2rem auto">${tr("noRuns")}</p>` : `
      <dl class="stats wide-stats">
        <div><dt>${tr("runs")}</dt><dd>${runs.length}</dd></div>
        <div><dt>${tr("avgWpm")}</dt><dd>${avg(recent.map((r) => r.wpm))}</dd></div>
        <div><dt>${tr("bestWpm")}</dt><dd>${Math.max(...runs.map((r) => r.wpm))}</dd></div>
        <div><dt>${tr("avgAcc")}</dt><dd>${avg(recent.map((r) => r.acc))}%</dd></div>
        <div><dt>${tr("totalStars")}</dt><dd>${totalStars}/${LEVELS.length * 3}</dd></div>
      </dl>
      <div class="charts">
        ${chart(recent.map((r) => r.wpm), Math.max(10, Math.ceil(Math.max(...recent.map((r) => r.wpm)) / 20) * 20), `${tr("wpmChart")} · ${tr("lastN")} ${recent.length}`)}
        ${chart(recent.map((r) => r.acc), 100, `${tr("accChart")} · ${tr("lastN")} ${recent.length}`)}
      </div>
      ${hardest.length ? `<section class="panel"><h3>${tr("hardKeys")}</h3><div class="chips">${hardest.map(([k, n]) => `<span class="chip key">${esc(k === " " ? "␣" : k)} <small>×${n}</small></span>`).join("")}</div></section>` : ""}
      <section class="panel"><h3>${tr("recent")}</h3><ul class="runs">${rows}</ul></section>`}
      <button class="ghost" id="back" style="align-self:flex-start">${tr("back")}</button>
    </main>`, (r) => {
    wireToolbar(r, progress);
    on(r, "#back", levelMap);
  });
}

function info(l: Level) {
  const b = store.best(l.id);
  show(`${toolbar()}
    <main class="center">
      <h2>${lvlName(l)} · ${tr(l.diff)}</h2>
      <blockquote class="quote">${esc(l.text[store.lang])}</blockquote>
      <p class="hint">${tr("best")}: ${b ? `${stars(b.stars)} · ${b.wpm} ${tr("wpm")}` : tr("none")}</p>
      <div class="row"><button class="btn ghost-b" id="back">${tr("back")}</button><button class="btn" id="go" data-focus>${tr("play")}</button></div>
    </main>`, (r) => {
    wireToolbar(r, () => info(l));
    on(r, "#back", levelMap);
    on(r, "#go", () => play(l));
  });
}

function play(l: Level) {
  world.theme(l.diff);
  world.mode("play");
  music.mood(l.diff);
  const round = new Round(l.text[store.lang]);
  // La frase se divide en palabras (que no se parten al saltar de línea) y espacios.
  const html = round.text.split(" ").map((w) =>
    `<span class="wd">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join("")}</span>`).join('<span class="ch sp"> </span>');
  show(`<main class="play">
      <header class="bar"><h3>${lvlName(l)} · ${tr(l.diff)}</h3><span class="streak" id="streak" hidden></span><span class="clock" id="clock">0s</span></header>
      <div class="phrase idle" id="phrase" aria-label="${esc(round.text)}">${html}<span class="tap" id="tap">${tr("tapHint")}</span></div>
      <div class="meter" aria-hidden="true"><i id="meter"></i></div>
      <p class="hint" id="count">${tr("typeHint")}</p>
      <input id="in" class="ghost-input" aria-label="${tr("typeHint")}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" />
    </main>`, (r) => {
    const phrase = r.querySelector<HTMLElement>("#phrase")!;
    const input = r.querySelector<HTMLInputElement>("#in")!;
    const clock = r.querySelector<HTMLElement>("#clock")!;
    const count = r.querySelector<HTMLElement>("#count")!;
    const meter = r.querySelector<HTMLElement>("#meter")!;
    const streakEl = r.querySelector<HTMLElement>("#streak")!;
    const chars = [...r.querySelectorAll<HTMLElement>(".ch")];
    chars[0].classList.add("now");
    let leaving = false;

    const timer = window.setInterval(() => {
      if (round.start && !round.done) clock.textContent = `${Math.floor((performance.now() - round.start) / 1000)}s`;
    }, 250);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { leaving = true; levelMap(); } };
    const focus = () => input.focus({ preventScroll: true });
    addEventListener("keydown", onKey);
    r.addEventListener("pointerdown", focus);
    cleanup = () => { leaving = true; clearInterval(timer); removeEventListener("keydown", onKey); };

    input.addEventListener("focus", () => phrase.classList.remove("idle"));
    input.addEventListener("blur", () => { phrase.classList.add("idle"); if (!leaving && !round.done) setTimeout(focus, 50); });
    focus();

    const press = (c: string) => {
      const before = round.pos;
      const hit = round.key(c, performance.now());
      if (hit === "none") return;
      if (hit === "error") {
        sfx.error(); world.error();
        phrase.classList.remove("err"); void phrase.offsetWidth; phrase.classList.add("err");
      } else {
        chars[before].classList.remove("now");
        chars[before].classList.add("done");
        chars[round.pos]?.classList.add("now");
        sfx.key(round.streak); world.key();
        if (hit === "word" || hit === "done") { sfx.word(); world.word(); }
      }
      meter.style.width = `${(round.pos / round.chars.length) * 100}%`;
      world.progress(round.pos / round.chars.length);
      count.textContent = `${tr("written")}: ${round.pos}/${round.chars.length}`;
      streakEl.hidden = round.streak < 10;
      streakEl.textContent = `🔥 ${tr("streak")} ${round.streak}`;
      if (hit === "done") {
        leaving = true;
        input.blur();
        world.win();
        setTimeout(() => results(l, round), 1000);
      }
    };
    const feed = () => { const v = input.value; input.value = ""; for (const c of v) press(c); };
    input.addEventListener("input", (e) => { if (!(e as InputEvent).isComposing) feed(); });
    input.addEventListener("compositionend", feed);
  });
}

function countUp(el: HTMLElement, to: number, suffix = "", ms = 900) {
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = `${Math.round(to * (1 - (1 - k) ** 3))}${suffix}`;
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function results(l: Level, round: Round) {
  const next = LEVELS[LEVELS.findIndex((x) => x.id === l.id) + 1];
  const nextLevel = next && next.free === l.free ? next : undefined;
  const wasOpen = nextLevel ? store.unlocked(nextLevel.id) : true;
  const acc = Math.round(round.accuracy * 100);
  const prev = store.best(l.id);
  const isBest = store.record(l.id, { stars: round.stars, wpm: round.wpm, acc });
  const miss = Object.fromEntries(Object.entries(round.missedChars).sort((a, b) => b[1] - a[1]).slice(0, 5));
  store.addRun({ id: l.id, ts: Date.now(), stars: round.stars, wpm: round.wpm, acc, errors: round.errors, secs: Math.round(round.seconds), miss });
  const d = prev ? round.wpm - prev.wpm : 0;
  const versus = prev ? (d === 0 ? tr("sameBest") : `${d > 0 ? "+" : ""}${d} ${tr("wpmShort")} ${tr("vsBest")}`) : "";
  const opened = nextLevel && !wasOpen && store.unlocked(nextLevel.id);
  music.mood("menu");
  const msg = round.stars === 3 ? "msg3" : round.stars === 2 ? "msg2" : "msg1";
  const starHtml = [0, 1, 2].map((i) =>
    `<span class="star ${i < round.stars ? "on" : "off"}" style="animation-delay:${0.35 + i * 0.35}s">★</span>`).join("");
  show(`${toolbar()}
    <main class="center">
      <h2>${tr("results")}</h2>
      <div class="big-stars" aria-label="${round.stars}/3">${starHtml}</div>
      <p class="tag pop" style="animation-delay:1.5s">${tr(msg)}</p>
      <dl class="stats">
        <div><dt>${tr("wpm")}</dt><dd data-n="${round.wpm}">0</dd></div>
        <div><dt>${tr("acc")}</dt><dd data-n="${acc}" data-s="%">0</dd></div>
        <div><dt>${tr("errors")}</dt><dd data-n="${round.errors}">0</dd></div>
        <div><dt>${tr("time")}</dt><dd data-n="${Math.round(round.seconds)}" data-s="s">0</dd></div>
      </dl>
      ${versus ? `<p class="hint pop" style="animation-delay:1.6s">${versus}</p>` : ""}
      <div class="practice pop" style="animation-delay:1.7s">${round.missedWords.length
        ? `<span class="hint">${tr("toPractice")}</span><div class="chips">${round.missedWords.map((w) => `<span class="chip">${esc(w)}</span>`).join("")}</div>`
        : `<span class="good">${tr("cleanRun")}</span>`}</div>
      ${isBest ? `<p class="good pop" style="animation-delay:1.8s">${tr("newBest")}</p>` : ""}
      ${opened ? `<p class="good pop" style="animation-delay:1.9s">${tr("unlocked")}</p>` : ""}
      ${!nextLevel && !l.free ? `<p class="good pop" style="animation-delay:1.9s">${tr("allDone")}</p>` : ""}
      <div class="row">
        <button class="btn ghost-b" id="map">${tr("map")}</button>
        <button class="btn ghost-b" id="retry">${tr("retry")}</button>
        ${nextLevel && store.unlocked(nextLevel.id) ? `<button class="btn" id="next" data-focus>${tr("next")}</button>` : ""}
      </div>
    </main>`, (r) => {
    wireToolbar(r, () => results(l, round));
    r.querySelectorAll<HTMLElement>("dd").forEach((d) => countUp(d, +d.dataset.n!, d.dataset.s ?? ""));
    // un "ding" por cada estrella ganada, y fanfarria si son las tres
    const timers: number[] = [];
    for (let i = 0; i < round.stars; i++) timers.push(window.setTimeout(() => sfx.star(i), 350 + i * 350 + 200));
    if (round.stars === 3) timers.push(window.setTimeout(sfx.fanfare, 1600));
    cleanup = () => timers.forEach(clearTimeout);
    on(r, "#map", () => { tab = l.diff; levelMap(); });
    on(r, "#retry", () => play(l));
    on(r, "#next", () => { tab = nextLevel!.diff; info(nextLevel!); });
  });
}

export function start(w: World) {
  world = w;
  document.documentElement.lang = store.lang;
  setMuted(store.muted);
  home();
}
