// A cena do escritorio: junta o motor, a sala (tema), os personagens (diretor) e os baloes.
import { Engine } from './engine.js';
import { construirSala } from './sala.js';
import { tema } from './temas/index.js';
import { Diretor } from './diretor.js';
import { Baloes } from './baloes.js';
import { config } from '../app/config.js';

const ESTADO = { idle: 'livre', working: 'trabalhando', waiting: 'esperando você', error: 'com erro', done: 'terminou' };

export class Escritorio {
  constructor(host, camadaBaloes) {
    this.engine = new Engine(host, { qualidade: config.get('qualidade'), camera: config.get('camera') });
    this.baloes = new Baloes(camadaBaloes, this.engine, (id) => this.detalhar(id));
    this.trocarTema(config.get('tema'));
    this.diretor = new Diretor(this);
    this.engine.onTick((dt, t) => {
      this.sala.tick(dt, t);
      this.diretor.tick(dt, t);
      this.baloes.atualizar();
      if (this.selecionado) this.atualizarDetalhe();
    });
    config.ouvir((c, v) => { if (c === 'tema') this.trocarTema(v); });
    this.pronto = Promise.resolve();
  }

  trocarTema(id) {
    if (this.tema && this.tema.id === id && this.sala) return;
    if (this.sala) this.sala.liberar();
    this.tema = tema(id);
    this.sala = construirSala(this.engine, this.tema);
    if (this.diretor) { this.diretor.reaplicarSala(); this.diretor.desenharTv(); }
  }

  aplicar(s) { this.estado = s; this.diretor.aplicar(s); }

  // ---------- cartao de detalhes ao clicar num personagem ----------
  detalhar(id) {
    this.selecionado = id;
    const el = document.getElementById('detalhe');
    el.hidden = false;
    this.atualizarDetalhe(true);
  }

  atualizarDetalhe(montar) {
    const a = this.diretor.atores.get(this.selecionado), el = document.getElementById('detalhe');
    if (!a) { el.hidden = true; this.selecionado = null; this.engine.seguirAtor = null; return; }
    const papel = a.papel === 'sub' ? `Subagente ${a.sub ? a.sub.name : ''}` : a.papel === 'npc' ? 'Figurante (só decoração)' : a.papel === 'plan' ? 'Agente principal · Plan' : 'Agente principal · Build';
    const st = a.papel === 'sub' ? (a.saindo ? 'terminou' : 'trabalhando') : a.estado ? ESTADO[a.estado.status] : 'passeando';
    const faz = a.papel === 'sub' ? (a.sub && (a.sub.text || a.sub.task)) || '' : a.estado && a.estado.status !== 'idle' ? a.estado.text : a.atividade;
    const linhas = [['estado', st], ['fazendo', faz || '—'], ['skin', a.skin.nome || 'Aleatório']];
    if (a.papel === 'sub' && a.sub && a.sub.task) linhas.push(['tarefa', a.sub.task]);
    if (a.lugar) linhas.push(['lugar', a.lugar.tipo === 'pod' ? 'salinha 0' + (a.lugar.i + 1) : 'mesa redonda']);
    const chave = JSON.stringify(linhas) + a.id + this.engine.seguirAtor;
    if (!montar && chave === this._chaveDetalhe) return;
    this._chaveDetalhe = chave;
    el.textContent = '';
    const h3 = document.createElement('h3'); h3.textContent = a.nome;
    const pp = document.createElement('div'); pp.className = 'papel'; pp.textContent = papel; pp.style.color = a.cor;
    el.append(h3, pp);
    for (const [k, v] of linhas) {
      const d = document.createElement('div'); d.className = 'linha';
      const s1 = document.createElement('span'); s1.textContent = k;
      const s2 = document.createElement('span'); s2.textContent = v; s2.title = v;
      d.append(s1, s2); el.appendChild(d);
    }
    const acoes = document.createElement('div'); acoes.className = 'acoes';
    const seguir = document.createElement('button');
    seguir.textContent = this.engine.seguirAtor === a.id ? '🎯 parar de seguir' : '🎯 seguir';
    seguir.onclick = () => { this.engine.seguirAtor = this.engine.seguirAtor === a.id ? null : a.id; this.engine.mexeu = 0; if (this.engine.modo !== 'seguir') { this.engine.setCamera('seguir'); } this.atualizarDetalhe(true); };
    acoes.appendChild(seguir);
    if (a.papel !== 'npc') {
      const skin = document.createElement('button');
      skin.textContent = '🎨 trocar skin';
      skin.onclick = () => import('../app/aparencia.js').then((m) => m.abrir(this, a.id));
      acoes.appendChild(skin);
    }
    const fechar = document.createElement('button'); fechar.className = 'fechar'; fechar.textContent = '×';
    fechar.onclick = () => { el.hidden = true; this.selecionado = null; };
    el.append(acoes, fechar);
  }
}
