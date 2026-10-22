// Traducao dos eventos do opencode e do Claude Code para o estado da tela.
const test = require("node:test");
const assert = require("node:assert");
const { app, reset } = require("./helpers");
const { S, handle, handleClaude } = app;

test("opencode: ferramenta de leitura deixa o Construtor 'lendo <arquivo>'", () => {
  reset();
  handle({ type: "message.updated", properties: { info: { sessionID: "s1", role: "assistant", agent: "build", id: "m1" } } });
  handle({ type: "message.part.updated", properties: { part: { sessionID: "s1", type: "tool", tool: "read", id: "p1", state: { input: { filePath: "C:\\x\\server.js" } } } } });
  assert.strictEqual(S.agents.build.status, "working");
  assert.strictEqual(S.agents.build.text, "lendo server.js");
  assert.strictEqual(S.agents.build.kind, "read");
});

test("opencode: pedido de permissao e sessao ociosa", () => {
  reset();
  handle({ type: "message.updated", properties: { info: { sessionID: "s1", role: "assistant", agent: "plan", id: "m2" } } });
  handle({ type: "permission.asked", properties: { permission: "bash", patterns: ["git status"] } });
  assert.strictEqual(S.agents.plan.status, "waiting");
  handle({ type: "permission.replied", properties: {} });
  assert.strictEqual(S.agents.plan.status, "working");
  handle({ type: "session.idle", properties: { sessionID: "s1" } });
  assert.strictEqual(S.agents.plan.status, "done");
});

test("Claude Code: modo plan vai para o Auditor e Stop termina", () => {
  reset();
  handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "c1", permission_mode: "plan" });
  assert.strictEqual(S.agents.plan.status, "working");
  handleClaude({ hook_event_name: "PreToolUse", session_id: "c1", tool_name: "Grep", tool_input: { pattern: "todo" } });
  assert.strictEqual(S.agents.plan.text, "procurando todo");
  handleClaude({ hook_event_name: "Stop", session_id: "c1" });
  assert.strictEqual(S.agents.plan.status, "done");
});

test("sessao atual: muda com sessao nova do opencode ou do Claude Code", () => {
  handle({ type: "session.created", properties: { info: { id: "ses_A", directory: "E:/x" } } });
  assert.strictEqual(S.session, "ses_A");
  handle({ type: "session.created", properties: { info: { id: "ses_filho", parentID: "ses_A" } } });
  assert.strictEqual(S.session, "ses_A", "subagente nao muda a sessao");
  handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "cc_B" });
  assert.strictEqual(S.session, "cc_B");
  handleClaude({ hook_event_name: "Stop", session_id: "cc_B" });
});
