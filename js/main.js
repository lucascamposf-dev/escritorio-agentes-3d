// Ponto de entrada: liga a conexao com o servidor, o HUD e a cena 3D.
import { config } from './app/config.js';
import { conectar, onEstado, onStatus, conexao, janela } from './app/conexao.js';
import { mostrar, status, iniciarHud } from './app/hud.js';
import { rodarDemo, demoAtivo, snap, quieto } from './app/demo.js';

const ESC = window.ESC = { config, conexao, pronto: false }; // usado nos testes e no Console

let escritorio = null; // a cena 3D (carregada a parte: se o WebGL falhar, o HUD continua)

function exibir(s) {
  ESC.estado = s;
  mostrar(s);
  if (escritorio) escritorio.aplicar(s);
}

iniciarHud({
  camera: (m) => escritorio && escritorio.engine.setCamera(m),
  qualidade: (q) => escritorio && escritorio.engine.setQualidade(q),
  aparencia: () => import('./app/aparencia.js').then((m) => m.alternar(escritorio)).catch((e) => console.error(e)),
  demo: () => rodarDemo(exibir, () => exibir(conexao.ultimo || snap(quieto(), quieto(), { oc: false, project: '' }))),
});

onStatus((c) => status(c));
onEstado((s) => { if (!demoAtivo()) exibir(s); });
// a escolha do "sempre por cima" fica no navegador e e reaplicada quando a janela abre
let fixou = false;
onStatus((c) => { if (c.conectado && !fixou && c.ultimo && c.ultimo.janela && c.ultimo.janela.controle) { fixou = true; if (config.get('fixar')) janela({ acao: 'fixar', on: true }); } });

exibir(snap(quieto(), quieto(), { oc: false, project: '', model: '', ctxTokens: 0 }));
conectar();

import('./office3d/escritorio.js')
  .then(async ({ Escritorio }) => {
    escritorio = ESC.escritorio = new Escritorio(document.getElementById('stage'), document.getElementById('baloes'));
    await escritorio.pronto;
    if (ESC.estado) escritorio.aplicar(ESC.estado);
    ESC.pronto = true;
  })
  .catch((e) => {
    console.error(e);
    const d = document.createElement('div');
    d.className = 'aviso';
    d.textContent = 'Não consegui iniciar o 3D (' + (e && e.message || e) + '). O painel continua funcionando.';
    document.getElementById('stage').appendChild(d);
  });
