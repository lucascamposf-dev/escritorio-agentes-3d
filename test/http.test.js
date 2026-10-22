// Rotas HTTP e robustez do servidor.
const test = require("node:test");
const assert = require("node:assert");
const { listen, close, raw, req } = require("./helpers");

test.before(listen);
test.after(close);

test("pagina principal responde", async () => {
  const r = await req("GET", "/");
  assert.strictEqual(r.status, 200);
  assert.match(r.body, /<title>/);
});

test("Host invalido nao derruba o servidor", async () => {
  await raw(["GET / HTTP/1.1", "Host: a b", "Connection: close"]);
  await raw(["GET / HTTP/1.1", "Connection: close"]); // sem Host
  const r = await req("GET", "/favicon.ico");
  assert.strictEqual(r.status, 204, "o servidor deveria continuar no ar");
});
