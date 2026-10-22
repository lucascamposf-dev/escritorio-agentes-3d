// Ator: um personagem com posicao, direcao e uma fila de tarefas.
// Tarefas: ir (pelos caminhos da sala), direto (linha reta, ex.: passar pela porta), virar,
// sentar/levantar, fazer (uma pose por um tempo, com objeto na mao) e func (codigo qualquer).
import * as THREE from 'three';
import { Personagem } from './personagem.js';
import { caminho } from './nav.js';

const ANDAR = 1.5, CORRER = 3.1;
const angDif = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export class Ator {
  constructor(kit, skin, info) {
    this.kit = kit;
    Object.assign(this, info); // id, nome, papel ('plan' | 'build' | 'sub' | 'npc'), cor
    this.raiz = new THREE.Group();
    this.x = info.x ?? 0; this.z = info.z ?? 0; this.ang = info.ang ?? 0;
    this.fila = [];
    this.sentado = null;       // { x, z, ang, de: {x,z} } quando esta numa cadeira/sofa
    this.atividade = '';       // texto do que esta fazendo quando nao trabalha
    this.trocarSkin(skin);
    this.sincronizar();
  }

  trocarSkin(skin) {
    const pose = this.p ? this.p.pose : 'em pe', opc = this.p ? this.p.opc : {}, obj = this.p ? this.p.objeto : null;
    if (this.p) { this.raiz.remove(this.p.raiz); this.p.liberar(); }
    this.skin = skin;
    this.p = new Personagem(this.kit, skin);
    this.p.setPose(pose, opc);
    if (obj) this.p.segurar(obj);
    this.raiz.add(this.p.raiz);
  }

  sincronizar() { this.raiz.position.set(this.x, 0, this.z); this.raiz.rotation.y = this.ang; }

  // troca tudo o que ia fazer por uma nova lista (levanta antes, se estiver sentado)
  agir(lista) {
    this.fila = [...(this.sentado ? [{ tipo: 'levantar' }] : []), ...lista];
    this.passo = null;
  }
  // acrescenta no fim do que ja ia fazer
  depois(lista) { this.fila.push(...lista); }
  get ocupado() { return !!(this.passo || this.fila.length); }

  atualizar(dt) {
    let vel = 0;
    if (!this.passo && this.fila.length) this.iniciar(this.fila.shift());
    const ps = this.passo;
    if (ps) {
      if (ps.tipo === 'ir' || ps.tipo === 'direto') vel = this.andar(ps, dt);
      else if (ps.tipo === 'virar') { this.virar(ps.ang, dt, 8); if (Math.abs(angDif(this.ang, ps.ang)) < 0.05) this.passo = null; }
      else if (ps.tipo === 'sentar' || ps.tipo === 'levantar') this.deslizar(ps, dt);
      else if (ps.tipo === 'fazer') { ps.t += dt; if (ps.ang !== undefined) this.virar(ps.ang, dt, 6); if (ps.cada) ps.cada(dt, ps); if (ps.dur !== Infinity && ps.t >= ps.dur) this.terminarFazer(ps); }
    }
    this.p.atualizar(dt, vel);
    this.sincronizar();
  }

  iniciar(ps) {
    this.passo = ps;
    if (ps.tipo === 'ir') {
      ps.pts = caminho({ x: this.x, z: this.z }, ps.destino);
      this.p.setPose(ps.correr ? 'correr' : ps.pose || 'andar');
    } else if (ps.tipo === 'direto') { ps.pts = [ps.destino]; this.p.setPose(ps.pose || 'andar'); }
    else if (ps.tipo === 'sentar') {
      ps.t = 0; ps.de = { x: this.x, z: this.z, ang: this.ang };
      this.sentado = { ...ps.lugar, de: { x: this.x, z: this.z } };
      this.p.setPose(ps.pose || 'sentado', ps.opc);
    } else if (ps.tipo === 'levantar') {
      ps.t = 0; ps.de = { x: this.x, z: this.z, ang: this.ang };
      ps.lugar = { ...(this.sentado ? this.sentado.de : { x: this.x, z: this.z }), ang: this.ang };
      this.sentado = null;
      this.p.setPose('em pe');
    } else if (ps.tipo === 'fazer') {
      ps.t = 0;
      if (ps.pose) this.p.setPose(ps.pose, { ...(ps.opc || {}), sentado: !!this.sentado });
      if (ps.objeto !== undefined) this.p.segurar(ps.objeto);
      if (ps.expr) this.p.setExpr(ps.expr);
      if (ps.texto !== undefined) this.atividade = ps.texto;
    } else if (ps.tipo === 'func') { ps.f(this); this.passo = null; }
  }

  terminarFazer(ps) {
    if (ps.objeto) this.p.segurar(null);
    if (ps.expr) this.p.setExpr('normal');
    this.passo = null;
  }

  andar(ps, dt) {
    const alvo = ps.pts[0];
    if (!alvo) { this.passo = null; this.p.setPose('em pe'); return 0; }
    const v = (ps.correr ? CORRER : ANDAR) * (ps.velocidade || 1);
    const dx = alvo.x - this.x, dz = alvo.z - this.z, d = Math.hypot(dx, dz), passo = v * dt;
    if (d <= passo) { this.x = alvo.x; this.z = alvo.z; ps.pts.shift(); if (!ps.pts.length) { this.passo = null; if (!this.fila.length || this.fila[0].tipo !== 'ir') this.p.setPose(this.p.pose === 'carregar' ? 'carregar' : 'em pe'); } return v; }
    this.x += (dx / d) * passo; this.z += (dz / d) * passo;
    this.virar(Math.atan2(dx, dz), dt, 10);
    return v;
  }

  // senta (ou levanta) deslizando ate o lugar enquanto o quadril desce
  deslizar(ps, dt) {
    ps.t += dt;
    const k = Math.min(1, ps.t / 0.45), e = k * k * (3 - 2 * k);
    this.x = ps.de.x + (ps.lugar.x - ps.de.x) * e;
    this.z = ps.de.z + (ps.lugar.z - ps.de.z) * e;
    this.ang = ps.de.ang + angDif(ps.de.ang, ps.lugar.ang) * e;
    if (k >= 1) this.passo = null;
  }

  virar(alvo, dt, rapidez) { this.ang += angDif(this.ang, alvo) * Math.min(1, dt * rapidez); }

  // ponto da cabeca no mundo (para o balao)
  // (acompanha o quadril: desce quando senta, sobe quando pula)
  topo(v) { return v.set(this.x, this.p.topo + this.p.quadril.position.y * (this.skin.altura || 1) - 0.78 + 0.12, this.z); }
}
