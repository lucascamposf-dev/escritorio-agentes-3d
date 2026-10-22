// Cyberpunk: escuro, neon roxo e ciano, chao de grade, hologramas e chuva na cidade.
import { TEX } from '../geo.js';
import { MESA, SALA } from '../layout.js';

export default {
  id: 'cyberpunk',
  nome: 'Cyberpunk',
  desc: 'Neon roxo e ciano, hologramas e chuva',
  cores: ['#0d0a18', '#ff2bd6', '#2bf6ff', '#8b5bff'],
  luz: { ceu: 0x7a5cff, chao: 0x1a0d2a, hemi: 0.55, corSol: 0xb48cff, sol: 1.0, exposicao: 0.95, ambiente: 0.25, bloom: 0.95, fundo: 0x07050d },
  fog: { cor: 0x0d0618, perto: 22, longe: 55 },
  luzTeto: { cor: 0xb06bff, forca: 9 },
  piso: (kit) => kit.mat(0xffffff, { map: TEX.grade(kit, 0x0f0b1c, 0x2bf6ff, [24, 16]), rough: 0.35, metal: 0.3 }),
  parede: (kit) => kit.mat(0x15102a, { rough: 0.6, metal: 0.2 }),
  rodape: 0x2bf6ff, caixilho: 0x231a3f, porta: 0x231a3f,
  tapete: 0x2a1450, tapete2: 0x1d1238, pisoPod: 0x140f26,
  tampo: 0x1d1238, metal: 0x2a2342, cadeira: 0x231a3f, notebook: 0x2a2342,
  armario: 0x1d1238, bancada: 0x2bf6ff, madeira: 0x2a1450,
  tecido: 0x3a1f6e, tecido2: 0x4b2a8a, destaque: 0xff2bd6, vaso: 0x231a3f, folha: 0x2bf6ff, folha2: 0x8b5bff,
  vidro: { cor: 0x8b5bff, opac: 0.2 }, faixaBrilho: 2, cupula: 0xff2bd6, relogio: 0x231a3f,
  quadra: { piso: 0x140f26, linha: 0x2bf6ff, destaque: 0xff2bd6 },
  vista: 'chuva', janelaCols: 7,

  extras({ kit, THREE, tick, raiz }, DECO) {
    // faixas de neon no pe e no alto das paredes
    const neon = (cor) => kit.mat(cor, { emis: cor, ei: 2.2 });
    const faixa = (w, d, x, y, z, cor) => { const f = kit.caixa(w, 0.04, d, neon(cor), x, y, z); f.castShadow = false; };
    faixa(SALA.x1 - SALA.x0, 0.03, 0, 0.14, SALA.z0 + 0.04, 0xff2bd6); faixa(SALA.x1 - SALA.x0, 0.03, 0, 3.45, SALA.z0 + 0.04, 0x2bf6ff);
    faixa(0.03, SALA.z1 - SALA.z0, SALA.x1 - 0.04, 0.14, 0, 0xff2bd6); faixa(0.03, SALA.z1 - SALA.z0, SALA.x1 - 0.04, 3.45, 0, 0x2bf6ff);
    // holograma girando sobre a mesa redonda
    const holo = new THREE.Group(); holo.position.set(MESA.x, 1.55, MESA.z); raiz.add(holo);
    const mh = kit.mat(0x2bf6ff, { emis: 0x2bf6ff, ei: 2, opac: 0.55 });
    const aneis = [0.55, 0.42, 0.3].map((r, i) => { const a = kit.malha(kit.geo('toro', r, 0.012, 6, 48), mh, 0, i * 0.12, 0, holo, false); a.rotation.x = Math.PI / 2; return a; });
    const nucleo = kit.malha(new THREE.IcosahedronGeometry(0.16, 0), kit.mat(0xff2bd6, { emis: 0xff2bd6, ei: 2.5, flat: true }), 0, 0.15, 0, holo, false);
    kit.geos.set('holo', nucleo.geometry);
    const feixe = kit.malha(kit.geo('cil', 0.06, 0.5, 0.75, 24), kit.mat(0x2bf6ff, { emis: 0x2bf6ff, ei: 1, opac: 0.12 }), 0, -0.4, 0, holo, false);
    feixe.material.depthWrite = false;
    tick((dt, t) => { nucleo.rotation.y += dt * 1.5; nucleo.position.y = 0.15 + Math.sin(t * 2) * 0.05; aneis.forEach((a, i) => { a.rotation.z += dt * (i % 2 ? -1 : 1) * (0.8 + i * 0.4); }); });
    // letreiro neon piscando na parede direita
    const tx = kit.textura(512, 200, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.font = 'bold 86px Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ff2bd6'; c.shadowBlur = 30; c.fillStyle = '#ffb3f0'; c.fillText('AGENTES', w / 2, h / 2 - 20);
      c.font = 'bold 40px Segoe UI, sans-serif'; c.shadowColor = '#2bf6ff'; c.fillStyle = '#b3fbff'; c.fillText('エージェント 24h', w / 2, h / 2 + 50);
    });
    const placa = kit.malha(kit.geo('plano', 3.0, 1.2), kit.mat(0xffffff, { map: tx, emis: 0xffffff, ei: 1.3, opac: 0.99 }), SALA.x1 - 0.06, 2.85, -2.3, raiz, false);
    placa.material.emissiveMap = tx; placa.rotation.y = -Math.PI / 2;
    tick((dt, t) => { placa.material.emissiveIntensity = Math.sin(t * 9) > 0.95 ? 0.2 : 1.3; });
    // DECO: fliperama, maquina de vendas brilhando e um pilar de dados
    const [d0, d1, d2] = DECO;
    const arc = kit.grupo(d0[0], 0, d0[1], 0);
    kit.rcaixa(0.75, 1.7, 0.7, 0.05, kit.mat(0x231a3f, { rough: 0.4 }), 0, 0.85, 0, arc);
    const telaA = kit.rcaixa(0.6, 0.45, 0.04, 0.02, kit.mat(0x111111, { emis: 0x2bf6ff, ei: 1.6 }), 0, 1.3, 0.34, arc); telaA.castShadow = false;
    kit.rcaixa(0.7, 0.08, 0.3, 0.02, kit.mat(0x2a2342), 0, 0.98, 0.4, arc);
    for (const [x, c] of [[-0.15, 0xff2bd6], [0.05, 0x2bf6ff], [0.18, 0xffe02b]]) kit.esf(0.035, kit.mat(c, { emis: c, ei: 1.5 }), x, 1.03, 0.45, arc);
    tick((dt, t) => { telaA.material.emissive.setHSL((t * 0.15) % 1, 1, 0.5); });
    const vend = kit.grupo(d1[0], 0, d1[1], 0);
    kit.rcaixa(0.9, 1.9, 0.7, 0.04, kit.mat(0x1d1238, { rough: 0.4 }), 0, 0.95, 0, vend);
    kit.rcaixa(0.65, 1.3, 0.03, 0.02, kit.mat(0x2bf6ff, { emis: 0x2bf6ff, ei: 0.9, opac: 0.6 }), -0.08, 1.15, 0.36, vend);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) kit.cil(0.05, 0.05, 0.16, kit.mat([0xff2bd6, 0xffe02b, 0x2bf6ff][k], { emis: [0xff2bd6, 0xffe02b, 0x2bf6ff][k], ei: 0.6 }), -0.28 + k * 0.2, 0.65 + i * 0.3, 0.3, vend);
    const pilar = kit.cil(0.2, 0.2, 2.6, kit.mat(0x2bf6ff, { emis: 0x2bf6ff, ei: 1.2, opac: 0.35 }), d2[0], 1.3, d2[1]);
    pilar.castShadow = false; pilar.material.depthWrite = false;
    const bits = [];
    for (let i = 0; i < 10; i++) { const b = kit.caixa(0.08, 0.08, 0.08, kit.mat(0xffffff, { emis: 0x2bf6ff, ei: 2.5 }), d2[0], 0.2 + i * 0.25, d2[1]); b.castShadow = false; bits.push(b); }
    tick((dt, t) => { bits.forEach((b, i) => { b.position.y = 0.2 + ((t * 0.6 + i * 0.25) % 2.5); b.rotation.y = t * 2 + i; }); });
  },
};
