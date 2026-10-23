// A pagina de verdade, num Chrome headless, ligada ao servidor de teste.
// Pulado se nao houver Chrome/Edge na maquina (CHROME_PATH aponta outro).
// ESCRITORIO_PRINTS=<pasta> salva capturas de tela de cada teste nessa pasta.
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { app, listen, close, req, janelaCmds } = require("./helpers");
const browser = require("./browser");

const skip = !browser.available && "Chrome/Edge nao encontrado";
let page, url;
const print = (nome) => process.env.ESCRITORIO_PRINTS && page.screenshot(path.join(process.env.ESCRITORIO_PRINTS, nome + ".png"));
// sem capturas de tela, os testes usam a qualidade baixa (o Chrome de teste desenha sem placa de video)
const QUAL = process.env.ESCRITORIO_PRINTS ? "alta" : "baixa";
const abrir = (extra = "") => page.open(url, `try { const c = JSON.parse(localStorage.getItem('escritorio.config') || '{}'); c.qualidade = '${QUAL}'; localStorage.setItem('escritorio.config', JSON.stringify(c)); } catch {} ${extra}`);
const limpo = () => page.errors.filter((e) => !/WebGL|GPU stall|GL Driver/i.test(e));

test.before(async () => {
  if (skip) return;
  url = `http://localhost:${await listen()}/`;
  page = await browser.launch();
});
test.after(async () => { if (page) await page.close(); await close(); });

test("a pagina conecta, mostra o estado e liga o 3D sem erros", { skip }, async () => {
  await req("GET", "/set?agent=build&status=working&kind=read&text=lendo%20teste.js");
  await abrir();
  await page.until(`window.ESC && ESC.estado && ESC.estado.agents.build.text === 'lendo teste.js'`);
  await page.until(`ESC.pronto === true`, 15000);
  assert.match(await page.eval(`document.getElementById('conn').textContent`), /aguardando|conectado/);
  await print("01-inicio");
  assert.deepStrictEqual(limpo(), []);
  await req("GET", "/set?agent=build&status=idle");
});

test("uma conexao /events por aba", { skip }, async () => {
  await req("GET", "/sub?id=nav1&name=explore&text=procurando");
  await abrir();
  await page.until(`document.getElementById('cSub').textContent === '1'`);
  await new Promise((r) => setTimeout(r, 500));
  assert.strictEqual(page.requests.filter((p) => p === "/events").length, 1, page.requests.join(" "));
  await req("GET", "/sub?id=nav1&status=done");
});

test("botoes da janela: ocultar e sempre por cima", { skip }, async () => {
  await abrir("try { const c = JSON.parse(localStorage.getItem('escritorio.config')); delete c.fixar; localStorage.setItem('escritorio.config', JSON.stringify(c)); } catch {}");
  await page.until(`!document.getElementById('bHide').hidden === ${process.platform === "win32"}`);
  if (process.platform !== "win32") return;
  janelaCmds.length = 0;
  await page.eval(`document.getElementById('bPin').click()`);
  await page.until(`document.getElementById('bPin').classList.contains('on')`);
  await page.eval(`document.getElementById('bHide').click()`);
  await new Promise((r) => setTimeout(r, 300));
  assert.deepStrictEqual(janelaCmds, ["pin", "minimize"]);
  assert.strictEqual(app.S.janela.hidden, true);
  await page.eval(`document.getElementById('bPin').click()`);
  await new Promise((r) => setTimeout(r, 300));
  assert.strictEqual(app.S.janela.pinned, false);
  app.handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "nav" }); // desfaz o ocultar
  app.handleClaude({ hook_event_name: "Stop", session_id: "nav" });
});

test("demo mostra estados de mentira e volta ao estado real", { skip }, async () => {
  await abrir();
  await page.until(`ESC.pronto === true`, 15000);
  await page.eval(`document.getElementById('bDemo').click()`);
  await page.until(`ESC.estado.project === 'demo'`);
  assert.strictEqual(await page.eval(`ESC.estado.agents.plan.status`), "working");
  assert.strictEqual(app.S.agents.plan.status, "idle", "o demo nao pode mexer no servidor");
  assert.deepStrictEqual(limpo(), []);
});

test("os 5 temas montam sem erro (e liberam a GPU ao trocar)", { skip }, async () => {
  await abrir();
  await page.until(`ESC.pronto === true`, 15000);
  const ids = await page.eval(`import('/js/office3d/temas/index.js').then(m => m.TEMAS.map(t => t.id))`);
  assert.strictEqual(ids.length, 5);
  // vazamento: da 3 voltas pelos temas; se a troca deixasse lixo, a memoria cresceria a cada volta.
  // (A 1a volta ainda enche os caches dos personagens; comparamos o fim da 2a com o fim da 3a.)
  // O diretor fica parado para os personagens nao mudarem no meio da medicao.
  await page.eval(`void (ESC.escritorio.diretor.tick = () => {})`);
  const voltas = [];
  for (let volta = 0; volta < 3; volta++) {
    for (const id of [...ids.slice(1), ids[0]]) {
      await page.eval(`ESC.escritorio.trocarTema('${id}')`);
      if (volta === 0) { await new Promise((r) => setTimeout(r, 600)); await print("tema-" + id); }
    }
    // desenha um quadro antes de medir (a contagem so inclui o que ja foi enviado a GPU)
    voltas.push(await page.eval(`(() => { const e = ESC.escritorio.engine; e.renderer.render(e.scene, e.camera); return JSON.stringify(e.renderer.info.memory); })()`));
  }
  assert.strictEqual(voltas[2], voltas[1], "trocar de tema deixou lixo na GPU: " + voltas.join(" -> "));
  assert.deepStrictEqual(limpo(), []);
});

test("vitrine: todas as skins prontas e algumas aleatorias, em varias poses", { skip }, async () => {
  await abrir();
  await page.until(`ESC.pronto === true`, 15000);
  const n = await page.eval(`(async () => {
    const THREE = await import('three');
    const { Personagem } = await import('/js/office3d/personagem.js');
    const { SKINS, aleatoria } = await import('/js/office3d/skins.js');
    const { Kit } = await import('/js/office3d/geo.js');
    const e = ESC.escritorio.engine, g = new THREE.Group(); e.scene.add(g);
    const kit = new Kit(g);
    const lista = [...Object.values(SKINS), aleatoria('a'), aleatoria('b'), aleatoria('c')];
    const poses = ['em pe', 'acenar', 'comemorar', 'pensar', 'conversar', 'desespero', 'beber', 'janela', 'em pe', 'acenar', 'regar', 'comemorar', 'em pe', 'conversar', 'pensar', 'em pe'];
    const ps = lista.map((s, i) => { const p = new Personagem(kit, s); p.raiz.position.set(-6.3 + (i % 8) * 1.8, 0, -1 + Math.floor(i / 8) * 2.4); p.setPose(poses[i]); g.add(p.raiz); return p; });
    e.onTick((dt) => ps.forEach((p) => p.atualizar(dt)));
    e.setCamera('livre'); e.mexeu = performance.now() + 1e9;
    ESC.escritorio.sala.raiz.visible = false; // so os personagens na foto
    e.controles.target.set(0, 0.9, 0.2); e.camera.position.set(0, 3.2, 10.5);
    window.__vitrine = { g, kit };
    return ps.length;
  })()`);
  assert.strictEqual(n, 16);
  await new Promise((r) => setTimeout(r, 1500));
  await print("vitrine");
  // close no primeiro (Ronaldinho), de frente e de costas
  await page.eval(`(() => { const e = ESC.escritorio.engine; e.controles.minDistance = 0.5; e.controles.target.set(-6.3, 1.15, -1); e.camera.position.set(-6.3, 1.45, 0.9); })()`);
  await new Promise((r) => setTimeout(r, 400));
  await print("vitrine-ronaldinho");
  await page.eval(`(() => { const e = ESC.escritorio.engine; e.camera.position.set(-6.3, 1.5, -3.6); })()`);
  await new Promise((r) => setTimeout(r, 400));
  await print("vitrine-ronaldinho-costas");
  await page.eval(`ESC.escritorio.sala.raiz.visible = true`);
  assert.deepStrictEqual(limpo(), []);
});

test("vida no escritorio: senta para trabalhar, subagentes nas salinhas, acena e vai embora", { skip }, async () => {
  const d = "ESC.escritorio.diretor";
  await req("GET", "/set?agent=build&status=working&kind=read&text=lendo%20app.js");
  await req("GET", "/sub?id=v1&name=Explore&text=procurando%20rotas&kind=search");
  await req("GET", "/sub?id=v2&name=general-purpose&text=rodando%20testes&kind=bash");
  await abrir();
  await page.until(`ESC.pronto === true`);
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 3, passoMax: 0.4 })`);
  // o Construtor senta no lugar dele e os dois subagentes, nas salinhas 01 e 02
  await page.until(`${d}.atores.get('build')?.sentado?.id === 'mesa1'`, 30000);
  await page.until(`${d}.atores.get('sub:v1')?.sentado && ${d}.atores.get('sub:v2')?.sentado`, 40000);
  const lugares = await page.eval(`[${d}.atores.get('sub:v1').lugar.id, ${d}.atores.get('sub:v2').lugar.id].sort().join()`);
  assert.strictEqual(lugares, "pod0,pod1");
  // o balao mostra o que o agente esta fazendo
  assert.match(await page.eval(`document.querySelector('.balao[data-id="build"] .txt').textContent`), /lendo app\.js/);
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 1, passoMax: 0.1 })`);
  await print("vida-trabalhando");

  // um terceiro subagente ganha a salinha 03, que "brota" na sala
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 3, passoMax: 0.4 })`);
  await req("GET", "/sub?id=v3&name=Plan&text=pensando&kind=think");
  await page.until(`${d}.atores.get('sub:v3')?.lugar?.id === 'pod2' && ESC.escritorio.sala.podVisivel(2)`);

  // pedir permissao: o Auditor fica em pe acenando
  await req("GET", "/set?agent=plan&status=waiting&text=pedindo%20permiss%C3%A3o");
  await page.until(`${d}.atores.get('plan').p.pose === 'acenar'`, 20000);
  assert.ok(await page.eval(`document.querySelector('.balao[data-id="plan"]').classList.contains('waiting')`));

  // o subagente termina: entrega o resultado e sai pela porta
  await req("GET", "/sub?id=v1&status=done");
  await page.until(`${d}.atores.get('sub:v1')?.saindo === true`);
  await page.until(`!${d}.atores.has('sub:v1')`, 90000);
  assert.strictEqual(await page.eval(`${d}.lugares.has('pod0')`), false, "a salinha ficou presa");
  assert.deepStrictEqual(limpo(), []);

  for (const id of ["v2", "v3"]) await req("GET", `/sub?id=${id}&status=done`);
  await req("GET", "/set?agent=plan&status=idle");
  await req("GET", "/set?agent=build&status=idle");
});

test("aparencia: troca o tema e a skin pela gaveta, e o editor salva um personalizado", { skip }, async () => {
  await req("GET", "/set?agent=build&status=working&kind=edit&text=editando");
  await abrir("try { localStorage.removeItem('escritorio.config'); } catch {}");
  await page.until(`ESC.pronto === true`);
  await page.eval(`document.getElementById('bLook').click()`);
  await page.until(`!document.getElementById('aparencia').hidden && document.querySelectorAll('#aparencia .tema').length === 5`);
  // tema pelo cartao
  await page.eval(`[...document.querySelectorAll('#aparencia .tema')].find(b => b.textContent.includes('Cyberpunk')).click()`);
  await page.until(`ESC.escritorio.tema.id === 'cyberpunk' && ESC.config.get('tema') === 'cyberpunk'`);
  // skin do Construtor: Ronaldinho
  await page.eval(`[...document.querySelectorAll('#aparencia .abas button')][1].click()`);
  await page.until(`document.querySelectorAll('#aparencia .quem').length >= 6`);
  await page.eval(`[...document.querySelectorAll('#aparencia .quem')].find(q => q.textContent.includes('Construtor')).querySelector('button').click()`);
  await page.until(`document.querySelectorAll('#aparencia .skin').length >= 14`);
  await page.until(`(() => { const c = [...document.querySelectorAll("#aparencia .skin canvas")].at(-2); const d = c.getContext("2d").getImageData(64, 64, 1, 1).data; return d[3] > 0; })()`, 40000); // miniaturas prontas (a penultima tem pixel desenhado)
  await print("aparencia-skins");
  await page.eval(`[...document.querySelectorAll('#aparencia .skin')].find(b => b.textContent === 'Ronaldinho').click()`);
  await page.until(`ESC.escritorio.diretor.atores.get('build').skin.nome === 'Ronaldinho'`);
  // editor: personalizado para o Auditor
  await page.eval(`[...document.querySelectorAll('#aparencia .quem')].find(q => q.textContent.includes('Auditor')).querySelector('button').click()`);
  await page.until(`[...document.querySelectorAll('#aparencia .skin')].some(b => b.textContent.includes('Personalizado'))`);
  await page.eval(`[...document.querySelectorAll('#aparencia .skin')].find(b => b.textContent.includes('Personalizado')).click()`);
  await page.until(`document.querySelector('#aparencia canvas.previa')`);
  await page.eval(`(() => { const i = document.querySelector('#aparencia .editor input[type=text]'); i.value = 'Meu agente'; i.dispatchEvent(new Event('input')); })()`);
  await page.eval(`[...document.querySelectorAll('#aparencia .editor button')].find(b => b.textContent === 'coroa').click()`);
  await new Promise((r) => setTimeout(r, 1200));
  await print("aparencia-editor");
  await page.eval(`[...document.querySelectorAll('#aparencia button')].find(b => b.textContent.includes('salvar')).click()`);
  await page.until(`ESC.escritorio.diretor.atores.get('plan').skin.nome === 'Meu agente'`);
  assert.ok(await page.eval(`ESC.escritorio.diretor.atores.get('plan').skin.acessorios.includes('coroa')`));
  // a escolha fica salva no navegador
  assert.strictEqual(await page.eval(`JSON.parse(localStorage.getItem('escritorio.config')).skins.build`), "ronaldinho");
  await page.eval(`ESC.escritorio.engine.escala = 1`);
  await print("aparencia-sala");
  assert.deepStrictEqual(limpo(), []);
  await page.eval(`localStorage.removeItem('escritorio.config')`);
  await req("GET", "/set?agent=build&status=idle");
});

test("baloes nao se sobrepoem e subagentes tem nomes diferentes", { skip }, async () => {
  for (let i = 0; i < 4; i++) await req("GET", `/sub?id=n${i}&name=Explore&text=x&kind=read`);
  await abrir();
  await page.until(`ESC.pronto === true`);
  await page.until(`[...ESC.escritorio.diretor.atores.values()].filter(a => a.papel === 'sub').length === 4`);
  const nomes = await page.eval(`[...ESC.escritorio.diretor.atores.values()].filter(a => a.papel !== 'plan' && a.papel !== 'build').map(a => a.nome)`);
  assert.strictEqual(new Set(nomes).size, nomes.length, "nomes repetidos: " + nomes.join(", "));
  // Auditor e Construtor no mesmo lugar: os baloes tem que se separar
  await page.eval(`(() => { const d = ESC.escritorio.diretor; d.tick = ((t) => (dt, tt) => { for (const w of ['plan', 'build']) { const a = d.atores.get(w); a.fila = []; a.passo = null; a.x = 0; a.z = 3; } t.call(d, dt, tt); })(d.tick); })()`);
  await new Promise((r) => setTimeout(r, 2500));
  const cruzam = await page.eval(`(() => { const r = (id) => document.querySelector('.balao[data-id="' + id + '"] .txt').getBoundingClientRect(); const a = r('plan'), b = r('build'); return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top); })()`);
  const info = await page.eval(`JSON.stringify(["plan", "build"].map((id) => { const e = document.querySelector('.balao[data-id="' + id + '"]'); const r = e.querySelector(".txt").getBoundingClientRect(); return { id, t: e.style.transform, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: ESC.escritorio.baloes.itens.get(id).w }; }))`);
  assert.strictEqual(cruzam, false, "os baloes do Auditor e do Construtor estao um em cima do outro: " + info);
  for (let i = 0; i < 4; i++) await req("GET", `/sub?id=n${i}&status=done`);
});

test("a pagina se recarrega sozinha quando o servidor muda de versao", { skip }, async () => {
  await abrir();
  await page.until(`ESC.pronto === true`);
  await page.eval(`window.__marca = 1`);
  const antiga = app.S.versao;
  app.S.versao = "nova-" + Date.now();
  await req("GET", "/set?agent=plan&status=idle"); // provoca um envio do estado
  await page.until(`window.__marca === undefined && window.ESC && ESC.conexao.versao === ${JSON.stringify(app.S.versao)}`);
  app.S.versao = antiga;
});

test("modo foco: com o agente trabalhando todos sentam e trabalham; painel minimiza e lista subagentes e skills", { skip }, async () => {
  const d = "ESC.escritorio.diretor";
  await abrir("try { const c = JSON.parse(localStorage.getItem('escritorio.config')); delete c.painelMin; localStorage.setItem('escritorio.config', JSON.stringify(c)); } catch {}");
  await page.until(`ESC.pronto === true`);
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 3, passoMax: 0.4 })`);
  app.handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "foco" });
  app.handleClaude({ hook_event_name: "PreToolUse", session_id: "foco", tool_name: "Skill", tool_input: { skill: "frontend-design" } });
  app.handleClaude({ hook_event_name: "PreToolUse", session_id: "foco", tool_name: "Agent", tool_use_id: "f1", tool_input: { subagent_type: "Explore", description: "achar estilos" } });
  app.handleClaude({ hook_event_name: "PreToolUse", session_id: "foco", agent_id: "ag-f1", agent_type: "Explore", tool_name: "Grep", tool_input: { pattern: "painel" } });
  // o Auditor (livre) e os 3 figurantes sentam na mesa redonda para ajudar
  await page.until(`${d}.foco === true`);
  await page.until(`(() => { const as = ['plan', 'npc0', 'npc1', 'npc2'].map(id => ${d}.atores.get(id)); return as.every(a => a.apoio && a.sentado && String(a.sentado.id).startsWith('mesa')); })()`, 60000);
  assert.match(await page.eval(`document.querySelector('.balao[data-id="npc0"] .txt').textContent`), /junto|revisando|terminal|skill|ajudando/);
  // painel: subagente com o que esta fazendo, skill acesa
  await page.until(`document.querySelector('#subsList li span')?.textContent === 'procurando painel'`);
  assert.match(await page.eval(`document.querySelector('#skillsList .skill.ativa').textContent`), /frontend-design/);
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 1, passoMax: 0.1 })`);
  await print("foco-todos-trabalhando");
  // minimizar: so a pilula do contexto fica; volta ao clicar de novo (e a escolha fica salva)
  await page.eval(`document.getElementById('bMin').click()`);
  assert.strictEqual(await page.eval(`document.body.classList.contains('painel-min') && getComputedStyle(document.getElementById('corpo')).display`), "none");
  assert.ok(await page.eval(`document.getElementById('painel').getBoundingClientRect().height < 50`));
  assert.strictEqual(await page.eval(`JSON.parse(localStorage.getItem('escritorio.config')).painelMin`), true);
  await print("foco-painel-minimizado");
  await page.eval(`document.getElementById('bMin').click()`);
  assert.strictEqual(await page.eval(`document.body.classList.contains('painel-min')`), false);
  // acabou o trabalho: os figurantes levantam e liberam a mesa
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 3, passoMax: 0.4 })`);
  app.handleClaude({ hook_event_name: "PostToolUse", session_id: "foco", tool_name: "Agent", tool_use_id: "f1", tool_response: { content: "ok" } });
  app.handleClaude({ hook_event_name: "Stop", session_id: "foco" });
  await page.until(`${d}.foco === false && !${d}.atores.get('npc0').apoio`);
  await page.until(`![...${d}.lugares.values()].some(v => v.startsWith('npc'))`);
  assert.deepStrictEqual(limpo(), []);
  await req("GET", "/set?agent=build&status=idle");
});

test("modo foco: subagente tem prioridade na mesa cheia e os 5 temas funcionam com todos trabalhando", { skip }, async () => {
  const d = "ESC.escritorio.diretor";
  await req("GET", "/set?agent=build&status=working&kind=edit&text=editando%20app.js");
  await abrir();
  await page.until(`ESC.pronto === true`);
  await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 3, passoMax: 0.4 })`);
  await page.until(`['npc0', 'npc1', 'npc2'].every(id => ${d}.atores.get(id).lugar?.tipo === 'mesa')`, 30000);
  // 8 salinhas + 3 lugares livres da mesa (os figurantes estao em 3 dos 6): os 2 ultimos tiram figurantes
  for (let i = 0; i < 13; i++) await req("GET", `/sub?id=m${i}&name=Explore&text=lendo&kind=read`);
  await page.until(`[...${d}.atores.values()].filter(a => a.papel === 'sub' && a.lugar).length === 13`, 30000);
  const npcs = await page.eval(`['npc0', 'npc1', 'npc2'].map(id => ${d}.atores.get(id).lugar ? 'mesa' : 'lounge').sort().join()`);
  assert.strictEqual(npcs, "lounge,lounge,mesa");
  const donos = await page.eval(`JSON.stringify([...${d}.lugares.entries()])`);
  assert.strictEqual(new Set(JSON.parse(donos).map(([, v]) => v)).size, JSON.parse(donos).length, "lugar com dois donos: " + donos);
  for (let i = 0; i < 13; i++) await req("GET", `/sub?id=m${i}&status=done`);
  // os 5 temas com o escritorio em foco
  const ids = await page.eval(`import('/js/office3d/temas/index.js').then(m => m.TEMAS.map(t => t.id))`);
  for (const id of ids) {
    await page.eval(`ESC.escritorio.trocarTema('${id}')`);
    await page.until(`ESC.escritorio.tema.id === '${id}'`);
    await page.until(`['plan', 'npc0', 'npc1', 'npc2'].every(id => ${d}.atores.get(id).apoio && ${d}.atores.get(id).sentado)`, 90000);
    await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 1, passoMax: 0.1 })`);
    await new Promise((r) => setTimeout(r, 600));
    await print("foco-tema-" + id);
    await page.eval(`void Object.assign(ESC.escritorio.engine, { escala: 3, passoMax: 0.4 })`);
  }
  await page.eval(`ESC.escritorio.trocarTema(ESC.config.get('tema'))`);
  assert.deepStrictEqual(limpo(), []);
  await req("GET", "/set?agent=build&status=idle");
});

test("pedido de permissao no painel: botoes permitir/negar e o modo fora", { skip }, async () => {
  app._setRemoto({ token: "x".repeat(32), ntfy: "" });
  await abrir("try { const c = JSON.parse(localStorage.getItem('escritorio.config')); c.painelMin = true; localStorage.setItem('escritorio.config', JSON.stringify(c)); } catch {}");
  await page.until(`!document.getElementById('bFora').hidden`);
  await page.eval(`document.getElementById('bFora').click()`);
  await page.until(`document.getElementById('bFora').classList.contains('on')`);
  assert.strictEqual(app.S.fora, true);
  // o hook do Claude Code fica esperando a resposta
  const body = JSON.stringify({ hook_event_name: "PermissionRequest", session_id: "navp", tool_name: "Bash", tool_input: { command: "npm run deploy" } });
  const resposta = new Promise((ok) => {
    const r = require("http").request({ host: "127.0.0.1", port: require("./helpers").port(), path: "/claude", method: "POST", headers: { "Content-Type": "application/json" } },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok(b)); });
    r.end(body);
  });
  // aparece mesmo com o painel minimizado
  await page.until(`!document.getElementById('pedidosBox').hidden && getComputedStyle(document.getElementById('pedidosBox')).display !== 'none'`);
  assert.strictEqual(await page.eval(`document.querySelector('#pedidosList span').textContent`), "Bash: npm run deploy");
  assert.strictEqual(await page.eval(`[...document.querySelectorAll('#pedidosList button')].map(b => b.dataset.decisao).join()`), "sim,nao");
  await print("pedido-permissao");
  await page.eval(`document.querySelector('#pedidosList button.sim').click()`);
  assert.strictEqual(JSON.parse(await resposta).hookSpecificOutput.decision.behavior, "allow");
  await page.until(`document.getElementById('pedidosBox').hidden`);
  await page.eval(`document.getElementById('bFora').click()`);
  await page.until(`!document.getElementById('bFora').classList.contains('on')`);
  assert.strictEqual(app.S.fora, false);
  app._setRemoto(null);
  app.handleClaude({ hook_event_name: "Stop", session_id: "navp" });
  await page.eval(`void localStorage.removeItem('escritorio.config')`);
  assert.deepStrictEqual(limpo(), []);
});

test("tela estreita: so a animacao; o HUD vai para uma gaveta embaixo que abre na seta", { skip }, async () => {
  await abrir();
  await page.until(`window.ESC && ESC.estado`);
  const ve = (id) => `(() => { const e = document.getElementById('${id}'), r = e.getBoundingClientRect(); return getComputedStyle(e).visibility === 'visible' && r.width > 0 && r.top < innerHeight && r.bottom > 0; })()`;
  // tela larga: tudo como antes, sem a seta
  assert.strictEqual(await page.eval(`getComputedStyle(document.getElementById('bGaveta')).display`), "none");
  assert.strictEqual(await page.eval(ve("botoes")) && await page.eval(ve("painel")), true);
  // o Chrome de teste nao avanca as transicoes de CSS: desliga para medir as posicoes finais
  await page.eval(`void document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '* { transition: none !important }' }))`);
  await page.tamanho(700, 800);
  try {
    await page.until(ve("bGaveta"));
    for (const id of ["conexao", "chips", "botoes", "painel"]) assert.strictEqual(await page.eval(ve(id)), false, id + " aparece com a gaveta fechada");
    await page.eval(`document.getElementById('bGaveta').click()`);
    for (const id of ["conexao", "chips", "botoes", "painel"]) assert.strictEqual(await page.eval(ve(id)), true, id + " nao aparece com a gaveta aberta");
    assert.strictEqual(await page.eval(`document.getElementById('bGaveta').getAttribute('aria-expanded')`), "true");
    assert.match(await page.eval(`getComputedStyle(document.getElementById('bSound'), '::after').content`), /Som e avisos/);
    await print("gaveta-aberta");
    // tocar na cena fecha
    await page.eval(`document.getElementById('stage').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
    await page.until(`!document.body.classList.contains('gaveta-aberta')`);
    // abrir a aparencia pela gaveta tambem fecha
    await page.eval(`document.getElementById('bGaveta').click()`);
    await page.eval(`document.getElementById('bLook').click()`);
    await page.until(`!document.body.classList.contains('gaveta-aberta')`);
  } finally { await page.tamanho(1280, 800); }
  assert.deepStrictEqual(limpo(), []);
});
