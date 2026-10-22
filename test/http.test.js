// Rotas HTTP e robustez do servidor.
const test = require("node:test");
const assert = require("node:assert");
const { app, listen, close, raw, req } = require("./helpers");

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

test("/set e /state so aceitam os agentes plan e build", async () => {
  for (const bad of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    const r = await req("GET", `/set?agent=${bad}&status=working&text=x`);
    assert.strictEqual(r.status, 400, bad);
    const p = await req("POST", "/state", { "Content-Type": "application/json" }, JSON.stringify({ agent: bad, status: "working", text: "x" }));
    assert.strictEqual(p.status, 400, bad);
  }
  assert.strictEqual(({}).status, undefined, "Object.prototype foi alterado");
  assert.strictEqual(({}).text, undefined, "Object.prototype foi alterado");
  // a atividade real continua indo para o agente certo
  app.handle({ type: "message.updated", properties: { info: { sessionID: "s9", role: "assistant", agent: "build", id: "m9" } } });
  app.handle({ type: "message.part.updated", properties: { part: { sessionID: "s9", type: "tool", tool: "read", id: "p9", state: { input: { filePath: "a.txt" } } } } });
  assert.strictEqual(app.S.agents.build.text, "lendo a.txt");
  assert.strictEqual((await req("GET", "/set?agent=plan&status=idle")).status, 200);
});
