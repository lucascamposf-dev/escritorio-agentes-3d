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

test("outros sites nao leem nem alteram o painel", async () => {
  const evil = [
    { Origin: "https://site-malicioso.com" },
    { Origin: "http://localhost:5173" }, // outro servidor local
    { Origin: "null" }, // pagina aberta como arquivo
    { "Sec-Fetch-Site": "cross-site" }, // <img src=...> nao manda Origin
    { "Sec-Fetch-Site": "same-site" },
    { Host: "rebind.example.com:4747" }, // DNS rebinding
  ];
  for (const h of evil) {
    for (const [m, p] of [["GET", "/events"], ["GET", "/set?agent=plan&status=working"], ["GET", "/sub?id=x"], ["POST", "/claude"], ["POST", "/state"]]) {
      const r = await req(m, p, h, m === "POST" ? "{}" : "");
      assert.strictEqual(r.status, 403, `${m} ${p} ${JSON.stringify(h)}`);
    }
  }
  assert.strictEqual(app.S.agents.plan.status, "idle");
});

test("a propria pagina e os hooks continuam funcionando", async () => {
  const ok = [
    {}, // hook do Claude Code (node, sem Origin)
    { "Sec-Fetch-Site": "same-origin" },
    { "Sec-Fetch-Site": "none" }, // endereco digitado na barra
    { "Sec-Fetch-Site": "same-origin", Origin: "http://localhost:PORT" },
  ];
  for (const h of ok) {
    const hh = { ...h };
    if (hh.Origin) hh.Origin = hh.Origin.replace("PORT", require("./helpers").port());
    const r = await req("GET", "/favicon.ico", hh);
    assert.strictEqual(r.status, 204, JSON.stringify(hh));
    assert.strictEqual(r.headers["access-control-allow-origin"], undefined);
  }
  const c = await req("POST", "/claude", { "Content-Type": "application/json" }, JSON.stringify({ hook_event_name: "SessionEnd", session_id: "zz" }));
  assert.strictEqual(c.status, 200);
  const h127 = await raw(["GET /favicon.ico HTTP/1.1", "Host: 127.0.0.1:4747", "Connection: close"]);
  assert.strictEqual(h127.status, 204);
});

test("corpo grande demais e recusado e o servidor segue no ar", async () => {
  const r = await req("POST", "/claude", { "Content-Type": "application/json" }, "x".repeat(11 * 1024 * 1024));
  assert.ok(r.status === 413 || r.error, "esperava 413, veio " + (r.status || r.error));
  assert.strictEqual((await req("GET", "/favicon.ico")).status, 204);
});

test("acentos chegam inteiros mesmo divididos entre pacotes", async () => {
  const body = Buffer.from(JSON.stringify({ hook_event_name: "PreToolUse", session_id: "u", tool_name: "Read", tool_input: { file_path: "C:/ação.txt" } }));
  const cut = body.indexOf(Buffer.from("ç")) + 1; // parte o "ç" (2 bytes) no meio
  const net = require("net");
  await new Promise((ok) => {
    const c = net.connect(require("./helpers").port(), "127.0.0.1", () => {
      c.write(`POST /claude HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`);
      c.write(body.subarray(0, cut));
      setTimeout(() => c.write(body.subarray(cut)), 50);
    });
    c.on("data", () => {}); c.on("close", ok);
  });
  assert.strictEqual(app.S.agents.build.text, "lendo ação.txt");
});
