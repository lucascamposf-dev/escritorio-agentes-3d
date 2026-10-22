// Caminhos pela sala: grade de 20 cm com os obstaculos do layout, A* em 8 direcoes e
// "puxada de barbante" no fim (tira os zigue-zagues quando ha linha reta livre).
import { SALA, obstaculos } from './layout.js';

const CEL = 0.2;
const RAIO = 0.3; // "gordura" dos personagens: ninguem encosta nos moveis
const W = Math.round((SALA.x1 - SALA.x0) / CEL), H = Math.round((SALA.z1 - SALA.z0) / CEL);
const bloq = new Uint8Array(W * H);

const cx = (x) => Math.max(0, Math.min(W - 1, Math.floor((x - SALA.x0) / CEL)));
const cz = (z) => Math.max(0, Math.min(H - 1, Math.floor((z - SALA.z0) / CEL)));
const centro = (i, j) => ({ x: SALA.x0 + (i + 0.5) * CEL, z: SALA.z0 + (j + 0.5) * CEL });

function montar() {
  const { rets, circ } = obstaculos();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const { x, z } = centro(i, j);
    let b = x < SALA.x0 + RAIO || x > SALA.x1 - RAIO || z < SALA.z0 + RAIO || z > SALA.z1 - 0.1;
    for (let k = 0; !b && k < rets.length; k++) {
      const [x0, z0, x1, z1] = rets[k];
      b = x > x0 - RAIO && x < x1 + RAIO && z > z0 - RAIO && z < z1 + RAIO;
    }
    for (let k = 0; !b && k < circ.length; k++) {
      const [ox, oz, r] = circ[k];
      b = (x - ox) ** 2 + (z - oz) ** 2 < (r + RAIO) ** 2;
    }
    bloq[j * W + i] = b ? 1 : 0;
  }
}
montar();

export const livre = (x, z) => x > SALA.x0 && x < SALA.x1 && z > SALA.z0 && z < SALA.z1 && !bloq[cz(z) * W + cx(x)];

// celula livre mais proxima (o destino pode cair dentro de um movel, ex.: a cadeira)
function maisProxima(i, j) {
  if (!bloq[j * W + i]) return [i, j];
  for (let r = 1; r < 30; r++) {
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const a = i + di, b = j + dj;
      if (a >= 0 && b >= 0 && a < W && b < H && !bloq[b * W + a]) return [a, b];
    }
  }
  return [i, j];
}

// linha reta livre entre dois pontos: amostrada a cada 5 cm e com 8 cm de folga
// para cada lado (assim o caminho nunca raspa na quina de um movel)
function linhaLivre(a, b) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.05);
  if (!d) return true;
  const px = -(b.z - a.z) / d * 0.08, pz = (b.x - a.x) / d * 0.08;
  const bloqueado = (x, z) => bloq[cz(z) * W + cx(x)];
  for (let k = 1; k < n; k++) {
    const t = k / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
    if (bloqueado(x, z) || bloqueado(x + px, z + pz) || bloqueado(x - px, z - pz)) return false;
  }
  return true;
}

// fila de prioridade simples (heap binario)
class Heap {
  constructor() { this.a = []; }
  push(n, f) { const a = this.a; a.push([f, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top[1];
  }
  get size() { return this.a.length; }
}

const VIZ = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
const g = new Float32Array(W * H), de = new Int32Array(W * H), visto = new Uint32Array(W * H);
let rodada = 0;

// devolve a lista de pontos {x,z} de "de" ate "para" (sem incluir o ponto de partida)
export function caminho(de0, para) {
  const [si, sj] = maisProxima(cx(de0.x), cz(de0.z)), [ti, tj] = maisProxima(cx(para.x), cz(para.z));
  const s = sj * W + si, alvo = tj * W + ti;
  rodada++;
  const h = (n) => { const i = n % W, j = (n / W) | 0; const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return dx + dz - 0.586 * Math.min(dx, dz); };
  const q = new Heap();
  visto[s] = rodada; g[s] = 0; de[s] = -1; q.push(s, h(s));
  let achou = false;
  while (q.size) {
    const n = q.pop();
    if (n === alvo) { achou = true; break; }
    const i = n % W, j = (n / W) | 0;
    for (const [di, dj, c] of VIZ) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= W || b >= H) continue;
      const m = b * W + a;
      if (bloq[m]) continue;
      if (di && dj && (bloq[j * W + a] || bloq[b * W + i])) continue; // nao corta quina
      const ng = g[n] + c;
      if (visto[m] === rodada && ng >= g[m]) continue;
      visto[m] = rodada; g[m] = ng; de[m] = n;
      q.push(m, ng + h(m));
    }
  }
  if (!achou) return [{ x: para.x, z: para.z }];
  const pts = [];
  for (let n = alvo; n !== -1 && n !== s; n = de[n]) pts.push(centro(n % W, (n / W) | 0));
  pts.reverse();
  pts.push({ x: para.x, z: para.z });
  // puxa o barbante
  const out = [];
  let ancora = { x: de0.x, z: de0.z }, k = 0;
  while (k < pts.length) {
    let ultimo = k;
    for (let m = k + 1; m < pts.length; m++) if (linhaLivre(ancora, pts[m])) ultimo = m;
    out.push(pts[ultimo]);
    ancora = pts[ultimo];
    k = ultimo + 1;
  }
  return out;
}

export const _grade = { W, H, CEL, bloq }; // para depurar e testar
