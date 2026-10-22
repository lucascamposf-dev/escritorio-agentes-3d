// Paisagem atras do janelao, desenhada em canvas. Dia/noite segue a hora real do computador.
// tipos: cidade | chuva (cidade neon chovendo) | montanha (com neve) | espaco (a Terra vista da estacao)
import * as THREE from 'three';

const noite = () => { const h = new Date().getHours(); return h < 6 || h >= 18; };
const sorte = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647); // aleatorio repetivel

function ceu(ctx, w, h, cima, baixo) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, cima); g.addColorStop(1, baixo);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function estrelas(ctx, w, h, n, r) {
  ctx.fillStyle = '#fff';
  for (let i = 0; i < n; i++) { ctx.globalAlpha = 0.3 + r() * 0.7; ctx.fillRect(r() * w, r() * h * 0.7, 1.5, 1.5); }
  ctx.globalAlpha = 1;
}
function predios(ctx, w, h, r, { base, cor, janela, acesas, neon }) {
  for (let camada = 0; camada < 2; camada++) {
    let x = -20;
    while (x < w) {
      const bw = 40 + r() * 90, bh = h * (0.25 + r() * (camada ? 0.45 : 0.3)) * (camada ? 1 : 0.8);
      ctx.fillStyle = camada ? cor : base;
      ctx.fillRect(x, h - bh, bw, bh);
      ctx.fillStyle = janela;
      for (let jy = h - bh + 10; jy < h - 8; jy += 14) for (let jx = x + 6; jx < x + bw - 8; jx += 12) if (r() < acesas) ctx.fillRect(jx, jy, 6, 8);
      if (neon && camada && r() < 0.35) { ctx.fillStyle = neon[(r() * neon.length) | 0]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 18; ctx.fillRect(x + 6, h - bh + 14, bw - 12, 10); ctx.shadowBlur = 0; }
      x += bw + 4 + r() * 18;
    }
  }
}

const DESENHO = {
  cidade(ctx, w, h) {
    const r = sorte(7), n = noite();
    ceu(ctx, w, h, n ? '#0b1236' : '#5fb4ff', n ? '#28305e' : '#cfe8ff');
    if (n) { estrelas(ctx, w, h, 160, r); ctx.fillStyle = '#f1f1f7'; ctx.beginPath(); ctx.arc(w * 0.75, h * 0.2, 26, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#fff3b0'; ctx.shadowColor = '#fff3b0'; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(w * 0.75, h * 0.2, 30, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.85)'; for (const [x, y, s] of [[0.2, 0.18, 1], [0.45, 0.1, 0.7], [0.9, 0.3, 0.8]]) { ctx.beginPath(); ctx.ellipse(w * x, h * y, 60 * s, 18 * s, 0, 0, 7); ctx.ellipse(w * x + 30 * s, h * y - 10 * s, 40 * s, 16 * s, 0, 0, 7); ctx.fill(); } }
    predios(ctx, w, h, r, n ? { base: '#141a33', cor: '#1d2547', janela: '#ffd98a', acesas: 0.45 } : { base: '#8fa6c4', cor: '#6d84a6', janela: '#bcd6f2', acesas: 0.5 });
  },
  chuva(ctx, w, h) {
    const r = sorte(11);
    ceu(ctx, w, h, '#0a0614', '#2a1238');
    predios(ctx, w, h, r, { base: '#120a20', cor: '#1b1030', janela: '#5ef2ff', acesas: 0.3, neon: ['#ff2bd6', '#2bf6ff', '#ffe02b', '#8b5bff'] });
    ctx.fillStyle = 'rgba(255,43,214,.12)'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
  },
  montanha(ctx, w, h) {
    const r = sorte(3), n = noite();
    ceu(ctx, w, h, n ? '#0d1430' : '#8ec5ff', n ? '#3a3f6a' : '#f2e6d0');
    if (n) { estrelas(ctx, w, h, 220, r); ctx.fillStyle = '#f5f3e8'; ctx.beginPath(); ctx.arc(w * 0.25, h * 0.22, 22, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(w * 0.25, h * 0.25, 28, 0, 7); ctx.fill(); }
    const serra = (y, alt, cor, neve) => {
      ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(0, h);
      const pts = [];
      for (let x = 0; x <= w; x += w / 8) { const py = y - r() * alt; pts.push([x, py]); ctx.lineTo(x, py); }
      ctx.lineTo(w, h); ctx.fill();
      if (neve) { ctx.fillStyle = n ? '#c8d0e8' : '#ffffff'; for (const [x, py] of pts) if (py < y - alt * 0.55) { ctx.beginPath(); ctx.moveTo(x - 26, py + 26); ctx.lineTo(x, py); ctx.lineTo(x + 26, py + 26); ctx.fill(); } }
    };
    serra(h * 0.6, h * 0.35, n ? '#2a3256' : '#7d8fb3', true);
    serra(h * 0.78, h * 0.22, n ? '#1c2440' : '#5d7a6a', false);
    ctx.fillStyle = n ? '#0f1a1a' : '#2f5a3e';
    for (let i = 0; i < 70; i++) { const x = r() * w, b = h - r() * h * 0.12, a = 30 + r() * 40; ctx.beginPath(); ctx.moveTo(x, b - a); ctx.lineTo(x - a * 0.3, b); ctx.lineTo(x + a * 0.3, b); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 140; i++) ctx.fillRect(r() * w, r() * h, 2, 2); // neve caindo
  },
  espaco(ctx, w, h) {
    const r = sorte(5);
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, w, h);
    estrelas(ctx, w, h * 1.4, 400, r);
    const g = ctx.createRadialGradient(w * 0.62, h * 1.25, h * 0.2, w * 0.62, h * 1.25, h * 0.95);
    g.addColorStop(0, '#2c7be5'); g.addColorStop(0.75, '#1a4fa3'); g.addColorStop(0.92, '#7fc8ff'); g.addColorStop(1, 'rgba(127,200,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w * 0.62, h * 1.25, h * 0.95, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(80,170,90,.75)';
    for (const [x, y, rx, ry] of [[0.5, 0.62, 90, 40], [0.7, 0.55, 60, 30], [0.6, 0.8, 120, 30]]) { ctx.beginPath(); ctx.ellipse(w * x, h * y, rx, ry, 0.3, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.ellipse(w * (0.35 + r() * 0.55), h * (0.45 + r() * 0.5), 50 + r() * 60, 8, r(), 0, 7); ctx.fill(); }
    ctx.fillStyle = '#d9d9d9'; ctx.beginPath(); ctx.arc(w * 0.18, h * 0.25, 22, 0, 7); ctx.fill();
  },
};

export function vista(kit, tipo, largura, altura) {
  const cv = document.createElement('canvas');
  cv.width = 2048; cv.height = 640;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  kit.texs.push(tex);
  const mat = new THREE.MeshBasicMaterial({ map: tex, fog: false });
  kit.mats.set('vista', mat);
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), mat);
  kit.geos.set('vista', malha.geometry);
  let desenhada = '';
  const desenhar = () => {
    const chave = tipo + noite();
    if (chave === desenhada) return;
    desenhada = chave;
    (DESENHO[tipo] || DESENHO.cidade)(cv.getContext('2d'), cv.width, cv.height);
    tex.needsUpdate = true;
  };
  desenhar();

  // chuva/neve: uma segunda camada com riscos que desce sem parar
  let cortina = null;
  if (tipo === 'chuva' || tipo === 'montanha') {
    const t = kit.textura(256, 256, (c, w, h) => {
      c.strokeStyle = tipo === 'chuva' ? 'rgba(170,200,255,.55)' : 'rgba(255,255,255,.9)';
      c.lineWidth = tipo === 'chuva' ? 1.2 : 2.5;
      for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x - (tipo === 'chuva' ? 3 : 0), y + (tipo === 'chuva' ? 16 : 2.5)); c.stroke(); }
    }, [8, 3]);
    cortina = new THREE.Mesh(new THREE.PlaneGeometry(largura, altura), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
    kit.geos.set('cortina', cortina.geometry); kit.mats.set('cortina', cortina.material);
    cortina.position.z = 0.3;
    malha.add(cortina);
  }
  // espaco: a vista gira devagar (a estacao esta em orbita)
  let acc = 0;
  return {
    malha,
    tick(dt) {
      acc += dt;
      if (acc > 30) { acc = 0; desenhar(); }
      if (cortina) cortina.material.map.offset.y += dt * (tipo === 'chuva' ? 1.6 : 0.12);
      if (tipo === 'espaco') { tex.offset.x -= dt * 0.004; tex.wrapS = THREE.RepeatWrapping; }
    },
  };
}
