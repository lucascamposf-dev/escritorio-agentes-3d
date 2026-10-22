// Aconchegante: madeira quente, tapetes, lareira acesa, estante de livros, um cachorro dormindo
// e neve nas montanhas.
import { TEX } from '../geo.js';
import { MESA, SALA } from '../layout.js';

export default {
  id: 'aconchegante',
  nome: 'Aconchegante',
  desc: 'Madeira, lareira, livros e um cachorro',
  cores: ['#8a5a36', '#c98b52', '#7a2e2e', '#f2c14e'],
  luz: { ceu: 0xffe2bf, chao: 0x5a3a24, hemi: 0.7, corSol: 0xffd6a0, sol: 1.8, exposicao: 0.85, ambiente: 0.35, bloom: 0.35, fundo: 0x16100c },
  luzTeto: { cor: 0xffc98a, forca: 7 },
  piso: (kit) => kit.mat(0xffffff, { map: TEX.madeira(kit, 0x9a6438, [5, 3.3]), rough: 0.6 }),
  parede: (kit) => kit.mat(0xffffff, { map: TEX.ripado(kit, 0xc98b52, [14, 1]), rough: 0.8 }),
  rodape: 0x5a3a24, caixilho: 0x4a2f1c, porta: 0x7a4a26,
  tapete: 0x7a2e2e, tapete2: 0xc2a27a, pisoPod: 0xb48a5e,
  tampo: 0x8a5a36, metal: 0x3a2a1e, cadeira: 0x7a2e2e, notebook: 0xd8cdbd,
  armario: 0x8a5a36, bancada: 0xe8dcc8, madeira: 0x7a4a26,
  tecido: 0x6b3a2a, tecido2: 0xa0583a, destaque: 0xf2c14e, vaso: 0xb05a3a, folha: 0x5f9a3a, folha2: 0x3f7a2a,
  vidro: { cor: 0xffe8c8, opac: 0.16 }, cupula: 0xf3e0c0, relogio: 0xf3ead8,
  quadra: { piso: 0xb07a46, linha: 0xf3ead8, destaque: 0x7a2e2e },
  vista: 'montanha', janelaCols: 6, janelaTravessa: true,

  extras({ kit, THREE, tick, raiz }, DECO) {
    const [d0, d1, d2] = DECO;
    // lareira redonda (estilo moderno) com fogo piscando e luz quente
    kit.cil(0.55, 0.6, 0.12, kit.mat(0x2b2b2e, { rough: 0.6 }), d0[0], 0.06, d0[1]);
    kit.cil(0.45, 0.45, 0.6, kit.mat(0x1b1b1d, { metal: 0.6, rough: 0.4 }), d0[0], 0.42, d0[1]);
    kit.cil(0.07, 0.07, SALA.altura - 0.9, kit.mat(0x1b1b1d, { metal: 0.6 }), d0[0], (SALA.altura + 0.9) / 2, d0[1]);
    const chamas = [];
    for (let i = 0; i < 5; i++) {
      const c = kit.malha(kit.geo('cone', 0.09, 0.3, 6), kit.mat(0xff8a1a, { emis: i % 2 ? 0xff5a00 : 0xffb000, ei: 3, flat: true }), d0[0] + Math.cos(i * 1.3) * 0.15, 0.8, d0[1] + Math.sin(i * 1.3) * 0.15, raiz, false);
      chamas.push(c);
    }
    const fogo = new THREE.PointLight(0xff8a3a, 4, 6, 1.5); fogo.position.set(d0[0], 1.0, d0[1]); raiz.add(fogo);
    tick((dt, t) => {
      chamas.forEach((c, i) => { const s = 0.8 + 0.35 * Math.abs(Math.sin(t * (7 + i) + i)); c.scale.set(1, s, 1); c.position.y = 0.72 + s * 0.12; });
      fogo.intensity = 3.4 + Math.sin(t * 13) * 0.5 + Math.sin(t * 7.3) * 0.4;
    });
    // estante baixa cheia de livros
    kit.rcaixa(1.1, 1.0, 0.4, 0.02, kit.mat(0x7a4a26, { rough: 0.7 }), d1[0], 0.5, d1[1]);
    const cores = [0x7a2e2e, 0x2e4a7a, 0xf2c14e, 0x3f7a2a, 0xe8dcc8, 0x5a3a24, 0xa0583a];
    // livros em pe em cima da estante
    for (let i = 0; i < 9; i++) { const h = 0.3 - (i % 3) * 0.04; kit.caixa(0.08, h, 0.26, kit.mat(cores[i % cores.length]), d1[0] - 0.45 + i * 0.11, 1.0 + h / 2, d1[1]); }
    // poltrona de leitura + manta
    kit.rcaixa(0.8, 0.45, 0.75, 0.1, kit.mat(0xa0583a, { rough: 0.95 }), d2[0], 0.23, d2[1]);
    kit.rcaixa(0.8, 0.6, 0.18, 0.08, kit.mat(0xa0583a, { rough: 0.95 }), d2[0], 0.6, d2[1] - 0.3);
    kit.rcaixa(0.5, 0.05, 0.6, 0.02, kit.mat(0xf2c14e, { rough: 1 }), d2[0] + 0.05, 0.47, d2[1] + 0.05).rotation.z = 0.1;
    // cachorro dormindo no tapete perto da lareira (a barriga sobe e desce, o rabo abana as vezes)
    const dog = kit.grupo(d0[0] + 1.1, 0, d0[1] - 0.4, -0.6);
    const pelo = kit.mat(0xc98b52, { rough: 0.95 }), escuro = kit.mat(0x5a3a24, { rough: 0.95 });
    kit.malha(kit.geo('esf', 0.3, 16, 12), kit.mat(0x7a2e2e, { rough: 1 }), 0, 0.02, 0, dog).scale.set(1.6, 0.12, 1.2);
    const corpo = kit.malha(kit.geo('esf', 0.2, 16, 12), pelo, 0, 0.16, 0, dog); corpo.scale.set(1.5, 0.8, 1);
    const cab = kit.malha(kit.geo('esf', 0.12, 16, 12), pelo, 0.3, 0.14, 0.08, dog);
    kit.malha(kit.geo('esf', 0.05, 10, 8), escuro, 0.41, 0.12, 0.1, dog);
    for (const dz of [-0.07, 0.07]) kit.malha(kit.geo('esf', 0.06, 10, 8), escuro, 0.27, 0.2, 0.08 + dz, dog).scale.set(0.6, 1.2, 0.5);
    const rabo = kit.grupo(-0.28, 0.14, 0, 0, dog);
    kit.cil(0.025, 0.015, 0.22, pelo, 0, 0.1, 0, rabo).rotation.z = 0.9;
    tick((dt, t) => { corpo.scale.y = 0.8 + 0.05 * Math.sin(t * 1.6); cab.position.y = 0.14 + 0.01 * Math.sin(t * 1.6); rabo.rotation.y = Math.sin(t * 2) > 0.7 ? Math.sin(t * 25) * 0.6 : 0; });
    // lustre de madeira sobre a mesa
    const lustre = kit.malha(kit.geo('toro', 1.0, 0.06, 8, 40), kit.mat(0x5a3a24, { rough: 0.7 }), MESA.x, 2.9, MESA.z, raiz);
    lustre.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const b = kit.esf(0.06, kit.mat(0xffe0a8, { emis: 0xffc070, ei: 2.5 }), MESA.x + Math.cos(a), 2.98, MESA.z + Math.sin(a)); b.castShadow = false; }
  },
};
