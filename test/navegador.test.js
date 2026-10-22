// A pagina de verdade, num Chrome headless, ligada ao servidor de teste.
// Pulado se nao houver Chrome/Edge na maquina (CHROME_PATH aponta outro).
const test = require("node:test");
const assert = require("node:assert");
const { app, listen, close, req } = require("./helpers");
const browser = require("./browser");

const skip = !browser.available && "Chrome/Edge nao encontrado";
let page, url;

test.before(async () => {
  if (skip) return;
  url = `http://localhost:${await listen()}/`;
  page = await browser.launch();
});
test.after(async () => { if (page) await page.close(); await close(); });

test("a pagina conecta e mostra o estado do servidor", { skip }, async () => {
  await req("GET", "/set?agent=build&status=working&kind=read&text=lendo%20teste.js");
  await page.open(url);
  await page.until(`document.querySelector('[data-who=build] .bt').textContent === 'lendo teste.js'`);
  assert.strictEqual(await page.eval(`document.querySelector('[data-who=build]').dataset.status`), "working");
  assert.match(await page.eval(`document.getElementById('conn').textContent`), /aguardando|conectado/);
  assert.deepStrictEqual(page.errors, []);
  assert.ok(!page.requests.includes("/three.min.js"), "o modo 2D nao precisa baixar o three.js");
  await req("GET", "/set?agent=build&status=idle");
});

test("uma conexao /events por aba, e o 3D recebe os subagentes por ela", { skip }, async () => {
  await req("GET", "/sub?id=nav1&name=explore&text=procurando");
  await page.open(url);
  await page.until(`document.getElementById('cSub').textContent === '1'`);
  await new Promise((r) => setTimeout(r, 500));
  assert.strictEqual(page.requests.filter((p) => p === "/events").length, 1, page.requests.join(" "));
  assert.strictEqual(await page.eval(`(window.O3.subs || []).map(s => s.id).join()`), "nav1");
  await req("GET", "/sub?id=nav1&status=done");
});

test("modo 3D liga, mostra o robo do subagente, libera a GPU e nao da erro", { skip }, async () => {
  await page.open(url, "try { localStorage.setItem('office.v3d', '1'); } catch {}");
  await page.until(`window.O3 && window.O3.ready`, 15000);
  const robos = () => page.eval(`O3.scene.children.filter(o => o.isGroup && o.children.some(c => c.isSprite)).length`);
  const antes = await robos(); // os 2 agentes principais
  const mem = `JSON.stringify(O3.renderer.info.memory)`;
  const memAntes = await page.eval(mem);
  await req("GET", "/sub?id=nav3d&name=explore&text=procurando");
  await page.until(`O3.scene.children.filter(o => o.isGroup && o.children.some(c => c.isSprite)).length === ${antes + 1}`);
  await req("GET", "/sub?id=nav3d&status=done");
  await page.until(`O3.scene.children.filter(o => o.isGroup && o.children.some(c => c.isSprite)).length === ${antes}`, 25000);
  await new Promise((r) => setTimeout(r, 300)); // alguns quadros depois
  assert.strictEqual(await page.eval(mem), memAntes, "geometrias/texturas do robo ficaram na GPU");
  assert.deepStrictEqual(page.errors, []);
});

test("clicar no personagem nao altera o estado real; no demo so muda a tela", { skip }, async () => {
  await req("GET", "/set?agent=plan&status=idle");
  await page.open(url);
  await page.until(`document.getElementById('conn').textContent.includes('aguardando')`);
  await page.eval(`document.querySelector('[data-who=plan]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  assert.ok(!page.requests.includes("/set"), "a pagina chamou /set");
  assert.strictEqual(app.S.agents.plan.status, "idle");
  assert.strictEqual(await page.eval(`document.querySelector('[data-who=plan]').dataset.status`), "idle");

  await page.eval(`document.getElementById('bDemo').click()`); // 1o passo do demo: Auditor lendo
  await page.eval(`document.querySelector('[data-who=build]').click()`);
  assert.strictEqual(await page.eval(`document.querySelector('[data-who=build]').dataset.status`), "working");
  assert.ok(!page.requests.includes("/set"), "a pagina chamou /set no demo");
  assert.strictEqual(app.S.agents.build.status, "idle");
});

test("botoes da janela: ocultar e sempre por cima", { skip }, async () => {
  const { janelaCmds } = require("./helpers");
  await page.open(url, "try { localStorage.setItem('office.pin', '0'); } catch {}");
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
