// Reglas del juego, sin pantalla ni sonido: fáciles de probar.
// Se escribe la frase completa, letra por letra. Una tecla incorrecta no avanza.
export type Hit = "ok" | "word" | "error" | "done" | "none";

export class Round {
  pos = 0;
  errors = 0;
  firstTry = 0;
  streak = 0;
  bestStreak = 0;
  start = 0;
  end = 0;
  readonly chars: string[];
  /** Veces que se falló cada letra esperada. */
  readonly missedChars: Record<string, number> = {};
  /** Palabras donde hubo al menos un fallo, sin repetir y en orden. */
  readonly missedWords: string[] = [];
  private started = false;
  private missed = false;

  constructor(readonly text: string) { this.chars = [...text]; }

  get done() { return this.pos >= this.chars.length; }
  get current() { return this.chars[this.pos] ?? ""; }

  key(c: string, now: number): Hit {
    if (this.done) return "none";
    if (!this.started) { this.started = true; this.start = now; }
    if (c !== this.current) {
      this.streak = 0;
      this.missed = true;
      this.errors++;
      const k = this.current.toLowerCase();
      this.missedChars[k] = (this.missedChars[k] ?? 0) + 1;
      const w = this.wordAt(this.pos);
      if (w && !this.missedWords.includes(w)) this.missedWords.push(w);
      return "error";
    }
    if (!this.missed) this.firstTry++;
    this.missed = false;
    this.pos++;
    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (this.done) { this.end = now; return "done"; }
    return c === " " ? "word" : "ok";
  }

  private wordAt(i: number) {
    let a = i, b = i;
    while (a > 0 && this.chars[a - 1] !== " ") a--;
    while (b < this.chars.length && this.chars[b] !== " ") b++;
    return this.chars.slice(a, b).join("").replace(/[.,;:!?¡¿]/g, "");
  }

  /** Letras acertadas a la primera sobre las escritas (si la frase está completa, sobre el total). */
  get accuracy() { return this.pos ? this.firstTry / this.pos : 0; }
  get seconds() { return Math.max(0, (this.end - this.start) / 1000); }
  /** Palabras por minuto estándar: 5 caracteres = 1 palabra. */
  get wpm() {
    if (!this.seconds) return 0;
    return Math.round(this.chars.length / 5 / (this.seconds / 60));
  }
  get stars() { return starsFor(this.accuracy); }
}

export const starsFor = (acc: number) => (acc >= 0.95 ? 3 : acc >= 0.85 ? 2 : 1);

export interface Summary {
  chars: number; firstTry: number; errors: number; acc: number; wpm: number;
  phrases: number; missedWords: string[]; missedChars: Record<string, number>;
}

/** Junta varias frases seguidas (reto diario, contrarreloj) en un solo resultado. */
export function summarize(rounds: Round[], secs: number): Summary {
  const sum = (f: (r: Round) => number) => rounds.reduce((n, r) => n + f(r), 0);
  const chars = sum((r) => r.pos), firstTry = sum((r) => r.firstTry);
  const missedChars: Record<string, number> = {};
  const missedWords: string[] = [];
  for (const r of rounds) {
    for (const [k, v] of Object.entries(r.missedChars)) missedChars[k] = (missedChars[k] ?? 0) + v;
    for (const w of r.missedWords) if (!missedWords.includes(w)) missedWords.push(w);
  }
  return {
    chars, firstTry, errors: sum((r) => r.errors),
    acc: chars ? firstTry / chars : 0,
    wpm: secs > 0 ? Math.round(chars / 5 / (secs / 60)) : 0,
    phrases: rounds.filter((r) => r.done).length,
    missedWords, missedChars,
  };
}
