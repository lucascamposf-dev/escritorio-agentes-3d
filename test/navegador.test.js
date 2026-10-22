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
  let mem0 = null;
  for (const id of [...ids, ids[0]]) {
    await page.eval(`ESC.escritorio.trocarTema('${id}')`);
    await new Promise((r) => setTimeout(r, 600));
    await print("tema-" + id);
    // desenha um quadro antes de medir (a contagem so inclui o que ja foi enviado a GPU)
    // so a sala: desconta o cache dos personagens (pecas e numeros de camisa reaproveitados de proposito)
    const mem = await page.eval(`(() => { const e = ESC.escritorio.engine, k = ESC.escritorio.diretor.kit; e.renderer.render(e.scene, e.camera); const m = e.renderer.info.memory; return JSON.stringify({ geometrias: m.geometries - k.geos.size, texturas: m.textures - k.texs.length }); })()`);
    if (id === ids[0]) { if (mem0) assert.strictEqual(mem, mem0, "trocar de tema deixou lixo na GPU"); else mem0 = mem; }
  }
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
