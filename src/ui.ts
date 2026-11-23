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
    on(r, "#play", () => { unlockAudio(); if (!store.muted) music.start(); profile(); });
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
  const text = l.text[store.lang];
  const round = new Round(text.split(" "));
  show(`<main class="play">
      <header class="bar"><h3>${tr("level")} ${l.n} · ${tr(l.diff)}</h3><span class="clock" id="clock">0s</span></header>
      <div class="phrase" id="phrase" aria-live="off"></div>
      <input id="in" class="field big-field" data-focus autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${tr("typeHere")}" aria-label="${tr("typeHere")}" />
      <p class="hint" id="count"></p>
    </main>`, (r) => {
    const phrase = r.querySelector<HTMLElement>("#phrase")!;
    const input = r.querySelector<HTMLInputElement>("#in")!;
    const clock = r.querySelector<HTMLElement>("#clock")!;
    const count = r.querySelector<HTMLElement>("#count")!;
    const draw = () => {
      phrase.innerHTML = round.words.map((w, i) =>
        `<span class="${i < round.idx ? "w-done" : i === round.idx ? "w-now" : "w-todo"}">${esc(w)}</span>`).join(" ");
      count.textContent = `${tr("written")}: ${round.idx}/${round.words.length}`;
      world.progress(round.idx / round.words.length);
    };
    draw();
    const timer = window.setInterval(() => {
      if (round.start && !round.done) clock.textContent = `${Math.floor((performance.now() - round.start) / 1000)}s`;
    }, 250);
    const esc_ = (e: KeyboardEvent) => { if (e.key === "Escape") levelMap(); };
    addEventListener("keydown", esc_);
    cleanup = () => { clearInterval(timer); removeEventListener("keydown", esc_); };

    input.addEventListener("input", () => {
      const hit = round.type(input.value.trimEnd(), performance.now());
      if (hit === "ok") sfx.key();
      else if (hit === "error") { sfx.error(); world.error(); input.classList.add("bad"); }
      if (hit !== "error" && hit !== "none") input.classList.remove("bad");
      if (hit === "word" || hit === "done") { sfx.word(); world.word(); input.value = ""; draw(); }
      if (hit === "done") {
        input.disabled = true;
        world.win();
        setTimeout(() => results(l, round), 900);
      }
    });
  });
}

function results(l: Level, round: Round) {
  const nextLevel = LEVELS[LEVELS.findIndex((x) => x.id === l.id) + 1];
  const wasOpen = nextLevel ? store.unlocked(nextLevel.id) : true;
  const isBest = store.record(l.id, { stars: round.stars, wpm: round.wpm, acc: Math.round(round.accuracy * 100) });
  const opened = nextLevel && !wasOpen && store.unlocked(nextLevel.id);
  sfx.win(round.stars);
  const msg = round.stars === 3 ? "msg3" : round.stars === 2 ? "msg2" : "msg1";
  show(`${toolbar()}
    <main class="center">
      <h2>${tr("results")}</h2>
      <div class="big-stars" aria-label="${round.stars}/3">${stars(round.stars)}</div>
      <p class="tag">${tr(msg)}</p>
      <dl class="stats">
        <div><dt>${tr("wpm")}</dt><dd>${round.wpm}</dd></div>
        <div><dt>${tr("acc")}</dt><dd>${Math.round(round.accuracy * 100)}%</dd></div>
        <div><dt>${tr("errors")}</dt><dd>${round.errors}</dd></div>
        <div><dt>${tr("time")}</dt><dd>${Math.round(round.seconds)}s</dd></div>
      </dl>
      ${isBest ? `<p class="good">${tr("newBest")}</p>` : ""}
      ${opened ? `<p class="good">${tr("unlocked")}</p>` : ""}
      ${!nextLevel ? `<p class="good">${tr("allDone")}</p>` : ""}
      <div class="row">
        <button class="btn ghost-b" id="map">${tr("map")}</button>
        <button class="btn ghost-b" id="retry">${tr("retry")}</button>
        ${nextLevel && store.unlocked(nextLevel.id) ? `<button class="btn" id="next" data-focus>${tr("next")}</button>` : ""}
      </div>
    </main>`, (r) => {
    wireToolbar(r, () => results(l, round));
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
