// Planta do escritorio (metros). x: -12 (esquerda) .. 12 (direita); z: -8 (fundo) .. 8 (frente, aberta).
// Todo o resto (moveis, caminhos, personagens) le as posicoes daqui; os temas so mudam a aparencia.
export const SALA = { x0: -12, x1: 12, z0: -8, z1: 8, altura: 3.6 };

const rad = (g) => (g * Math.PI) / 180;
// angulo para "olhar" de (x,z) na direcao de (tx,tz); os personagens olham para +z quando ang = 0
export const olharPara = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// ---------- mesa redonda dos agentes principais ----------
export const MESA = { x: 0, z: -0.4, raio: 1.6 };
// 8 lugares; os principais ficam do lado de tras, olhando para a camera
const ANGULOS = [235, 305, 270, 200, 340, 145, 35, 90];
export const ASSENTOS = ANGULOS.map((g, i) => {
  const a = rad(g), r = 2.25, ra = 2.95;
  const x = MESA.x + Math.cos(a) * r, z = MESA.z + Math.sin(a) * r;
  return {
    id: 'mesa' + i, x, z, ang: olharPara(x, z, MESA.x, MESA.z),
    aprox: { x: MESA.x + Math.cos(a) * ra, z: MESA.z + Math.sin(a) * ra },
    // notebook na mesa, na frente do lugar
    note: { x: MESA.x + Math.cos(a) * 1.15, z: MESA.z + Math.sin(a) * 1.15 },
  };
});
export const LUGAR_PRINCIPAL = { plan: 0, build: 1 };

// ---------- salinhas dos subagentes ----------
// 6 no fundo (porta para a frente) e 2 na parede direita (porta para a esquerda).
// rot: rotacao da salinha; em coordenadas locais a porta fica em +z e a mesa encostada em -x.
export const POD = { largura: 2.8, fundo: 2.6, porta: 1.0, alturaVidro: 2.3 };
export const PODS = [
  ...[-7, -4.2, -1.4, 1.4, 4.2, 7].map((x) => ({ x, z: -8 + POD.fundo / 2, rot: 0 })),
  ...[-3.7, -0.9].map((z) => ({ x: 12 - POD.fundo / 2, z, rot: -Math.PI / 2 })),
].map((p, i) => {
  // converte um ponto local (lx, lz) da salinha para o mundo
  const c = Math.cos(p.rot), s = Math.sin(p.rot);
  const mundo = (lx, lz) => ({ x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c });
  const cad = mundo(-0.35, -0.15), mesa = mundo(-0.95, -0.15);
  return {
    id: 'pod' + i, ...p, mundo,
    porta: mundo(0, POD.fundo / 2 + 0.45),       // do lado de fora da porta
    dentro: mundo(0.2, 0.45),
    cadeira: { ...cad, ang: olharPara(cad.x, cad.z, mesa.x, mesa.z) },
  };
});

// ---------- copa, lounge, quadra, porta ----------
export const PORTA = { x: SALA.x0, z: 6.6, fora: { x: SALA.x0 - 1.4, z: 6.6 }, dentro: { x: SALA.x0 + 1.1, z: 6.6 } };
export const AGUA = { x: SALA.x0 + 0.35, z: -5.4 };                      // filtro encostado na parede esquerda
export const CAFE = { x0: SALA.x0, x1: SALA.x0 + 3.2, z0: SALA.z0, z1: SALA.z0 + 0.75 }; // bancada no canto do fundo
export const LOUNGE = { x: -8.6, z: 2.6 };
export const QUADRA = { x0: 5.4, x1: SALA.x1, z0: 2.2, z1: SALA.z1, aro: { x: SALA.x1 - 0.75, y: 2.3, z: 5.1 } };
export const TV = { x: 10.2, y: 2.05, z: SALA.z0 + 0.06 };              // telao no canto direito do fundo
export const JANELAS = { x: SALA.x0, z0: -4.6, z1: 4.8, y0: 0.9, y1: 3.0 }; // janelao da parede esquerda

// ---------- lugares onde os personagens vao "fazer coisas" ----------
// cada um: onde parar (x,z), para onde olhar (ang) e o que fazer (acao)
export const SPOTS = {
  agua: [{ x: AGUA.x + 0.75, z: AGUA.z, ang: -Math.PI / 2, acao: 'beber' }, { x: AGUA.x + 1.2, z: AGUA.z + 0.9, ang: -2.2, acao: 'esperar' }],
  cafe: [-11.2, -10.2, -9.2].map((x) => ({ x, z: CAFE.z1 + 0.5, ang: Math.PI, acao: 'cafe' })),
  // sentar: (x,z) e o assento (dentro do sofa); aprox e onde o personagem chega andando
  sofa: [
    ...[-1.6, -0.6, 0.4].map((dx) => ({ x: LOUNGE.x + dx, z: LOUNGE.z - 1.55, ang: 0, acao: 'sentarSofa', aprox: { x: LOUNGE.x + dx, z: LOUNGE.z - 0.75 } })),
    { x: LOUNGE.x + 2.2, z: LOUNGE.z - 0.2, ang: -Math.PI / 2, acao: 'sentarSofa', aprox: { x: LOUNGE.x + 1.35, z: LOUNGE.z - 0.2 } },
  ],
  janela: [-3.2, -0.6, 3.6].map((z) => ({ x: JANELAS.x + 0.8, z, ang: -Math.PI / 2, acao: 'olharJanela' })),
  quadra: [{ x: 8.3, z: 5.1 }, { x: 8.8, z: 3.5 }, { x: 8.8, z: 6.7 }].map((p) => ({ ...p, ang: olharPara(p.x, p.z, QUADRA.aro.x, QUADRA.aro.z), acao: 'arremessar' })),
  plantas: [{ x: -1.6, z: 3.6, ang: Math.PI, acao: 'regar' }, { x: 5.7, z: -2.7, ang: Math.PI, acao: 'regar' }],
  conversa: [{ x: -4.5, z: 2.5, ang: Math.PI / 2, acao: 'conversar' }, { x: -3.4, z: 2.5, ang: -Math.PI / 2, acao: 'conversar' },
    { x: 3.6, z: 2.6, ang: -Math.PI / 2, acao: 'conversar' }, { x: 2.5, z: 2.6, ang: Math.PI / 2, acao: 'conversar' }],
};

// ---------- obstaculos para o calculo de caminhos ----------
// retangulos [x0, z0, x1, z1] e circulos [x, z, r]; o nav.js engorda tudo pelo "raio" dos personagens
export function obstaculos() {
  const rets = [], circ = [];
  circ.push([MESA.x, MESA.z, MESA.raio + 0.05]);
  // salinhas: paredes de vidro (com a abertura da porta) e a mesa interna
  const e = 0.08, L = POD.largura / 2, F = POD.fundo / 2, meiaPorta = POD.porta / 2;
  const segLocal = [
    [-L, -F, -L + e, F], [L - e, -F, L, F],                 // laterais
    [-L, F - e, -meiaPorta, F], [meiaPorta, F - e, L, F],   // frente, com a porta no meio
    [-L, -F, -L + 0.75, F - 0.55],                          // mesa encostada na lateral
  ];
  for (const p of PODS) {
    for (const [a, b, c, d] of segLocal) {
      const p1 = p.mundo(a, b), p2 = p.mundo(c, d);
      rets.push([Math.min(p1.x, p2.x), Math.min(p1.z, p2.z), Math.max(p1.x, p2.x), Math.max(p1.z, p2.z)]);
    }
  }
  rets.push([CAFE.x0, CAFE.z0, CAFE.x1, CAFE.z1]);
  rets.push([AGUA.x - 0.35, AGUA.z - 0.35, AGUA.x + 0.35, AGUA.z + 0.35]);
  // lounge: sofa de 3 lugares, poltrona e mesinha de centro
  rets.push([LOUNGE.x - 2.2, LOUNGE.z - 2.1, LOUNGE.x + 1.0, LOUNGE.z - 1.3]);
  rets.push([LOUNGE.x + 1.85, LOUNGE.z - 0.65, LOUNGE.x + 2.6, LOUNGE.z + 0.25]);
  rets.push([LOUNGE.x - 0.9, LOUNGE.z - 0.35, LOUNGE.x + 0.7, LOUNGE.z + 0.45]);
  // tela da TV (movel embaixo), poste da cesta e banco da quadra
  rets.push([TV.x - 1.4, SALA.z0, TV.x + 1.4, SALA.z0 + 0.55]);
  rets.push([QUADRA.aro.x - 0.1, QUADRA.aro.z - 0.35, SALA.x1, QUADRA.aro.z + 0.35]);
  rets.push([6.0, SALA.z1 - 0.6, 8.6, SALA.z1]);
  // plantas grandes e os lugares de decoracao dos temas
  for (const [x, z] of VASOS) circ.push([x, z, 0.38]);
  for (const [x, z, r] of DECO) circ.push([x, z, r]);
  return { rets, circ };
}

// vasos de planta grandes (posicoes compartilhadas por todos os temas)
// lugares onde cada tema poe sua decoracao propria (lareira, fliperama, robo...): [x, z, raio]
export const DECO = [[-3.6, 7.25, 0.55], [0.9, 7.3, 0.55], [-5.6, -4.2, 0.45]];

export const VASOS = [[-1.6, 4.5], [5.7, -3.4], [-5.6, 7.3], [11.3, 1.6], [-11.4, -2.6], [2.6, 7.4], [8.9, -5.0]];
