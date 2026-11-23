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
      <div class="tabs" role="tablist">${DIFFS.map((d) => `<button role="tab" class="tab" aria-selected="${d === tab}" data-d="${d}">${tr(d)}</button>`).join("")}</div>
      <div class="grid">${LEVELS.filter((l) => l.diff === tab).map((l) => {
        const open = store.unlocked(l.id), b = store.best(l.id);
        return `<button class="lvl ${open ? "open" : "closed"}" data-id="${l.id}" ${open ? "" : "disabled"} aria-label="${tr("level")} ${l.n}, ${open ? tr("open") : tr("locked")}">
          <i>${open ? "🎮" : "🚫"}</i><b>${tr("level")} ${l.n}</b><span class="st">${b ? stars(b.stars) : ""}</span></button>`;
      }).join("")}</div>
      <button class="ghost" id="back">${tr("back")}</button>
    </main>`, (r) => {
    wireToolbar(r, levelMap);
    on(r, "#back", profile);
    r.querySelectorAll<HTMLElement>(".tab").forEach((b) => b.addEventListener("click", () => { sfx.click(); tab = b.dataset.d as Diff; levelMap(); }));
    r.querySelectorAll<HTMLElement>(".lvl.open").forEach((b) => b.addEventListener("click", () => { sfx.click(); info(LEVELS.find((l) => l.id === +b.dataset.id!)!); }));
  });
}

function info(l: Level) {
  const b = store.best(l.id);
  show(`${toolbar()}
    <main class="center">
      <h2>${tr("level")} ${l.n} · ${tr(l.diff)}</h2>
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
      <header class="bar"><h3>${tr("level")} ${l.n} · ${tr(l.diff)}</h3><span class="streak" id="streak" hidden></span><span class="clock" id="clock">0s</span></header>
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
  const nextLevel = LEVELS[LEVELS.findIndex((x) => x.id === l.id) + 1];
  const wasOpen = nextLevel ? store.unlocked(nextLevel.id) : true;
  const acc = Math.round(round.accuracy * 100);
  const isBest = store.record(l.id, { stars: round.stars, wpm: round.wpm, acc });
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
      ${isBest ? `<p class="good pop" style="animation-delay:1.7s">${tr("newBest")}</p>` : ""}
      ${opened ? `<p class="good pop" style="animation-delay:1.9s">${tr("unlocked")}</p>` : ""}
      ${!nextLevel ? `<p class="good pop" style="animation-delay:1.9s">${tr("allDone")}</p>` : ""}
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
