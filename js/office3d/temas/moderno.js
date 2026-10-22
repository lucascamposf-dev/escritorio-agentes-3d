// Moderno: branco, madeira clara, vidro, muito verde e a cidade de dia.
import { TEX } from '../geo.js';
import { MESA, SALA } from '../layout.js';

export default {
  id: 'moderno',
  nome: 'Moderno',
  desc: 'Branco, madeira clara, vidro e plantas',
  cores: ['#f4f2ee', '#d9b88f', '#3fa65a', '#5aa9ff'],
  luz: { ceu: 0xeef3ff, chao: 0x7a6c5c, hemi: 0.85, corSol: 0xfff0dc, sol: 2.3, exposicao: 0.82, ambiente: 0.4, bloom: 0.15, fundo: 0x1a1d24 },
  luzTeto: { cor: 0xfff3e2, forca: 5 },
  piso: (kit) => kit.mat(0xffffff, { map: TEX.madeira(kit, 0xd9b88f, [5, 3.3]), rough: 0.55 }),
  parede: (kit) => kit.mat(0xf4f2ee, { rough: 0.9 }),
  rodape: 0xe2ddd5, caixilho: 0x2a2d35, porta: 0xd9b88f,
  tapete: 0x8fa3b8, tapete2: 0xd8d2c8, pisoPod: 0xe9e4dc,
  tampo: 0xf7f5f2, metal: 0x2a2d35, cadeira: 0x3b4252, notebook: 0xc9ced8,
  armario: 0xf0ede8, bancada: 0x2a2d35, madeira: 0xc79a6b,
  tecido: 0x9aa6b2, tecido2: 0xb7c0c9, destaque: 0x5aa9ff, vaso: 0xf2efe9, folha: 0x4caf63, folha2: 0x2f8a49,
  vidro: { cor: 0xd6ecff, opac: 0.18 }, cupula: 0xffffff, relogio: 0xffffff,
  quadra: { piso: 0xd9a066, linha: 0xffffff, destaque: 0x5aa9ff },
  vista: 'cidade', janelaCols: 6,

  extras({ kit, THREE, tick, raiz }, DECO) {
    // anel de luz flutuando sobre a mesa redonda
    const anel = kit.malha(kit.geo('toro', 1.25, 0.035, 8, 64), kit.mat(0xffffff, { emis: 0xfff4e0, ei: 2.2 }), MESA.x, 3.1, MESA.z, raiz, false);
    anel.rotation.x = Math.PI / 2;
    for (const a of [0, 2.1, 4.2]) kit.cil(0.004, 0.004, 0.5, kit.mat(0x2a2d35), MESA.x + Math.cos(a) * 1.25, 3.35, MESA.z + Math.sin(a) * 1.25);
    // quadros abstratos na parede direita, acima das salinhas
    const arte = kit.textura(512, 320, (c, w, h) => {
      c.fillStyle = '#f7f3ec'; c.fillRect(0, 0, w, h);
      for (const [x, y, r, cor] of [[0.3, 0.55, 0.32, '#5aa9ff'], [0.62, 0.42, 0.24, '#ffb454'], [0.78, 0.7, 0.15, '#3fa65a']]) { c.fillStyle = cor; c.beginPath(); c.arc(w * x, h * y, h * r, 0, 7); c.fill(); }
      c.strokeStyle = '#22252e'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.1, h * 0.85); c.bezierCurveTo(w * 0.4, h * 0.2, w * 0.6, h * 0.95, w * 0.92, h * 0.25); c.stroke();
    });
    const q = kit.malha(kit.geo('plano', 2.0, 1.25), kit.mat(0xffffff, { map: arte, rough: 0.8 }), SALA.x1 - 0.04, 2.95, -2.3, raiz, false);
    q.rotation.y = -Math.PI / 2;
    kit.caixa(0.03, 1.33, 2.08, kit.mat(0x2a2d35), SALA.x1 - 0.02, 2.95, -2.3);
    // DECO: escultura, estante baixa com livros e um vaso alto
    const [d0, d1, d2] = DECO;
    kit.cil(0.35, 0.4, 0.5, kit.mat(0xe9e4dc), d0[0], 0.25, d0[1]);
    const esc = kit.malha(kit.geo('toro', 0.28, 0.08, 12, 40), kit.mat(0xd4a24c, { metal: 0.9, rough: 0.25 }), d0[0], 0.85, d0[1]);
    tick((dt) => { esc.rotation.y += dt * 0.6; });
    kit.rcaixa(1.0, 0.8, 0.4, 0.03, kit.mat(0xc79a6b, { rough: 0.6 }), d1[0], 0.4, d1[1]);
    const cores = [0xe85d5d, 0x5aa9ff, 0xffd166, 0x4ade80, 0x9b7bff, 0xf2efe9];
    for (let i = 0; i < 8; i++) kit.caixa(0.08, 0.26 + (i % 3) * 0.04, 0.24, kit.mat(cores[i % cores.length]), d1[0] - 0.4 + i * 0.105, 0.95, d1[1]);
    kit.cil(0.22, 0.16, 0.9, kit.mat(0x2a2d35, { rough: 0.4 }), d2[0], 0.45, d2[1]);
    for (let i = 0; i < 6; i++) { const c = kit.cil(0.008, 0.008, 0.9, kit.mat(0x6b4a2f), d2[0] + Math.sin(i) * 0.05, 1.3, d2[1] + Math.cos(i) * 0.05); c.rotation.z = (i - 2.5) * 0.12; }
  },
};
