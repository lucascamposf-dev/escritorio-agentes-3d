// Traducao dos eventos do opencode e do Claude Code para o estado da tela.
const test = require("node:test");
const assert = require("node:assert");
const { app, reset } = require("./helpers");
const { S, handle, handleClaude, snapshot } = app;

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

test("Claude Code: skill chamada pela ferramenta ou digitada com / aparece na lista de skills", () => {
  reset();
  handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "sk", prompt: "/simplify o server.js" });
  assert.strictEqual(S.agents.build.text, "usando a skill simplify");
  handleClaude({ hook_event_name: "PreToolUse", session_id: "sk", tool_name: "Skill", tool_input: { skill: "caveman" } });
  assert.strictEqual(S.agents.build.text, "usando a skill caveman");
  assert.strictEqual(S.agents.build.kind, "skill");
  assert.deepStrictEqual(S.skills.slice(-2).map((k) => [k.name, k.agent]), [["simplify", "build"], ["caveman", "build"]]);
  handleClaude({ hook_event_name: "Stop", session_id: "sk" });
});

test("Claude Code: cada subagente mostra o que esta fazendo, sem mudar o texto do principal", () => {
  reset();
  handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "sa" });
  handleClaude({ hook_event_name: "PreToolUse", session_id: "sa", tool_name: "Agent", tool_use_id: "t1", tool_input: { subagent_type: "Explore", description: "achar rotas" } });
  handleClaude({ hook_event_name: "PreToolUse", session_id: "sa", tool_name: "Agent", tool_use_id: "t2", tool_input: { subagent_type: "Plan", description: "planejar" } });
  const principal = S.agents.build.text;
  handleClaude({ hook_event_name: "PreToolUse", session_id: "sa", agent_id: "ag-plan", agent_type: "Plan", tool_name: "Read", tool_input: { file_path: "E:/x/plano.md" } });
  handleClaude({ hook_event_name: "PreToolUse", session_id: "sa", agent_id: "ag-exp", agent_type: "Explore", tool_name: "Skill", tool_input: { skill: "code-review" } });
  const subs = Object.fromEntries(snapshot().subs.map((s) => [s.name, s]));
  assert.strictEqual(subs.Plan.text, "lendo plano.md", "o evento foi para o subagente certo (mesmo tipo)");
  assert.strictEqual(subs.Explore.text, "usando a skill code-review");
  assert.strictEqual(S.agents.build.text, principal);
  assert.deepStrictEqual(S.skills.at(-1), { ...S.skills.at(-1), name: "code-review", agent: "sub", by: "Explore" });
  handleClaude({ hook_event_name: "PostToolUse", session_id: "sa", tool_name: "Agent", tool_use_id: "t1", tool_response: { content: "achei 3 rotas" } });
  handleClaude({ hook_event_name: "PostToolUse", session_id: "sa", tool_name: "Agent", tool_use_id: "t2", tool_response: { content: "plano pronto" } });
  assert.deepStrictEqual(snapshot().subs.filter((s) => s.id.startsWith("cc:t")).map((s) => s.status), ["done", "done"]);
  handleClaude({ hook_event_name: "Stop", session_id: "sa" });
});

test("Claude Code: subagente em segundo plano continua trabalhando depois do Stop ate o SubagentStop", () => {
  reset();
  handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "bg" });
  handleClaude({ hook_event_name: "PreToolUse", session_id: "bg", tool_name: "Agent", tool_use_id: "b1", tool_input: { subagent_type: "general-purpose", description: "testes" } });
  handleClaude({ hook_event_name: "PostToolUse", session_id: "bg", tool_name: "Agent", tool_use_id: "b1", tool_response: "Async agent launched successfully. agentId: ag123456" });
  const st = () => (snapshot().subs.find((s) => s.id === "cc:b1") || {}).status;
  assert.strictEqual(st(), "working");
  handleClaude({ hook_event_name: "Stop", session_id: "bg" });
  assert.strictEqual(S.agents.build.status, "done");
  assert.strictEqual(st(), "working");
  handleClaude({ hook_event_name: "PreToolUse", session_id: "bg", agent_id: "ag123456", agent_type: "general-purpose", tool_name: "Bash", tool_input: { command: "npm test" } });
  assert.strictEqual(snapshot().subs.find((s) => s.id === "cc:b1").text, "rodando npm test");
  handleClaude({ hook_event_name: "SubagentStop", session_id: "bg", agent_id: "ag123456", agent_type: "general-purpose" });
  assert.strictEqual(st(), "done");
});
