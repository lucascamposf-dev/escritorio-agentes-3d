// Estacao espacial: placas de metal, luzes azuis, a Terra pela janela, um drone orbitando a mesa
// e plantas na hidroponia.
import { TEX } from '../geo.js';
import { MESA, SALA } from '../layout.js';

export default {
  id: 'espacial',
  nome: 'Estação espacial',
  desc: 'Metal, luzes azuis e a Terra pela janela',
  cores: ['#c9d1dc', '#3a4252', '#3da9ff', '#0b0e16'],
  luz: { ceu: 0xcfe6ff, chao: 0x2a3140, hemi: 0.65, corSol: 0xffffff, sol: 1.9, exposicao: 0.72, ambiente: 0.4, bloom: 0.5, limiar: 0.97, fundo: 0x02030a },
  luzTeto: { cor: 0xbfe2ff, forca: 4.5 },
  piso: (kit) => kit.mat(0xffffff, { map: TEX.metal(kit, 0x5a6372, [12, 8]), rough: 0.45, metal: 0.6 }),
  parede: (kit) => kit.mat(0xffffff, { map: TEX.metal(kit, 0xc9d1dc, [12, 2]), rough: 0.5, metal: 0.4 }),
  rodape: 0x3da9ff, caixilho: 0x3a4252, porta: 0x9aa4b2,
  tapete: 0x2a3140, tapete2: 0x3a4252, pisoPod: 0x4a5262,
  tampo: 0xc9d1dc, metal: 0x3a4252, cadeira: 0xb8c2cf, notebook: 0xc9d1dc,
  armario: 0xc9d1dc, bancada: 0x3a4252, madeira: 0x9aa4b2,
  tecido: 0xaeb8c6, tecido2: 0x3d7fbf, destaque: 0x3da9ff, vaso: 0xc9d1dc, folha: 0x5ad16a, folha2: 0x2fb35a,
  vidro: { cor: 0xa8d8ff, opac: 0.2 }, cupula: 0xffffff, relogio: 0x0b0e16,
  quadra: { piso: 0x3a4252, linha: 0x3da9ff, destaque: 0x1d5f9a },
  vista: 'espaco', janelaCols: 4,

  extras({ kit, THREE, tick, raiz }, DECO) {
    // faixas de luz azul no chao, rente as paredes
    const azul = kit.mat(0x3da9ff, { emis: 0x3da9ff, ei: 2 });
    for (const [w, d, x, z] of [[SALA.x1 - SALA.x0 - 0.4, 0.05, 0, SALA.z0 + 0.25], [0.05, SALA.z1 - SALA.z0 - 0.4, SALA.x1 - 0.25, 0]]) { const f = kit.caixa(w, 0.02, d, azul, x, 0.012, z); f.castShadow = false; }
    // drone orbitando a mesa redonda
    const drone = new THREE.Group(); raiz.add(drone);
    kit.malha(kit.geo('esf', 0.16, 16, 12), kit.mat(0xf2f4f7, { metal: 0.5, rough: 0.3 }), 0, 0, 0, drone).scale.y = 0.6;
    kit.malha(kit.geo('esf', 0.05, 10, 8), kit.mat(0x3da9ff, { emis: 0x3da9ff, ei: 3 }), 0, 0, 0.14, drone);
    const helices = [];
    for (const [x, z] of [[0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]]) { kit.caixa(0.2, 0.02, 0.02, kit.mat(0x3a4252), x * 0.6, 0.05, z * 0.6, drone).rotation.y = Math.atan2(z, x); const h = kit.malha(kit.geo('cil', 0.09, 0.09, 0.01, 12), kit.mat(0x9aa4b2, { opac: 0.6 }), x, 0.08, z, drone, false); helices.push(h); }
    tick((dt, t) => { const a = t * 0.4; drone.position.set(MESA.x + Math.cos(a) * 2.4, 2.4 + Math.sin(t * 1.3) * 0.15, MESA.z + Math.sin(a) * 2.4); drone.rotation.y = -a; helices.forEach((h) => { h.rotation.y += dt * 40; }); });
    // DECO: tubos de hidroponia, um traje espacial na vitrine e um globo holografico
    const [d0, d1, d2] = DECO;
    for (let i = 0; i < 3; i++) {
      kit.cil(0.08, 0.08, 1.0, kit.mat(0xffffff, { opac: 0.35 }), d0[0] - 0.3 + i * 0.3, 0.7, d0[1]);
      for (let k = 0; k < 3; k++) { const f = kit.malha(new THREE.IcosahedronGeometry(0.09, 0), kit.mat(0x5ad16a, { emis: 0x2fb35a, ei: 0.4, flat: true }), d0[0] - 0.3 + i * 0.3, 0.4 + k * 0.3, d0[1]); kit.geos.set('hid' + f.uuid, f.geometry); }
    }
    kit.rcaixa(1.0, 0.2, 0.4, 0.04, kit.mat(0xdfe5ec), d0[0], 0.1, d0[1]);
    const vit = kit.grupo(d1[0], 0, d1[1]);
    kit.cil(0.4, 0.45, 0.15, kit.mat(0x3a4252, { metal: 0.6 }), 0, 0.075, 0, vit);
    kit.cil(0.38, 0.38, 1.9, kit.mat(0xa8d8ff, { opac: 0.15 }), 0, 1.1, 0, vit).castShadow = false;
    const traje = kit.mat(0xf2f4f7, { rough: 0.6 });
    kit.rcaixa(0.38, 0.5, 0.25, 0.1, traje, 0, 1.15, 0, vit);
    kit.esf(0.17, traje, 0, 1.58, 0, vit);
    kit.malha(kit.geo('esf', 0.12, 16, 12), kit.mat(0x1a1a1a, { metal: 0.9, rough: 0.1 }), 0, 1.58, 0.08, vit).scale.z = 0.6;
    for (const sx of [-1, 1]) { kit.rcaixa(0.12, 0.45, 0.12, 0.05, traje, sx * 0.26, 1.1, 0, vit); kit.rcaixa(0.14, 0.55, 0.14, 0.05, traje, sx * 0.1, 0.55, 0, vit); }
    const globo = kit.malha(new THREE.IcosahedronGeometry(0.32, 1), kit.mat(0x3da9ff, { emis: 0x3da9ff, ei: 1.2, opac: 0.5, flat: true }), d2[0], 1.0, d2[1], raiz, false);
    globo.material.wireframe = true; kit.geos.set('globo', globo.geometry);
    kit.cil(0.12, 0.2, 0.7, kit.mat(0x3a4252, { metal: 0.6 }), d2[0], 0.35, d2[1]);
    tick((dt) => { globo.rotation.y += dt * 0.5; });
  },
};
