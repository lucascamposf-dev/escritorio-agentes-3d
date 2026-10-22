// Demo: percorre todos os estados (e alguns subagentes) para ver as animacoes sem um agente real.
const A = (status, text, kind) => ({ status, text, kind, since: Date.now() });
export const quieto = () => A('idle', '', 'think');
const sub = (id, name, text, kind, status = 'working') => ({ id, name, task: 'tarefa de ' + name, text, kind, status, parent: 'build' });

export function snap(plan, build, extra) {
  return Object.assign({ oc: true, cc: false, project: 'demo', model: 'claude-opus-5-5', ctxTokens: 52000, cost: 0, files: 0,
    subagents: 0, subs: [], log: [], agents: { plan, build }, janela: null }, extra || {});
}

const PASSOS = [
  () => snap(A('working', 'lendo server.js', 'read'), quieto(), { ctxTokens: 41000 }),
  () => snap(A('working', 'procurando empresaId', 'search'), quieto(), { ctxTokens: 56000, subagents: 1, subs: [sub('d1', 'Explore', 'procurando rotas', 'search')] }),
  () => snap(A('waiting', 'pedindo permissão: bash git status', 'wait'), quieto(), { ctxTokens: 80000, subagents: 1, subs: [sub('d1', 'Explore', 'lendo app.js', 'read')] }),
  () => snap(A('error', 'Rate limit atingido (tente em 20s)', 'think'), quieto(), { ctxTokens: 130000, subs: [sub('d1', 'Explore', 'pronto', 'think', 'done')] }),
  () => snap(A('done', 'pronto!', 'think'), quieto(), { ctxTokens: 150000 }),
  () => snap(quieto(), A('working', 'editando LockOverlay.kt', 'edit'), { ctxTokens: 20000, files: 1, subagents: 3,
    subs: [sub('d2', 'general-purpose', 'rodando testes', 'bash'), sub('d3', 'Explore', 'pesquisando na web', 'web'), sub('d4', 'Plan', 'pensando…', 'think')] }),
  () => snap(quieto(), A('working', 'rodando gradlew assembleDebug', 'bash'), { ctxTokens: 33000, files: 2, subagents: 3,
    subs: [sub('d2', 'general-purpose', 'editando teste.kt', 'edit'), sub('d3', 'Explore', 'lendo docs', 'read'), sub('d4', 'Plan', 'organizando tarefas', 'think')] }),
  () => snap(quieto(), A('working', 'pesquisando na web', 'web'), { ctxTokens: 36000, files: 2, subagents: 1,
    subs: [sub('d2', 'general-purpose', 'pronto', 'think', 'done'), sub('d3', 'Explore', 'pronto', 'think', 'done'), sub('d4', 'Plan', 'escrevendo…', 'edit')] }),
  () => snap(quieto(), A('done', 'pronto!', 'think'), { ctxTokens: 160000, files: 3, subs: [sub('d4', 'Plan', 'pronto', 'think', 'done')] }),
  () => snap(quieto(), quieto(), { ctxTokens: 160000, files: 3 }),
];

let ativo = false;
export const demoAtivo = () => ativo;

// mostra cada passo com "mostrar"; no fim chama "fim" para voltar ao estado real
export function rodarDemo(mostrar, fim, passoMs = 3200) {
  if (ativo) return;
  ativo = true;
  let i = 0;
  const step = () => {
    if (i >= PASSOS.length) { ativo = false; fim(); return; }
    const s = PASSOS[i++]();
    s.log = [{ t: Date.now(), agent: i <= 5 ? 'plan' : 'build', text: 'demonstração ' + i + ' de ' + PASSOS.length }];
    mostrar(s);
    setTimeout(step, passoMs);
  };
  step();
}
