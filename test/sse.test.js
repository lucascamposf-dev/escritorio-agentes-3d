// Leitura do fluxo de eventos (SSE) do opencode.
const test = require("node:test");
const assert = require("node:assert");
const { app } = require("./helpers");

const ler = (chunks) => { const out = []; let buf = ""; for (const c of chunks) buf = app.sseEvents(buf + c, (d) => out.push(d)); return { out, buf }; };

test("eventos inteiros, partidos e com varias linhas data:", () => {
  const { out, buf } = ler(['data: {"a":1}\n\n: ping\n\ndata: {"b"', ':2}\n\ndata: {"c":\ndata: 3}\n\ndata: {"d"']);
  assert.deepStrictEqual(out.map((d) => JSON.parse(d)), [{ a: 1 }, { b: 2 }, { c: 3 }]);
  assert.strictEqual(buf, 'data: {"d"');
});

test("evento que nunca termina nao cresce para sempre", () => {
  const { buf } = ler(["data: " + "x".repeat(6 * 1024 * 1024)]);
  assert.strictEqual(buf, "");
});
