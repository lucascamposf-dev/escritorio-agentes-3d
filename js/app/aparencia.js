// Gaveta "Aparência": tema do escritorio e skin de cada agente/subagente (com miniaturas 3D
// e um editor de personagem personalizado com previa ao vivo).
import * as THREE from 'three';
import { config } from './config.js';
import { TEMAS } from '../office3d/temas/index.js';
import { SKINS, aleatoria, resolver } from '../office3d/skins.js';
import { Personagem } from '../office3d/personagem.js';
import { Kit } from '../office3d/geo.js';

const el = () => document.getElementById('aparencia');
let esc = null, aba = 'escritorio', foco = null, editando = null, previa = null;
const TIPOS_PADRAO = ['Explore', 'general-purpose', 'Plan'];

export function alternar(e) { if (el().hidden) abrir(e); else fechar(); }

// abre a gaveta; atorId opcional: ja abre editando a skin daquele personagem
export function abrir(e, atorId) {
  esc = e;
  el().hidden = false;
  if (atorId) { aba = 'personagens'; foco = alvoDoAtor(atorId); editando = null; }
  montar();
}

export function fechar() { el().hidden = true; pararPrevia(); }

// ---------- quem pode ter skin escolhida ----------
// chave = caminho na config (skins.plan, skins.subTipos.Explore, skins.subIds.<id>, skins.subPadrao)
function alvoDoAtor(id) {
  const a = esc && esc.diretor.atores.get(id);
  if (!a) return null;
  if (a.papel === 'plan' || a.papel === 'build') return { chave: 'skins.' + a.papel, titulo: a.nome, papel: a.papel };
  if (a.papel === 'sub') return { chave: 'skins.subIds.' + a.subId, titulo: `${a.nome} · ${a.sub ? a.sub.name : ''}`, sub: a.subId };
  return null;
}

function alvos() {
  const lista = [
    { chave: 'skins.plan', titulo: 'Auditor', desc: 'agente principal · Plan', papel: 'plan' },
    { chave: 'skins.build', titulo: 'Construtor', desc: 'agente principal · Build', papel: 'build' },
    { chave: 'skins.subPadrao', titulo: 'Subagentes (padrão)', desc: 'quem não tiver escolha própria', grupo: true },
  ];
  const tipos = new Set([...TIPOS_PADRAO, ...Object.keys(config.get('skins').subTipos || {})]);
  if (esc) for (const a of esc.diretor.atores.values()) if (a.papel === 'sub' && a.sub && a.sub.name) tipos.add(a.sub.name);
  for (const t of tipos) lista.push({ chave: 'skins.subTipos.' + t, titulo: t, desc: 'todo subagente deste tipo', grupo: true, tipo: t });
  if (esc) for (const a of esc.diretor.atores.values()) if (a.papel === 'sub' && !a.saindo) lista.push({ chave: 'skins.subIds.' + a.subId, titulo: a.nome, desc: `subagente ${a.sub ? a.sub.name : ''} na sala agora`, sub: a.subId });
  return lista;
}

const ler = (chave) => chave.split('.').reduce((o, k) => (o == null ? o : o[k]), config.todos());
const herdado = (alvo) => alvo.sub ? 'herda do tipo/padrão' : alvo.tipo ? 'herda do padrão' : null;

// skin mostrada para um alvo (o que esta salvo, ou o que ele herda)
function skinDe(alvo) {
  const v = ler(alvo.chave);
  if (alvo.papel) return esc ? esc.diretor.skinPrincipal(alvo.papel) : resolver(v, alvo.papel);
  if (alvo.sub && esc) { const a = esc.diretor.atores.get('sub:' + alvo.sub); if (a) return a.skin; }
  return resolver(v ?? config.get('skins').subPadrao, 'previa:' + alvo.chave);
}

// ---------- montagem da gaveta ----------
function montar() {
  const e = el();
  e.textContent = '';
  const cab = h('header', {}, h('h2', { text: '🎨 Aparência' }), botao('×', fechar, 'Fechar'));
  const abas = h('div', { class: 'abas' },
    botao('🏢 Escritório', () => { aba = 'escritorio'; montar(); }, '', aba === 'escritorio' ? 'sel' : ''),
    botao('🧑 Personagens', () => { aba = 'personagens'; montar(); }, '', aba === 'personagens' ? 'sel' : ''));
  const corpo = h('div', { class: 'corpo' });
  e.append(cab, abas, corpo);
  pararPrevia();
  if (aba === 'escritorio') montarTemas(corpo);
  else if (editando) montarEditor(corpo);
  else if (foco) montarEscolha(corpo, foco);
  else montarLista(corpo);
}

function montarTemas(corpo) {
  corpo.append(h('h4', { text: 'Tema do escritório' }));
  const grade = h('div', { class: 'temas' });
  for (const t of TEMAS) {
    const b = botao('', () => { config.set('tema', t.id); montar(); }, t.desc, 'tema' + (config.get('tema') === t.id ? ' sel' : ''));
    b.append(h('div', { class: 'cores' }, ...t.cores.map((c) => { const i = h('i'); i.style.background = c; return i; })), h('span', { text: t.nome }), h('small', { text: t.desc }));
    grade.append(b);
  }
  corpo.append(grade, h('h4', { text: 'Dica' }), h('div', { class: 'papel', text: 'A planta é a mesma em todos os temas: a mesa redonda, as salinhas, a copa, o lounge e a quadra só mudam de visual.' }));
}

function montarLista(corpo) {
  corpo.append(h('h4', { text: 'Escolha a skin de cada um' }));
  for (const alvo of alvos()) {
    const v = ler(alvo.chave);
    const rotulo = v == null ? (herdado(alvo) || 'aleatório') : v === 'aleatorio' ? '🎲 aleatório' : typeof v === 'object' ? '✏️ ' + (v.custom.nome || 'personalizado') : (SKINS[v] ? SKINS[v].nome : v);
    const linha = h('div', { class: 'quem' });
    const img = h('canvas', {}); img.width = img.height = 96; img.style.width = img.style.height = '48px'; img.style.borderRadius = '8px'; img.style.background = 'rgba(0,0,0,.25)';
    miniatura(skinDe(alvo), img);
    linha.append(img, h('div', { class: 'rot' }, h('b', { text: alvo.titulo }), h('small', { text: (alvo.desc || '') + ' — ' + rotulo })), botao('trocar', () => { foco = alvo; montar(); }));
    corpo.append(linha);
  }
}

function montarEscolha(corpo, alvo) {
  corpo.append(h('div', { class: 'quem' }, botao('← voltar', () => { foco = null; montar(); }), h('div', { class: 'rot' }, h('b', { text: alvo.titulo }), h('small', { text: alvo.desc || '' }))));
  const atual = ler(alvo.chave);
  const grade = h('div', { class: 'skins' });
  const opcao = (titulo, valor, skin, sel) => {
    const b = botao('', () => { escolher(alvo, valor); }, titulo, 'skin' + (sel ? ' sel' : ''));
    const cv = h('canvas'); cv.width = cv.height = 128;
    b.append(cv, h('span', { text: titulo }));
    miniatura(skin, cv);
    grade.append(b);
  };
  opcao('🎲 Aleatório', 'aleatorio', aleatoria('previa-dado'), atual === 'aleatorio' || (atual == null && !alvo.sub && !alvo.tipo));
  if (alvo.sub || alvo.tipo) opcao('↩ Herdar', null, resolver(config.get('skins').subPadrao, 'previa:herdar'), atual == null);
  for (const [id, s] of Object.entries(SKINS)) opcao(s.nome, id, s, atual === id);
  opcao('✏️ Personalizado', '__editar', typeof atual === 'object' && atual ? resolver(atual, 'x') : aleatoria('previa-edit'), typeof atual === 'object' && atual);
  corpo.append(grade);
  // personagem aleatorio dos principais: da para "travar" o sorteio atual
  if (alvo.papel && (atual === 'aleatorio' || atual == null)) {
    const fixo = config.get('fixados')[alvo.papel];
    corpo.append(h('h4', { text: 'Sorteio' }), h('div', { class: 'acoes' },
      botao(fixo ? '🔓 voltar a sortear a cada sessão' : '🔒 manter este visual', () => {
        const sessao = (esc && esc.estado && esc.estado.session) || 'sessao';
        config.set('fixados.' + alvo.papel, fixo ? undefined : `${sessao}:${alvo.papel}`);
        montar();
      }),
      botao('🎲 sortear outro agora', () => { config.set('fixados.' + alvo.papel, 'sorteio:' + Date.now()); montar(); })));
  }
}

function escolher(alvo, valor) {
  if (valor === '__editar') { const atual = ler(alvo.chave); editando = { alvo, skin: structuredClone(typeof atual === 'object' && atual ? resolver(atual, 'x') : skinDe(alvo)) }; delete editando.skin.nome; montar(); return; }
  config.set(alvo.chave, valor === null ? undefined : valor);
  foco = null; // escolheu: volta para a lista
  montar();
}

// ---------- editor de personagem ----------
const ESTILOS = ['curto', 'espetado', 'longo', 'cacheado', 'longoCacheado', 'coque', 'rabo', 'moicano', 'afro', 'chanel', 'careca'];
const ROUPAS = ['camiseta', 'jersey', 'regata', 'moletom', 'camisa', 'terno', 'jaleco', 'traje', 'manto', 'vestido', 'ninja'];
const ACESS = ['oculos', 'oculosEscuros', 'fone', 'bone', 'boneTras', 'faixa', 'capacete', 'chapeuChef', 'chapeuMago', 'boina', 'gravata', 'coroa', 'antena'];
const NOMES_ACESS = { oculos: 'óculos', oculosEscuros: 'óculos escuros', fone: 'fone', bone: 'boné', boneTras: 'boné pra trás', faixa: 'faixa', capacete: 'capacete', chapeuChef: 'chapéu de chef', chapeuMago: 'chapéu de mago', boina: 'boina', gravata: 'gravata', coroa: 'coroa', antena: 'antena' };

function montarEditor(corpo) {
  const { alvo, skin } = editando;
  corpo.append(h('div', { class: 'quem' }, botao('← voltar', () => { editando = null; montar(); }), h('div', { class: 'rot' }, h('b', { text: 'Personalizar: ' + alvo.titulo }), h('small', { text: 'a prévia gira; salve quando gostar' }))));
  const cv = h('canvas', { class: 'previa' }); cv.width = 760; cv.height = 570;
  corpo.append(cv);
  const ed = h('div', { class: 'editor' });
  const hex = (n) => '#' + new THREE.Color(n).getHexString();
  const cor = (rot, get, set) => { const i = h('input', { type: 'color' }); i.value = hex(get()); i.oninput = () => { set(parseInt(i.value.slice(1), 16)); atualizar(); }; ed.append(h('label', { text: rot }), i); };
  const sel = (rot, opcoes, get, set, nomes = {}) => { const s = h('select'); for (const o of opcoes) { const op = h('option', { text: nomes[o] || o }); op.value = o; s.append(op); } s.value = get(); s.onchange = () => { set(s.value); atualizar(); }; ed.append(h('label', { text: rot }), s); };
  const nome = h('input', { type: 'text' }); nome.value = skin.nome || ''; nome.placeholder = 'nome da skin'; nome.style.cssText = 'font:inherit;color:inherit;background:var(--glass2);border:1px solid var(--line);border-radius:8px;padding:4px 6px';
  nome.oninput = () => { skin.nome = nome.value; };
  ed.append(h('label', { text: 'nome' }), nome);
  cor('pele', () => skin.pele, (v) => { skin.pele = v; });
  sel('cabelo', ESTILOS, () => skin.cabelo.estilo, (v) => { skin.cabelo.estilo = v; });
  cor('cor do cabelo', () => skin.cabelo.cor, (v) => { skin.cabelo.cor = v; skin.barbaCor = v; });
  sel('barba', ['nenhuma', 'cheia', 'cavanhaque', 'bigode', 'mago'], () => skin.barba || 'nenhuma', (v) => { skin.barba = v === 'nenhuma' ? null : v; });
  sel('sorriso', ['normal', 'grande', 'dentes'], () => skin.sorriso || 'normal', (v) => { skin.sorriso = v; });
  sel('roupa', ROUPAS, () => skin.roupa.tipo, (v) => { skin.roupa.tipo = v; });
  cor('cor da roupa', () => skin.roupa.cor, (v) => { skin.roupa.cor = v; });
  cor('detalhes', () => skin.roupa.cor2 ?? skin.roupa.cor, (v) => { skin.roupa.cor2 = v; });
  sel('calça', ['calca', 'short', 'saia'], () => skin.calca.tipo, (v) => { skin.calca.tipo = v; }, { calca: 'calça', short: 'short', saia: 'saia' });
  cor('cor da calça', () => skin.calca.cor, (v) => { skin.calca.cor = v; });
  cor('sapato', () => skin.sapato, (v) => { skin.sapato = v; });
  const ac = h('div', {}); ac.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
  for (const a of ACESS) {
    const b = botao(NOMES_ACESS[a], () => { const l = skin.acessorios = skin.acessorios || []; const i = l.indexOf(a); if (i >= 0) l.splice(i, 1); else l.push(a); b.classList.toggle('on', i < 0); atualizar(); }, '', (skin.acessorios || []).includes(a) ? 'on' : '');
    ac.append(b);
  }
  ed.append(h('label', { text: 'acessórios' }), ac);
  const robo = botao('🤖 corpo de robô', () => { skin.robo = !skin.robo; robo.classList.toggle('on', skin.robo); atualizar(); }, '', skin.robo ? 'on' : '');
  ed.append(h('label', { text: 'especial' }), robo);
  corpo.append(ed, h('div', { class: 'acoes' }, botao('💾 salvar', () => { config.set(alvo.chave, { custom: structuredClone(skin) }); editando = null; foco = null; montar(); }), botao('cancelar', () => { editando = null; montar(); })));
  corpo.lastChild.style.cssText = 'display:flex;gap:6px;margin-top:10px';
  const atualizar = () => previa && previa.trocar(skin);
  iniciarPrevia(cv, skin);
}

// ---------- renderizacao das miniaturas e da previa ----------
let mini = null;
function palco(w, h2) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(w, h2, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2); sol.position.set(2, 4, 3); cena.add(sol);
  const cam = new THREE.PerspectiveCamera(28, w / h2, 0.1, 20);
  const grupo = new THREE.Group(); cena.add(grupo);
  return { r, cena, cam, grupo, kit: new Kit(grupo) };
}

// desenha a skin num canvas 2D (fila: uma por vez, com um renderer compartilhado)
const fila = [];
function miniatura(skin, canvas) {
  fila.push([skin, canvas]);
  if (fila.length === 1) setTimeout(processar, 0);
}
function processar() {
  if (!fila.length) return;
  if (!mini) { mini = palco(256, 256); mini.cam.position.set(0, 1.05, 4.3); mini.cam.lookAt(0, 0.98, 0); }
  const [skin, canvas] = fila.shift();
  const p = new Personagem(mini.kit, skin);
  p.raiz.rotation.y = 0.35;
  for (let i = 0; i < 30; i++) p.atualizar(0.05);
  mini.grupo.add(p.raiz);
  mini.r.render(mini.cena, mini.cam);
  mini.grupo.remove(p.raiz);
  p.liberar();
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.drawImage(mini.r.domElement, 0, 0, canvas.width, canvas.height);
  if (fila.length) setTimeout(processar, 0);
}

function iniciarPrevia(canvas, skin) {
  const st = palco(760, 570);
  st.cam.position.set(0, 1.05, 5.2); st.cam.lookAt(0, 0.98, 0);
  let p = null, t = 0, vivo = true;
  const poses = ['em pe', 'acenar', 'comemorar', 'conversar', 'pensar'];
  const trocar = (s) => { if (p) { st.grupo.remove(p.raiz); p.liberar(); } p = new Personagem(st.kit, s); st.grupo.add(p.raiz); };
  trocar(skin);
  let antes = performance.now();
  const ctx = canvas.getContext('2d');
  const quadro = () => {
    if (!vivo) return;
    const agora = performance.now(), dt = Math.min(0.05, (agora - antes) / 1000); antes = agora;
    t += dt;
    p.raiz.rotation.y = Math.sin(t * 0.5) * 0.9;
    p.setPose(poses[Math.floor(t / 3) % poses.length]);
    p.atualizar(dt);
    st.r.render(st.cena, st.cam);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(st.r.domElement, 0, 0);
    requestAnimationFrame(quadro);
  };
  quadro();
  previa = { trocar, parar: () => { vivo = false; if (p) p.liberar(); st.kit.liberar(); st.r.dispose(); } };
}
function pararPrevia() { if (previa) { previa.parar(); previa = null; } }

// ---------- utilitarios de DOM ----------
function h(tag, at = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(at)) { if (k === 'text') e.textContent = v; else if (k === 'class') e.className = v; else e.setAttribute(k, v); }
  e.append(...filhos);
  return e;
}
function botao(texto, f, titulo = '', cls = '') { const b = h('button', { text: texto }); if (titulo) b.title = titulo; if (cls) b.className = cls; b.onclick = f; return b; }
