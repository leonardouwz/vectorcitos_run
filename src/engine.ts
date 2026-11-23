// Reglas del juego, sin pantalla ni sonido: fáciles de probar.
export type Hit = "ok" | "word" | "error" | "done" | "none";

export class Round {
  idx = 0;
  firstTry = 0;
  errors = 0;
  start = 0;
  end = 0;
  private started = false;
  private clean = true;
  private bad = false;

  constructor(readonly words: string[]) {}

  get done() { return this.idx >= this.words.length; }
  get current() { return this.words[this.idx] ?? ""; }

  /** Recibe lo escrito hasta ahora para la palabra actual. */
  type(value: string, now: number): Hit {
    if (this.done) return "none";
    if (!this.started) { this.started = true; this.start = now; }
    const w = this.current;
    if (value === w) {
      if (this.clean) this.firstTry++;
      this.idx++;
      this.clean = true;
      this.bad = false;
      if (this.done) { this.end = now; return "done"; }
      return "word";
    }
    if (w.startsWith(value)) { this.bad = false; return "ok"; }
    if (this.bad) return "none"; // un error se cuenta una vez por tropiezo
    this.bad = true;
    this.clean = false;
    this.errors++;
    return "error";
  }

  get accuracy() { return this.words.length ? this.firstTry / this.words.length : 0; }
  get seconds() { return Math.max(0, (this.end - this.start) / 1000); }
  /** Palabras por minuto estándar: 5 caracteres = 1 palabra. */
  get wpm() {
    if (!this.seconds) return 0;
    return Math.round(this.words.join(" ").length / 5 / (this.seconds / 60));
  }
  get stars() {
    const a = this.accuracy;
    return a >= 2 / 3 ? 3 : a >= 1 / 3 ? 2 : 1;
  }
}
