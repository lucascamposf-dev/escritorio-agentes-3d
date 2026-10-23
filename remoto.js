// Acesso pelo celular: painel pela rede do Tailscale (com token) e avisos pelo ntfy.
// Uso (dentro da pasta do escritorio):   node remoto.js            cria/mostra a configuracao
//                                        node remoto.js --desligar  apaga a configuracao
// A configuracao fica em remoto.json (fora do git): { token, ntfy, ip? }.
// Sem remoto.json nada muda: o servidor continua so em 127.0.0.1 e nao manda avisos.
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const http = require("http");
const crypto = require("crypto");

const ARQ = process.env.ESCRITORIO_REMOTO_ARQ || path.join(__dirname, "remoto.json");

function ler() {
  try {
    const c = JSON.parse(fs.readFileSync(ARQ, "utf8"));
    if (!c || typeof c.token !== "string" || c.token.length < 16) return null;
    return c;
  } catch { return null; }
}

// IPv4 do Tailscale: faixa 100.64.0.0/10 (CGNAT)
function ipTailscale() {
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const n of lista || []) {
      if (n.family !== "IPv4" && n.family !== 4) continue;
      const [a, b] = n.address.split(".").map(Number);
      if (a === 100 && b >= 64 && b <= 127) return n.address;
    }
  }
  return "";
}

// compara o token sem vazar o tempo da comparacao
function tokenOk(c, t) {
  if (!c || typeof t !== "string") return false;
  const a = Buffer.from(c.token), b = Buffer.from(t);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const cookieToken = (req) => {
  const m = /(?:^|;\s*)esc_t=([^;]+)/.exec(String(req.headers.cookie || ""));
  return m ? m[1] : "";
};

// ---------- avisos (ntfy) ----------
// so o titulo e uma frase curta saem do computador; o topico e secreto (quem souber o nome le os avisos)
let enviar = (cfg, aviso) => {
  try {
    const u = new URL(cfg.ntfy);
    const lib = u.protocol === "http:" ? http : https;
    // ntfy aceita cabecalhos com acentos codificados assim (RFC 2047)
    const headers = { Title: "=?UTF-8?B?" + Buffer.from(aviso.titulo).toString("base64") + "?=", Priority: aviso.prioridade || "default", Tags: aviso.tags || "" };
    if (aviso.link) headers.Click = aviso.link;
    const req = lib.request(u, { method: "POST", headers, timeout: 8000 }, (res) => res.resume());
    req.on("timeout", () => req.destroy());
    req.on("error", () => {});
    req.end(aviso.texto);
  } catch {}
};
const recentes = new Map(); // titulo+texto -> quando: nao repete o mesmo aviso em 30 s
function avisar(cfg, aviso) {
  if (!cfg || !cfg.ntfy) return false;
  const k = aviso.titulo + "|" + aviso.texto, agora = Date.now();
  if (agora - (recentes.get(k) || 0) < 30000) return false;
  recentes.set(k, agora);
  if (recentes.size > 50) recentes.delete(recentes.keys().next().value);
  enviar(cfg, aviso);
  return true;
}

module.exports = { ARQ, ler, ipTailscale, tokenOk, cookieToken, avisar, _setEnviar: (fn) => { enviar = fn; recentes.clear(); } };

// ---------- linha de comando ----------
if (require.main === module) {
  if (process.argv.includes("--desligar")) {
    try { fs.unlinkSync(ARQ); } catch {}
    console.log("Acesso pelo celular desligado. Reinicie o servidor (node server.js).");
    process.exit(0);
  }
  let c = ler();
  if (!c) {
    c = { token: crypto.randomBytes(24).toString("base64url"), ntfy: "https://ntfy.sh/escritorio-" + crypto.randomBytes(9).toString("base64url") };
    fs.writeFileSync(ARQ, JSON.stringify(c, null, 2) + "\n");
  }
  const port = process.env.PORT || 4747;
  const ip = c.ip || ipTailscale();
  console.log("Configuracao: " + ARQ + " (nao compartilhe: o token abre o painel)\n");
  console.log("1) Painel no celular (Tailscale ligado no PC e no celular):");
  console.log(ip ? `   http://${ip}:${port}/?t=${c.token}` : "   Tailscale nao encontrado neste PC. Instale em https://tailscale.com/download e rode de novo.");
  console.log("\n2) Avisos no celular: instale o app ntfy e assine o topico:");
  console.log("   " + (c.ntfy || "(sem ntfy em remoto.json)"));
  console.log("\nReinicie o servidor (node server.js) para valer. No painel, ligue o modo \"fora\" ao sair.");
}
