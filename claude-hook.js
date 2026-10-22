// Hook do Claude Code -> Escritorio.
// O Claude Code roda este arquivo em cada evento (em qualquer projeto) e manda o JSON pela entrada padrao.
// Ele repassa o evento para o servidor do escritorio. Se o servidor estiver fechado,
// liga o server.js em segundo plano (e o servidor abre a janela do escritorio).
// Nunca bloqueia o Claude: qualquer falha e ignorada.
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const PORT = process.env.ESCRITORIO_PORT || 4747;

function send(body) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: "127.0.0.1", port: PORT, path: "/claude", method: "POST", headers: { "Content-Type": "application/json" }, timeout: 800 },
      (res) => { res.resume(); res.on("end", () => resolve(true)); }
    );
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.on("error", () => resolve(false));
    req.end(body);
  });
}

function startServer() {
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    cwd: __dirname,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

let data = "";
const quit = () => process.exit(0);
setTimeout(quit, 4000); // seguranca: nunca segura o Claude por muito tempo
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", async () => {
  try {
    let ev = "";
    try { ev = JSON.parse(data).hook_event_name || ""; } catch {}
    if (await send(data)) return quit();
    // so liga o escritorio quando o Claude comeca a trabalhar
    if (ev === "SessionStart" || ev === "UserPromptSubmit") {
      startServer();
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 250));
        if (await send(data)) break;
      }
    }
  } catch {}
  quit();
});
