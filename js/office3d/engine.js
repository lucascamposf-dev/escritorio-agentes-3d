// Motor da cena: renderer, camera com 3 modos, luzes base, reflexos do ambiente, bloom e o laco de animacao.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const VISTA = { pos: new THREE.Vector3(1.2, 17.5, 19.5), alvo: new THREE.Vector3(0.4, 0, 0.6) };

export class Engine {
  constructor(host, { qualidade = 'alta', camera = 'seguir' } = {}) {
    this.host = host;
    this.tickers = new Set();
    this.foco = null; // ponto que a camera "seguir" acompanha (o diretor atualiza)
    this.relogio = new THREE.Clock();

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(r.domElement);

    const scene = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.camera.position.copy(VISTA.pos);

    // reflexos suaves de "sala" para os materiais (sem nenhuma imagem externa)
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // luzes base: cada tema muda cores e intensidades
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1);
    const sol = this.sol = new THREE.DirectionalLight(0xffffff, 2);
    sol.position.set(-8, 16, 9);
    sol.castShadow = true;
    Object.assign(sol.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 1, far: 45 });
    sol.shadow.bias = -0.0004;
    sol.shadow.normalBias = 0.03;
    scene.add(this.hemi, sol, sol.target);

    const c = this.controles = new OrbitControls(this.camera, r.domElement);
    c.target.copy(VISTA.alvo);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 5;
    c.maxDistance = 34;
    c.maxPolarAngle = 1.38;
    c.autoRotateSpeed = 0.35;
    c.addEventListener('start', () => { this.mexeu = performance.now(); });
    r.domElement.addEventListener('dblclick', () => this.voltarVista());

    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.5, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.setQualidade(qualidade);
    this.setCamera(camera);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.relogio.getDelta(); });
    r.setAnimationLoop(() => this.quadro());
  }

  setQualidade(q) {
    this.qualidade = q;
    const alta = q === 'alta';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, alta ? 2 : 1));
    this.renderer.shadowMap.enabled = alta;
    this.sol.shadow.mapSize.set(alta ? 2048 : 512, alta ? 2048 : 512);
    if (this.sol.shadow.map) { this.sol.shadow.map.dispose(); this.sol.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  // livre: so o mouse; seguir: acompanha quem trabalha; cinema: gira devagar sozinho
  setCamera(modo) {
    this.modo = modo;
    this.controles.autoRotate = modo === 'cinema';
  }

  voltarVista() {
    this.camera.position.copy(VISTA.pos);
    this.controles.target.copy(VISTA.alvo);
    this.mexeu = 0;
  }

  // tema: { luz: { ceu, chao, hemi, sol, corSol, exposicao, bloom, ambiente } }
  aplicarLuz(l) {
    this.hemi.color.set(l.ceu); this.hemi.groundColor.set(l.chao); this.hemi.intensity = l.hemi;
    this.sol.color.set(l.corSol); this.sol.intensity = l.sol;
    this.renderer.toneMappingExposure = l.exposicao ?? 1;
    this.scene.environmentIntensity = l.ambiente ?? 0.6;
    this.bloom.strength = l.bloom ?? 0.3;
    this.bloom.threshold = l.limiar ?? 0.86; // so o que passa desse brilho "vaza" luz
    this.scene.background = new THREE.Color(l.fundo ?? 0x0e1016);
  }

  onTick(f) { this.tickers.add(f); return () => this.tickers.delete(f); }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  quadro() {
    if (document.hidden) return; // janela oculta: nao gasta GPU
    // escala: acelera o tempo (usado nos testes para nao esperar os personagens andarem)
    const dt = Math.min(this.relogio.getDelta(), this.passoMax || 0.1) * (this.escala || 1);
    this.tempo = (this.tempo || 0) + dt;
    const t = this.tempo;
    for (const f of this.tickers) f(dt, t);
    // seguir: depois de 6 s sem mexer no mouse, a camera desliza ate o foco
    if (this.modo === 'seguir' && this.foco && performance.now() - (this.mexeu || 0) > 6000) {
      const k = Math.min(1, dt * 1.6);
      const alvo = this.controles.target;
      const novo = new THREE.Vector3(this.foco.x * 0.7, 0.6, this.foco.z * 0.7);
      const delta = novo.sub(alvo).multiplyScalar(k);
      alvo.add(delta);
      this.camera.position.add(delta);
    }
    this.controles.update(dt);
    if (this.qualidade === 'alta') this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }
}
