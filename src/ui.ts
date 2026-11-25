import { DIFFS, LEVELS, type Diff, type Level } from "./content";
import { Round, starsFor, summarize, type Summary } from "./engine";
import { dailyLevels, dateKey, endlessTexts } from "./modes";
import { device, deviceLabel, physicalKeys } from "./device";
import { ic } from "./icons";
import { ITEMS, SLOTS, SLOT_NAMES, coinsFor, rarityOf, type Slot } from "./cosmetics";
import { compareScore, decode, encode, verdict, type Challenge } from "./challenge";
import { FINGER_COLORS, FINGER_NAMES, highlightKey, keyboardHtml } from "./keys";
import { fetchBoard, forget, idOf, submit, type Place } from "./online";
import { t, type Key } from "./i18n";
import { store } from "./store";
import { music, setMusicOn, setMuted, sfx, unlockAudio } from "./audio";
import type { createScene } from "./scene";

type World = ReturnType<typeof createScene>;
const app = document.getElementById("app")!;
let world: World;
let cleanup: (() => void) | null = null;
let tab: Diff = "easy";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const tr = (k: Key) => t(store.lang, k);
let pending: Challenge | null = null; // reto recibido por enlace
const fmt = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));
const DAILY_ID = 900, TIME_ID = 901; // partidas que no son un nivel
const lvlName = (l: Level) => l.title?.[store.lang] ?? `${tr("level")} ${l.n}`;
const stars = (n: number, total = 3) => "★".repeat(n) + `<span class="off">${"★".repeat(total - n)}</span>`;

function show(html: string, onMount?: (root: HTMLElement) => void) {
  world.dress(store.worn);
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
    <button class="ghost" data-act="music" aria-label="${tr("music")}" aria-pressed="${store.music}">${ic("music")}</button>
    <button class="ghost" data-act="sound" aria-label="${tr("sound")}" aria-pressed="${!store.muted}">${ic(store.muted ? "mute" : "sound")}</button>
  </div>`;

/** Encabezado común: volver, título y algo a la derecha (monedas, jugador...). */
const topbar = (title: string, right = "", back = true) =>
  `<header class="top">${back ? `<button class="back" id="back" aria-label="${tr("back")}">←</button>` : ""}<h2>${title}</h2><span class="right">${right}</span></header>`;

/** Aviso breve abajo de la pantalla. Vive fuera de #app para sobrevivir al cambio de pantalla. */
let toastTimer = 0;
function toast(html: string) {
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
    rerender();
  });
  root.querySelector('[data-act="music"]')?.addEventListener("click", () => {
    store.music = !store.music;
    setMusicOn(store.music);
    if (store.music && !store.muted) { unlockAudio(); music.start(); }
    rerender();
  });
  root.querySelector('[data-act="sound"]')?.addEventListener("click", () => {
    store.muted = !store.muted;
    setMuted(store.muted);
  setMusicOn(store.music);
    if (!store.muted) { unlockAudio(); music.start(); }
    rerender();
  });
}

// Instalar como app: Chrome/Edge avisan con un evento; en iPhone y iPad hay que hacerlo desde el menú Compartir.
let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e as typeof installEvt; renderInstall(); });
addEventListener("appinstalled", () => { installEvt = null; renderInstall(); });

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
  world.theme("menu");
  world.mode("menu");
  show(`${toolbar()}
    <main class="center plain">
      <h1 class="logo">VECTORCITOS<span>RUN<i class="cursor"></i></span></h1>
      <p class="tag">${tr("tagline")}</p>
      ${store.current ? `<div class="whochip">${esc(store.current)} · ${ic("coin")} ${store.coins}${store.dailyStreak ? ` · ${ic("fire")} ${store.dailyStreak}` : ""}</div>` : ""}
      ${pending ? `<div class="banner">${ic("challenge")} <b>${esc(pending.nick)}</b> ${tr("challengeBy")} ${esc(pending.kind === "time" ? tr("timeAttack") : lvlName(LEVELS.find((l) => l.id === pending!.id)!))}: ${pending.wpm} ${tr("wpmShort")} · ${pending.acc}%</div>` : ""}
      <button class="btn big" id="play" data-focus>${pending ? tr("acceptChallenge") : tr("play")}</button>
      <div id="installslot" class="installslot"></div>
      <div class="row">
        ${store.current ? `<button class="ghost" id="switch">${tr("switchPlayer")}</button>` : ""}
        <button class="ghost" id="box">${ic("box")} ${tr("box")}</button>
      </div>
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

function guide(next: () => void) {
  const names = FINGER_NAMES[store.lang];
  show(`${toolbar()}
    <main class="wide">
      ${topbar(`${ic("hands")} ${tr("guide")}`, "", false)}
      <section class="panel">
        ${device.kind !== "desktop" ? `<p class="deviceTip">${ic(device.kind === "phone" ? "phone" : "kbd")} ${tr(device.kind === "phone" ? "guidePhone" : "guideTablet")}</p>` : ""}
        ${keyboardHtml(store.lang)}
        <p class="tips">${tr("guideTips")}</p>
        <ul class="legend">${names.map((n, i) => `<li><i style="background:${FINGER_COLORS[i]}"></i>${n}</li>`).join("")}</ul>
      </section>
      <button class="btn" id="ok" data-focus style="align-self:center">${tr("guideOk")}</button>
    </main>`, (r) => {
    wireToolbar(r, () => guide(next));
    r.querySelectorAll(".k.home").forEach((k) => k.classList.add("next")); // F y J, para que se vea dónde van los índices
    on(r, "#ok", () => { store.markGuide(); next(); });
  });
}

let shopTab: Slot = "head";
const SWATCH_BASE = 150; // el verde original, en grados de color

function shop() {
  world.theme("menu");
  world.mode("shop");
  const worn = store.worn;
  const items = ITEMS.filter((i) => i.slot === shopTab);
  show(`${toolbar()}
    <main class="wide shop">
      ${topbar(`${ic("shop")} ${tr("shop")}`, `${ic("coin")} ${store.coins}`)}
      <div class="shopbox">
        <div class="tabs" role="tablist">${SLOTS.map((sl) => `<button role="tab" class="tab" aria-selected="${sl === shopTab}" data-s="${sl}">${SLOT_NAMES[sl][store.lang]}</button>`).join("")}</div>
        <div class="cards">${items.map((i) => {
          const owned = store.owns(i.id), on = worn[i.slot] === i.id, afford = owned || store.coins >= i.price;
          const art = i.hue !== undefined ? `<i class="swatch" style="background:hsl(${(SWATCH_BASE + i.hue + 360) % 360} 90% 55%)"></i>` : ic(i.icon);
          return `<button class="card ${rarityOf(i.price)} ${on ? "wearing" : ""} ${owned ? "owned" : ""} ${afford ? "" : "cant"}" data-id="${i.id}" aria-pressed="${on}">
            <span class="art">${art}</span><b>${i.name[store.lang]}</b>
            <small>${owned ? (on ? `✓ ${tr("wearing")}` : tr("equip")) : `${ic("coin")} ${i.price}`}</small></button>`;
        }).join("")}</div>
        <p class="hint">${tr("shopHint")}</p>
      </div>
    </main>`, (r) => {
    wireToolbar(r, shop);
    on(r, "#back", () => { world.mode("menu"); levelMap(); });
    r.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.addEventListener("click", () => { sfx.click(); shopTab = b.dataset.s as Slot; shop(); }));
    r.querySelectorAll<HTMLElement>(".card").forEach((c) => c.addEventListener("click", () => {
      const it = ITEMS.find((x) => x.id === c.dataset.id)!;
      if (store.owns(it.id)) { sfx.click(); store.wear(it.slot, store.worn[it.slot] === it.id ? null : it.id); }
      else if (store.buy(it.id)) { sfx.star(1); world.word(); toast(`${ic("coin")} ${tr("bought")} <b>${it.name[store.lang]}</b>`); }
      else { sfx.error(); toast(tr("notEnough")); return; }
      shop();
    }));
  });
}

function startChallenge() {
  const c = pending;
  pending = null;
  if (!c) return levelMap();
  if (c.kind === "time") return playTime(c);
  play(LEVELS.find((l) => l.id === c.id)!, c);
}

function levelMap() {
  world.theme(tab);
  world.mode("menu");
  show(`${toolbar()}
    <main class="wide">
      ${topbar(tr("pick"), `${esc(store.current)} · ${ic("coin")} ${store.coins}`)}
      <div class="modes">
        ${store.giftReady ? `<button class="mode gift" id="gift"><b>${ic("gift")} ${tr("giftDay")}</b><small>+${store.giftAmount} ${ic("coin")}</small></button>` : ""}
        <button class="mode" id="shop"><b>${ic("shop")} ${tr("shop")}</b><small>${ic("coin")} ${store.coins}</small></button>
        <button class="mode" id="m-daily"><b>${ic("daily")} ${tr("daily")}</b><small>${store.daily.days[dateKey()] ? `✓ ${tr("doneToday")}` : `${ic("fire")} ${store.dailyStreak} ${tr("dayStreak")}`}</small></button>
        <button class="mode" id="m-time"><b>${ic("time")} ${tr("timeAttack")}</b><small>${tr("bestScore")}: ${store.bestTime || "–"}</small></button>
        <button class="mode" id="rank"><b>${ic("rank")} ${tr("ranking")}</b><small>${store.online.on ? `${tr("scopeRoom")}: ${store.online.room || "–"}` : "&nbsp;"}</small></button>
        <button class="mode" id="prog"><b>${ic("progress")} ${tr("progress")}</b></button>
        <button class="mode" id="hands"><b>${ic("hands")} ${tr("guide")}</b></button>
        <button class="mode" id="box"><b>${ic("box")} ${tr("box")}</b></button>
      </div>
      <div class="tabs" role="tablist">${DIFFS.map((d) => {
        const all = LEVELS.filter((l) => l.diff === d), got = all.filter((l) => store.best(l.id)).length;
        return `<button role="tab" class="tab" aria-selected="${d === tab}" data-d="${d}">${tr(d)} <small>${got}/${all.length}</small></button>`;
      }).join("")}</div>
      <div class="grid">${LEVELS.filter((l) => l.diff === tab).map((l) => {
        const open = store.unlocked(l.id), b = store.best(l.id);
        return `<button class="lvl ${open ? "open" : "closed"}" data-id="${l.id}" ${open ? "" : "disabled"} aria-label="${lvlName(l)}, ${open ? tr("open") : tr("locked")}">
          <i>${ic(open ? "game" : "locked")}</i><b>${lvlName(l)}</b><span class="st">${b ? stars(b.stars) : "&nbsp;"}</span><small>${b ? `${b.wpm} ${tr("wpmShort")}` : "&nbsp;"}</small></button>`;
      }).join("")}</div>
    </main>`, (r) => {
    wireToolbar(r, levelMap);
    on(r, "#back", home);
    on(r, "#prog", progress);
    on(r, "#rank", () => ranking("daily", "world"));
    on(r, "#box", () => suggest(levelMap));
    on(r, "#hands", () => guide(levelMap));
    on(r, "#shop", shop);
    on(r, "#gift", () => { const n = store.claimGift(); sfx.fanfare(); world.win(); levelMap(); toast(`${ic("gift")} ${tr("giftGot")} <b>+${n}</b> ${ic("coin")}`); });
    on(r, "#m-daily", () => modeInfo("daily"));
    on(r, "#m-time", () => modeInfo("time"));
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
    const lv = LEVELS.find((x) => x.id === r.id);
    const label = lv ? `${lvlName(lv)} · ${tr(lv.diff)}` : r.id === DAILY_ID ? `${ic("daily")} ${tr("daily")}` : `${ic("time")} ${tr("timeAttack")}`;
    return `<li><span>${fmt.format(r.ts)}</span><span>${label}</span><b>${r.wpm}</b><span>${r.acc}%</span><span class="st">${stars(r.stars)}</span></li>`;
  }).join("");
  show(`${toolbar()}
    <main class="wide">
      ${topbar(`${ic("progress")} ${tr("progress")}`, esc(store.current))}
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
      streakEl.hidden = streak < 10;
      streakEl.innerHTML = `${ic("fire")} <span class="lbl">${tr("streak")}</span> ${streak}`;
    };
    refresh();

    const end = (complete: boolean) => {
      if (over) return;
      over = true; leaving = true;
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
        streak = 0;
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
        if (hit === "word" || hit === "done") { sfx.word(); world.word(); }
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

function play(l: Level, vs?: Challenge) {
  run({
    diff: l.diff, title: `${lvlName(l)} · ${tr(l.diff)}`, next: once(l.text[store.lang]),
    finish: ([round]) => results({ kind: "level", level: l, title: lvlName(l), sum: summarize([round], round.seconds), secs: round.seconds, retry: () => play(l, vs), vs }),
    back: levelMap,
  });
}

function playDaily() {
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
function playTime(vs?: Challenge) {
  run({
    diff: "hard", title: tr("timeAttack"), limit: TIME_LIMIT, next: endlessTexts(store.lang),
    finish: (rounds) => results({ kind: "time", title: tr("timeAttack"), sum: summarize(rounds, TIME_LIMIT), secs: TIME_LIMIT, retry: () => playTime(vs), vs }),
    back: levelMap,
  });
}

function modeInfo(kind: "daily" | "time") {
  const done = store.daily.days[dateKey()];
  show(`${toolbar()}
    <main class="center">
      <h2>${kind === "daily" ? `${ic("daily")} ${tr("daily")}` : `${ic("time")} ${tr("timeAttack")}`}</h2>
      <p class="tag">${tr(kind === "daily" ? "dailyDesc" : "timeDesc")}</p>
      <p class="hint">${kind === "daily"
        ? `${ic("fire")} ${store.dailyStreak} ${tr("dayStreak")}${done ? ` · ✓ ${tr("doneToday")} (${done.wpm} ${tr("wpmShort")})` : ""}`
        : `${tr("bestScore")}: ${store.bestTime || "–"}`}</p>
      <div class="row"><button class="btn ghost-b" id="back">${tr("back")}</button><button class="btn" id="go" data-focus>${tr("play")}</button></div>
    </main>`, (r) => {
    wireToolbar(r, () => modeInfo(kind));
    on(r, "#back", levelMap);
    on(r, "#go", kind === "daily" ? playDaily : () => playTime());
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
  if (o.kind === "level" && l) {
    const next = LEVELS[LEVELS.findIndex((x) => x.id === l.id) + 1];
    nextLevel = next && next.free === l.free ? next : undefined;
    const wasOpen = nextLevel ? store.unlocked(nextLevel.id) : true;
    const prev = store.best(l.id);
    isBest = store.record(l.id, { stars, wpm: sum.wpm, acc });
    opened = !!nextLevel && !wasOpen && store.unlocked(nextLevel.id);
    const d = prev ? sum.wpm - prev.wpm : 0;
    versus = prev ? (d === 0 ? tr("sameBest") : `${d > 0 ? "+" : ""}${d} ${tr("wpmShort")} ${tr("vsBest")}`) : "";
    store.addRun({ id: l.id, ...run });
  } else if (o.kind === "daily") {
    store.recordDaily(dateKey(), { stars, wpm: sum.wpm, acc });
    streakMsg = `${ic("fire")} ${store.dailyStreak} ${tr("dayStreak")}`;
    store.addRun({ id: DAILY_ID, ...run });
  } else {
    isBest = store.recordTime(score);
    store.addRun({ id: TIME_ID, ...run });
  }

  music.mood("menu");
  // Comparación con el amigo que envió el reto (si lo hay)
  const mine = compareScore(o.kind === "time" ? "time" : "level", sum.wpm, acc, score);
  const duel = o.vs ? fmt(tr(verdict(mine, o.vs.score) === "win" ? "youWin" : verdict(mine, o.vs.score) === "lose" ? "youLose" : "youTie"), { nick: o.vs.nick, a: mine, b: o.vs.score }) : "";
  const coins = coinsFor({ kind: o.kind, stars, wpm: sum.wpm, score, isBest });
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
    on(r, "#map", () => { if (l) tab = l.diff; world.mode("menu"); levelMap(); });
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
    on(r, "#next", () => { tab = nextLevel!.diff; info(nextLevel!); });
  });
}

function ranking(board: "daily" | "time", scope: "world" | "room") {
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
      ranking(board, code.length >= 3 ? "room" : "world");
    });
    r.querySelectorAll<HTMLElement>("[data-b]").forEach((b) => b.addEventListener("click", () => ranking(b.dataset.b as typeof board, scope)));
    r.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.addEventListener("click", () => ranking(board, b.dataset.s as typeof scope)));
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
function suggest(back: () => void) {
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

export function start(w: World) {
  world = w;
  document.documentElement.lang = store.lang;
  setMuted(store.muted);
  pending = decode(location.hash);
  if (location.hash.startsWith("#reto=")) history.replaceState(null, "", location.pathname + location.search);
  home();
}
