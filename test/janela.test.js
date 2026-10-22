// Janela do escritorio: abre/restaura quando o agente comeca e so fica oculta pelo botao.
const test = require("node:test");
const assert = require("node:assert");
const { app, listen, close, req, sse, janelaCmds } = require("./helpers");

test.before(listen);
test.after(close);

const claude = (ev, extra) => app.handleClaude({ hook_event_name: ev, session_id: "j1", ...extra });
const janela = (j) => req("POST", "/janela", { "Content-Type": "application/json" }, JSON.stringify(j));
const tick = () => new Promise((r) => setTimeout(r, 30));

test("com a janela aberta, novo pedido restaura (se minimizada)", async () => {
  const aba = await sse();
  janelaCmds.length = 0;
  claude("UserPromptSubmit");
  await tick();
  assert.deepStrictEqual(janelaCmds, ["restore"]);
  aba.destroy();
});

test("ocultar minimiza e segura ate o proximo pedido", async () => {
  const aba = await sse();
  janelaCmds.length = 0;
  const r = await janela({ acao: "ocultar" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(JSON.parse(r.body).hidden, true);
  assert.deepStrictEqual(janelaCmds, ["minimize"]);

  janelaCmds.length = 0;
  claude("SessionStart"); claude("PreToolUse", { tool_name: "Read", tool_input: {} });
  await tick();
  assert.deepStrictEqual(janelaCmds, [], "nao pode restaurar enquanto estiver oculta");
  assert.strictEqual(app.S.janela.hidden, true);

  claude("UserPromptSubmit");
  await tick();
  assert.deepStrictEqual(janelaCmds, ["restore"]);
  assert.strictEqual(app.S.janela.hidden, false);
  aba.destroy();
});

test("sempre por cima liga, desliga e e reaplicado ao restaurar", async () => {
  const aba = await sse();
  janelaCmds.length = 0;
  await janela({ acao: "fixar", on: true });
  assert.strictEqual(app.S.janela.pinned, true);
  claude("UserPromptSubmit");
  await tick();
  await janela({ acao: "fixar", on: false });
  assert.deepStrictEqual(janelaCmds, ["pin", "restore", "pin", "unpin"]);
  assert.strictEqual((await janela({ acao: "explodir" })).status, 400);
  aba.destroy();
});

test("opencode: mensagem nova do usuario tambem acorda a janela", async () => {
  const aba = await sse();
  janelaCmds.length = 0;
  app.handle({ type: "message.updated", properties: { info: { sessionID: "oc1", role: "user", agent: "build", id: "u1" } } });
  await tick();
  assert.deepStrictEqual(janelaCmds, ["restore"]);
  aba.destroy();
});

test("sem janela encontrada e sem abas, abre uma nova; com janela encontrada, nao", async () => {
  const j = require("../janela");
  const abertas = [];
  const exec = require("child_process").exec;
  for (const [resposta, abre] of [["ok", false], ["none", true]]) {
    j.setRunner((cmd) => { janelaCmds.push(cmd); return Promise.resolve(resposta); });
    abertas.length = 0;
    app._setOpener((u) => abertas.push(u));
    claude("UserPromptSubmit");
    await tick();
    assert.strictEqual(abertas.length, abre ? 1 : 0, "resposta " + resposta);
  }
  j.setRunner((cmd) => { janelaCmds.push(cmd); return Promise.resolve("ok"); });
});
