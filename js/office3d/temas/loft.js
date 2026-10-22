// Loft industrial: tijolinho, cimento queimado, ferro preto, lampadas de filamento e couro.
import { TEX } from '../geo.js';
import { MESA, SALA, LOUNGE } from '../layout.js';

export default {
  id: 'loft',
  nome: 'Loft industrial',
  desc: 'Tijolinho, cimento, ferro e lâmpadas de filamento',
  cores: ['#9c5a3c', '#6f6a64', '#1b1b1d', '#f2a541'],
  luz: { ceu: 0xffe7c8, chao: 0x4a3a30, hemi: 0.7, corSol: 0xffd9a8, sol: 1.9, exposicao: 0.85, ambiente: 0.35, bloom: 0.45, fundo: 0x14110f },
  luzTeto: { cor: 0xffc27a, forca: 7 },
  piso: (kit) => kit.mat(0xffffff, { map: TEX.concreto(kit, 0x8d8780, [5, 3.3]), rough: 0.7 }),
  parede: (kit) => kit.mat(0xffffff, { map: TEX.tijolo(kit, 0xa35b3c, [7, 2]), rough: 0.95 }),
  rodape: 0x1b1b1d, caixilho: 0x18181a, porta: 0x2b2b2e,
  tapete: 0x7a3b2e, tapete2: 0x5c4a3a, pisoPod: 0x6f6a64,
  tampo: 0x6b4a2f, metal: 0x1b1b1d, cadeira: 0x2b2b2e, notebook: 0x9aa0a8,
  armario: 0x2b2b2e, bancada: 0x6b4a2f, madeira: 0x6b4a2f,
  tecido: 0x7a4a2a, tecido2: 0x8a5634, destaque: 0xf2a541, vaso: 0x3a3a3c, folha: 0x4f8a3a, folha2: 0x3a6e2d,
  vidro: { cor: 0xe8dcc8, opac: 0.15 }, cupula: 0x1b1b1d, relogio: 0xf3ead8,
  quadra: { piso: 0x8d8780, linha: 0xf2a541, destaque: 0x9c5a3c },
  vista: 'cidade', janelaCols: 9, janelaTravessa: true,

  extras({ kit, THREE, tick, raiz }, DECO) {
    // lampadas de filamento penduradas sobre a mesa e o lounge (o bloom faz brilhar)
    const bulbos = [];
    const pendurar = (x, z, alt) => {
      kit.cil(0.006, 0.006, SALA.altura - alt, kit.mat(0x111111), x, (SALA.altura + alt) / 2 + 0.1, z);
      kit.cil(0.05, 0.08, 0.1, kit.mat(0x1b1b1d, { metal: 0.8 }), x, alt + 0.17, z);
      const b = kit.esf(0.07, kit.mat(0xffd08a, { emis: 0xffb35c, ei: 3 }), x, alt + 0.06, z);
      b.castShadow = false; bulbos.push(b);
    };
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pendurar(MESA.x + Math.cos(a) * 0.8, MESA.z + Math.sin(a) * 0.8, 2.2 + (i % 2) * 0.25); }
    for (let i = 0; i < 3; i++) pendurar(LOUNGE.x - 1.2 + i * 1.0, LOUNGE.z - 0.1, 2.3);
    tick((dt, t) => { for (let i = 0; i < bulbos.length; i++) bulbos[i].material.emissiveIntensity = 2.6 + 0.4 * Math.sin(t * 3 + i * 1.7); });
    // dutos de ventilacao aparentes no alto da parede do fundo e da direita
    const duto = kit.mat(0x9aa0a8, { metal: 0.85, rough: 0.35 });
    const dutoFundo = kit.cil(0.22, 0.22, SALA.x1 - SALA.x0 - 1, duto, 0, 3.3, SALA.z0 + 0.35); dutoFundo.rotation.z = Math.PI / 2;
    const dutoLado = kit.cil(0.18, 0.18, SALA.z1 - SALA.z0 - 1, duto, SALA.x1 - 0.35, 3.25, 0); dutoLado.rotation.x = Math.PI / 2;
    for (let x = -10; x <= 10; x += 2.5) kit.cil(0.24, 0.24, 0.05, kit.mat(0x6f747c, { metal: 0.9 }), x, 3.3, SALA.z0 + 0.35).rotation.z = Math.PI / 2;
    // letreiro neon na parede direita
    const neon = kit.textura(512, 160, (c, w, h) => {
      c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h);
      c.font = 'bold 92px Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ffb35c'; c.shadowBlur = 24; c.fillStyle = '#ffd9a8'; c.fillText('BORA CODAR', w / 2, h / 2);
    });
    const placa = kit.malha(kit.geo('plano', 3.0, 0.95), kit.mat(0xffffff, { map: neon, emis: 0xffb35c, ei: 1.2, opac: 0.99 }), SALA.x1 - 0.05, 2.9, -2.3, raiz, false);
    placa.material.emissiveMap = neon;
    placa.rotation.y = -Math.PI / 2;
    // DECO: barril com tampo de madeira, toca-discos e uma bicicleta na parede... (versao low-poly)
    const [d0, d1, d2] = DECO;
    kit.cil(0.32, 0.36, 0.85, kit.mat(0x6b4a2f, { rough: 0.8 }), d0[0], 0.425, d0[1]);
    for (const y of [0.15, 0.7]) kit.cil(0.37, 0.37, 0.05, kit.mat(0x1b1b1d, { metal: 0.8 }), d0[0], y, d0[1]);
    kit.rcaixa(0.9, 0.55, 0.45, 0.03, kit.mat(0x6b4a2f), d1[0], 0.275, d1[1]);
    kit.rcaixa(0.6, 0.06, 0.4, 0.02, kit.mat(0x1b1b1d), d1[0], 0.58, d1[1]);
    const disco = kit.cil(0.15, 0.15, 0.01, kit.mat(0x0a0a0a, { rough: 0.3 }), d1[0] - 0.08, 0.62, d1[1]);
    tick((dt) => { disco.rotation.y += dt * 3.5; });
    kit.cil(0.28, 0.2, 0.7, kit.mat(0x3a3a3c, { rough: 0.6 }), d2[0], 0.35, d2[1]);
    const cacto = kit.cil(0.09, 0.1, 0.7, kit.mat(0x4f8a3a, { rough: 0.8 }), d2[0], 1.05, d2[1]);
    kit.cil(0.05, 0.05, 0.3, kit.mat(0x4f8a3a, { rough: 0.8 }), d2[0] + 0.14, 1.15, d2[1]).rotation.z = -0.6;
    cacto.castShadow = true;
  },
};
