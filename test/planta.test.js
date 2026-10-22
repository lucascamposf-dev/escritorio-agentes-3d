// A planta do escritorio: todo lugar importante tem que ser alcancavel a partir da porta,
// sem atravessar moveis. (Os arquivos de js/ sao modulos ES: carregados com import().)
const test = require("node:test");
const assert = require("node:assert");

let L, nav;
test.before(async () => {
  L = await import("../js/office3d/layout.js");
  nav = await import("../js/office3d/nav.js");
});

// confere um caminho: termina no destino e cada trecho reto passa so por lugares livres
function confere(de, para, nome) {
  const pts = nav.caminho(de, para);
  assert.ok(pts.length > 0, nome + ": sem caminho");
  const fim = pts[pts.length - 1];
  assert.ok(Math.hypot(fim.x - para.x, fim.z - para.z) < 0.01, nome + ": nao chegou");
  let a = de;
  // o ultimo trecho pode entrar num lugar "bloqueado" de proposito (sentar numa cadeira encostada na mesa)
  for (const p of pts.slice(0, -1)) {
    const d = Math.hypot(p.x - a.x, p.z - a.z);
    for (let k = 1; k < d / 0.1; k++) {
      const t = k / (d / 0.1);
      assert.ok(nav.livre(a.x + (p.x - a.x) * t, a.z + (p.z - a.z) * t), `${nome}: atravessa um movel perto de (${(a.x + (p.x - a.x) * t).toFixed(1)}, ${(a.z + (p.z - a.z) * t).toFixed(1)})`);
    }
    a = p;
  }
  return pts;
}

test("da porta da sala da para chegar em todo lugar importante", () => {
  const porta = L.PORTA.dentro;
  assert.ok(nav.livre(porta.x, porta.z), "a entrada esta bloqueada");
  L.PODS.forEach((p, i) => { confere(porta, p.porta, "porta da salinha " + i); confere(p.porta, p.dentro, "dentro da salinha " + i); });
  L.ASSENTOS.forEach((a, i) => confere(porta, a.aprox, "lugar " + i + " da mesa"));
  for (const [nome, lista] of Object.entries(L.SPOTS)) lista.forEach((s, i) => confere(porta, s.aprox || s, `${nome} ${i}`));
});

test("lugares de chegada nao ficam dentro de moveis", () => {
  const pontos = [L.PORTA.dentro, ...L.PODS.flatMap((p) => [p.porta, p.dentro]), ...L.ASSENTOS.map((a) => a.aprox),
    ...Object.values(L.SPOTS).flat().map((s) => s.aprox || s)];
  for (const p of pontos) assert.ok(nav.livre(p.x, p.z), `(${p.x.toFixed(2)}, ${p.z.toFixed(2)}) esta bloqueado`);
});

test("salinhas nao se sobrepoem e ficam dentro da sala", () => {
  const caixa = (p) => { const a = p.mundo(-1.4, -1.3), b = p.mundo(1.4, 1.3); return [Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)]; };
  const cx = L.PODS.map(caixa);
  for (const [x0, z0, x1, z1] of cx) assert.ok(x0 >= L.SALA.x0 - 1e-6 && x1 <= L.SALA.x1 + 1e-6 && z0 >= L.SALA.z0 - 1e-6 && z1 <= L.SALA.z1 + 1e-6);
  for (let i = 0; i < cx.length; i++) for (let j = i + 1; j < cx.length; j++) {
    const [a, b] = [cx[i], cx[j]];
    const sobre = Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 0.01 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 0.01;
    assert.ok(!sobre, `salinhas ${i} e ${j} se sobrepoem`);
  }
});
