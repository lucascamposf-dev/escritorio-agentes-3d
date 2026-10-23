// Acesso pelo celular: permissoes respondidas pelo painel, avisos do ntfy e o painel no Tailscale com token.
const test = require("node:test");
const assert = require("node:assert");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
process.env.ESCRITORIO_REMOTO_ARQ = path.join(__dirname, "nao-existe-remoto.json"); // nunca le o remoto.json de verdade

// opencode de mentira: grava as respostas de permissao (precisa existir antes de carregar o server.js)
const ocReqs = [];
let ocNaoAcha = false; // simula o opencode novo, que so tem /permission/:id/reply
const oc = http.createServer((req, res) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => {
    if (req.url === "/event") { res.writeHead(404); return res.end(); }
    ocReqs.push({ url: req.url, body: JSON.parse(b || "{}") });
    res.writeHead(ocNaoAcha && req.url.startsWith("/session/") ? 404 : 200);
    res.end("true");
  });
});
let app, listen, close, req, port;
const remoto = require("../remoto");

test.before(async () => {
  await new Promise((ok) => oc.listen(0, "127.0.0.1", ok));
  process.env.OC_PORT = String(oc.address().port);
  ({ app, listen, close, req, port } = require("./helpers"));
  await listen();
});
test.after(async () => { await close(); oc.close(); const r = app.remoteServer(); if (r) { r.closeAllConnections(); r.close(); } });

const esperar = async (f, ms = 3000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) throw new Error("tempo esgotado"); await new Promise((r) => setTimeout(r, 20)); } };
const post = (p, j) => req("POST", p, { "Content-Type": "application/json" }, JSON.stringify(j));

// roda o hook de verdade e devolve o que ele escreveu na saida padrao
function hook(evento) {
  return new Promise((ok) => {
    const h = spawn(process.execPath, [path.join(__dirname, "..", "claude-hook.js")], { env: { ...process.env, ESCRITORIO_PORT: String(port()) } });
    let out = "";
    h.stdout.on("data", (d) => (out += d));
    h.on("close", (code) => ok({ out, code }));
    h.stdin.end(JSON.stringify(evento));
  });
}
const pedido = (tool_name, tool_input, extra = {}) => ({ hook_event_name: "PermissionRequest", session_id: "rem", tool_name, tool_input, ...extra });

test("modo fora: o hook espera e recebe a resposta dada pelo painel", async () => {
  assert.strictEqual((await post("/fora", { on: true })).status, 200);
  assert.strictEqual(app.S.fora, true);
  // permitir
  let h = hook(pedido("Bash", { command: "npm test" }));
  await esperar(() => app.S.pedidos.length === 1);
  const p = app.S.pedidos[0];
  assert.strictEqual(p.text, "Bash: npm test");
  assert.strictEqual(p.sempre, false);
  assert.strictEqual(app.S.agents.build.status, "waiting");
  assert.strictEqual((await post("/responder", { id: p.id, decisao: "sim" })).status, 200);
  let r = await h;
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(JSON.parse(r.out).hookSpecificOutput, { hookEventName: "PermissionRequest", decision: { behavior: "allow" } });
  assert.strictEqual(app.S.pedidos.length, 0);
  assert.strictEqual(app.S.agents.build.status, "working");
  assert.strictEqual((await post("/responder", { id: p.id, decisao: "sim" })).status, 404, "o mesmo pedido nao responde duas vezes");
  // negar
  h = hook(pedido("Write", { file_path: "C:/x/a.txt" }));
  await esperar(() => app.S.pedidos.length === 1);
  await post("/responder", { id: app.S.pedidos[0].id, decisao: "nao" });
  r = await h;
  assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.decision.behavior, "deny");
  // sempre: usa as regras sugeridas pelo proprio Claude Code
  const sug = [{ type: "addRules", rules: [{ toolName: "Bash", ruleContent: "npm test" }], behavior: "allow", destination: "localSettings" }];
  h = hook(pedido("Bash", { command: "npm test" }, { permission_suggestions: sug }));
  await esperar(() => app.S.pedidos.length === 1);
  assert.strictEqual(app.S.pedidos[0].sempre, true);
  await post("/responder", { id: app.S.pedidos[0].id, decisao: "sempre" });
  r = await h;
  assert.deepStrictEqual(JSON.parse(r.out).hookSpecificOutput.decision, { behavior: "allow", updatedPermissions: sug });
  // decisao invalida
  assert.strictEqual((await post("/responder", { id: "cc:x", decisao: "talvez" })).status, 404);
  assert.strictEqual((await post("/fora", { on: "sim" })).status, 400);
  app.handleClaude({ hook_event_name: "Stop", session_id: "rem" });
});

test("sem o modo fora a permissao passa direto, e desligar devolve os pedidos ao terminal", async () => {
  await post("/fora", { on: false });
  let r = await hook(pedido("Bash", { command: "ls" }));
  assert.strictEqual(r.out, "");
  assert.strictEqual(app.S.pedidos.length, 0);
  await post("/fora", { on: true });
  const h = hook(pedido("Bash", { command: "ls" }));
  await esperar(() => app.S.pedidos.length === 1);
  await post("/fora", { on: false });
  r = await h;
  assert.strictEqual(r.out, "", "sem resposta: o Claude pergunta no terminal");
  assert.strictEqual(app.S.pedidos.length, 0);
  app.handleClaude({ hook_event_name: "Stop", session_id: "rem" });
});

test("opencode: o pedido aparece no painel e a resposta vai para a API do opencode", async () => {
  app.handle({ type: "message.updated", properties: { info: { sessionID: "ses1", role: "assistant", agent: "build", id: "mo1" } } });
  app.handle({ type: "permission.asked", properties: { id: "per1", sessionID: "ses1", permission: "bash", patterns: ["rm x"] } });
  assert.deepStrictEqual(app.S.pedidos.map((p) => [p.id, p.text, p.sempre]), [["oc:per1", "bash: rm x", true]]);
  assert.ok(app.responder("oc:per1", "nao"));
  await esperar(() => ocReqs.length === 1);
  assert.deepStrictEqual(ocReqs[0], { url: "/session/ses1/permissions/per1", body: { response: "reject" } });
  // opencode novo: cai no /permission/:id/reply
  ocNaoAcha = true;
  app.handle({ type: "permission.asked", properties: { id: "per2", sessionID: "ses1", permission: "edit", patterns: ["a.js"] } });
  app.responder("oc:per2", "sempre");
  await esperar(() => ocReqs.length === 3);
  assert.deepStrictEqual(ocReqs[2], { url: "/permission/per2/reply", body: { reply: "always" } });
  // respondido no proprio opencode: some do painel
  app.handle({ type: "permission.asked", properties: { id: "per3", sessionID: "ses1", permission: "bash", patterns: ["ls"] } });
  app.handle({ type: "permission.replied", properties: { sessionID: "ses1", permissionID: "per3", response: "once" } });
  assert.strictEqual(app.S.pedidos.length, 0);
  app.handle({ type: "session.idle", properties: { sessionID: "ses1" } });
});

test("avisos no celular (ntfy) so no modo fora, um por mudanca de estado", () => {
  const avisos = [];
  remoto._setEnviar((cfg, a) => avisos.push(a));
  app._setRemoto({ token: "x".repeat(32), ntfy: "https://ntfy.example/topico" });
  app.setFora(false);
  for (const w of ["plan", "build"]) app.setA(w, "idle");
  app.setA("build", "working", "lendo a.js", "read");
  app.setA("build", "done", "pronto!", "think");
  assert.strictEqual(avisos.length, 0);
  app.setFora(true);
  app.setA("build", "waiting", "pedindo permissão: rodando npm test", "wait");
  app.setA("build", "waiting", "pedindo permissão: rodando npm test", "wait"); // mesmo estado: nao repete
  app.setA("build", "working", "x", "think");
  app.setA("build", "done", "pronto!", "think");
  app.setA("plan", "error", "sem credito", "think");
  assert.deepStrictEqual(avisos.map((a) => [a.titulo.split(" ").slice(0, 2).join(" "), a.prioridade || "default"]),
    [["Construtor precisa", "high"], ["Construtor terminou", "default"], ["Auditor deu", "high"]]);
  assert.strictEqual(avisos[0].texto, "pedindo permissão: rodando npm test");
  app.setFora(false);
  app._setRemoto(null);
  for (const w of ["plan", "build"]) app.setA(w, "idle");
});

// ---------- painel pelo Tailscale ----------
function rget(rp, method, p, headers = {}, body = "") {
  return new Promise((ok) => {
    const r = http.request({ host: "127.0.0.1", port: rp, method, path: p, headers: { Host: `127.0.0.1:${rp}`, ...headers } }, (res) => {
      if (p.startsWith("/events")) { ok({ status: res.statusCode, headers: res.headers }); return res.destroy(); }
      let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => ok({ status: res.statusCode, headers: res.headers, body: b }));
    });
    r.on("error", (e) => ok({ error: e.code }));
    r.end(body);
  });
}

test("painel no celular: so com o token, e so a pagina, o estado e as respostas", async () => {
  const token = "t".repeat(20) + "ABCDEFGH_-";
  app._setRemoto({ token, ntfy: "" });
  const rp = await app.ligarRemoto("127.0.0.1", 0);
  assert.ok(rp > 0);
  assert.strictEqual((await rget(rp, "GET", "/")).status, 401);
  assert.strictEqual((await rget(rp, "GET", "/events")).status, 401);
  assert.strictEqual((await rget(rp, "GET", "/?t=errado")).status, 401);
  assert.strictEqual((await rget(rp, "GET", "/?t=" + token.slice(0, -1) + "x")).status, 401);
  const login = await rget(rp, "GET", "/?t=" + token);
  assert.strictEqual(login.status, 302);
  const cookie = String(login.headers["set-cookie"]);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  const c = { Cookie: cookie.split(";")[0] };
  assert.strictEqual((await rget(rp, "GET", "/", c)).status, 200);
  assert.strictEqual((await rget(rp, "GET", "/js/main.js", c)).status, 200);
  assert.strictEqual((await rget(rp, "GET", "/events", c)).status, 200);
  assert.strictEqual((await rget(rp, "POST", "/responder", { ...c, "Content-Type": "application/json" }, '{"id":"x","decisao":"sim"}')).status, 404);
  assert.strictEqual((await rget(rp, "POST", "/fora", { ...c, "Content-Type": "application/json" }, '{"on":false}')).status, 200);
  // depuracao, hooks e a janela do PC ficam so no computador
  for (const [m, p] of [["GET", "/set?agent=plan&status=working"], ["GET", "/sub?id=x"], ["POST", "/claude"], ["POST", "/state"], ["POST", "/janela"]])
    assert.strictEqual((await rget(rp, m, p, c, m === "POST" ? "{}" : "")).status, 403, p);
  assert.strictEqual(app.S.agents.plan.status, "idle");
  // outros sites e DNS rebinding continuam bloqueados, mesmo com o cookie
  for (const h of [{ Host: "rebind.example.com" }, { Origin: "https://site-malicioso.com" }, { "Sec-Fetch-Site": "cross-site" }])
    assert.strictEqual((await rget(rp, "GET", "/events", { ...c, ...h })).status, 403, JSON.stringify(h));
  assert.strictEqual((await rget(rp, "GET", "/", { ...c, Host: "meu-pc.tail1234.ts.net:4747" })).status, 200, "nome do MagicDNS");
  // sem remoto.json o token nao vale nada
  app._setRemoto(null);
  assert.strictEqual((await rget(rp, "GET", "/", c)).status, 401);
  assert.strictEqual(app.S.remoto, false);
});

test("token: compara inteiro e recusa curto ou vazio", () => {
  const cfg = { token: "a".repeat(32) };
  assert.ok(remoto.tokenOk(cfg, "a".repeat(32)));
  for (const t of ["", "a", "a".repeat(31), "a".repeat(33), "b".repeat(32), null, undefined]) assert.ok(!remoto.tokenOk(cfg, t), String(t));
  assert.ok(!remoto.tokenOk(null, "a".repeat(32)));
  assert.strictEqual(remoto.cookieToken({ headers: { cookie: "x=1; esc_t=abc; y=2" } }), "abc");
});
