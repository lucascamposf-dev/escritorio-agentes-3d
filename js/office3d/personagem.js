// Personagem low-poly articulado, montado a partir de uma skin (skins.js).
// Esqueleto: raiz (pes no chao, olhando para +z) > quadril > pernas/joelhos e tronco > ombros/cotovelos e cabeca.
// Poses: cada uma diz para onde as juntas devem ir; as juntas deslizam ate la (nunca "teleportam").
import * as THREE from 'three';

const PI = Math.PI;
const QUADRIL = 0.78;      // altura do quadril em pe
const SENTADO = 0.56;      // altura do quadril sentado numa cadeira
const SOFA = 0.48;

export class Personagem {
  constructor(kit, skin) {
    this.kit = kit;
    this.skin = skin;
    this.raiz = new THREE.Group();
    this.pose = 'em pe';
    this.fase = 0;            // ciclo da caminhada (avanca com a distancia andada)
    this.piscar = 2 + Math.random() * 3;
    this.expr = 'normal';
    this.t = Math.random() * 10;
    this.montar();
  }

  // ---------- montagem ----------
  montar() {
    const k = this.kit, s = this.skin, R = this.raiz;
    const robo = !!s.robo;
    const pele = k.mat(s.pele, robo ? { metal: 0.7, rough: 0.35 } : { rough: 0.7 });
    const roupa = k.mat(s.roupa.cor, robo ? { metal: 0.6, rough: 0.4 } : { rough: 0.85 });
    const roupa2 = k.mat(s.roupa.cor2 ?? s.roupa.cor, { rough: 0.8 });
    const calca = k.mat(s.calca.cor, robo ? { metal: 0.6, rough: 0.4 } : { rough: 0.9 });
    const sapato = k.mat(s.sapato, { rough: 0.5 });
    const tipo = s.roupa.tipo, tcalca = s.calca.tipo;
    const mangaLonga = ['moletom', 'terno', 'camisa', 'jaleco', 'traje', 'manto', 'ninja'].includes(tipo);
    const semManga = tipo === 'regata';
    const largura = s.largura || 1;
    // a largura estica a peca (escala) em vez de mudar a medida: assim as geometrias sao sempre
    // as mesmas e ficam no cache, por mais personagens aleatorios que aparecam
    const L = (m) => { m.scale.x = largura; return m; };
    this.L = L;

    R.scale.setScalar(s.altura || 1);
    const quadril = this.quadril = grupo(R, 0, QUADRIL, 0);
    L(k.rcaixa(0.4, 0.18, 0.26, 0.06, calca, 0, 0, 0, quadril));

    // pernas: coxa > joelho > canela > sapato
    const perna = (lado) => {
      const p = grupo(quadril, lado * 0.11 * largura, -0.04, 0);
      if (tcalca === 'short') {
        k.rcaixa(0.17, 0.2, 0.19, 0.06, calca, 0, -0.1, 0, p);
        k.rcaixa(0.14, 0.2, 0.15, 0.05, pele, 0, -0.28, 0, p);
      } else k.rcaixa(0.16, 0.38, 0.18, 0.06, tcalca === 'saia' ? pele : calca, 0, -0.19, 0, p);
      const j = grupo(p, 0, -0.38, 0);
      const canela = tcalca === 'calca' ? calca : (tcalca === 'short' && s.meia !== undefined ? k.mat(s.meia, { rough: 0.9 }) : pele);
      k.rcaixa(0.145, 0.34, 0.16, 0.05, canela, 0, -0.17, 0, j);
      k.rcaixa(0.16, 0.09, 0.27, 0.04, sapato, 0, -0.355, 0.05, j);
      return [p, j];
    };
    [this.pernaE, this.joelhoE] = perna(1);
    [this.pernaD, this.joelhoD] = perna(-1);

    // saias e casacos compridos ficam presos ao quadril
    if (tipo === 'manto') L(k.cil(0.27, 0.42, 0.74, roupa, 0, -0.38, 0, quadril, 16));
    if (tipo === 'vestido' || tcalca === 'saia') L(k.cil(0.22, 0.3, 0.32, tipo === 'vestido' ? roupa : calca, 0, -0.14, 0, quadril, 16));
    if (tipo === 'jaleco') L(k.rcaixa(0.47, 0.36, 0.3, 0.05, roupa, 0, -0.14, -0.01, quadril));

    // tronco
    const tronco = this.tronco = grupo(quadril, 0, 0.05, 0);
    const corpo = L(k.rcaixa(tipo === 'traje' ? 0.52 : 0.46, 0.52, tipo === 'traje' ? 0.32 : 0.28, 0.1, roupa, 0, 0.3, 0, tronco));
    this.corpo = corpo;
    this.roupaDetalhes(tronco, roupa, roupa2, largura);

    // bracos: ombro > cotovelo > mao
    const braco = (lado) => {
      const o = grupo(tronco, lado * (0.29 * largura + 0.02), 0.5, 0);
      k.rcaixa(0.12, 0.29, 0.13, 0.05, semManga ? pele : roupa, 0, -0.13, 0, o);
      const c = grupo(o, 0, -0.28, 0);
      k.rcaixa(0.11, 0.25, 0.12, 0.045, mangaLonga ? roupa : pele, 0, -0.12, 0, c);
      if (tipo === 'jersey' || tipo === 'camiseta') k.rcaixa(0.135, 0.04, 0.145, 0.015, roupa2, 0, -0.27, 0, o);
      const mao = grupo(c, 0, -0.29, 0);
      k.esf(0.068, tipo === 'traje' ? k.mat(0xffffff, { rough: 0.6 }) : pele, 0, 0, 0, mao);
      return [o, c, mao];
    };
    [this.ombroE, this.cotoveloE, this.maoE] = braco(1);
    [this.ombroD, this.cotoveloD, this.maoD] = braco(-1);

    // pescoco e cabeca
    k.cil(0.07, 0.08, 0.1, pele, 0, 0.6, 0, tronco);
    const cab = this.cabeca = grupo(tronco, 0, 0.62, 0);
    const cranio = k.rcaixa(0.44, 0.42, 0.42, 0.14, robo ? k.mat(s.pele, { metal: 0.6, rough: 0.3 }) : pele, 0, 0.22, 0, cab);
    cranio.castShadow = true;
    this.rosto(cab, pele, robo);
    if (!robo) this.cabelo(cab);
    this.acessorios(cab, tronco);
  }

  roupaDetalhes(tronco, roupa, roupa2, largura) {
    const k = this.kit, s = this.skin, tipo = s.roupa.tipo;
    if (tipo === 'jersey' || tipo === 'camiseta') k.rcaixa(0.24, 0.04, 0.29, 0.015, roupa2, 0, 0.555, 0, tronco);
    if (tipo === 'jersey') {
      // numero nas costas e pequeno na frente (material reaproveitado por numero/cor)
      const chave = 'num:' + (s.roupa.numero || '10') + ':' + s.roupa.cor2;
      let m = k.mats.get(chave);
      if (!m) {
      const num = k.textura(128, 128, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.font = 'bold 96px Arial Black, Segoe UI, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 8; c.strokeStyle = '#' + new THREE.Color(s.roupa.cor2).getHexString(); c.strokeText(s.roupa.numero || '10', w / 2, h / 2 + 6);
        c.fillStyle = '#' + new THREE.Color(s.roupa.cor2).getHexString(); c.fillText(s.roupa.numero || '10', w / 2, h / 2 + 6);
      });
        m = new THREE.MeshStandardMaterial({ map: num, transparent: true, roughness: 0.8 });
        k.mats.set(chave, m);
      }
      const costas = k.malha(k.geo('plano', 0.3, 0.3), m, 0, 0.32, -0.145, tronco, false); costas.rotation.y = PI;
      k.malha(k.geo('plano', 0.11, 0.11), m, 0.1, 0.42, 0.145, tronco, false);
      for (const lado of [-1, 1]) k.caixa(0.02, 0.44, 0.18, roupa2, lado * 0.226 * largura, 0.3, 0, tronco); // faixas laterais
    }
    if (tipo === 'moletom') {
      k.rcaixa(0.36, 0.18, 0.14, 0.06, roupa, 0, 0.55, -0.16, tronco);
      k.rcaixa(0.26, 0.12, 0.02, 0.02, roupa2, 0, 0.16, 0.145, tronco);
      for (const x of [-0.05, 0.05]) k.cil(0.008, 0.008, 0.14, k.mat(0xffffff), x, 0.45, 0.15, tronco);
    }
    if (tipo === 'camisa') { k.rcaixa(0.26, 0.05, 0.29, 0.02, k.mat(0xffffff, { rough: 0.8 }), 0, 0.555, 0, tronco); for (let i = 0; i < 4; i++) k.esf(0.012, roupa2, 0, 0.2 + i * 0.1, 0.143, tronco); }
    if (tipo === 'terno' || tipo === 'jaleco') {
      const camisa = k.malha(k.geoFeita('triangulo', () => new THREE.CircleGeometry(0.11, 3)), k.mat(tipo === 'terno' ? (s.roupa.cor2 ?? 0xffffff) : 0xdfe7f2, { rough: 0.8 }), 0, 0.47, 0.142, tronco, false);
      camisa.rotation.z = -PI / 2; camisa.scale.set(1.1, 0.9, 1);
      if (tipo === 'jaleco') { k.rcaixa(0.08, 0.06, 0.02, 0.01, roupa2, -0.12, 0.38, 0.145, tronco); k.cil(0.008, 0.008, 0.1, k.mat(0x3b5bdb), -0.1, 0.42, 0.15, tronco); }
    }
    if (tipo === 'traje') {
      k.rcaixa(0.4, 0.42, 0.18, 0.06, k.mat(0xdfe5ec, { rough: 0.6 }), 0, 0.3, -0.24, tronco);
      this.L(k.rcaixa(0.53, 0.05, 0.33, 0.02, roupa2, 0, 0.18, 0, tronco));
      k.rcaixa(0.12, 0.08, 0.02, 0.02, k.mat(0x111111, { emis: 0x3da9ff, ei: 1.2 }), 0.1, 0.42, 0.165, tronco);
    }
    if (tipo === 'manto') this.L(k.rcaixa(0.48, 0.06, 0.3, 0.02, roupa2, 0, 0.1, 0, tronco));
    if (tipo === 'ninja') this.L(k.rcaixa(0.48, 0.07, 0.3, 0.02, roupa2, 0, 0.1, 0, tronco));
    if (s.robo) { for (let i = 0; i < 3; i++) k.cil(0.025, 0.025, 0.02, k.mat(0x111111, { emis: [0xff5a5a, 0xffd166, 0x4ade80][i], ei: 2 }), -0.08 + i * 0.08, 0.4, 0.145, tronco).rotation.x = PI / 2; }
  }

  rosto(cab, pele, robo) {
    const k = this.kit, s = this.skin;
    const olhoM = k.mat(0x1a1410, { rough: 0.3 });
    if (robo) {
      k.rcaixa(0.36, 0.24, 0.02, 0.05, k.mat(0x0a0d12, { rough: 0.2, metal: 0.3 }), 0, 0.22, 0.212, cab);
      const brilho = k.mat(0x111111, { emis: 0x3da9ff, ei: 2.5 });
      this.olhos = [-0.08, 0.08].map((x) => k.rcaixa(0.07, 0.07, 0.02, 0.02, brilho, x, 0.25, 0.225, cab));
      this.boca = k.rcaixa(0.14, 0.025, 0.02, 0.01, brilho, 0, 0.15, 0.225, cab);
      this.bocaO = k.esf(0.04, brilho, 0, 0.15, 0.22, cab);
      this.bocaO.scale.z = 0.3; this.bocaO.visible = false;
      return;
    }
    this.olhos = [-0.09, 0.09].map((x) => k.rcaixa(0.062, 0.085, 0.03, 0.025, olhoM, x, 0.25, 0.205, cab));
    for (const x of [-0.08, 0.1]) k.esf(0.012, k.mat(0xffffff), x + 0.012 * Math.sign(x), 0.265, 0.222, cab);
    const sobr = k.mat(s.cabelo.estilo === 'careca' ? 0x3a2a1e : s.cabelo.cor, { rough: 0.9 });
    for (const x of [-0.09, 0.09]) k.rcaixa(0.09, 0.022, 0.02, 0.008, sobr, x, 0.335, 0.212, cab);
    k.rcaixa(0.05, 0.06, 0.05, 0.02, k.mat(new THREE.Color(s.pele).multiplyScalar(0.88).getHex(), { rough: 0.7 }), 0, 0.19, 0.22, cab);
    const labio = k.mat(0x5a2a22, { rough: 0.6 });
    if (s.sorriso === 'dentes') {
      // sorrisao (o do Ronaldinho)
      k.rcaixa(0.19, 0.085, 0.02, 0.03, labio, 0, 0.105, 0.208, cab);
      this.boca = k.rcaixa(0.16, 0.055, 0.02, 0.02, k.mat(0xffffff, { rough: 0.3 }), 0, 0.108, 0.215, cab);
    } else if (s.sorriso === 'grande') {
      this.boca = k.malha(k.geoFeita('sorriso', () => new THREE.TorusGeometry(0.055, 0.013, 6, 16, PI)), labio, 0, 0.13, 0.212, cab);
      this.boca.rotation.z = PI;
    } else this.boca = k.rcaixa(0.1, 0.022, 0.02, 0.01, labio, 0, 0.11, 0.212, cab);
    this.bocaO = k.esf(0.035, labio, 0, 0.1, 0.205, cab);
    this.bocaO.scale.set(1, 1.3, 0.4); this.bocaO.visible = false;
    // barba
    const bc = k.mat(s.barbaCor ?? s.cabelo.cor, { rough: 0.95 });
    if (s.barba === 'cheia') { k.rcaixa(0.44, 0.16, 0.12, 0.05, bc, 0, 0.07, 0.17, cab); for (const x of [-0.2, 0.2]) k.rcaixa(0.06, 0.2, 0.3, 0.03, bc, x, 0.13, 0.05, cab); }
    if (s.barba === 'cavanhaque') k.rcaixa(0.1, 0.09, 0.06, 0.03, bc, 0, 0.04, 0.2, cab);
    if (s.barba === 'bigode' || s.barba === 'cavanhaque') k.rcaixa(0.16, 0.035, 0.04, 0.015, bc, 0, 0.145, 0.222, cab);
    if (s.barba === 'mago') { const c = k.malha(k.geo('cone', 0.17, 0.45, 8), k.mat(s.barbaCor ?? 0xeeeeee, { rough: 0.95, flat: true }), 0, -0.1, 0.17, cab); c.rotation.x = PI; }
  }

  cabelo(cab) {
    const k = this.kit, s = this.skin, e = s.cabelo.estilo;
    if (e === 'careca') return;
    const m = k.mat(s.cabelo.cor, { rough: 0.85 });
    const topo = () => { k.rcaixa(0.47, 0.13, 0.45, 0.06, m, 0, 0.42, -0.01, cab); k.rcaixa(0.47, 0.28, 0.1, 0.05, m, 0, 0.3, -0.18, cab); for (const x of [-0.22, 0.22]) k.rcaixa(0.05, 0.16, 0.36, 0.02, m, x, 0.36, -0.02, cab); };
    const bolinhas = (pts, r) => { for (const [x, y, z] of pts) { const b = k.malha(k.geo('esf', r, 8, 6), k.mat(s.cabelo.cor, { rough: 0.9, flat: true }), x, y, z, cab); b.castShadow = true; } };
    if (e === 'curto' || e === 'coque' || e === 'rabo') topo();
    if (e === 'coque') k.esf(0.11, m, 0, 0.5, -0.14, cab);
    if (e === 'rabo') { const r = k.cil(0.05, 0.03, 0.3, m, 0, 0.25, -0.26, cab); r.rotation.x = 0.4; }
    if (e === 'espetado') { topo(); for (let i = 0; i < 7; i++) { const c = k.malha(k.geo('cone', 0.06, 0.18, 5), k.mat(s.cabelo.cor, { rough: 0.9, flat: true }), -0.18 + i * 0.06, 0.52, -0.05 + (i % 2) * 0.08, cab); c.rotation.z = (i - 3) * 0.18; } }
    if (e === 'moicano') k.rcaixa(0.09, 0.2, 0.44, 0.04, m, 0, 0.5, -0.02, cab);
    if (e === 'longo') { topo(); k.rcaixa(0.48, 0.5, 0.12, 0.05, m, 0, 0.14, -0.2, cab); for (const x of [-0.23, 0.23]) k.rcaixa(0.06, 0.42, 0.22, 0.03, m, x, 0.18, -0.07, cab); }
    if (e === 'chanel') { k.rcaixa(0.5, 0.15, 0.47, 0.06, m, 0, 0.42, -0.01, cab); k.rcaixa(0.5, 0.36, 0.12, 0.05, m, 0, 0.22, -0.2, cab); for (const x of [-0.24, 0.24]) k.rcaixa(0.07, 0.34, 0.34, 0.03, m, x, 0.23, -0.03, cab); k.rcaixa(0.44, 0.07, 0.06, 0.03, m, 0, 0.39, 0.2, cab); }
    if (e === 'afro') { const a = k.malha(k.geo('esf', 0.33, 10, 8), k.mat(s.cabelo.cor, { rough: 0.95, flat: true }), 0, 0.4, -0.05, cab); a.scale.set(1, 0.85, 1); a.castShadow = true; }
    if (e === 'cacheado' || e === 'longoCacheado') {
      const pts = [];
      for (let i = 0; i < 9; i++) { const a = (i / 9) * PI * 2; pts.push([Math.cos(a) * 0.2, 0.44 + (i % 2) * 0.03, Math.sin(a) * 0.19 - 0.02]); }
      pts.push([0, 0.5, 0], [0.08, 0.49, 0.1], [-0.08, 0.49, 0.1], [0, 0.47, -0.15]);
      if (e === 'longoCacheado') for (let y = 0.34; y >= 0.0; y -= 0.1) for (const x of [-0.2, -0.07, 0.07, 0.2]) pts.push([x, y, -0.2 + Math.abs(x) * 0.15]);
      bolinhas(pts, 0.085);
      if (e === 'longoCacheado') for (const x of [-0.23, 0.23]) bolinhas([[x, 0.3, -0.05], [x, 0.18, -0.08], [x * 1.05, 0.06, -0.1]], 0.07);
    }
  }

  acessorios(cab, tronco) {
    const k = this.kit, s = this.skin, A = s.acessorios || [];
    const tem = (a) => A.includes(a);
    const escuro = k.mat(0x15171d, { rough: 0.3, metal: 0.4 });
    if (tem('oculos')) {
      for (const x of [-0.09, 0.09]) { const o = k.malha(k.geo('toro', 0.058, 0.011, 6, 20), escuro, x, 0.25, 0.228, cab); o.castShadow = false; }
      k.caixa(0.06, 0.012, 0.012, escuro, 0, 0.26, 0.228, cab);
    }
    if (tem('oculosEscuros')) { k.rcaixa(0.36, 0.085, 0.03, 0.03, k.mat(0x0a0a0a, { rough: 0.1, metal: 0.6 }), 0, 0.255, 0.225, cab); }
    if (tem('fone')) {
      const arco = k.malha(k.geoFeita('arcoFone', () => new THREE.TorusGeometry(0.255, 0.022, 6, 20, PI)), escuro, 0, 0.25, 0, cab); arco.rotation.y = PI / 2;
      for (const x of [-0.245, 0.245]) { const c = k.cil(0.08, 0.08, 0.06, k.mat(s.roupa.cor2 ?? 0x2b2b2b, { rough: 0.5 }), x, 0.22, 0, cab); c.rotation.z = PI / 2; }
    }
    if (tem('bone') || tem('boneTras')) {
      const cor = k.mat(s.boneCor ?? 0xd62828, { rough: 0.8 });
      const cup = k.malha(k.geo('esf', 0.245, 16, 10), cor, 0, 0.4, -0.01, cab); cup.scale.set(1, 0.55, 1);
      k.rcaixa(0.32, 0.025, 0.2, 0.01, cor, 0, 0.4, tem('boneTras') ? -0.29 : 0.29, cab);
    }
    if (tem('faixa')) { const f = k.malha(k.geo('toro', 0.232, 0.028, 6, 24), k.mat(s.faixaCor ?? 0xffffff, { rough: 0.8 }), 0, 0.38, -0.005, cab); f.rotation.x = PI / 2; f.scale.set(1, 1.02, 1); }
    if (tem('capacete')) {
      const v = k.malha(k.geo('esf', 0.36, 24, 16), k.mat(0xbfe3ff, { opac: 0.22, rough: 0.05, metal: 0.3 }), 0, 0.23, 0, cab, false); v.renderOrder = 2;
      const anel = k.malha(k.geo('toro', 0.28, 0.035, 8, 24), k.mat(0xdfe5ec, { metal: 0.6, rough: 0.3 }), 0, -0.02, 0, cab); anel.rotation.x = PI / 2;
    }
    if (tem('chapeuChef')) { const b = k.mat(0xffffff, { rough: 0.8 }); k.cil(0.17, 0.18, 0.18, b, 0, 0.5, 0, cab); const p = k.esf(0.21, b, 0, 0.66, 0, cab); p.scale.y = 0.7; }
    if (tem('chapeuMago')) {
      const c = k.mat(s.roupa.cor, { rough: 0.85 });
      k.cil(0.34, 0.34, 0.025, c, 0, 0.44, 0, cab, 24);
      const cone = k.malha(k.geo('cone', 0.22, 0.55, 12), c, 0, 0.72, -0.03, cab); cone.rotation.x = -0.18;
      k.esf(0.04, k.mat(0xf2c14e, { emis: 0xf2c14e, ei: 1.5 }), 0.06, 0.66, 0.15, cab);
    }
    if (tem('boina')) { const b = k.malha(k.geo('esf', 0.25, 16, 10), k.mat(s.boinaCor ?? 0xd62828, { rough: 0.9 }), 0.03, 0.44, -0.01, cab); b.scale.set(1.05, 0.38, 1.05); b.rotation.z = 0.22; }
    if (tem('gravata')) { k.rcaixa(0.05, 0.05, 0.03, 0.015, k.mat(0xb02a2a), 0, 0.54, 0.145, tronco); k.rcaixa(0.06, 0.26, 0.02, 0.02, k.mat(0xb02a2a), 0, 0.38, 0.145, tronco); }
    if (tem('coroa')) { const ouro = k.mat(0xf2c14e, { metal: 0.9, rough: 0.25 }); k.cil(0.2, 0.2, 0.08, ouro, 0, 0.5, 0, cab, 12); for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; k.malha(k.geo('cone', 0.04, 0.1, 4), ouro, Math.cos(a) * 0.19, 0.58, Math.sin(a) * 0.19, cab); } }
    if (tem('antena')) { k.cil(0.012, 0.012, 0.2, k.mat(0x6b7686, { metal: 0.8 }), 0.12, 0.52, 0, cab); this.luzAntena = k.esf(0.04, k.mat(0x111111, { emis: 0xff4d4d, ei: 2.5 }), 0.12, 0.63, 0, cab); }
    if (s.roupa.tipo === 'ninja') {
      const preto = k.mat(s.roupa.cor, { rough: 0.9 });
      k.rcaixa(0.47, 0.17, 0.46, 0.07, preto, 0, 0.4, 0, cab);
      k.rcaixa(0.47, 0.16, 0.46, 0.07, preto, 0, 0.08, 0, cab);
      k.rcaixa(0.47, 0.04, 0.47, 0.02, k.mat(s.roupa.cor2, { rough: 0.8 }), 0, 0.36, 0, cab);
      for (const z of [-0.06, 0.06]) { const f = k.rcaixa(0.04, 0.2, 0.05, 0.02, k.mat(s.roupa.cor2), -0.05 + z, 0.3, -0.25, cab); f.rotation.x = 0.6 + z * 3; }
    }
  }

  // ---------- objetos na mao direita ----------
  segurar(o) {
    if (this.objeto === o) return;
    this.objeto = o;
    if (this.objMesh) { this.maoD.remove(this.objMesh); this.objMesh = null; }
    if (!o) return;
    const k = this.kit, g = new THREE.Group();
    if (o === 'copo') k.cil(0.045, 0.035, 0.11, k.mat(0xffffff, { opac: 0.8 }), 0, -0.02, 0.06, g);
    if (o === 'xicara') { k.cil(0.045, 0.04, 0.08, k.mat(0xffffff, { rough: 0.3 }), 0, -0.01, 0.06, g); k.cil(0.04, 0.04, 0.005, k.mat(0x4a2c1d), 0, 0.03, 0.06, g); }
    if (o === 'bola') k.esf(0.12, k.mat(0xe8742a, { rough: 0.7 }), 0, -0.04, 0.1, g);
    if (o === 'papel') { const p = k.caixa(0.21, 0.005, 0.28, k.mat(0xffffff, { rough: 0.9 }), 0.1, -0.02, 0.1, g); p.rotation.x = 0.3; }
    if (o === 'regador') { k.cil(0.08, 0.09, 0.16, k.mat(0x3fa65a, { rough: 0.5 }), 0, -0.1, 0.08, g); const b = k.cil(0.015, 0.02, 0.2, k.mat(0x3fa65a), 0, -0.05, 0.22, g); b.rotation.x = 1.1; }
    this.maoD.add(g);
    this.objMesh = g;
  }

  // ---------- animacao ----------
  // pose: em pe | andar | correr | sentado | digitar | pensar | acenar | comemorar | desespero | beber |
  //       sofa | janela | conversar | regar | arremessar | carregar | entregar
  setPose(p, opc = {}) { this.pose = p; this.opc = opc; }
  setExpr(e) { this.expr = e; if (this.bocaO) { this.bocaO.visible = e === 'susto'; this.boca.visible = e !== 'susto'; } }

  // dt: segundos; vel: metros/s andados neste quadro (para sincronizar os passos)
  atualizar(dt, vel = 0) {
    this.t += dt;
    const t = this.t, p = this.pose, o = this.opc || {};
    if (vel > 0) this.fase += vel * dt * (p === 'correr' ? 4.2 : 5.2);
    const alvo = { hip: QUADRIL, inc: 0, cx: 0, cy: 0, oEx: 0.05, oEz: 0.1, oDx: 0.05, oDz: -0.1, cE: -0.1, cD: -0.1, pE: 0, pD: 0, jE: 0, jD: 0, pulo: 0, gira: 0 };
    const s = Math.sin(this.fase), sentar = (h = SENTADO) => { alvo.hip = h; alvo.pE = alvo.pD = -1.5; alvo.jE = alvo.jD = 1.45; };
    const respira = Math.sin(t * 2.2) * 0.012;

    if (p === 'andar' || p === 'correr' || p === 'carregar') {
      const a = p === 'correr' ? 0.85 : 0.55;
      alvo.pE = s * a; alvo.pD = -s * a;
      alvo.jE = Math.max(0, -Math.sin(this.fase - 0.6)) * a * 1.3; alvo.jD = Math.max(0, Math.sin(this.fase - 0.6)) * a * 1.3;
      alvo.oEx = -s * a * 0.9; alvo.oDx = s * a * 0.9; alvo.cE = alvo.cD = p === 'correr' ? -1.2 : -0.35;
      alvo.pulo = Math.abs(Math.cos(this.fase)) * (p === 'correr' ? 0.06 : 0.03);
      alvo.inc = p === 'correr' ? 0.18 : 0.04;
      if (p === 'carregar') { alvo.oEx = alvo.oDx = -1.0; alvo.cE = alvo.cD = -0.6; alvo.oEz = 0.25; alvo.oDz = -0.25; }
    } else if (p === 'sentado' || p === 'digitar' || p === 'ler') {
      sentar();
      alvo.oEx = alvo.oDx = -0.55; alvo.cE = alvo.cD = -0.7;
      if (p === 'digitar') { alvo.oEx = -1.05 + Math.sin(t * 18) * 0.06; alvo.oDx = -1.05 + Math.sin(t * 18 + 2) * 0.06; alvo.cE = alvo.cD = -0.45; alvo.cx = 0.12; alvo.inc = 0.08; }
      if (p === 'ler') { alvo.cx = 0.32; alvo.oDx = -1.7; alvo.cD = -2.1; alvo.oDz = 0.1; }
    } else if (p === 'sofa') {
      sentar(SOFA); alvo.inc = -0.28; alvo.oEz = 0.5; alvo.oDz = -0.5; alvo.oEx = alvo.oDx = -0.25; alvo.cy = Math.sin(t * 0.4) * 0.25; alvo.cx = -0.05;
    } else if (p === 'pensar') {
      if (o.sentado) sentar();
      alvo.oDx = -1.65; alvo.cD = -2.25; alvo.oDz = 0.15; alvo.cx = 0.05; alvo.cy = -0.15 + Math.sin(t * 0.8) * 0.1;
    } else if (p === 'acenar') {
      alvo.oDx = -2.9; alvo.oDz = -0.25; alvo.cD = -0.25 + Math.sin(t * 9) * 0.45; alvo.pulo = Math.max(0, Math.sin(t * 4)) * 0.05; alvo.cx = -0.12;
    } else if (p === 'comemorar') {
      const f = Math.abs(Math.sin(t * 6.5));
      alvo.oEx = alvo.oDx = -2.9; alvo.oEz = 0.35; alvo.oDz = -0.35; alvo.cE = alvo.cD = -0.2;
      alvo.pulo = f * 0.32; alvo.pE = alvo.pD = -f * 0.5; alvo.jE = alvo.jD = f * 1.0; alvo.cx = -0.2;
    } else if (p === 'desespero') {
      if (o.sentado) sentar();
      alvo.oEx = alvo.oDx = -2.5; alvo.oEz = 0.75; alvo.oDz = -0.75; alvo.cE = alvo.cD = -1.9; alvo.cy = Math.sin(t * 11) * 0.22; alvo.cx = 0.15;
    } else if (p === 'beber') {
      const gole = Math.sin(t * 1.4) > 0.2;
      alvo.oDx = gole ? -1.55 : -0.7; alvo.cD = gole ? -2.2 : -1.2; alvo.oDz = 0.2; alvo.cx = gole ? -0.3 : 0;
    } else if (p === 'janela') {
      alvo.oEx = alvo.oDx = 0.45; alvo.cE = alvo.cD = -0.6; alvo.oEz = -0.15; alvo.oDz = 0.15; alvo.cx = -0.1; alvo.cy = Math.sin(t * 0.3) * 0.35;
    } else if (p === 'conversar') {
      alvo.oDx = -0.7 + Math.sin(t * 3) * 0.35; alvo.cD = -1.3; alvo.oEx = -0.3 + Math.sin(t * 2.3 + 1) * 0.25; alvo.cE = -0.9; alvo.cy = Math.sin(t * 0.9) * 0.2; alvo.cx = Math.sin(t * 2.7) * 0.05;
    } else if (p === 'regar') {
      alvo.oDx = -1.2; alvo.cD = -0.2; alvo.cx = 0.25; alvo.inc = 0.1;
    } else if (p === 'arremessar') {
      // o.p vai de 0 a 1: agacha (0-0.4), salta e empurra a bola (0.4-0.6), desce (0.6-1)
      const q = o.p ?? 0, sobe = q > 0.4 && q < 0.75;
      alvo.oEx = alvo.oDx = sobe ? -3.0 : -1.6; alvo.cE = alvo.cD = sobe ? -0.2 : -1.7;
      alvo.pE = alvo.pD = q < 0.4 ? -0.7 : 0; alvo.jE = alvo.jD = q < 0.4 ? 1.2 : 0;
      alvo.hip = q < 0.4 ? QUADRIL - 0.18 : QUADRIL; alvo.pulo = sobe ? Math.sin(((q - 0.4) / 0.35) * PI) * 0.3 : 0; alvo.cx = -0.25;
    } else if (p === 'entregar') {
      alvo.oDx = alvo.oEx = -1.35; alvo.cD = alvo.cE = -0.15; alvo.inc = 0.12;
    } else {
      // em pe: respira e olha em volta de vez em quando
      alvo.cy = Math.sin(t * 0.35) * 0.35; alvo.oEx = Math.sin(t * 0.9) * 0.04; alvo.oDx = -Math.sin(t * 0.9) * 0.04;
    }

    // as juntas deslizam ate o alvo
    const k = 1 - Math.exp(-dt * (p === 'arremessar' ? 22 : 11));
    const L = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    const hipAlvo = alvo.hip / (this.skin.altura || 1) + alvo.pulo;
    L(this.quadril.position, 'y', hipAlvo);
    L(this.tronco.rotation, 'x', alvo.inc);
    L(this.cabeca.rotation, 'x', alvo.cx); L(this.cabeca.rotation, 'y', alvo.cy);
    L(this.ombroE.rotation, 'x', alvo.oEx); L(this.ombroE.rotation, 'z', alvo.oEz);
    L(this.ombroD.rotation, 'x', alvo.oDx); L(this.ombroD.rotation, 'z', alvo.oDz);
    L(this.cotoveloE.rotation, 'x', alvo.cE); L(this.cotoveloD.rotation, 'x', alvo.cD);
    L(this.pernaE.rotation, 'x', alvo.pE); L(this.pernaD.rotation, 'x', alvo.pD);
    L(this.joelhoE.rotation, 'x', alvo.jE); L(this.joelhoD.rotation, 'x', alvo.jD);
    this.corpo.scale.y = 1 + respira;

    // piscar
    this.piscar -= dt;
    const fechado = this.piscar < 0.12;
    if (this.piscar < 0) this.piscar = 2.5 + Math.random() * 4;
    for (const e of this.olhos) e.scale.y = fechado ? 0.12 : 1;
    if (this.luzAntena) this.luzAntena.material.emissiveIntensity = Math.sin(t * 4) > 0 ? 2.5 : 0.3;
  }

  // altura da cabeca (para o balao ficar em cima)
  get topo() { return (QUADRIL + 0.05 + 0.62 + 0.5) * (this.skin.altura || 1); }
}

function grupo(pai, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); pai.add(g); return g; }
