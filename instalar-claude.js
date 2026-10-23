// Liga o Escritorio ao Claude Code em TODOS os projetos.
// Uso (dentro da pasta do escritorio):   node instalar-claude.js
// Para remover:                           node instalar-claude.js --remover
// Edita %USERPROFILE%\.claude\settings.json (faz backup antes) sem apagar suas outras configuracoes.
const fs = require("fs");
const os = require("os");
const path = require("path");

const remover = process.argv.includes("--remover");
const dir = path.join(os.homedir(), ".claude");
const file = path.join(dir, "settings.json");
const hook = path.join(__dirname, "claude-hook.js").replace(/\\/g, "/");
const command = `node "${hook}"`;
const MARK = "claude-hook.js";

const EVENTS = [
  "SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PostToolUseFailure",
  "PermissionRequest", "Notification", "SubagentStart", "SubagentStop", "PreCompact", "Stop", "StopFailure", "SessionEnd",
];
const WITH_MATCHER = new Set(["PreToolUse", "PostToolUse", "PostToolUseFailure", "PermissionRequest"]);

fs.mkdirSync(dir, { recursive: true });
let cfg = {};
if (fs.existsSync(file)) {
  const raw = fs.readFileSync(file, "utf8");
  try { cfg = raw.trim() ? JSON.parse(raw) : {}; }
  catch { console.error("Nao consegui ler " + file + " (JSON invalido). Corrija o arquivo e rode de novo."); process.exit(1); }
  fs.writeFileSync(file + ".backup-escritorio", raw);
}
cfg.hooks = cfg.hooks || {};

// tira qualquer instalacao anterior do escritorio
for (const ev of Object.keys(cfg.hooks)) {
  cfg.hooks[ev] = (cfg.hooks[ev] || [])
    .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !String(h.command || "").includes(MARK)) }))
    .filter((g) => g.hooks.length);
  if (!cfg.hooks[ev].length) delete cfg.hooks[ev];
}

if (!remover) {
  for (const ev of EVENTS) {
    // PermissionRequest pode esperar a resposta dada pelo celular (modo "fora" do painel)
    const group = { hooks: [{ type: "command", command, timeout: ev === "PermissionRequest" ? 600 : 10 }] };
    if (WITH_MATCHER.has(ev)) group.matcher = "*";
    (cfg.hooks[ev] = cfg.hooks[ev] || []).push(group);
  }
}
if (!Object.keys(cfg.hooks).length) delete cfg.hooks;

fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
console.log(remover
  ? "Escritorio desligado do Claude Code."
  : "Pronto! O Escritorio agora acompanha o Claude Code em todos os projetos.\n" +
    "Configuracao: " + file + "\n" +
    "Abra uma conversa NOVA no Claude Code para os hooks valerem.");
