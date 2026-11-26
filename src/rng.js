// Générateur pseudo-aléatoire avec graine (mulberry32).
// Même graine + mêmes choix = exactement la même partie.
var G = globalThis.G = globalThis.G || {};

G.RNG = (function () {
  // Transforme une graine texte (« abc ») ou numérique en entier 32 bits.
  function hashSeed(seed) {
    const s = String(seed);
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function create(seed) {
    let a = hashSeed(seed);
    const rng = {
      seed,
      // Nombre dans [0, 1[
      next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      chance(p) { return rng.next() < p; },
      range(min, max) { return min + (max - min) * rng.next(); },
      int(min, max) { return Math.floor(rng.range(min, max + 1)); }, // bornes incluses
      pick(arr) { return arr[Math.floor(rng.next() * arr.length)]; },
      // Sous-générateur indépendant (ex. un par combat), pour que les choix
      // faits entre deux combats ne décalent pas les tirages des combats.
      fork(label) { return create(seed + '/' + label); },
    };
    return rng;
  }

  function randomSeed() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  return { create, randomSeed };
})();
