// Custo e arquivos editados sao contados por projeto.
const test = require("node:test");
const assert = require("node:assert");
const { app } = require("./helpers");
const { handle, handleClaude, snapshot } = app;

const sessao = (id, dir) => handle({ type: "session.updated", properties: { info: { id, directory: dir } } });
const custo = (sid, id, cost) => handle({ type: "message.updated", properties: { info: { sessionID: sid, role: "assistant", agent: "build", id, cost } } });
const editou = (sid, id, f) => handle({ type: "message.part.updated", properties: { part: { sessionID: sid, type: "tool", tool: "edit", id, state: { status: "completed", input: { filePath: f } } } } });

test("trocar de projeto mostra o custo e os arquivos daquele projeto", () => {
  sessao("pa", "E:/projA");
  custo("pa", "ma1", 0.5); custo("pa", "ma1", 0.75); // a mesma mensagem atualizada nao soma duas vezes
  editou("pa", "ea1", "E:/projA/x.js");
  assert.deepStrictEqual([snapshot().cost, snapshot().files], [0.75, 1]);

  sessao("pb", "E:/projB");
  assert.deepStrictEqual([snapshot().cost, snapshot().files], [0, 0]);
  custo("pb", "mb1", 0.1);

  handleClaude({ hook_event_name: "PostToolUse", session_id: "c", cwd: "E:/projA", tool_name: "Write", tool_input: { file_path: "E:/projA/y.js" } });
  assert.deepStrictEqual([snapshot().project, snapshot().cost, snapshot().files], ["projA", 0.75, 2]);
});

test("muitas mensagens antigas nao mudam o custo total", () => {
  sessao("pc", "E:/projC");
  for (let i = 0; i < 1000; i++) custo("pc", "mc" + i, 0.01);
  assert.strictEqual(Math.round(snapshot().cost * 100), 1000);
});
