// Conexao unica com o servidor (/events). Entrega cada snapshot do estado para quem pedir.
const ouvintes = new Set();
const status = new Set();
export const conexao = { conectado: false, ultimo: null };

export function onEstado(f) { ouvintes.add(f); if (conexao.ultimo) f(conexao.ultimo); }
export function onStatus(f) { status.add(f); f(conexao); }

const avisar = () => { for (const f of status) f(conexao); };

export function conectar() {
  if (location.protocol === 'file:') { conexao.erro = 'abra por http://localhost:4747'; avisar(); return; }
  const es = new EventSource('/events');
  es.onopen = () => { conexao.conectado = true; avisar(); };
  es.onerror = () => { conexao.conectado = false; avisar(); };
  es.onmessage = (e) => {
    let s;
    try { s = JSON.parse(e.data); } catch { return; }
    // o servidor foi atualizado/reiniciado: recarrega a pagina para pegar a versao nova
    if (s.versao) { if (conexao.versao && conexao.versao !== s.versao) { location.reload(); return; } conexao.versao = s.versao; }
    conexao.ultimo = s;
    if (!conexao.conectado) { conexao.conectado = true; avisar(); }
    for (const f of ouvintes) f(s);
    avisar();
  };
}

// botoes da janela: { acao: 'ocultar' } | { acao: 'fixar', on }
export const janela = (j) => fetch('/janela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(j) }).catch(() => {});
