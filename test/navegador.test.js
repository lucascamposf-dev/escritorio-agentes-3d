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
  await req("GET", "/set?agent=build&status=idle");
});
