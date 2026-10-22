// HUD: barra do topo, contexto, log de atividade e avisos quando um agente muda de estado.
import { config } from './config.js';
import { beep, SONS, notificar, ligarSom } from './avisos.js';
import { janela } from './conexao.js';

const $ = (id) => document.getElementById(id);
const fmtK = (n) => n >= 100000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
const fmtT = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
export const NOMES = { plan: 'Auditor', build: 'Construtor' };

const prev = { plan: 'idle', build: 'idle' };
const inicio = { plan: 0, build: 0 };
let ultimaDur = 0, atual = null;

// chamado a cada estado novo (real ou do demo)
export function mostrar(s) {
  atual = s;
  for (const who of ['plan', 'build']) {
    const a = s.agents[who], era = prev[who];
    if (era === a.status) continue;
    if (a.status === 'working' && era !== 'waiting') inicio[who] = Date.now();
    if ((era === 'working' || era === 'waiting') && a.status !== 'working') ultimaDur = Date.now() - (inicio[who] || Date.now());
    if (a.status === 'done') { beep(SONS.done); notificar('Pronto!', NOMES[who] + ' terminou o trabalho.'); }
    if (a.status === 'waiting') { beep(SONS.waiting); notificar('Preciso de você', a.text || 'O agente pediu permissão.'); }
    if (a.status === 'error') { beep(SONS.error); notificar('Deu erro', a.text || 'O agente encontrou um erro.'); }
    prev[who] = a.status;
  }
  $('proj').textContent = s.project ? '· ' + s.project : '';
  const usado = s.ctxTokens || 0, lim = config.get('ctxLimite'), pct = Math.min(100, usado / lim * 100);
  $('ctxTxt').textContent = `${fmtK(usado)} / ${fmtK(lim)} (${Math.round(pct)}%)`;
  $('ctxFill').style.width = pct + '%';
  $('ctxBar').className = 'bar' + (pct >= 80 ? ' hot' : pct >= 60 ? ' mid' : '');
  $('cFiles').textContent = s.files || 0;
  $('cSub').textContent = s.subagents || 0;
  $('cCost').textContent = '$' + (s.cost || 0).toFixed(2);
  $('cModelWrap').hidden = !s.model;
  $('cModel').textContent = String(s.model || '').split('/').pop();
  const ul = $('log'); ul.textContent = '';
  for (const e of (s.log || []).slice().reverse().slice(0, 5)) {
    const li = document.createElement('li');
    const tm = document.createElement('time'); tm.textContent = new Date(e.t).toTimeString().slice(0, 8);
    const dot = document.createElement('i'); dot.style.background = e.agent === 'plan' ? 'var(--plan)' : 'var(--build)';
    const sp = document.createElement('span'); sp.textContent = e.text; sp.title = e.text;
    li.append(tm, dot, sp); ul.appendChild(li);
  }
  tempo();
  janelaBotoes(s.janela);
}

// tempo do trabalho atual (ou o do ultimo, quando ninguem trabalha)
function tempo() {
  if (!atual) return;
  const w = ['plan', 'build'].find((k) => ['working', 'waiting'].includes(atual.agents[k].status));
  $('cTime').textContent = fmtT(w ? Date.now() - (inicio[w] || atual.agents[w].since) : ultimaDur);
}
setInterval(tempo, 1000);

export function status(c) {
  const dot = $('dot'), conn = $('conn'), sv = c.ultimo;
  if (c.erro) { conn.textContent = c.erro; return; }
  if (!c.conectado) { dot.className = 'dot'; conn.textContent = 'servidor desconectado'; return; }
  const on = [sv && sv.oc && 'opencode', sv && sv.cc && 'Claude Code'].filter(Boolean);
  dot.className = on.length ? 'dot on' : 'dot wait';
  conn.textContent = on.length ? 'conectado ao ' + on.join(' + ') : 'aguardando o opencode ou o Claude Code…';
}

function janelaBotoes(w) {
  const on = !!(w && w.controle);
  $('bPin').hidden = $('bHide').hidden = !on;
  $('bPin').classList.toggle('on', !!(w && w.pinned));
}

// liga os botoes do topo; acoes que dependem da cena 3D chegam por "acoes"
export function iniciarHud(acoes) {
  const bSound = $('bSound');
  bSound.classList.toggle('on', config.get('som'));
  bSound.addEventListener('click', async () => { await ligarSom(!config.get('som')); bSound.classList.toggle('on', config.get('som')); });

  $('bPin').addEventListener('click', () => { const on = !$('bPin').classList.contains('on'); config.set('fixar', on); janela({ acao: 'fixar', on }); });
  $('bHide').addEventListener('click', () => janela({ acao: 'ocultar' }));

  const CAMS = ['seguir', 'livre', 'cinema'];
  const bCam = $('bCam');
  const cam = (m) => { bCam.querySelector('span').textContent = m; config.set('camera', m); acoes.camera(m); };
  bCam.addEventListener('click', () => cam(CAMS[(CAMS.indexOf(config.get('camera')) + 1) % CAMS.length]));
  bCam.querySelector('span').textContent = config.get('camera');

  const bQual = $('bQual');
  const qual = (q) => { bQual.querySelector('span').textContent = q; config.set('qualidade', q); acoes.qualidade(q); };
  bQual.addEventListener('click', () => qual(config.get('qualidade') === 'alta' ? 'baixa' : 'alta'));
  bQual.querySelector('span').textContent = config.get('qualidade');

  $('bLook').addEventListener('click', () => acoes.aparencia());
  $('bDemo').addEventListener('click', () => acoes.demo());

  $('ctx').addEventListener('click', () => {
    const v = prompt('Limite de contexto do modelo, em tokens:', config.get('ctxLimite'));
    if (v && parseInt(v, 10) > 1000) { config.set('ctxLimite', parseInt(v, 10)); if (atual) mostrar(atual); }
  });
  // clicar no log mostra/esconde a lista (modo compacto)
  document.body.classList.toggle('compacto', config.get('compacto'));
  $('painel').addEventListener('dblclick', () => { config.set('compacto', !config.get('compacto')); document.body.classList.toggle('compacto', config.get('compacto')); });
}
