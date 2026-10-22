// O log de depuracao grava prompts: so pode ser escrito quando ESCRITORIO_LOG=1.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const LOG = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "escritorio-")), "events.log");
test.after(() => fs.rmSync(path.dirname(LOG), { recursive: true, force: true }));
// roda num processo separado para ler as variaveis de ambiente do zero
const run = (env) => execFileSync(process.execPath, ["-e",
  'require("./server.js").handleClaude({ hook_event_name: "UserPromptSubmit", session_id: "t", prompt: "segredo" })'],
  { cwd: path.join(__dirname, ".."), env: { ...process.env, OPEN_BROWSER: "0", ESCRITORIO_LOG_FILE: LOG, ...env } });

test("sem ESCRITORIO_LOG nada e gravado", () => {
  run({ ESCRITORIO_LOG: "" });
  assert.strictEqual(fs.existsSync(LOG), false);
});

test("com ESCRITORIO_LOG=1 o evento e gravado", () => {
  run({ ESCRITORIO_LOG: "1" });
  assert.match(fs.readFileSync(LOG, "utf8"), /UserPromptSubmit/);
});
