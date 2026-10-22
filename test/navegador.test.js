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
const limpo = () => page.errors.filter((e) => !/WebGL|GPU stall|GL Driver/i.test(e));

test.before(async () => {
  if (skip) return;
  url = `http://localhost:${await listen()}/`;
  page = await browser.launch();
});
test.after(async () => { if (page) await page.close(); await close(); });

test("a pagina conecta, mostra o estado e liga o 3D sem erros", { skip }, async () => {
  await req("GET", "/set?agent=build&status=working&kind=read&text=lendo%20teste.js");
  await page.open(url);
  await page.until(`window.ESC && ESC.estado && ESC.estado.agents.build.text === 'lendo teste.js'`);
  await page.until(`ESC.pronto === true`, 15000);
  assert.match(await page.eval(`document.getElementById('conn').textContent`), /aguardando|conectado/);
  await print("01-inicio");
  assert.deepStrictEqual(limpo(), []);
  await req("GET", "/set?agent=build&status=idle");
});

test("uma conexao /events por aba", { skip }, async () => {
  await req("GET", "/sub?id=nav1&name=explore&text=procurando");
  await page.open(url);
  await page.until(`document.getElementById('cSub').textContent === '1'`);
  await new Promise((r) => setTimeout(r, 500));
  assert.strictEqual(page.requests.filter((p) => p === "/events").length, 1, page.requests.join(" "));
  await req("GET", "/sub?id=nav1&status=done");
});

test("botoes da janela: ocultar e sempre por cima", { skip }, async () => {
  await page.open(url, "try { localStorage.removeItem('escritorio.config'); } catch {}");
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
  await page.open(url);
  await page.until(`ESC.pronto === true`, 15000);
  await page.eval(`document.getElementById('bDemo').click()`);
  await page.until(`ESC.estado.project === 'demo'`);
  assert.strictEqual(await page.eval(`ESC.estado.agents.plan.status`), "working");
  assert.strictEqual(app.S.agents.plan.status, "idle", "o demo nao pode mexer no servidor");
  assert.deepStrictEqual(limpo(), []);
});
