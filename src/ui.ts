import { DIFFS, LEVELS, factoryLevels, type CustomLevel, type Diff, type Level } from "./content";
import { openHub, setWorldTab } from "./hub";
import { Round, starsFor, summarize, type Summary } from "./engine";
import { dailyLevels, dateKey, endlessTexts } from "./modes";
import { device, deviceLabel, physicalKeys } from "./device";
import { ic } from "./icons";
import { comboCoins, comboTier, coinsFor } from "./cosmetics";
import { compareScore, decode, encode, verdict, type Challenge } from "./challenge";
import { highlightKey, keyboardHtml } from "./keys";
import { adminLogin, adminLogout, custom, isAdmin, saveLevels } from "./remote";
import { syncPush } from "./push";
import { fetchBoard, forget, idOf, submit, type Place } from "./online";
import { t, type Key } from "./i18n";
import { channel, versionText } from "./version";
import { store } from "./store";
import { music, setMusicOn, setMuted, sfx, unlockAudio } from "./audio";
import type { createScene } from "./scene";

type World = ReturnType<typeof createScene>;
const app = document.getElementById("app")!;
let world: World;
let cleanup: (() => void) | null = null;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const tr = (k: Key) => t(store.lang, k);
let pending: Challenge | null = null; // reto recibido por enlace
const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
let runCombo = { coins: 0, max: 0, words: 0 }; // lo que dejó el combo en la última partida
const DAILY_ID = 900, TIME_ID = 901; // partidas que no son un nivel
export const lvlName = (l: Level) => l.title?.[store.lang] ?? `${tr("level")} ${l.n}`;
const levelMap = () => openHub(); // el menú principal vive en src/hub.ts
export const getWorld = () => world;
export const setMood = (m: Parameters<typeof music.mood>[0]) => music.mood(m);
export const onLeave = (fn: () => void) => { cleanup = fn; };
const stars = (n: number, total = 3) => "★".repeat(n) + `<span class="off">${"★".repeat(total - n)}</span>`;

/** Verdadero cuando la pantalla se vuelve a dibujar por un cambio en ella misma (idioma, pestaña...): sin animación de entrada y sin perder el desplazamiento ni el foco. */
let soft = false;
const again = <T,>(fn: () => T): T => { soft = true; return fn(); };

export function show(html: string, onMount?: (root: HTMLElement) => void, bare = false) {
  const keep = soft, top = app.scrollTop, focused = keep ? (document.activeElement as HTMLElement | null) : null;
  const focusSel = focused?.id ? `#${focused.id}` : focused?.dataset?.b ? `[data-b="${focused.dataset.b}"]` : focused?.dataset?.s ? `[data-s="${focused.dataset.s}"]` : focused?.dataset?.act ? `[data-act="${focused.dataset.act}"]` : "";
  soft = false;
  if (!keep) world.dress(store.worn);
  cleanup?.();
  cleanup = null;
  app.innerHTML = `<div class="screen${keep ? " still" : ""}${bare ? " bare" : ""}">${html}</div>`;
  const root = app.firstElementChild as HTMLElement;
  if (keep) { app.scrollTop = top; if (focusSel) root.querySelector<HTMLElement>(focusSel)?.focus({ preventScroll: true }); }
  else root.querySelector<HTMLElement>("[data-focus]")?.focus();
  onMount?.(root);
}


/** Actualiza los botones de la barra de arriba sin volver a dibujar la pantalla. */
function syncToolbar(root: HTMLElement) {
  root.querySelector('[data-act="music"]')?.setAttribute("aria-pressed", String(store.music));
  const snd = root.querySelector('[data-act="sound"]');
  if (snd) { snd.setAttribute("aria-pressed", String(!store.muted)); snd.innerHTML = ic(store.muted ? "mute" : "sound"); }
}
const on = (root: HTMLElement, sel: string, fn: () => void) =>
  root.querySelector(sel)?.addEventListener("click", () => { sfx.click(); fn(); });

const toolbar = () => `
  <div class="toolbar">
    <button class="ghost" data-act="lang" aria-label="${tr("lang")}">${store.lang === "es" ? "EN" : "ES"}</button>
    <button class="ghost" data-act="music" aria-label="${tr("music")}" aria-pressed="${store.music}">${ic("music")}</button>
    <button class="ghost" data-act="sound" aria-label="${tr("sound")}" aria-pressed="${!store.muted}">${ic(store.muted ? "mute" : "sound")}</button>
  </div>`;

/** Encabezado común: volver, título y algo a la derecha (monedas, jugador...). */
const topbar = (title: string, right = "", back = true) =>
  `<header class="top">${back ? `<button class="back" id="back" aria-label="${tr("back")}">←</button>` : ""}<h2>${title}</h2><span class="right">${right}</span></header>`;

/** Error: viñeta roja en los bordes, sacudida de la pantalla de juego y, si había combo, cartel de "combo perdido". Vive fuera de #app. */
function errorFx(lostCombo: number) {
  const el = document.getElementById("errfx") ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: "errfx", ariaHidden: "true" }));
  el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  const play = document.querySelector<HTMLElement>(".play");
  if (play) { play.classList.remove("jolt"); void play.offsetWidth; play.classList.add("jolt"); }
  if (lostCombo >= 1) { // cualquier racha de palabras limpias que se rompe avisa
    const t = document.createElement("div");
    t.className = "lostfx"; t.innerHTML = `${ic("combo")} ${tr("combo")} x${comboTier(lostCombo)} ✕ <small>${lostCombo} ${tr("cleanWords")}</small>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1100);
  }
}

/** Aviso breve abajo de la pantalla. Vive fuera de #app para sobrevivir al cambio de pantalla. */
let toastTimer = 0;
export function toast(html: string) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.innerHTML = html;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove("show"), 2600);
}

function wireToolbar(root: HTMLElement, rerender: () => void) {
  root.querySelector('[data-act="lang"]')?.addEventListener("click", () => {
    store.lang = store.lang === "es" ? "en" : "es";
    document.documentElement.lang = store.lang;
    again(rerender); // cambian todos los textos: se redibuja, pero sin animación de entrada
  });
  root.querySelector('[data-act="music"]')?.addEventListener("click", () => {
    store.music = !store.music;
    setMusicOn(store.music);
    unlockAudio(); music.start();
    syncToolbar(root);
  });
  root.querySelector('[data-act="sound"]')?.addEventListener("click", () => {
    store.muted = !store.muted;
    setMuted(store.muted);
    unlockAudio(); music.start();
    syncToolbar(root);
  });
}

// Instalar como app: Chrome/Edge avisan con un evento; en iPhone y iPad hay que hacerlo desde el menú Compartir.
let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e as typeof installEvt; renderInstall(); });
addEventListener("appinstalled", () => { installEvt = null; renderInstall(); });

export const canInstall = () => !device.standalone && (!!installEvt || (device.os === "ios" && device.touch));
/** Abre el aviso de instalación si el navegador lo permite; false = hay que hacerlo a mano (iPhone, iPad). */
export async function install() { if (!installEvt) return false; await installEvt.prompt(); installEvt = null; return true; }

function renderInstall() {
  const slot = document.getElementById("installslot");
  if (!slot || device.standalone) { if (slot) slot.innerHTML = ""; return; }
  if (!installEvt && !(device.os === "ios" && device.touch)) { slot.innerHTML = ""; return; }
  slot.innerHTML = `<button class="ghost" id="install">${ic("phone")} ${tr("install")}</button><p class="hint" id="installhint" hidden>${tr("installIos")}</p>`;
  slot.querySelector("#install")!.addEventListener("click", async () => {
    sfx.click();
    if (installEvt) { await installEvt.prompt(); installEvt = null; renderInstall(); }
    else slot.querySelector<HTMLElement>("#installhint")!.hidden = false;
  });
}

export function home() {
  music.mood("menu");
  world.theme("menu");
  world.mode("menu");
  show(`${toolbar()}
    <main class="center plain">
      <h1 class="logo">VECTORCITOS<span>RUN<i class="cursor"></i></span></h1>
      <p class="tag">${tr("tagline")}</p>
      ${store.current ? `<div class="whochip">${esc(store.current)} · ${ic("coin")} ${store.coinsText}${store.dailyStreak ? ` · ${ic("fire")} ${store.dailyStreak}` : ""}</div>` : ""}
      ${pending ? `<div class="banner">${ic("challenge")} <b>${esc(pending.nick)}</b> ${tr("challengeBy")} ${esc(pending.kind === "time" ? tr("timeAttack") : lvlName(LEVELS.find((l) => l.id === pending!.id)!))}: ${pending.wpm} ${tr("wpmShort")} · ${pending.acc}%</div>` : ""}
      <button class="btn big" id="play" data-focus>${pending ? tr("acceptChallenge") : tr("play")}</button>
      <div id="installslot" class="installslot"></div>
      <div class="row">
        ${store.current ? `<button class="ghost" id="switch">${tr("switchPlayer")}</button>` : ""}
        <button class="ghost" id="box">${ic("box")} ${tr("box")}</button>
      </div>
      <span class="ver" data-channel="${channel}" title="${tr("version")}">${versionText}</span>
    </main>`, (r) => {
    wireToolbar(r, home);
    on(r, "#box", () => suggest(home));
    on(r, "#switch", profile);
    renderInstall();
    on(r, "#play", () => {
      unlockAudio(); music.start();
      if (!store.current) return profile();
      const after = pending ? startChallenge : levelMap;
      if (store.guideSeen) after(); else guide(after);
    });
  });
}

export function profile() {
  world.theme("menu"); world.mode("menu");
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
    const go = (n: string) => { store.login(n); const after = pending ? startChallenge : levelMap; if (store.guideSeen) after(); else guide(after); };
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

export function guide(next: () => void) {
  world.theme("menu"); world.mode("menu");
  show(`${toolbar()}
    <main class="wide">
      ${topbar(`${ic("hands")} ${tr("guide")}`, "", false)}
      <section class="panel">
        ${device.kind !== "desktop" ? `<p class="deviceTip">${ic(device.kind === "phone" ? "phone" : "kbd")} ${tr(device.kind === "phone" ? "guidePhone" : "guideTablet")}</p>` : ""}
        <figure class="hands"><img src="/brand/manos.webp" width="1200" height="672" alt="${esc(tr("guideImgAlt"))}" /><figcaption>${tr("guideCaption")}</figcaption></figure>
        <div class="guidekbd">${keyboardHtml(store.lang)}</div>
        <p class="tips">${tr("guideTips")}</p>
      </section>
      <button class="btn" id="ok" data-focus style="align-self:center">${tr("guideOk")}</button>
    </main>`, (r) => {
    wireToolbar(r, () => guide(next));
    on(r, "#ok", () => { store.markGuide(); next(); });
  });
}



function startChallenge() {
  const c = pending;
  pending = null;
  if (!c) return levelMap();
  if (c.kind === "time") return playTime(c);
  play(LEVELS.find((l) => l.id === c.id)!, c);
}





/** Una carrera: una o varias frases seguidas, con cuenta regresiva y, si se pide, límite de tiempo. */
interface RunCfg {
  diff: Diff;
  title: string;
  next: () => string | undefined; // siguiente frase; undefined = no hay más
  total?: number; // cuántas frases tendrá (para la barra y el contador)
  limit?: number; // segundos de cuenta atrás (contrarreloj)
  finish: (rounds: Round[]) => void;
  back: () => void;
}

function run(cfg: RunCfg) {
  world.theme(cfg.diff);
  world.mode("play");
  world.layout(store.help && physicalKeys());
  music.mood(cfg.diff);
  show(`<main class="play">
      <header class="bar"><h3>${esc(cfg.title)}</h3><span class="streak" id="streak" hidden></span>${physicalKeys() ? `<button class="ghost" id="helpbtn" aria-pressed="${store.help}" aria-label="${tr("help")}" title="${tr("help")}">${ic("kbd")}</button>` : ""}<span class="clock" id="clock">${cfg.limit ?? 0}s</span><button class="ghost exit" id="exitbtn" aria-label="${tr("exitGame")}" title="${tr("exitGame")}">✕</button></header>
      <div class="phrase idle" id="phrase"><div id="text"></div><span class="tap" id="tap">${tr(device.touch ? "tapHintTouch" : "tapHint")}</span><span class="cd" id="cd" aria-live="assertive"></span></div>
      <div class="meter" aria-hidden="true"><i id="meter"></i></div>
      <p class="hint" id="count"></p>
      <div id="kbdbox">${store.help && physicalKeys() ? keyboardHtml(store.lang) : ""}</div>
      <input id="in" class="ghost-input" aria-label="${tr("typeHint")}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" enterkeyhint="done" />
      <div class="rotate" aria-hidden="true">${ic("phone")} ${tr("rotate")}</div>
    </main>`, (r) => {
    const $ = <T extends HTMLElement>(id: string) => r.querySelector<T>(`#${id}`)!;
    const phrase = $("phrase"), input = $<HTMLInputElement>("in"), clock = $("clock"), count = $("count");
    const meter = $("meter"), streakEl = $("streak"), textEl = $("text"), cd = $("cd");
    const kbdbox = $("kbdbox");
    const rounds: Round[] = [];
    let cur!: Round;
    let chars: HTMLElement[] = [];
    let ready = false, over = false, leaving = false, streak = 0, t0 = 0;
    let wordsInRow = 0, wordDirty = false, comboCoinsGot = 0, comboMax = 1, comboWords = 0;
    runCombo = { coins: 0, max: 1, words: 0 };
    const timers: number[] = [];

    const load = (text: string) => {
      cur = new Round(text);
      rounds.push(cur);
      // Las palabras no se parten al saltar de línea; los espacios son letras más.
      textEl.innerHTML = text.split(" ").map((w) =>
        `<span class="wd">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join("")}</span>`).join('<span class="ch sp"> </span>');
      chars = [...textEl.querySelectorAll<HTMLElement>(".ch")];
      chars[0].classList.add("now");
      phrase.setAttribute("aria-label", text);
      highlightKey(kbdbox, cur.current, store.lang);
    };
    load(cfg.next()!);

    const label = () => cfg.total
      ? `${tr("phrases")}: ${Math.min(rounds.length, cfg.total)}/${cfg.total} · ${tr("written")}: ${cur.pos}/${cur.chars.length}`
      : cfg.limit ? `${tr("phrases")}: ${rounds.filter((x) => x.done).length}` : `${tr("written")}: ${cur.pos}/${cur.chars.length}`;
    const refresh = () => {
      const done = rounds.filter((x) => x.done).length;
      if (!cfg.limit) meter.style.width = `${((done + (cur.done ? 0 : cur.pos / cur.chars.length)) / (cfg.total ?? 1)) * 100}%`;
      world.progress(cfg.limit ? Math.min(1, streak / 40) : (done + cur.pos / cur.chars.length) / (cfg.total ?? 1));
      count.textContent = label();
      const tier = comboTier(wordsInRow);
      streakEl.hidden = wordsInRow < 1;
      streakEl.dataset.tier = String(tier);
      streakEl.innerHTML = `${ic("combo")} <span class="lbl">${tr("combo")}</span> x${tier} <small>+${comboCoinsGot} ${ic("coin")}</small>`;
    };
    refresh();

    const end = (complete: boolean) => {
      if (over) return;
      over = true; leaving = true;
      runCombo = { coins: comboCoinsGot, max: comboMax, words: comboWords };
      input.blur();
      if (complete) world.win(); else sfx.click();
      timers.push(window.setTimeout(() => cfg.finish(rounds.filter((x) => x.pos > 0)), complete ? 1000 : 500));
    };

    // cuenta regresiva: 3, 2, 1, ¡YA!
    [..."321", tr("go")].forEach((step, i) => timers.push(window.setTimeout(() => {
      cd.textContent = step;
      cd.classList.remove("hit"); void cd.offsetWidth; cd.classList.add("hit");
      if (i < 3) sfx.tick(i); else { sfx.go(); ready = true; t0 = performance.now(); }
    }, i * 800)));
    timers.push(window.setTimeout(() => { cd.textContent = ""; }, 3 * 800 + 600));

    timers.push(window.setInterval(() => {
      if (!ready || over) return;
      if (cfg.limit) {
        const left = cfg.limit - (performance.now() - t0) / 1000;
        clock.textContent = `${Math.max(0, Math.ceil(left))}s`;
        meter.style.width = `${Math.max(0, left / cfg.limit) * 100}%`;
        if (left <= 0) end(false);
      } else if (rounds[0].start) clock.textContent = `${Math.floor((performance.now() - rounds[0].start) / 1000)}s`;
    }, 200));

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { leaving = true; cfg.back(); } };
    const focus = () => input.focus({ preventScroll: true });
    addEventListener("keydown", onKey);
    r.addEventListener("pointerdown", focus);
    cleanup = () => { leaving = true; timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); removeEventListener("keydown", onKey); };

    const helpBtn = r.querySelector<HTMLElement>("#helpbtn");
    helpBtn?.addEventListener("click", () => {
      store.help = !store.help;
      helpBtn.setAttribute("aria-pressed", String(store.help));
      kbdbox.innerHTML = store.help ? keyboardHtml(store.lang) : "";
      world.layout(store.help);
      highlightKey(kbdbox, cur.current, store.lang);
      focus();
    });
    $("exitbtn").addEventListener("click", () => { leaving = true; cfg.back(); });
    input.addEventListener("focus", () => phrase.classList.remove("idle"));
    input.addEventListener("blur", () => { phrase.classList.add("idle"); if (!leaving && !over) setTimeout(focus, 50); });
    focus();

    const press = (c: string) => {
      if (!ready || over) return;
      const before = cur.pos;
      const hit = cur.key(c, performance.now());
      if (hit === "none") return;
      if (hit === "error") {
        streak = 0; wordDirty = true;
        errorFx(wordsInRow);
        if (wordsInRow >= 3) { sfx.error(); streakEl.classList.remove("lost"); void streakEl.offsetWidth; streakEl.classList.add("lost"); }
        wordsInRow = 0;
        sfx.error(); world.error();
        if (device.touch && !store.muted) navigator.vibrate?.(25);
        phrase.classList.remove("err"); void phrase.offsetWidth; phrase.classList.add("err");
      } else {
        streak++;
        chars[before].classList.remove("now");
        chars[before].classList.add("done");
        chars[cur.pos]?.classList.add("now");
        highlightKey(kbdbox, cur.current, store.lang);
        sfx.key(streak); world.key();
        if (hit === "word" || hit === "done") {
          sfx.word(); world.word();
          if (!wordDirty) { // palabra limpia: suma al combo y da monedas
            const before = comboTier(wordsInRow);
            wordsInRow++; comboWords++;
            const n = comboCoins(wordsInRow);
            comboCoinsGot += n;
            const tier = comboTier(wordsInRow);
            comboMax = Math.max(comboMax, tier);
            if (tier > before) { sfx.star(tier - 1); world.win(); toast(`${ic("combo")} ${tr("combo")} x${tier}!`); }
            streakEl.classList.remove("bump"); void streakEl.offsetWidth; streakEl.classList.add("bump");
          }
          wordDirty = false;
        }
        if (hit === "done") {
          const text = cfg.next();
          if (text === undefined) { refresh(); return end(true); }
          load(text);
        }
      }
      refresh();
    };
    // En computador se espera a que termine cada composición (así las tildes con tecla muerta funcionan).
    // En pantalla táctil los teclados mantienen la palabra "en composición" mientras se escribe, así que
    // se leen las letras nuevas a medida que llegan y se limpia el campo al cerrar la composición.
    let prev = "";
    const drain = (final: boolean) => {
      const v = input.value;
      if (device.touch) {
        if (v.startsWith(prev)) for (const c of v.slice(prev.length)) press(c); // si no, el teclado cambió la palabra o borró: solo se re-sincroniza
        prev = v;
        if (final) { input.value = ""; prev = ""; }
      } else if (final) {
        input.value = "";
        for (const c of v) press(c);
      }
    };
    input.addEventListener("input", (e) => drain(!(e as InputEvent).isComposing));
    input.addEventListener("compositionend", () => drain(true));
  });
}

const once = (text: string) => { let used = false; return () => (used ? undefined : ((used = true), text)); };

export function play(l: Level, vs?: Challenge) {
  run({
    diff: l.diff, title: `${lvlName(l)} · ${tr(l.diff)}`, next: once(l.text[store.lang]),
    finish: ([round]) => results({ kind: "level", level: l, title: lvlName(l), sum: summarize([round], round.seconds), secs: round.seconds, retry: () => play(l, vs), vs }),
    back: levelMap,
  });
}

export function playDaily() {
  const texts = dailyLevels(dateKey()).map((l) => l.text[store.lang]);
  let i = 0;
  run({
    diff: "medium", title: tr("daily"), total: texts.length, next: () => texts[i++],
    finish: (rounds) => {
      const secs = rounds.reduce((n, x) => n + x.seconds, 0);
      results({ kind: "daily", title: tr("daily"), sum: summarize(rounds, secs), secs, retry: playDaily });
    },
    back: levelMap,
  });
}

const TIME_LIMIT = 60;
export function playTime(vs?: Challenge) {
  run({
    diff: "hard", title: tr("timeAttack"), limit: TIME_LIMIT, next: endlessTexts(store.lang),
    finish: (rounds) => results({ kind: "time", title: tr("timeAttack"), sum: summarize(rounds, TIME_LIMIT), secs: TIME_LIMIT, retry: () => playTime(vs), vs }),
    back: levelMap,
  });
}





const pushStatus = () => ({ lang: store.lang, last: store.daily.last, streak: store.dailyStreak });

function countUp(el: HTMLElement, to: number, suffix = "", ms = 900) {
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = `${Math.round(to * (1 - (1 - k) ** 3))}${suffix}`;
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

interface Outcome { kind: "level" | "daily" | "time"; level?: Level; title: string; sum: Summary; secs: number; retry: () => void; vs?: Challenge }

function results(o: Outcome) {
  const { sum, level: l } = o;
  const acc = Math.round(sum.acc * 100);
  const stars = starsFor(sum.acc);
  const score = Math.max(0, sum.firstTry * 10 - sum.errors * 5);
  const miss = Object.fromEntries(Object.entries(sum.missedChars).sort((a, b) => b[1] - a[1]).slice(0, 5));
  const run = { stars, wpm: sum.wpm, acc, errors: sum.errors, secs: Math.round(o.secs), miss, ts: Date.now() };

  // Se guarda el resultado y se prepara lo que cambia según el tipo de partida.
  let isBest = false, opened = false, versus = "", streakMsg = "";
  let nextLevel: Level | undefined;
  let newStars = 0;
  if (o.kind === "level" && l) {
    const next = LEVELS[LEVELS.findIndex((x) => x.id === l.id) + 1];
    nextLevel = next && next.free === l.free ? next : undefined;
    const wasOpen = nextLevel ? store.unlocked(nextLevel.id) : true;
    const prev = store.best(l.id);
    newStars = Math.max(0, stars - (prev?.stars ?? 0));
    isBest = store.record(l.id, { stars, wpm: sum.wpm, acc });
    opened = !!nextLevel && !wasOpen && store.unlocked(nextLevel.id);
    const d = prev ? sum.wpm - prev.wpm : 0;
    versus = prev ? (d === 0 ? tr("sameBest") : `${d > 0 ? "+" : ""}${d} ${tr("wpmShort")} ${tr("vsBest")}`) : "";
    store.addRun({ id: l.id, ...run });
  } else if (o.kind === "daily") {
    store.recordDaily(dateKey(), { stars, wpm: sum.wpm, acc });
    streakMsg = `${ic("fire")} ${store.dailyStreak} ${tr("dayStreak")}`;
    void syncPush(pushStatus());
    store.addRun({ id: DAILY_ID, ...run });
  } else {
    isBest = store.recordTime(score);
    store.addRun({ id: TIME_ID, ...run });
  }

  // la música del nivel sigue sonando en los resultados
  // Comparación con el amigo que envió el reto (si lo hay)
  const mine = compareScore(o.kind === "time" ? "time" : "level", sum.wpm, acc, score);
  const duel = o.vs ? fmt(tr(verdict(mine, o.vs.score) === "win" ? "youWin" : verdict(mine, o.vs.score) === "lose" ? "youLose" : "youTie"), { nick: o.vs.nick, a: mine, b: o.vs.score }) : "";
  const base = coinsFor({ kind: o.kind, stars, wpm: sum.wpm, score, isBest, newStars });
  const bonus = runCombo.coins;
  const coins = base + bonus;
  store.addCoins(coins);
  const tiles: [Key, number, string][] = o.kind === "time"
    ? [["score", score, ""], ["wpm", sum.wpm, ""], ["acc", acc, "%"], ["phrases", sum.phrases, ""]]
    : [["wpm", sum.wpm, ""], ["acc", acc, "%"], ["errors", sum.errors, ""], ["time", Math.round(o.secs), "s"]];
  const msg = stars === 3 ? "msg3" : stars === 2 ? "msg2" : "msg1";
  const starHtml = [0, 1, 2].map((i) =>
    `<span class="star ${i < stars ? "on" : "off"}" style="animation-delay:${0.35 + i * 0.35}s">★</span>`).join("");
  show(`${toolbar()}
    <main class="center">
      <h2>${esc(o.title)}</h2>
      <div class="big-stars" aria-label="${stars}/3">${starHtml}</div>
      <p class="tag pop" style="animation-delay:1.5s">${tr(msg)}</p>
      <dl class="stats">${tiles.map(([k, n, suf]) => `<div><dt>${tr(k)}</dt><dd data-n="${n}" data-s="${suf}">0</dd></div>`).join("")}</dl>
      ${duel ? `<p class="duel pop" style="animation-delay:1.5s">${verdict(mine, o.vs!.score) === "win" ? ic("win") + " " : ""}${esc(duel)}</p>` : ""}
      <p class="good pop" style="animation-delay:1.55s">+${coins} ${ic("coin")} ${tr("coinsEarned")}</p>
      ${runCombo.words ? `<p class="combo-res pop" style="animation-delay:1.6s">${ic("combo")} ${tr("combo")} x${runCombo.max} · ${runCombo.words} ${tr("cleanWords")} · +${bonus} ${ic("coin")}</p>` : ""}
      ${newStars ? `<p class="hint pop" style="animation-delay:1.62s">+${newStars * 10} ${ic("coin")} ${tr("newStarsBonus")} (+${newStars} ★)</p>` : ""}
      ${versus ? `<p class="hint pop" style="animation-delay:1.6s">${versus}</p>` : ""}
      ${streakMsg ? `<p class="good pop" style="animation-delay:1.6s">${streakMsg}</p>` : ""}
      <p class="hint" id="rankline" aria-live="polite"></p>
      <div class="practice pop" style="animation-delay:1.7s">${sum.missedWords.length
        ? `<span class="hint">${tr("toPractice")}</span><div class="chips">${sum.missedWords.slice(0, 12).map((w) => `<span class="chip">${esc(w)}</span>`).join("")}</div>`
        : `<span class="good">${tr("cleanRun")}</span>`}</div>
      ${isBest ? `<p class="good pop" style="animation-delay:1.8s">${tr("newBest")}</p>` : ""}
      ${opened ? `<p class="good pop" style="animation-delay:1.9s">${tr("unlocked")}</p>` : ""}
      ${o.kind === "level" && !nextLevel && l && !l.free ? `<p class="good pop" style="animation-delay:1.9s">${tr("allDone")}</p>` : ""}
      <p class="hint" id="sharenote" role="status"></p>
      <div class="row">
        <button class="btn ghost-b" id="map">${tr("map")}</button>
        <button class="btn ghost-b" id="retry">${tr("retry")}</button>
        ${o.kind !== "daily" ? `<button class="btn ghost-b" id="share">${ic("challenge")} ${tr("challengeFriend")}</button>` : ""}
        ${nextLevel && store.unlocked(nextLevel.id) ? `<button class="btn" id="next" data-focus>${tr("next")}</button>` : ""}
      </div>
    </main>`, (r) => {
    wireToolbar(r, () => results(o));
    r.querySelectorAll<HTMLElement>("dd").forEach((d) => countUp(d, +d.dataset.n!, d.dataset.s ?? ""));
    // un "ding" por cada estrella ganada, y fanfarria si son las tres
    const timers: number[] = [];
    for (let i = 0; i < stars; i++) timers.push(window.setTimeout(() => sfx.star(i), 350 + i * 350 + 200));
    if (stars === 3) timers.push(window.setTimeout(sfx.fanfare, 1600));
    cleanup = () => timers.forEach(clearTimeout);
    // Ranking en línea (si el jugador lo activó): se envía la marca y se muestra el puesto.
    if (o.kind !== "level") {
      const line = r.querySelector<HTMLElement>("#rankline")!;
      const text = (name: string, p: Place | null | undefined) => (p?.rank ? `${name}: ${tr("place")} ${p.rank} ${tr("of")} ${p.total}` : "");
      void submit(o.kind, o.kind === "daily" ? Math.round((sum.wpm * acc) / 100) : score, sum.wpm, acc, stars).then((res) => {
        if (res && line.isConnected) line.innerHTML = `${ic("rank")} ${[text(tr("world"), res.global), text(`${tr("room")} ${store.online.room}`, res.room)].filter(Boolean).join(" · ")}`;
      });
    }
    on(r, "#map", () => { if (l) setWorldTab(l.diff); openHub("play"); });
    on(r, "#retry", o.retry);
    on(r, "#share", async () => {
      const note = r.querySelector<HTMLElement>("#sharenote")!;
      const url = encode({ kind: o.kind === "time" ? "time" : "level", id: l?.id ?? 0, nick: store.current, wpm: sum.wpm, acc, score: mine }, location.origin);
      try {
        if (navigator.share) { await navigator.share({ title: "Vectorcitos Run", text: `${tr("shareText")} ${mine}`, url }); return; }
        await navigator.clipboard.writeText(url);
        note.textContent = tr("linkCopied");
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // la persona cerró el menú de compartir
        // Sin portapapeles ni menú de compartir: se muestra el enlace para copiarlo a mano.
        note.innerHTML = `${tr("linkCopied")}<br><input class="field" readonly value="${esc(url)}" aria-label="link">`;
        note.querySelector("input")!.addEventListener("focus", (ev) => (ev.target as HTMLInputElement).select());
      }
    });
    on(r, "#next", () => { sfx.click(); play(nextLevel!); });
  });
}

export function ranking(board: "daily" | "time", scope: "world" | "room") {
  world.theme("menu"); world.mode("menu");
  const o = store.online;
  if (scope === "room" && !o.room) scope = "world";
  show(`${toolbar()}
    <main class="wide">
      ${topbar(`${ic("rank")} ${tr("ranking")}`, esc(store.current))}
      <section class="panel">
        <label class="check"><input type="checkbox" id="on" ${o.on ? "checked" : ""}> ${tr("appearAs")} <b>${esc(store.current)}</b></label>
        <form id="rf" class="row-form">
          <input id="room" class="field" maxlength="12" value="${esc(o.room)}" placeholder="${tr("roomLabel")}" aria-label="${tr("roomLabel")}" autocomplete="off" />
          <button class="btn" type="submit">${tr("save")}</button>
        </form>
        <p class="hint">${tr("roomHint")}</p>
        <p class="hint">${tr("rankPrivacy")}</p>
      </section>
      <div class="tabs">
        <button class="tab" data-b="daily" aria-selected="${board === "daily"}">${ic("daily")} ${tr("rankDaily")}</button>
        <button class="tab" data-b="time" aria-selected="${board === "time"}">${ic("time")} ${tr("timeAttack")}</button>
        <span class="gap"></span>
        <button class="tab" data-s="world" aria-selected="${scope === "world"}">${ic("world")} ${tr("scopeWorld")}</button>
        ${o.room ? `<button class="tab" data-s="room" aria-selected="${scope === "room"}">${ic("room")} ${esc(o.room)}</button>` : ""}
      </div>
      <ol class="board" id="board"><li class="hint">…</li></ol>
      <div class="row"><button class="ghost" id="forget">${tr("forgetBtn")}</button></div>
      <p class="hint" id="note" role="status"></p>
    </main>`, (r) => {
    wireToolbar(r, () => ranking(board, scope));
    on(r, "#back", levelMap);
    r.querySelector("#on")!.addEventListener("change", (e) => { store.setOnline({ on: (e.target as HTMLInputElement).checked }); });
    r.querySelector("#rf")!.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = (r.querySelector("#room") as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      store.setOnline({ room: code.length >= 3 ? code : "" });
      again(() => ranking(board, code.length >= 3 ? "room" : "world"));
    });
    r.querySelectorAll<HTMLElement>("[data-b]").forEach((b) => b.addEventListener("click", () => again(() => ranking(b.dataset.b as typeof board, scope))));
    r.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.addEventListener("click", () => again(() => ranking(board, b.dataset.s as typeof scope))));
    const note = r.querySelector<HTMLElement>("#note")!;
    r.querySelector("#forget")!.addEventListener("click", async () => {
      try { await forget(); store.setOnline({ on: false }); note.textContent = tr("forgotten"); (r.querySelector("#on") as HTMLInputElement).checked = false; }
      catch { note.textContent = tr("errNet"); }
    });

    const list = r.querySelector<HTMLElement>("#board")!;
    const meId = idOf(o.pid);
    fetchBoard(board, scope === "room" ? o.room : "").then(async (b) => {
      if (!list.isConnected) return;
      const me = await meId;
      if (!b.top.length) { list.innerHTML = `<li class="hint">${tr("rankEmpty")}</li>`; return; }
      const row = (x: (typeof b.top)[number]) => `<li class="${x.id === me ? "me" : ""}" value="${x.rank}"><span class="pos">${x.rank}</span><span class="nick">${esc(x.nick)}${x.id === me ? ` <small>(${tr("you")})</small>` : ""}</span><span class="stars">${stars(x.stars)}</span><span class="wpm">${x.wpm} ${tr("wpmShort")}</span><b>${x.score}</b></li>`;
      list.innerHTML = b.top.map(row).join("") + (b.me && b.me.rank > b.top.length ? `<li class="gapline">⋯</li>${row(b.me)}` : "");
    }).catch(() => { if (list.isConnected) list.innerHTML = `<li class="hint">${tr("rankErr")}</li>`; });
  });
}

/** Buzón: el mensaje viaja a /api/suggest y queda guardado en un almacén privado. */
export function suggest(back: () => void) {
  world.theme("menu"); world.mode("menu");
  let cat: "idea" | "bug" | "other" = "idea";
  const kinds = [["idea", "catIdea"], ["bug", "catBug"], ["other", "catOther"]] as const;
  show(`${toolbar()}
    <main class="center form">
      ${topbar(`${ic("box")} ${tr("box")}`)}
      <p class="hint">${tr("boxIntro")}</p>
      <form id="f" class="stack" novalidate>
        <div class="tabs" role="radiogroup">${kinds.map(([k, key]) => `<button type="button" role="radio" class="tab" data-k="${k}" aria-checked="${k === cat}">${tr(key)}</button>`).join("")}</div>
        <textarea id="msg" class="field" rows="5" maxlength="1000" placeholder="${tr("yourMsg")}" aria-label="${tr("yourMsg")}" data-focus></textarea>
        <input id="alias" class="field" maxlength="40" placeholder="${tr("alias")}" aria-label="${tr("alias")}" autocomplete="nickname" />
        <input id="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <p class="hint" id="status" role="status"></p>
        <button class="btn" id="send" type="submit">${tr("send")}</button>
        <p class="hint">${tr("boxPrivacy")}</p>
      </form>
    </main>`, (r) => {
    wireToolbar(r, () => suggest(back));
    on(r, "#back", back);
    const status = r.querySelector<HTMLElement>("#status")!;
    const send = r.querySelector<HTMLButtonElement>("#send")!;
    r.querySelectorAll<HTMLElement>("[data-k]").forEach((b) => b.addEventListener("click", () => {
      cat = b.dataset.k as typeof cat;
      r.querySelectorAll("[data-k]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    }));
    r.querySelector("#f")!.addEventListener("submit", async (e) => {
      e.preventDefault();
      const message = (r.querySelector("#msg") as HTMLTextAreaElement).value.trim();
      if (message.length < 5) { status.textContent = tr("errShort"); return; }
      send.disabled = true;
      status.textContent = tr("sending");
      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat, message, lang: store.lang,
            alias: (r.querySelector("#alias") as HTMLInputElement).value,
            website: (r.querySelector("#website") as HTMLInputElement).value,
            device: deviceLabel(),
          }),
        });
        if (res.ok) {
          sfx.fanfare();
          r.querySelector("#f")!.outerHTML = `<p class="good">${tr("thanks")}</p>`;
          return;
        }
        status.textContent = res.status === 429 ? tr("errBusy") : res.status === 400 ? tr(message.length > 1000 ? "errLong" : "errShort") : tr("errNet");
      } catch {
        status.textContent = tr("errNet");
      }
      send.disabled = false;
    });
  });
}

// ---------- Modo desarrollador (se abre con #admin en la dirección y la clave ADMIN_KEY)
let adminTab: Diff = "easy";
let editing: { id: number; isNew: boolean } | null = null;

function adminLoginScreen() {
  world.theme("menu"); world.mode("menu");
  show(`${toolbar()}
    <main class="center">
      <h2>${ic("tools")} Modo desarrollador</h2>
      <p class="tag">Escribe la clave de administrador.</p>
      <input class="field" id="akey" type="password" autocomplete="off" aria-label="Clave" style="max-width:22rem">
      <p class="hint" id="amsg" role="status"></p>
      <div class="row"><button class="btn ghost-b" id="back">${tr("back")}</button><button class="btn" id="go" data-focus>Entrar</button></div>
    </main>`, (r) => {
    on(r, "#back", home);
    const go = async () => {
      const msg = r.querySelector<HTMLElement>("#amsg")!;
      msg.textContent = "…";
      if (await adminLogin(r.querySelector<HTMLInputElement>("#akey")!.value)) { sfx.fanfare(); history.replaceState(null, "", location.pathname); adminPanel(); }
      else { sfx.error(); msg.textContent = "Clave incorrecta."; }
    };
    on(r, "#go", go);
    r.querySelector("#akey")!.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") void go(); });
  });
}

export function adminPanel() {
  world.theme("menu"); world.mode("menu");
  const factory = factoryLevels();
  const over = new Map(custom.map((c) => [c.id, c]));
  const rows = [
    ...factory.map((f) => ({ id: f.id, diff: f.diff, es: over.get(f.id)?.es || f.text.es, en: over.get(f.id)?.en || f.text.en, hidden: !!over.get(f.id)?.hidden, changed: over.has(f.id), isNew: false })),
    ...custom.filter((c) => !factory.some((f) => f.id === c.id)).map((c) => ({ id: c.id, diff: c.diff, es: c.es, en: c.en, hidden: false, changed: true, isNew: true })),
  ].filter((x) => x.diff === adminTab);
  const cur = editing ? (over.get(editing.id) ?? (() => { const f = factory.find((x) => x.id === editing!.id); return f ? { id: f.id, diff: f.diff, es: f.text.es, en: f.text.en, title: f.title } : undefined; })()) : undefined;
  const nextId = Math.max(199, ...custom.map((c) => c.id)) + 1;
  const e = editing && (cur ?? { id: editing.id, diff: adminTab, es: "", en: "", title: undefined });
  show(`${toolbar()}
    <main class="wide admin">
      ${topbar(`${ic("tools")} Modo desarrollador`, `${ic("infinity")} monedas`, true)}
      <section class="panel">
        <p class="hint">${ic("infinity")} Monedas infinitas activas · ${ic("devbadge")} La skin y la insignia de desarrollador están en la tienda.</p>
        <div class="tabs" role="tablist">${DIFFS.map((d) => `<button role="tab" class="tab" aria-selected="${d === adminTab}" data-d="${d}">${tr(d)}</button>`).join("")}</div>
        <ul class="adminlist">${rows.map((x) => `<li class="${x.hidden ? "off" : ""}"><b>${x.id}</b><span>${esc(x.es)}<small>${esc(x.en)}</small></span>
          <button class="btn ghost-b" data-edit="${x.id}" data-new="${x.isNew}">${ic("pencil")}</button>
          ${x.isNew ? `<button class="btn ghost-b" data-del="${x.id}">✕</button>` : x.hidden ? `<button class="btn ghost-b" data-undo="${x.id}">↺</button>` : `<button class="btn ghost-b" data-hide="${x.id}">🙈</button>`}</li>`).join("") || `<li class="hint">Sin niveles.</li>`}</ul>
        <button class="btn" id="add">+ Añadir nivel a ${tr(adminTab)}</button>
        ${e ? `<div class="editor"><h3>${editing!.isNew ? "Nivel nuevo" : `Editar nivel ${e.id}`}</h3>
          <label>Español<textarea class="field" id="e-es" rows="2" maxlength="240">${esc(e.es)}</textarea></label>
          <label>English<textarea class="field" id="e-en" rows="2" maxlength="240">${esc(e.en)}</textarea></label>
          ${adminTab === "practice" ? `<div class="row"><label>Título ES<input class="field" id="e-tes" maxlength="40" value="${esc(e.title?.es ?? "")}"></label><label>Title EN<input class="field" id="e-ten" maxlength="40" value="${esc(e.title?.en ?? "")}"></label></div>` : ""}
          <div class="row"><button class="btn ghost-b" id="e-cancel">Cancelar</button>${!editing!.isNew && over.has(e.id) ? `<button class="btn ghost-b" id="e-reset">Quitar mis cambios</button>` : ""}<button class="btn" id="e-save">Guardar y publicar</button></div></div>` : ""}
        <p class="hint" id="amsg" role="status"></p>
      </section>
      <div class="row"><button class="btn ghost-b" id="logout">Salir del modo desarrollador</button></div>
    </main>`, (r) => {
    const msg = (t: string) => { const m = r.querySelector<HTMLElement>("#amsg"); if (m) m.textContent = t; };
    const publish = async (list: CustomLevel[], okText = "Publicado ✓") => {
      msg("Publicando…");
      if (await saveLevels(list)) { editing = null; sfx.star(1); toast(okText); adminPanel(); } else { sfx.error(); msg("No se pudo publicar (revisa la conexión o los textos)."); }
    };
    on(r, "#back", home);
    on(r, "#logout", () => { adminLogout(); home(); });
    r.querySelectorAll<HTMLElement>("[data-d]").forEach((b) => b.addEventListener("click", () => { adminTab = b.dataset.d as Diff; editing = null; adminPanel(); }));
    r.querySelectorAll<HTMLElement>("[data-edit]").forEach((b) => b.addEventListener("click", () => { editing = { id: +b.dataset.edit!, isNew: b.dataset.new === "true" }; adminPanel(); }));
    r.querySelectorAll<HTMLElement>("[data-hide]").forEach((b) => b.addEventListener("click", () => void publish([...custom.filter((c) => c.id !== +b.dataset.hide!), { id: +b.dataset.hide!, diff: adminTab, es: "", en: "", hidden: true }], "Nivel oculto")));
    r.querySelectorAll<HTMLElement>("[data-undo]").forEach((b) => b.addEventListener("click", () => void publish(custom.filter((c) => c.id !== +b.dataset.undo!), "Nivel restaurado")));
    r.querySelectorAll<HTMLElement>("[data-del]").forEach((b) => b.addEventListener("click", () => void publish(custom.filter((c) => c.id !== +b.dataset.del!), "Nivel eliminado")));
    on(r, "#add", () => { editing = { id: nextId, isNew: true }; adminPanel(); });
    on(r, "#e-cancel", () => { editing = null; adminPanel(); });
    on(r, "#e-reset", () => void publish(custom.filter((c) => c.id !== editing!.id), "Cambios quitados"));
    on(r, "#e-save", () => {
      const v = (id: string) => (r.querySelector<HTMLInputElement>(id)?.value ?? "").trim();
      const es = v("#e-es"), en = v("#e-en");
      if (es.length < 3 || en.length < 3) { sfx.error(); return msg("Escribe la frase en español y en inglés."); }
      const lv: CustomLevel = { id: editing!.id, diff: adminTab, es, en };
      if (adminTab === "practice" && (v("#e-tes") || v("#e-ten"))) lv.title = { es: v("#e-tes") || v("#e-ten"), en: v("#e-ten") || v("#e-tes") };
      void publish([...custom.filter((c) => c.id !== lv.id), lv]);
    });
  });
}

export function start(w: World) {
  world = w;
  document.documentElement.lang = store.lang;
  setMuted(store.muted);
  setMusicOn(store.music);
  pending = decode(location.hash);
  if (location.hash.startsWith("#reto=")) history.replaceState(null, "", location.pathname + location.search);
  const goAdmin = () => (isAdmin() ? adminPanel() : adminLoginScreen());
  addEventListener("hashchange", () => { if (location.hash === "#admin") goAdmin(); });
  if (location.hash === "#admin") return goAdmin();
  home();
}
