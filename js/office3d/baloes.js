// Baloes em HTML sobre cada personagem (texto nitido em qualquer zoom) e o clique para ver detalhes.
import * as THREE from 'three';

const v = new THREE.Vector3();

export class Baloes {
  constructor(camada, engine, aoClicar) {
    this.camada = camada;
    this.engine = engine;
    this.aoClicar = aoClicar;
    this.itens = new Map(); // id do ator -> { el, txt, nome }
  }

  // garante um balao para o ator; info: { texto, nome, classe ('working'|'idle'...), cor }
  definir(ator, info) {
    let b = this.itens.get(ator.id);
    if (!b) {
      const el = document.createElement('div');
      el.className = 'balao';
      el.dataset.id = ator.id;
      const txt = document.createElement('span'); txt.className = 'txt';
      const nome = document.createElement('span'); nome.className = 'nome';
      el.append(txt, nome);
      el.addEventListener('click', () => this.aoClicar(ator.id));
      this.camada.appendChild(el);
      b = { el, txt, nome, ator };
      this.itens.set(ator.id, b);
    }
    b.ator = ator;
    if (b.txt.textContent !== info.texto) { b.txt.textContent = info.texto; b.txt.title = info.texto; }
    if (b.nome.textContent !== info.nome) b.nome.textContent = info.nome;
    const cls = 'balao ' + (info.classe || 'idle') + (info.texto ? '' : ' mini');
    if (b.el.className !== cls) b.el.className = cls;
    if (info.cor && b.el.style.getPropertyValue('--c') !== info.cor) b.el.style.setProperty('--c', info.cor);
  }

  remover(id) {
    const b = this.itens.get(id);
    if (b) { b.el.remove(); this.itens.delete(id); }
  }

  // reposiciona todos (chamado a cada quadro)
  atualizar() {
    const cam = this.engine.camera, w = this.camada.clientWidth, h = this.camada.clientHeight;
    for (const b of this.itens.values()) {
      b.ator.topo(v);
      const dist = v.distanceTo(cam.position);
      v.project(cam);
      const visivel = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 && b.ator.raiz.visible !== false;
      b.el.style.display = visivel ? '' : 'none';
      if (!visivel) continue;
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      // longe da camera os baloes encolhem um pouco (sem sumir)
      const s = Math.max(0.85, Math.min(1.15, 18 / dist));
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
      b.el.style.zIndex = String(1000 - Math.round(dist * 10));
    }
  }

  limpar() { for (const id of [...this.itens.keys()]) this.remover(id); }
}
