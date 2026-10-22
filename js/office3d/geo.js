// Kit de construcao: materiais reaproveitados, pecas basicas (caixa arredondada, cilindro...)
// e texturas desenhadas em canvas. Tudo que um Kit cria e liberado junto em kit.liberar().
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class Kit {
  constructor(raiz) {
    this.raiz = raiz;              // grupo onde as pecas entram por padrao
    this.mats = new Map();
    this.geos = new Map();
    this.texs = [];
  }

  // material padrao (PBR) reaproveitado por cor/opcoes
  mat(cor, o = {}) {
    const k = cor + JSON.stringify({ ...o, map: o.map && o.map.uuid }); // textura entra pelo id (toJSON dela quebra aqui)
    let m = this.mats.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: cor, roughness: o.rough ?? 0.75, metalness: o.metal ?? 0, flatShading: !!o.flat });
      if (o.emis !== undefined) { m.emissive.set(o.emis); m.emissiveIntensity = o.ei ?? 1; }
      if (o.opac !== undefined) { m.transparent = true; m.opacity = o.opac; m.depthWrite = o.opac > 0.6; }
      if (o.map) m.map = o.map;
      if (o.lado) m.side = THREE.DoubleSide;
      this.mats.set(k, m);
    }
    return m;
  }

  // geometria reaproveitada por tipo/medidas
  geo(tipo, ...p) {
    const k = tipo + p.join(',');
    let g = this.geos.get(k);
    if (!g) {
      if (tipo === 'caixa') g = new THREE.BoxGeometry(...p);
      else if (tipo === 'rcaixa') g = new RoundedBoxGeometry(p[0], p[1], p[2], 3, Math.min(p[3], Math.min(p[0], p[1], p[2]) / 2 - 0.001));
      else if (tipo === 'cil') g = new THREE.CylinderGeometry(p[0], p[1], p[2], p[3] || 24);
      else if (tipo === 'esf') g = new THREE.SphereGeometry(p[0], p[1] || 20, p[2] || 14);
      else if (tipo === 'plano') g = new THREE.PlaneGeometry(p[0], p[1]);
      else if (tipo === 'toro') g = new THREE.TorusGeometry(p[0], p[1], p[2] || 10, p[3] || 32);
      else if (tipo === 'cone') g = new THREE.ConeGeometry(p[0], p[1], p[2] || 16);
      this.geos.set(k, g);
    }
    return g;
  }

  // geometria especial (que geo() nao sabe fazer), criada uma vez e reaproveitada pela chave
  geoFeita(chave, criar) {
    let g = this.geos.get(chave);
    if (!g) { g = criar(); this.geos.set(chave, g); }
    return g;
  }

  // coloca uma malha; m pode ser cor (numero/string) ou material
  malha(geo, m, x = 0, y = 0, z = 0, pai = this.raiz, sombra = true) {
    const me = new THREE.Mesh(geo, m && m.isMaterial ? m : this.mat(m));
    me.position.set(x, y, z);
    me.castShadow = me.receiveShadow = sombra;
    pai.add(me);
    return me;
  }
  caixa(w, h, d, m, x, y, z, pai) { return this.malha(this.geo('caixa', w, h, d), m, x, y, z, pai); }
  // caixa com cantos arredondados (r = raio do canto): o visual "moderno" dos moveis
  rcaixa(w, h, d, r, m, x, y, z, pai) { return this.malha(this.geo('rcaixa', w, h, d, r), m, x, y, z, pai); }
  cil(rt, rb, h, m, x, y, z, pai, seg) { return this.malha(this.geo('cil', rt, rb, h, seg), m, x, y, z, pai); }
  esf(r, m, x, y, z, pai) { return this.malha(this.geo('esf', r), m, x, y, z, pai); }
  grupo(x = 0, y = 0, z = 0, rotY = 0, pai = this.raiz) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = rotY;
    pai.add(g);
    return g;
  }

  // textura desenhada num canvas: desenhar(ctx, w, h)
  textura(w, h, desenhar, repetir = [1, 1]) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    desenhar(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repetir);
    t.anisotropy = 4;
    this.texs.push(t);
    return t;
  }

  liberar() {
    this.raiz.traverse((o) => { if (o.isMesh && o.material && o.material.map && !this.texs.includes(o.material.map)) o.material.map.dispose(); });
    for (const m of this.mats.values()) m.dispose();
    for (const g of this.geos.values()) g.dispose();
    for (const t of this.texs) t.dispose();
    this.raiz.clear();
  }
}

// ---------- texturas prontas ----------
const ruido = (ctx, w, h, n, cor, a) => {
  ctx.fillStyle = cor;
  for (let i = 0; i < n; i++) { ctx.globalAlpha = Math.random() * a; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  ctx.globalAlpha = 1;
};
const hex = (c) => '#' + new THREE.Color(c).getHexString();
const tom = (c, f) => { const k = new THREE.Color(c); k.offsetHSL(0, 0, f); return '#' + k.getHexString(); };

export const TEX = {
  // tabuas de madeira
  madeira: (kit, cor, rep = [6, 4]) => kit.textura(512, 512, (ctx, w, h) => {
    const n = 8, a = h / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = tom(cor, (Math.random() - 0.5) * 0.08);
      ctx.fillRect(0, i * a, w, a);
      ctx.strokeStyle = tom(cor, -0.18); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, i * a); ctx.lineTo(w, i * a); ctx.stroke();
      const corte = Math.random() * w;
      ctx.beginPath(); ctx.moveTo(corte, i * a); ctx.lineTo(corte, (i + 1) * a); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.strokeStyle = tom(cor, -0.25);
      for (let k = 0; k < 6; k++) { const y = i * a + Math.random() * a; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
  }, rep),
  // tijolinho aparente
  tijolo: (kit, cor, rep = [6, 2]) => kit.textura(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5a4a40'; ctx.fillRect(0, 0, w, h);
    const bh = h / 8, bw = w / 4;
    for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) {
      ctx.fillStyle = tom(cor, (Math.random() - 0.5) * 0.12);
      ctx.fillRect(i * bw + (j % 2) * bw / 2 + 3, j * bh + 3, bw - 6, bh - 6);
    }
    ruido(ctx, w, h, 4000, '#000', 0.25);
  }, rep),
  // concreto/cimento queimado
  concreto: (kit, cor, rep = [4, 3]) => kit.textura(512, 512, (ctx, w, h) => {
    ctx.fillStyle = hex(cor); ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 9000, '#000', 0.12); ruido(ctx, w, h, 6000, '#fff', 0.1);
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
  }, rep),
  // placas de metal com rebites (estacao espacial)
  metal: (kit, cor, rep = [8, 3]) => kit.textura(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(cor); ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, w - 4, h - 4);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (const [x, y] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
  }, rep),
  // grade neon no chao (cyberpunk)
  grade: (kit, fundo, linha, rep = [12, 8]) => kit.textura(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(fundo); ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 1500, '#fff', 0.05);
    ctx.strokeStyle = hex(linha); ctx.lineWidth = 3; ctx.shadowColor = hex(linha); ctx.shadowBlur = 8;
    ctx.strokeRect(0, 0, w, h);
  }, rep),
  // carpete/tapete com textura de trama
  carpete: (kit, cor, rep = [3, 3]) => kit.textura(256, 256, (ctx, w, h) => {
    ctx.fillStyle = hex(cor); ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, 12000, '#000', 0.16); ruido(ctx, w, h, 5000, '#fff', 0.08);
  }, rep),
  // painel de madeira na parede (aconchegante)
  ripado: (kit, cor, rep = [10, 1]) => kit.textura(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 4; i++) { ctx.fillStyle = tom(cor, (i % 2 ? -0.04 : 0.02)); ctx.fillRect(i * w / 4, 0, w / 4, h); }
    ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(i * w / 4, 0, 3, h);
    ruido(ctx, w, h, 3000, '#000', 0.1);
  }, rep),
  // linhas da quadra de basquete
  quadra: (kit, piso, linha, destaque) => kit.textura(1024, 768, (ctx, w, h) => {
    ctx.fillStyle = hex(piso); ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 14; i++) { ctx.fillStyle = tom(piso, (i % 2 ? -0.05 : 0.03)); ctx.fillRect(0, i * h / 14, w, h / 14); }
    ctx.globalAlpha = 1;
    // garrafao e linha de 3 (a cesta fica no lado direito da textura)
    const cy = h / 2, ax = w - 70;
    ctx.fillStyle = hex(destaque); ctx.globalAlpha = 0.85; ctx.fillRect(ax - 330, cy - 110, 330, 220); ctx.globalAlpha = 1;
    ctx.strokeStyle = hex(linha); ctx.lineWidth = 9;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.strokeRect(ax - 330, cy - 110, 330, 220);
    ctx.beginPath(); ctx.arc(ax - 330, cy, 110, Math.PI / 2, -Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, cy, 470, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, cy, 120, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  }),
};
export { hex, tom };
