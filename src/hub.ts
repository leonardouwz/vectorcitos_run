// Menú principal (v1): una carcasa fija con barra de estado (HUD), navegación por pestañas y un panel de contenido,
// delante del escenario 3D. Las pestañas cambian solo el panel: la carcasa y el personaje no se redibujan.
//   · Pantallas anchas: carril de navegación a la izquierda, Vectorcito en el centro y el panel a la derecha.
//   · Teléfonos y pantallas verticales: HUD arriba, Vectorcito en el escenario, panel abajo y barra de pestañas al pulgar.
import { DIFFS, LEVELS, type Diff, type Level } from "./content";
import { ITEMS, SLOTS, SLOT_NAMES, RARITY_NAMES, rarityOfItem, type Slot } from "./cosmetics";
import { dateKey } from "./modes";
import { gl, type Glyph } from "./glyphs";
import { ic } from "./icons";
import { isAdmin } from "./remote";
import { disablePush, enablePush, pushState, type PushState } from "./push";
import { setMusicOn, setMuted, sfx, unlockAudio, music } from "./audio";
import type { Key } from "./i18n";
import { store } from "./store";
import { versionText } from "./version";
import * as ui from "./ui";

export type HubTab = "play" | "daily" | "shop" | "progress" | "more";
// ui.ts y este archivo se importan entre sí: por eso se usan a través de funciones y no se desestructura al cargar
const tr = (k: Key) => ui.tr(k);
const esc = (s: string) => ui.esc(s);

const TABS: { id: HubTab; label: Key; glyph: Glyph }[] = [
  { id: "play", label: "play", glyph: "play" },
  { id: "daily", label: "navDaily", glyph: "daily" },
  { id: "shop", label: "shop", glyph: "shop" },
  { id: "progress", label: "navProgress", glyph: "progress" },
  { id: "more", label: "settings", glyph: "more" },
];

let cur: HubTab = "play";
let worldTab: Diff = "easy";
let shopTab: Slot = "head";
let preview: string | null = null;
export const setWorldTab = (d: Diff) => { worldTab = d; };

const stars3 = (n: number) => `<span class="h-stars" aria-label="${n}/3">${[0, 1, 2].map((i) => `<i class="${i < n ? "on" : ""}">${gl("star")}</i>`).join("")}</span>`;

/** Primer nivel de la progresión que aún no se ha pasado (o el último si ya se pasaron todos). */
function nextLevel(): { level: Level; cleared: boolean } {
  const seq = LEVELS.filter((l) => !l.free);
  const n = seq.find((l) => !store.best(l.id));
  return { level: n ?? seq[seq.length - 1], cleared: !n };
}
const diffProgress = (d: Diff) => { const all = LEVELS.filter((l) => l.diff === d); return { got: all.filter((l) => store.best(l.id)).length, total: all.length }; };

// ---------- Hoja inferior / diálogo
let closeSheet: (() => void) | null = null;
function openSheet(html: string, mount?: (el: HTMLElement) => void) {
  closeSheet?.();
  const shell = document.querySelector<HTMLElement>(".shell");
  if (!shell) return;
  const wrap = document.createElement("div");
  wrap.className = "h-sheetwrap";
  wrap.innerHTML = `<div class="h-backdrop" data-close></div><div class="h-sheet" role="dialog" aria-modal="true"><span class="h-grab" aria-hidden="true"></span>${html}</div>`;
  const prevFocus = document.activeElement as HTMLElement | null;
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
  const close = () => {
    removeEventListener("keydown", onKey);
    wrap.classList.add("leaving");
    setTimeout(() => wrap.remove(), 180);
    closeSheet = null;
    prevFocus?.focus?.({ preventScroll: true });
  };
  closeSheet = close;
  wrap.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("[data-close]")) { sfx.click(); close(); } });
  addEventListener("keydown", onKey);
  shell.appendChild(wrap);
  wrap.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  mount?.(wrap.querySelector<HTMLElement>(".h-sheet")!);
}

// ---------- Pestaña: Jugar
function playView(): { html: string; mount: (r: HTMLElement) => void } {
  const { level: next, cleared } = nextLevel();
  const worlds = DIFFS.map((d) => {
    const p = diffProgress(d), pct = p.total ? p.got / p.total : 0, C = 2 * Math.PI * 15;
    return `<button role="tab" class="h-world" data-w="${d}" aria-selected="${d === worldTab}">
      <svg class="h-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 18 18)"/></svg>
      <span class="h-wname">${tr(d)}</span><small>${p.got}/${p.total}</small></button>`;
  }).join("");
  const nodes = () => {
    const list = LEVELS.filter((l) => l.diff === worldTab);
    const cols = list.length <= 6 ? 3 : 5, rows: Level[][] = [];
    for (let i = 0; i < list.length; i += cols) rows.push(list.slice(i, i + cols));
    return rows.map((row, ri) => `<div class="h-prow ${ri % 2 ? "rev" : ""}">${row.map((l) => {
      const open = store.unlocked(l.id), b = store.best(l.id), isNext = open && !b && !cleared && next.id === l.id;
      return `<button class="h-node ${b ? "done" : open ? "open" : "locked"} ${isNext ? "now" : ""}" data-id="${l.id}" aria-label="${ui.lvlName(l)}${open ? "" : `, ${tr("locked")}`}" ${open ? "" : 'aria-disabled="true"'}>
        <span class="h-n">${open ? l.n : gl("lock")}</span>${open ? stars3(b?.stars ?? 0) : '<span class="h-stars sp"></span>'}</button>`;
    }).join("")}</div>`).join("");
  };
  const html = `
    <button class="h-continue" id="h-cont" data-autofocus>
      <span class="h-cont-art">${ic("game")}</span>
      <span class="h-cont-text"><em>${cleared ? tr("allClear") : tr("cont")}</em><b>${ui.lvlName(next)} · ${tr(next.diff)}</b><small>${esc(next.text[store.lang])}</small></span>
      <span class="h-cont-go">${gl("play")}</span>
    </button>
    <div class="h-worlds" role="tablist" aria-label="${tr("worldsLabel")}">${worlds}</div>
    <div class="h-path" id="h-path">${nodes()}</div>`;
  const mount = (r: HTMLElement) => {
    r.querySelector("#h-cont")!.addEventListener("click", () => { sfx.click(); ui.play(next); });
    r.querySelector(".h-worlds")!.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".h-world");
      if (!b || b.dataset.w === worldTab) return;
      sfx.click(); worldTab = b.dataset.w as Diff;
      r.querySelectorAll<HTMLElement>(".h-world").forEach((w) => w.setAttribute("aria-selected", String(w === b)));
      const path = r.querySelector<HTMLElement>("#h-path")!; path.innerHTML = nodes(); swap(path);
    });
    r.querySelector("#h-path")!.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".h-node");
      if (!b) return;
      const l = LEVELS.find((x) => x.id === +b.dataset.id!)!;
      if (!store.unlocked(l.id)) { sfx.error(); ui.toast(tr("prevFirst")); return; }
      sfx.click(); levelSheet(l);
    });
  };
  return { html, mount };
}

function levelSheet(l: Level) {
  const b = store.best(l.id);
  openSheet(`
    <header class="h-sheethead"><div><em>${tr(l.diff)}</em><h3>${ui.lvlName(l)}</h3></div><button class="h-iconbtn" data-close aria-label="${tr("closeBtn")}">${gl("close")}</button></header>
    <blockquote class="h-quote">${esc(l.text[store.lang])}</blockquote>
    <div class="h-best"><span>${tr("best")}</span>${b ? `${stars3(b.stars)}<b>${b.wpm} ${tr("wpm")}</b>` : `<b>${tr("none")}</b>`}</div>
    <button class="h-cta" id="h-go" data-autofocus>${gl("play")} ${tr("play")}</button>`,
  (el) => el.querySelector("#h-go")!.addEventListener("click", () => { sfx.click(); closeSheet?.(); ui.play(l); }));
}

// ---------- Pestaña: Reto diario
const msToMidnight = () => { const n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - n.getTime(); };
const clockText = (ms: number) => { const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`; };

function dailyView(): { html: string; mount: (r: HTMLElement) => void } {
  const done = store.daily.days[dateKey()], streak = store.dailyStreak, danger = !done && streak > 0;
  const week = Array.from({ length: 7 }, (_, i) => dateKey(new Date(Date.now() - (6 - i) * 864e5)));
  const dow = (k: string) => new Date(`${k}T12:00:00Z`).toLocaleDateString(store.lang, { weekday: "narrow", timeZone: "UTC" });
  const html = `
    <section class="h-card h-streakcard ${done ? "isdone" : danger ? "danger" : ""}">
      <div class="h-flame" aria-hidden="true">${ic("fire")}</div>
      <div class="h-streaknum"><b id="h-streaknum" data-to="${streak}">0</b><span>${tr("dayStreak")}</span></div>
      <div class="h-week" aria-label="${tr("weekTitle")}">${week.map((k, i) => `<span class="${store.daily.days[k] ? "on" : ""} ${k === dateKey() ? "today" : ""}" style="--i:${i}"><i>${store.daily.days[k] ? gl("check") : ""}</i><small>${dow(k)}</small></span>`).join("")}</div>
      <p class="h-note ${danger ? "warn" : ""}">${done ? `${tr("doneBig")} · ${done.wpm} ${tr("wpmShort")}` : danger ? tr("danger") : tr("daily1")}<br><small>${tr("timeLeft")} <b id="h-left">${clockText(msToMidnight())}</b></small></p>
      <button class="h-cta" id="h-daily" data-autofocus>${gl("play")} ${tr("play")}</button>
    </section>
    ${store.giftReady ? `<button class="h-row gift" id="h-gift"><span class="h-rowart">${ic("gift")}</span><span class="h-rowtext"><b>${tr("giftDay")}</b><small>+${store.giftAmount}</small></span><span class="h-rowgo">${gl("chevron")}</span></button>` : ""}
    <button class="h-row" id="h-time"><span class="h-rowart">${ic("time")}</span><span class="h-rowtext"><b>${tr("timeAttack")}</b><small>${tr("bestScore")}: ${store.bestTime || "–"}</small></span><span class="h-rowgo">${gl("chevron")}</span></button>
    <div class="h-remind" id="h-remind"></div>`;
  const mount = (r: HTMLElement) => {
    const num = r.querySelector<HTMLElement>("#h-streaknum")!;
    const to = Number(num.dataset.to), t0 = performance.now();
    const step = (now: number) => { const k = Math.min(1, (now - t0) / 800); num.textContent = String(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1 && num.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    const left = r.querySelector<HTMLElement>("#h-left")!;
    const t = window.setInterval(() => { if (left.isConnected) left.textContent = clockText(msToMidnight()); else clearInterval(t); }, 30000);
    r.querySelector("#h-daily")!.addEventListener("click", () => { sfx.click(); ui.playDaily(); });
    r.querySelector("#h-time")!.addEventListener("click", () => { sfx.click(); ui.playTime(); });
    r.querySelector("#h-gift")?.addEventListener("click", () => { const n = store.claimGift(); sfx.fanfare(); ui.getWorld().win(); ui.toast(`${ic("gift")} ${tr("giftGot")} <b>+${n}</b> ${ic("coin")}`); render(); });
    void remindRow(r.querySelector<HTMLElement>("#h-remind")!);
  };
  return { html, mount };
}

async function remindRow(box: HTMLElement) {
  const st: PushState = await pushState();
  if (!box.isConnected) return;
  const msg: Partial<Record<PushState, string>> = { unsupported: tr("remindUnsupported"), needsInstall: tr("remindInstall"), blocked: tr("remindBlocked") };
  if (msg[st]) { box.innerHTML = `<p class="h-hint">${gl("bell")} ${msg[st]}</p>`; return; }
  box.innerHTML = `<button class="h-row" id="h-rm" role="switch" aria-checked="${st === "on"}"><span class="h-rowart">${gl("bell")}</span><span class="h-rowtext"><b>${tr("reminders")}</b><small>${tr("remindHelp")}</small></span><span class="h-switch" aria-hidden="true"></span></button>`;
  box.querySelector("#h-rm")!.addEventListener("click", async () => {
    sfx.click();
    if (st === "on") await disablePush(); else await enablePush({ lang: store.lang, last: store.daily.last, streak: store.dailyStreak });
    void remindRow(box);
  });
}

// ---------- Pestaña: Tienda
const SLOT_GLYPH: Record<Slot, Glyph> = { head: "head", face: "face", body: "body", skin: "color", trail: "trail" };
const SWATCH_BASE = 150; // el verde original, en grados de color
function swatch(i: (typeof ITEMS)[number]) {
  const f = i.finish;
  return f === "metal" ? `<i class="swatch chrome"></i>` : f === "dark" ? `<i class="swatch dark"></i>` : f === "dev" ? `<i class="swatch dev"></i>` : f === "cycle" ? `<i class="swatch cycle"></i>` : `<i class="swatch" style="background:hsl(${(SWATCH_BASE + (i.hue ?? 0) + 360) % 360} 90% 55%)"></i>`;
}

function shopView(): { html: string; mount: (r: HTMLElement) => void } {
  const current = () => { const worn = store.worn; return { worn, sel: ITEMS.find((i) => i.id === preview && i.slot === shopTab) ?? ITEMS.find((i) => i.id === worn[shopTab]) ?? null }; };
  const cardsHtml = () => {
    const { worn, sel } = current();
    return ITEMS.filter((i) => i.slot === shopTab && (!i.admin || isAdmin())).sort((a, b) => a.price - b.price).map((i) => {
      const has = store.owns(i.id), on = worn[i.slot] === i.id;
      return `<button class="h-item ${rarityOfItem(i)} ${on ? "wearing" : ""} ${has ? "owned" : ""} ${sel?.id === i.id ? "sel" : ""}" data-id="${i.id}" aria-pressed="${sel?.id === i.id}">
        <span class="h-itemart">${i.hue !== undefined ? swatch(i) : ic(i.icon)}</span><b>${i.name[store.lang]}</b>
        <small>${has ? (on ? `${gl("check")} ${tr("wearing")}` : gl("check")) : `${gl("coin")} ${i.price}`}</small></button>`;
    }).join("");
  };
  const detailHtml = () => {
    const { worn, sel } = current();
    if (!sel) return `<div class="h-detail empty"><p>${tr("nothingWorn")}</p></div>`;
    const has = store.owns(sel.id), on = worn[sel.slot] === sel.id, miss = sel.price - store.coins;
    const act = has ? `<button class="h-btn ${on ? "ghost" : "primary"}" id="h-act">${on ? tr("unequip") : tr("equip")}</button>`
      : miss <= 0 ? `<button class="h-btn primary" id="h-act">${tr("buy")} · ${gl("coin")} ${sel.price}</button>`
      : `<button class="h-btn ghost" id="h-act" disabled>${gl("coin")} ${sel.price} · −${miss}</button>`;
    return `<div class="h-detail ${rarityOfItem(sel)}"><span class="h-itemart big">${sel.hue !== undefined ? swatch(sel) : ic(sel.icon)}</span>
      <div class="h-detailtext"><em>${RARITY_NAMES[rarityOfItem(sel)][store.lang]}</em><b>${sel.name[store.lang]}</b><small>${sel.blurb[store.lang]}</small></div>${act}</div>`;
  };
  const html = `
    <div class="h-tabs" role="tablist" aria-label="${tr("itemsLabel")}">${SLOTS.map((sl) => `<button role="tab" class="h-seg" data-s="${sl}" aria-selected="${sl === shopTab}">${gl(SLOT_GLYPH[sl])}<span>${SLOT_NAMES[sl][store.lang]}</span></button>`).join("")}</div>
    <div class="h-items" id="h-items"></div>
    <div id="h-sdetail"></div>`;
  const mount = (r: HTMLElement) => {
    const q = <T extends HTMLElement>(s: string) => r.querySelector<T>(s)!;
    const paint = (cards = true) => {
      const { worn, sel } = current();
      q("#h-sdetail").innerHTML = detailHtml();
      if (cards) q("#h-items").innerHTML = cardsHtml();
      else r.querySelectorAll<HTMLElement>(".h-item").forEach((c) => { const on = c.dataset.id === sel?.id; c.classList.toggle("sel", on); c.setAttribute("aria-pressed", String(on)); });
      r.querySelectorAll<HTMLElement>("[data-s]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.s === shopTab)));
      updateHud();
      ui.getWorld().dress(sel && !store.owns(sel.id) ? { ...worn, [sel.slot]: sel.id } : worn); // probárselo antes de comprarlo
    };
    paint();
    r.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const tab = t.closest<HTMLElement>("[data-s]"), card = t.closest<HTMLElement>(".h-item"), act = t.closest<HTMLElement>("#h-act");
      if (tab) { sfx.click(); shopTab = tab.dataset.s as Slot; preview = null; paint(); swap(q("#h-items")); q("#h-items").scrollTop = 0; }
      else if (card) { sfx.click(); preview = card.dataset.id!; paint(false); }
      else if (act && !(act as HTMLButtonElement).disabled) {
        const { worn, sel } = current();
        if (!sel) return;
        if (store.owns(sel.id)) { sfx.click(); store.wear(sel.slot, worn[sel.slot] === sel.id ? null : sel.id); }
        else if (store.buy(sel.id)) {
          const rar = rarityOfItem(sel), w = ui.getWorld();
          if (rar === "legendary") { sfx.fanfare(); w.win(); } else if (rar === "epic") { sfx.fanfare(); w.word(); } else { sfx.star(rar === "rare" ? 2 : 1); w.word(); }
          store.wear(sel.slot, sel.id);
          ui.toast(`${ic("coin")} ${tr("bought")} <b>${sel.name[store.lang]}</b>`);
        } else { sfx.error(); ui.toast(tr("notEnough")); return; }
        paint();
      }
    });
  };
  return { html, mount };
}

// ---------- Pestaña: Progreso
function progressView(): { html: string; mount: (r: HTMLElement) => void } {
  const runs = store.runs, recent = runs.slice(-20);
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const totalStars = LEVELS.reduce((n, l) => n + (store.best(l.id)?.stars ?? 0), 0);
  const miss: Record<string, number> = {};
  runs.slice(-50).forEach((r) => Object.entries(r.miss).forEach(([k, v]) => { miss[k] = (miss[k] ?? 0) + v; }));
  const hardest = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const tile = (label: string, value: string, glyph: Glyph) => `<div class="h-tile">${gl(glyph)}<b>${value}</b><span>${label}</span></div>`;
  const spark = () => {
    const vals = recent.map((r) => r.wpm), max = Math.max(10, ...vals), W = 300, H = 80, pad = 6;
    const x = (i: number) => pad + (vals.length < 2 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (vals.length - 1)), y = (v: number) => H - pad - (v / max) * (H - 2 * pad);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return `<svg class="h-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("wpmChart")}: ${vals.join(", ")}"><polyline points="${pts} ${x(vals.length - 1)},${H - pad} ${x(0)},${H - pad}" class="area"/><polyline points="${pts}" class="line"/>${vals.length ? `<circle cx="${x(vals.length - 1)}" cy="${y(vals[vals.length - 1])}" r="4"/>` : ""}</svg>`;
  };
  const html = `
    ${runs.length === 0 ? `<p class="h-empty">${tr("noRuns")}</p>` : `
    <div class="h-tiles">${tile(tr("avgWpm"), String(avg(recent.map((r) => r.wpm))), "bolt")}${tile(tr("bestWpm"), String(Math.max(...runs.map((r) => r.wpm))), "trophy")}${tile(tr("avgAcc"), `${avg(recent.map((r) => r.acc))}%`, "check")}${tile(tr("totalStars"), `${totalStars}/${LEVELS.length * 3}`, "star")}</div>
    <section class="h-card"><h3>${tr("wpmChart")}</h3>${spark()}</section>
    ${hardest.length ? `<section class="h-card"><h3>${tr("hardKeys")}</h3><div class="h-chips">${hardest.map(([k, n]) => `<span class="h-chip">${esc(k === " " ? "␣" : k)}<small>×${n}</small></span>`).join("")}</div></section>` : ""}`}
    <button class="h-row" id="h-rank"><span class="h-rowart">${gl("trophy")}</span><span class="h-rowtext"><b>${tr("ranking")}</b><small>${store.online.on ? `${tr("scopeRoom")}: ${store.online.room || "–"}` : tr("scopeWorld")}</small></span><span class="h-rowgo">${gl("chevron")}</span></button>`;
  const mount = (r: HTMLElement) => r.querySelector("#h-rank")!.addEventListener("click", () => { sfx.click(); ui.ranking("daily", "world"); });
  return { html, mount };
}

// ---------- Pestaña: Ajustes
function moreView(): { html: string; mount: (r: HTMLElement) => void } {
  const sw = (id: string, glyph: Glyph, title: string, on: boolean, sub = "") => `<button class="h-row" id="${id}" role="switch" aria-checked="${on}"><span class="h-rowart">${gl(glyph)}</span><span class="h-rowtext"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="h-switch" aria-hidden="true"></span></button>`;
  const link = (id: string, glyph: Glyph, title: string, sub = "") => `<button class="h-row" id="${id}"><span class="h-rowart">${gl(glyph)}</span><span class="h-rowtext"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="h-rowgo">${gl("chevron")}</span></button>`;
  const html = `
    <section class="h-group">
      <div class="h-row static"><span class="h-rowart">${gl("globe")}</span><span class="h-rowtext"><b>${tr("otherLang")}</b></span>
        <span class="h-seggroup" role="radiogroup"><button role="radio" aria-checked="${store.lang === "es"}" data-l="es">ES</button><button role="radio" aria-checked="${store.lang === "en"}" data-l="en">EN</button></span></div>
      ${sw("h-music", "music", tr("music"), store.music)}
      ${sw("h-sound", "volume", tr("sound"), !store.muted)}
      ${sw("h-help", "keyboard", tr("kbdHelp"), store.help)}
    </section>
    <section class="h-group">
      ${link("h-who2", "user", tr("player"), esc(store.current))}
      ${link("h-guide", "hands", tr("guide"))}
      ${link("h-box", "mail", tr("box"))}
      <div id="h-install"></div>
    </section>
    ${isAdmin() ? `<section class="h-group">${link("h-admin", "more", "Modo desarrollador")}</section>` : ""}
    <p class="h-version">${tr("gameVersion")} ${versionText}</p>`;
  const mount = (r: HTMLElement) => {
    const toggle = (id: string, fn: () => boolean) => r.querySelector(`#${id}`)!.addEventListener("click", (e) => { sfx.click(); (e.currentTarget as HTMLElement).setAttribute("aria-checked", String(fn())); });
    toggle("h-music", () => { store.music = !store.music; setMusicOn(store.music); unlockAudio(); music.start(); return store.music; });
    toggle("h-sound", () => { store.muted = !store.muted; setMuted(store.muted); unlockAudio(); music.start(); return !store.muted; });
    toggle("h-help", () => { store.help = !store.help; return store.help; });
    r.querySelector(".h-seggroup")!.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-l]");
      if (!b || b.dataset.l === store.lang) return;
      sfx.click(); store.lang = b.dataset.l as typeof store.lang; document.documentElement.lang = store.lang; rebuild();
    });
    r.querySelector("#h-who2")!.addEventListener("click", () => { sfx.click(); ui.profile(); });
    r.querySelector("#h-guide")!.addEventListener("click", () => { sfx.click(); ui.guide(() => openHub("more")); });
    r.querySelector("#h-box")!.addEventListener("click", () => { sfx.click(); ui.suggest(() => openHub("more")); });
    r.querySelector("#h-admin")?.addEventListener("click", () => { sfx.click(); ui.adminPanel(); });
    const slot = r.querySelector<HTMLElement>("#h-install")!;
    if (ui.canInstall()) {
      slot.innerHTML = `<button class="h-row" id="h-inst"><span class="h-rowart">${gl("download")}</span><span class="h-rowtext"><b>${tr("install")}</b><small id="h-insthint" hidden>${tr("installIos")}</small></span><span class="h-rowgo">${gl("chevron")}</span></button>`;
      slot.querySelector("#h-inst")!.addEventListener("click", async () => { sfx.click(); if (!(await ui.install())) slot.querySelector<HTMLElement>("#h-insthint")!.hidden = false; });
    }
  };
  return { html, mount };
}

// ---------- Carcasa
const VIEWS: Record<HubTab, () => { html: string; mount: (r: HTMLElement) => void }> = { play: playView, daily: dailyView, shop: shopView, progress: progressView, more: moreView };
const TITLES: Record<HubTab, Key> = { play: "pick", daily: "daily", shop: "shop", progress: "progress", more: "settings" };

function swap(el: HTMLElement) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }

export function updateHud() {
  const c = document.getElementById("h-coins"), s = document.getElementById("h-streak"), n = document.getElementById("h-name"), a = document.getElementById("h-av");
  if (c) c.textContent = store.coinsText;
  if (s) s.textContent = String(store.dailyStreak);
  if (n) n.textContent = store.current;
  if (a) a.textContent = (store.current[0] ?? "?").toUpperCase();
}

/** Qué parte de la pantalla ocupa el panel: la cámara deja a Vectorcito en el espacio que queda libre. */
function frame() {
  const panel = document.getElementById("h-panel");
  if (!panel) return;
  const wide = innerWidth / innerHeight > 1.05, r = panel.getBoundingClientRect();
  ui.getWorld().hub(cur === "shop", wide ? r.width / innerWidth : r.height / innerHeight);
}

function render(animate = false) {
  const shell = document.querySelector<HTMLElement>(".shell");
  const view = document.getElementById("h-view");
  if (!shell || !view) return;
  closeSheet?.();
  shell.dataset.tab = cur;
  shell.querySelectorAll<HTMLElement>(".h-tab").forEach((b) => { const on = b.dataset.t === cur; b.toggleAttribute("aria-current", on); if (on) b.setAttribute("aria-current", "page"); });
  const { html, mount } = VIEWS[cur]();
  const title = document.getElementById("h-title");
  if (title) title.textContent = tr(TITLES[cur]);
  view.innerHTML = html;
  if (animate) swap(view);
  mount(view);
  updateHud();
  if (cur !== "shop") ui.getWorld().dress(store.worn);
  frame();
}

/** Redibuja la carcasa entera (cambio de idioma). */
function rebuild() { document.querySelector(".shell")?.remove(); openHub(cur, false); }

function shellHtml() {
  return `<div class="shell" data-tab="${cur}">
    <header class="h-hud">
      <button class="h-who" id="h-who" aria-label="${tr("settings")}"><span class="h-av" id="h-av"></span><span class="h-name" id="h-name"></span></button>
      <div class="h-pills">
        <span class="h-pill flame" title="${tr("streak")}">${gl("flame")}<b id="h-streak">0</b></span>
        <span class="h-pill coin" title="${tr("coins")}">${gl("coin")}<b id="h-coins">0</b></span>
      </div>
    </header>
    <nav class="h-nav" aria-label="Menú">${TABS.map((t) => `<button class="h-tab" data-t="${t.id}">${gl(t.glyph)}<span>${tr(t.label)}</span></button>`).join("")}</nav>
    <div class="h-stage" aria-hidden="true"></div>
    <section class="h-panel" id="h-panel"><header class="h-paneltitle"><h2 id="h-title"></h2></header><div class="h-view" id="h-view"></div></section>
  </div>`;
}

let wired = false;
export function openHub(tab?: HubTab, push = true) {
  if (tab) cur = tab;
  const w = ui.getWorld();
  w.theme("menu"); w.mode("hub"); ui.setMood("menu");
  if (!document.querySelector(".shell")) {
    ui.show(shellHtml(), (root) => {
      const nav = root.querySelector<HTMLElement>(".h-nav")!;
      nav.addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>(".h-tab"); if (b) go(b.dataset.t as HubTab); });
      nav.addEventListener("keydown", (e) => { // flechas para moverse entre pestañas
        const keys = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]; if (!keys.includes(e.key)) return;
        e.preventDefault();
        const i = TABS.findIndex((t) => t.id === cur), d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        const next = TABS[(i + d + TABS.length) % TABS.length].id; go(next);
        nav.querySelector<HTMLElement>(`[data-t="${next}"]`)?.focus();
      });
      root.querySelector("#h-who")!.addEventListener("click", () => { sfx.click(); go("more"); });
      const ro = new ResizeObserver(() => frame()); ro.observe(root.querySelector("#h-panel")!);
      ui.onLeave(() => { ro.disconnect(); closeSheet?.(); });
      render(false);
    }, true);
  } else render(false);
  if (push && history.state?.hub !== cur) history.pushState({ hub: cur }, "");
  if (!wired) {
    wired = true;
    addEventListener("popstate", (e) => { const t = (e.state as { hub?: HubTab } | null)?.hub; if (t && document.querySelector(".shell")) { cur = t; render(true); } });
  }
}

function go(tab: HubTab) {
  if (tab === cur) return;
  sfx.click(); cur = tab; render(true);
  history.pushState({ hub: cur }, "");
}
