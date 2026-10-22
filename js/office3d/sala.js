// Monta a sala de um tema: a estrutura e a mesma em todos (layout.js); o tema escolhe
// cores, materiais, luzes, vista da janela e as decoracoes proprias (tema.extras).
import * as THREE from 'three';
import { Kit, TEX } from './geo.js';
import { vista } from './vista.js';
import { SALA, MESA, ASSENTOS, PODS, POD, PORTA, AGUA, CAFE, LOUNGE, QUADRA, TV, JANELAS, VASOS, DECO } from './layout.js';

const PI = Math.PI;

export function construirSala(engine, tema) {
  const raiz = new THREE.Group();
  raiz.name = 'sala:' + tema.id;
  engine.scene.add(raiz);
  const kit = new Kit(raiz);
  const ticks = [];
  const T = tema;
  const tick = (f) => ticks.push(f);
  const ctx = { kit, THREE, T, tick, raiz, engine };

  engine.aplicarLuz(T.luz);
  engine.scene.fog = T.fog ? new THREE.Fog(T.fog.cor, T.fog.perto, T.fog.longe) : null;

  // ---------- piso, tapete, paredes ----------
  const piso = kit.malha(kit.geo('plano', SALA.x1 - SALA.x0, SALA.z1 - SALA.z0), T.piso(kit), 0, 0, 0);
  piso.rotation.x = -PI / 2; piso.castShadow = false;
  const tapete = kit.malha(kit.geo('cil', 3.4, 3.4, 0.02, 48), kit.mat(T.tapete, { map: TEX.carpete(kit, T.tapete, [4, 4]), rough: 1 }), MESA.x, 0.012, MESA.z);
  tapete.castShadow = false;

  const paredeM = T.parede(kit), E = 0.16, A = SALA.altura;
  const parede = (w, h, d, x, y, z) => kit.caixa(w, h, d, paredeM, x, y, z);
  parede(SALA.x1 - SALA.x0 + E, A, E, 0, A / 2, SALA.z0 - E / 2);                       // fundo
  parede(E, A, SALA.z1 - SALA.z0, SALA.x1 + E / 2, A / 2, 0);                            // direita
  // esquerda: com o janelao e a porta recortados
  const xl = SALA.x0 - E / 2, j = JANELAS, p0 = PORTA.z - 0.65, p1 = PORTA.z + 0.65, ap = 2.35;
  parede(E, A, j.z0 - SALA.z0, xl, A / 2, (SALA.z0 + j.z0) / 2);
  parede(E, j.y0, j.z1 - j.z0, xl, j.y0 / 2, (j.z0 + j.z1) / 2);
  parede(E, A - j.y1, j.z1 - j.z0, xl, (A + j.y1) / 2, (j.z0 + j.z1) / 2);
  parede(E, A, p0 - j.z1, xl, A / 2, (j.z1 + p0) / 2);
  parede(E, A - ap, p1 - p0, xl, (A + ap) / 2, PORTA.z);
  parede(E, A, SALA.z1 - p1, xl, A / 2, (p1 + SALA.z1) / 2);
  // rodape
  const rod = kit.mat(T.rodape);
  kit.caixa(SALA.x1 - SALA.x0, 0.12, 0.03, rod, 0, 0.06, SALA.z0 + 0.015);
  kit.caixa(0.03, 0.12, SALA.z1 - SALA.z0, rod, SALA.x1 - 0.015, 0.06, 0);

  // ---------- janelao com a vista ----------
  const caixilho = kit.mat(T.caixilho, { rough: 0.4, metal: 0.6 });
  const jh = j.y1 - j.y0, jw = j.z1 - j.z0, jc = (j.z0 + j.z1) / 2;
  kit.caixa(0.1, 0.08, jw, caixilho, SALA.x0, j.y0, jc);
  kit.caixa(0.1, 0.08, jw, caixilho, SALA.x0, j.y1, jc);
  const nCols = T.janelaCols || 5;
  for (let i = 0; i <= nCols; i++) kit.caixa(0.1, jh, 0.07, caixilho, SALA.x0, (j.y0 + j.y1) / 2, j.z0 + (jw * i) / nCols);
  if (T.janelaTravessa) kit.caixa(0.08, 0.05, jw, caixilho, SALA.x0, j.y0 + jh * 0.62, jc);
  const vidro = kit.malha(kit.geo('plano', jw, jh), kit.mat(0xbfd8ff, { opac: 0.12, rough: 0.05, metal: 0.2 }), SALA.x0 + 0.01, (j.y0 + j.y1) / 2, jc, raiz, false);
  vidro.rotation.y = PI / 2;
  // a paisagem fica logo atras do vidro e nao passa da altura da parede (senao aparece por cima)
  const v = vista(kit, T.vista, jw + 1.6, A - 0.25);
  v.malha.position.set(SALA.x0 - 0.6, (A - 0.25) / 2, jc);
  v.malha.rotation.y = PI / 2;
  raiz.add(v.malha);
  tick((dt, t) => v.tick(dt, t));
  // a porta: batente, fundo escuro do corredor e a folha (abre quando alguem passa)
  kit.caixa(0.2, 0.1, 1.4, caixilho, SALA.x0, ap, PORTA.z);
  kit.caixa(0.2, ap, 0.1, caixilho, SALA.x0, ap / 2, p0); kit.caixa(0.2, ap, 0.1, caixilho, SALA.x0, ap / 2, p1);
  kit.caixa(0.05, ap, 1.3, kit.mat(0x0b0c10, { rough: 1 }), SALA.x0 - 1.6, ap / 2, PORTA.z);
  const dobradica = kit.grupo(SALA.x0, 0, p0 + 0.05);
  kit.rcaixa(0.06, ap - 0.05, 1.18, 0.02, kit.mat(T.porta, { rough: 0.5 }), 0, ap / 2, 0.59, dobradica);
  kit.esf(0.04, kit.mat(0xd0d0d0, { metal: 1, rough: 0.2 }), 0.08, 1.05, 1.05, dobradica);
  const porta = { abertura: 0, alvo: 0 };
  tick((dt) => { porta.abertura += (porta.alvo - porta.abertura) * Math.min(1, dt * 6); dobradica.rotation.y = -porta.abertura * 1.7; });

  // ---------- luz do teto ----------
  const luzes = T.luzTeto || { cor: 0xfff1dd, forca: 6 };
  for (const [x, z] of [[MESA.x, MESA.z], [-8, -2], [8.5, 4.5], [-8.6, 3.5]]) {
    const l = new THREE.PointLight(luzes.cor, luzes.forca, 11, 1.6);
    l.position.set(x, 3.2, z);
    raiz.add(l);
  }

  // ---------- mesa redonda dos agentes ----------
  const mesa = kit.grupo(MESA.x, 0, MESA.z);
  kit.cil(MESA.raio, MESA.raio, 0.07, kit.mat(T.tampo, { rough: 0.35 }), 0, 0.76, 0, mesa, 64);
  kit.cil(MESA.raio + 0.02, MESA.raio + 0.02, 0.02, kit.mat(T.destaque, { emis: T.destaque, ei: 0.6 }), 0, 0.735, 0, mesa, 64);
  kit.cil(0.18, 0.28, 0.72, kit.mat(T.metal, { metal: 0.7, rough: 0.35 }), 0, 0.36, 0, mesa);
  kit.cil(0.7, 0.75, 0.04, kit.mat(T.metal, { metal: 0.7, rough: 0.35 }), 0, 0.02, 0, mesa);
  const notes = ASSENTOS.map((a) => {
    cadeira(kit, T, a.x, a.z, a.ang);
    return notebook(kit, T, a.note.x, 0.795, a.note.z, a.ang + PI);
  });

  // ---------- salinhas dos subagentes (aparecem conforme precisa) ----------
  const pods = PODS.map((p, i) => salinha(kit, T, p, i));

  // ---------- copa: bancada de cafe ----------
  const cafeW = CAFE.x1 - CAFE.x0, cafeX = (CAFE.x0 + CAFE.x1) / 2, cafeZ = (CAFE.z0 + CAFE.z1) / 2;
  kit.rcaixa(cafeW, 0.86, CAFE.z1 - CAFE.z0, 0.02, kit.mat(T.armario, { rough: 0.6 }), cafeX, 0.43, cafeZ);
  kit.rcaixa(cafeW + 0.04, 0.05, CAFE.z1 - CAFE.z0 + 0.04, 0.015, kit.mat(T.bancada, { rough: 0.3 }), cafeX, 0.885, cafeZ);
  kit.rcaixa(cafeW, 0.7, 0.35, 0.02, kit.mat(T.armario, { rough: 0.6 }), cafeX, 2.35, SALA.z0 + 0.18);
  const maq = kit.grupo(CAFE.x0 + 0.7, 0.91, cafeZ - 0.1);
  kit.rcaixa(0.42, 0.55, 0.38, 0.05, kit.mat(0x22252e, { rough: 0.3, metal: 0.4 }), 0, 0.275, 0, maq);
  kit.rcaixa(0.3, 0.08, 0.06, 0.02, kit.mat(0x111111, { emis: 0x40ff9a, ei: 1.5 }), 0, 0.42, 0.2, maq);
  kit.cil(0.045, 0.04, 0.09, kit.mat(0xffffff, { rough: 0.3 }), 0, 0.1, 0.12, maq);
  for (let i = 0; i < 4; i++) kit.cil(0.045, 0.04, 0.1, kit.mat([0xe85d5d, 0x5aa9ff, 0xffd166, 0x4ade80][i], { rough: 0.4 }), CAFE.x0 + 1.4 + i * 0.16, 0.96, cafeZ + 0.08);
  const fruteira = kit.grupo(CAFE.x0 + 2.5, 0.92, cafeZ);
  kit.cil(0.2, 0.12, 0.08, kit.mat(T.madeira), 0, 0.04, 0, fruteira);
  for (const [x, z, c] of [[0.06, 0, 0xff8a3d], [-0.07, 0.04, 0xe23b3b], [0, -0.07, 0x9be03b]]) kit.esf(0.06, kit.mat(c, { rough: 0.5 }), x, 0.12, z, fruteira);

  // ---------- filtro de agua ----------
  const ag = kit.grupo(AGUA.x, 0, AGUA.z);
  kit.rcaixa(0.42, 1.0, 0.4, 0.04, kit.mat(0xf2f4f7, { rough: 0.4 }), 0, 0.5, 0, ag);
  kit.cil(0.17, 0.17, 0.48, kit.mat(0x6ec6ff, { opac: 0.55, rough: 0.05 }), 0, 1.25, 0, ag);
  kit.cil(0.09, 0.17, 0.08, kit.mat(0x6ec6ff, { opac: 0.55, rough: 0.05 }), 0, 1.51, 0, ag);
  kit.caixa(0.08, 0.05, 0.06, kit.mat(0x2b6cb0), 0.2, 0.82, -0.06, ag);
  kit.caixa(0.08, 0.05, 0.06, kit.mat(0xd64545), 0.2, 0.82, 0.06, ag);
  kit.cil(0.05, 0.05, 0.3, kit.mat(0xffffff, { opac: 0.8 }), 0.05, 0.68, 0.26, ag);

  // ---------- lounge ----------
  const lz = LOUNGE.z, lx = LOUNGE.x;
  const tapL = kit.malha(kit.geo('caixa', 4.6, 0.02, 3.4), kit.mat(T.tapete2, { map: TEX.carpete(kit, T.tapete2, [3, 2]), rough: 1 }), lx - 0.4, 0.011, lz - 0.2);
  tapL.castShadow = false;
  sofa(kit, T, lx - 0.6, lz - 1.7, 0, 3);
  sofa(kit, T, lx + 2.25, lz - 0.2, -PI / 2, 1);
  kit.rcaixa(1.6, 0.36, 0.8, 0.06, kit.mat(T.madeira, { rough: 0.45 }), lx - 0.1, 0.18, lz + 0.05);
  kit.cil(0.07, 0.07, 0.12, kit.mat(0xffffff), lx - 0.4, 0.42, lz, raiz);
  luminaria(kit, T, lx - 2.5, lz - 2.2);

  // ---------- quadra de basquete ----------
  const qw = QUADRA.x1 - QUADRA.x0, qd = QUADRA.z1 - QUADRA.z0;
  const chaoQ = kit.malha(kit.geo('plano', qw, qd), kit.mat(0xffffff, { map: TEX.quadra(kit, T.quadra.piso, T.quadra.linha, T.quadra.destaque), rough: 0.55 }),
    (QUADRA.x0 + QUADRA.x1) / 2, 0.013, (QUADRA.z0 + QUADRA.z1) / 2);
  chaoQ.rotation.x = -PI / 2; chaoQ.castShadow = false;
  const aro = QUADRA.aro;
  kit.cil(0.07, 0.09, aro.y + 0.6, kit.mat(0x30343e, { metal: 0.6, rough: 0.4 }), SALA.x1 - 0.2, (aro.y + 0.6) / 2, aro.z);
  kit.caixa(0.6, 0.08, 0.08, kit.mat(0x30343e, { metal: 0.6 }), SALA.x1 - 0.45, aro.y + 0.35, aro.z);
  const tabela = kit.grupo(SALA.x1 - 0.55, aro.y + 0.45, aro.z);
  kit.rcaixa(0.05, 0.75, 1.15, 0.02, kit.mat(0xffffff, { opac: 0.85, rough: 0.1 }), 0, 0, 0, tabela);
  // quadradinho vermelho acima do aro: 2 barras em pe e 2 deitadas
  const verm = kit.mat(0xe0442c);
  for (const z of [-0.22, 0.22]) kit.caixa(0.06, 0.3, 0.03, verm, 0, -0.12, z, tabela);
  for (const y of [0.02, -0.27]) kit.caixa(0.06, 0.03, 0.47, verm, 0, y, 0, tabela);
  const anel = kit.malha(kit.geo('toro', 0.23, 0.018, 8, 32), kit.mat(0xff6a1a, { metal: 0.5, rough: 0.4 }), aro.x, aro.y, aro.z);
  anel.rotation.x = PI / 2;
  const rede = kit.malha(kit.geo('cil', 0.22, 0.14, 0.38, 16), kit.mat(0xffffff, { opac: 0.45, lado: true }), aro.x, aro.y - 0.2, aro.z);
  rede.castShadow = false;
  rede.material.wireframe = true;
  // banco e suporte de bolas
  kit.rcaixa(2.4, 0.08, 0.4, 0.03, kit.mat(T.madeira, { rough: 0.5 }), 7.3, 0.45, SALA.z1 - 0.3);
  for (const x of [6.3, 8.3]) kit.caixa(0.06, 0.45, 0.35, kit.mat(0x30343e), x, 0.225, SALA.z1 - 0.3);
  for (let i = 0; i < 3; i++) bola(kit, 6.4 + i * 0.32, 0.6, SALA.z1 - 0.3);

  // ---------- telao com o painel ao vivo ----------
  kit.rcaixa(2.8, 0.5, 0.5, 0.04, kit.mat(T.armario, { rough: 0.6 }), TV.x, 0.25, SALA.z0 + 0.27);
  kit.rcaixa(2.7, 1.55, 0.08, 0.03, kit.mat(0x0b0c10, { rough: 0.3, metal: 0.4 }), TV.x, TV.y, TV.z + 0.04);
  const tvCv = document.createElement('canvas'); tvCv.width = 1024; tvCv.height = 576;
  const tvTex = new THREE.CanvasTexture(tvCv); tvTex.colorSpace = THREE.SRGBColorSpace; kit.texs.push(tvTex);
  const tela = kit.malha(kit.geo('plano', 2.56, 1.44), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false }), TV.x, TV.y, TV.z + 0.085, raiz, false);
  kit.mats.set('tela-tv', tela.material);

  // ---------- relogio de parede (hora de verdade) ----------
  const rel = kit.grupo(-1.4, 3.05, SALA.z0 + 0.03);
  const disco = kit.malha(kit.geo('cil', 0.32, 0.32, 0.04, 40), kit.mat(T.relogio || 0xffffff, { rough: 0.4 }), 0, 0, 0, rel);
  disco.rotation.x = PI / 2;
  const aroR = kit.malha(kit.geo('toro', 0.32, 0.025, 8, 40), kit.mat(T.metal, { metal: 0.8, rough: 0.3 }), 0, 0, 0.01, rel);
  aroR.castShadow = false;
  const ponteiro = (c, l, w) => { const g = kit.grupo(0, 0, 0.03, 0, rel); kit.caixa(w, l, 0.01, kit.mat(c), 0, l / 2, 0, g); return g; };
  const ph = ponteiro(0x1b1d24, 0.17, 0.035), pm = ponteiro(0x1b1d24, 0.25, 0.022), ps = ponteiro(0xe0442c, 0.27, 0.01);
  tick(() => {
    const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
    ph.rotation.z = -h / 12 * 2 * PI; pm.rotation.z = -m / 60 * 2 * PI; ps.rotation.z = -s / 60 * 2 * PI;
  });

  // ---------- plantas ----------
  VASOS.forEach(([x, z], i) => planta(kit, T, x, z, i));

  // ---------- decoracao propria do tema (nos lugares DECO e onde mais quiser) ----------
  if (T.extras) T.extras(ctx, DECO);

  // ---------- API usada pelo diretor ----------
  const telaCor = (m, cor) => { m.material.emissive.set(cor ?? 0x000000); m.material.emissiveIntensity = cor == null ? 0 : 1.4; };
  return {
    raiz, kit, porta,
    tick: (dt, t) => { for (const f of ticks) f(dt, t); for (const p of pods) p.animar(dt); },
    // tela do notebook de um lugar da mesa (null = desligada)
    telaMesa: (i, cor) => notes[i] && telaCor(notes[i], cor),
    telaPod: (i, cor) => pods[i] && telaCor(pods[i].tela, cor),
    mostrarPod: (i) => pods[i] && pods[i].mostrar(),
    podVisivel: (i) => pods[i] && pods[i].visivel,
    tv: (desenhar) => { desenhar(tvCv.getContext('2d'), tvCv.width, tvCv.height); tvTex.needsUpdate = true; },
    liberar() { engine.scene.remove(raiz); kit.liberar(); engine.scene.fog = null; },
  };
}

// ---------- moveis ----------
function cadeira(kit, T, x, z, ang, pai) {
  const g = kit.grupo(x, 0, z, ang, pai || kit.raiz);
  const est = kit.mat(T.cadeira, { rough: 0.7 }), met = kit.mat(T.metal, { metal: 0.7, rough: 0.35 });
  kit.rcaixa(0.5, 0.08, 0.48, 0.035, est, 0, 0.47, 0, g);
  kit.rcaixa(0.48, 0.55, 0.07, 0.035, est, 0, 0.8, -0.24, g);
  kit.cil(0.025, 0.025, 0.4, met, 0, 0.25, 0, g);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = kit.caixa(0.03, 0.03, 0.28, met, Math.sin(a) * 0.13, 0.05, Math.cos(a) * 0.13, g);
    p.rotation.y = a;
    kit.esf(0.028, kit.mat(0x111111), Math.sin(a) * 0.26, 0.028, Math.cos(a) * 0.26, g);
  }
  return g;
}

function notebook(kit, T, x, y, z, ang) {
  const g = kit.grupo(x, y, z, ang);
  const cor = kit.mat(T.notebook || 0xb8bec9, { metal: 0.6, rough: 0.35 });
  kit.rcaixa(0.36, 0.018, 0.25, 0.008, cor, 0, 0.009, 0, g);
  const tampa = kit.grupo(0, 0.018, -0.12, 0, g);
  tampa.rotation.x = -0.25;
  kit.rcaixa(0.36, 0.24, 0.012, 0.008, cor, 0, 0.12, 0, tampa);
  // a tela tem material proprio (acende com a cor do estado)
  const tela = kit.malha(kit.geo('plano', 0.32, 0.2), new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.3 }), 0, 0.12, 0.007, tampa, false);
  kit.mats.set('tela' + tela.uuid, tela.material);
  return tela;
}

function salinha(kit, T, p, i) {
  const g = kit.grupo(p.x, 0, p.z, p.rot);
  const L = POD.largura / 2, F = POD.fundo / 2, H = POD.alturaVidro, mp = POD.porta / 2;
  const vidroM = kit.mat(T.vidro.cor, { opac: T.vidro.opac, rough: 0.05, metal: 0.1 });
  const perfil = kit.mat(T.caixilho, { rough: 0.4, metal: 0.6 });
  const vid = (w, x, z, rot) => { const m = kit.malha(kit.geo('caixa', w, H, 0.02), vidroM, x, H / 2, z, g, false); m.rotation.y = rot; };
  vid(POD.fundo, -L, 0, PI / 2); vid(POD.fundo, L, 0, PI / 2);
  vid(L - mp, -(L + mp) / 2, F, 0); vid(L - mp, (L + mp) / 2, F, 0);
  // faixa fosca no vidro e perfis
  const faixa = kit.mat(T.destaque, { opac: 0.55, emis: T.destaque, ei: T.faixaBrilho ?? 0.25 });
  for (const [w, x, z, r] of [[L - mp, -(L + mp) / 2, F, 0], [L - mp, (L + mp) / 2, F, 0]]) { const f = kit.caixa(w, 0.12, 0.025, faixa, x, 1.15, z, g); f.rotation.y = r; }
  for (const [x, z] of [[-L, F], [L, F], [-mp, F], [mp, F], [-L, -F], [L, -F]]) kit.caixa(0.05, H, 0.05, perfil, x, H / 2, z, g);
  kit.caixa(POD.largura, 0.05, 0.05, perfil, 0, H, F, g);
  kit.caixa(0.05, 0.05, POD.fundo, perfil, -L, H, 0, g); kit.caixa(0.05, 0.05, POD.fundo, perfil, L, H, 0, g);
  // piso da salinha, mesa encostada na lateral, monitor, cadeira e um vasinho
  const pisoP = kit.malha(kit.geo('plano', POD.largura - 0.05, POD.fundo - 0.05), kit.mat(T.pisoPod || T.tapete2, { rough: 0.9 }), 0, 0.014, 0, g, false);
  pisoP.rotation.x = -PI / 2; pisoP.receiveShadow = true;
  kit.rcaixa(0.7, 0.05, 1.5, 0.02, kit.mat(T.tampo, { rough: 0.35 }), -L + 0.4, 0.74, -0.15, g);
  for (const dz of [-0.85, 0.55]) kit.caixa(0.6, 0.72, 0.04, kit.mat(T.metal, { metal: 0.6, rough: 0.4 }), -L + 0.4, 0.36, -0.15 + dz, g);
  const mon = kit.grupo(-L + 0.2, 0.77, -0.15, PI / 2, g);
  kit.cil(0.08, 0.1, 0.02, kit.mat(0x22252e), 0, 0.01, 0, mon);
  kit.caixa(0.04, 0.3, 0.04, kit.mat(0x22252e), 0, 0.16, 0, mon);
  kit.rcaixa(0.72, 0.42, 0.04, 0.015, kit.mat(0x15171d, { rough: 0.3 }), 0, 0.45, 0.02, mon);
  const tela = kit.malha(kit.geo('plano', 0.66, 0.36), new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.3 }), 0, 0.45, 0.045, mon, false);
  kit.mats.set('tela' + tela.uuid, tela.material);
  kit.rcaixa(0.16, 0.02, 0.44, 0.008, kit.mat(0x2a2d36), -L + 0.6, 0.775, -0.15, g);
  // a cadeira fica em coordenadas do mundo (fora do grupo): escondida/animada junto com a salinha
  const cad = p.cadeira;
  const cadMesh = cadeira(kit, T, cad.x, cad.z, cad.ang);
  vasinho(kit, T, -L + 0.4, 0.77, -0.8, g);
  // placa com o numero da salinha
  const placa = kit.textura(128, 64, (c, w, h) => { c.fillStyle = '#10131a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 40px Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('0' + (i + 1), w / 2, h / 2 + 2); });
  kit.malha(kit.geo('plano', 0.3, 0.15), kit.mat(0xffffff, { map: placa, rough: 0.5 }), (L + mp) / 2, 1.75, F + 0.015, g, false);
  // aparece com um "pop" quando um subagente precisa dela; as 2 primeiras ja existem
  const pod = { tela, visivel: i < 2, escala: i < 2 ? 1 : 0, vel: 0 };
  const aplicar = () => { const s = Math.max(0.0001, pod.escala); g.scale.set(s, s, s); g.visible = cadMesh.visible = pod.escala > 0.001; cadMesh.scale.setScalar(Math.max(0.0001, Math.min(1, pod.escala))); };
  aplicar();
  pod.mostrar = () => { pod.visivel = true; };
  pod.animar = (dt) => {
    if (!pod.visivel || pod.escala === 1) return;
    // mola: passa um pouco de 1 e volta (efeito de "brotar")
    pod.vel += ((1 - pod.escala) * 90 - pod.vel * 9) * dt;
    pod.escala += pod.vel * dt;
    if (Math.abs(1 - pod.escala) < 0.002 && Math.abs(pod.vel) < 0.02) pod.escala = 1;
    aplicar();
  };
  return pod;
}

function sofa(kit, T, x, z, ang, lugares) {
  const g = kit.grupo(x, 0, z, ang);
  const w = lugares * 0.95 + 0.3, tec = kit.mat(T.tecido, { rough: 0.95 }), tec2 = kit.mat(T.tecido2 || T.tecido, { rough: 0.95 });
  kit.rcaixa(w, 0.3, 0.85, 0.08, tec, 0, 0.2, 0, g);
  kit.rcaixa(w, 0.55, 0.22, 0.09, tec, 0, 0.55, -0.32, g);
  kit.rcaixa(0.2, 0.5, 0.85, 0.08, tec, -w / 2 + 0.1, 0.38, 0, g); kit.rcaixa(0.2, 0.5, 0.85, 0.08, tec, w / 2 - 0.1, 0.38, 0, g);
  for (let i = 0; i < lugares; i++) kit.rcaixa(0.9, 0.14, 0.62, 0.06, tec2, (i - (lugares - 1) / 2) * 0.95, 0.41, 0.06, g);
  if (lugares > 1) kit.rcaixa(0.42, 0.36, 0.14, 0.06, kit.mat(T.destaque, { rough: 0.9 }), -w / 2 + 0.45, 0.62, -0.15, g).rotation.z = 0.15;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.cil(0.025, 0.02, 0.06, kit.mat(T.metal, { metal: 0.7 }), sx * (w / 2 - 0.12), 0.03, sz * 0.32, g);
}

function luminaria(kit, T, x, z) {
  const met = kit.mat(T.metal, { metal: 0.7, rough: 0.35 });
  kit.cil(0.18, 0.2, 0.03, met, x, 0.015, z);
  kit.cil(0.015, 0.015, 1.55, met, x, 0.8, z);
  kit.cil(0.12, 0.22, 0.25, kit.mat(T.cupula || 0xf3ead8, { rough: 0.8, emis: 0xffe2b0, ei: 0.35, lado: true }), x, 1.62, z);
  const l = new THREE.PointLight(0xffd9a0, 2.5, 4.5, 1.8);
  l.position.set(x, 1.5, z);
  kit.raiz.add(l);
}

function planta(kit, T, x, z, i) {
  const vaso = kit.mat(T.vaso, { rough: 0.6 });
  kit.cil(0.3, 0.22, 0.55, vaso, x, 0.275, z);
  kit.cil(0.27, 0.27, 0.03, kit.mat(0x3b2a1c, { rough: 1 }), x, 0.54, z);
  const folha = [kit.mat(T.folha || 0x3fa65a, { rough: 0.8, flat: true }), kit.mat(T.folha2 || 0x2f8a49, { rough: 0.8, flat: true })];
  // copa feita de "bolhas" achatadas (low-poly)
  const g = kit.grupo(x, 0.55, z);
  const n = 5 + (i % 3);
  for (let k = 0; k < n; k++) {
    const a = k * 2.4 + i, r = 0.16 + (k % 3) * 0.07;
    const b = kit.malha(new THREE.IcosahedronGeometry(0.24 + (k % 2) * 0.08, 0), folha[k % 2], Math.cos(a) * r, 0.35 + k * 0.17, Math.sin(a) * r, g);
    b.scale.y = 1.25;
    kit.geos.set('ico' + b.uuid, b.geometry);
  }
}

function vasinho(kit, T, x, y, z, pai) {
  kit.cil(0.06, 0.045, 0.1, kit.mat(T.vaso, { rough: 0.6 }), x, y + 0.05, z, pai);
  const b = kit.malha(new THREE.IcosahedronGeometry(0.09, 0), kit.mat(T.folha || 0x3fa65a, { rough: 0.8, flat: true }), x, y + 0.17, z, pai);
  kit.geos.set('ico' + b.uuid, b.geometry);
}

export function bola(kit, x, y, z, pai) {
  const b = kit.esf(0.12, kit.mat(0xe8742a, { rough: 0.7 }), x, y, z, pai);
  return b;
}
