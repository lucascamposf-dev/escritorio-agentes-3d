// Sessoes longas nao podem fazer a memoria do servidor crescer sem limite.
const test = require("node:test");
const assert = require("node:assert");
const { app } = require("./helpers");

test("colecoes internas tem limite", () => {
  for (let i = 0; i < 5000; i++) {
    app.handle({ type: "session.updated", properties: { info: { id: "s" + i, directory: "E:/p" + (i % 50) } } });
    app.handle({ type: "message.part.updated", properties: { part: { sessionID: "s" + i, type: "tool", tool: "read", id: "p" + i, state: { input: {} } } } });
    app.handleClaude({ hook_event_name: "PreToolUse", session_id: "c", agent_id: "a" + i, tool_name: "Read", tool_input: {} });
  }
  const n = app.sizes();
  assert.ok(n.sessions <= 500, "sessions " + n.sessions);
  assert.ok(n.loggedParts <= 1000, "loggedParts " + n.loggedParts);
  assert.ok(n.ccSubs <= 100, "ccSubs " + n.ccSubs);
  assert.ok(n.projects <= 30, "projects " + n.projects);
});
