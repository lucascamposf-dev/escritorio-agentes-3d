// Abre paginas num Chrome/Edge headless e conversa com ele pelo protocolo DevTools.
// Sem dependencias: usa o fetch e o WebSocket do proprio Node (v22+).
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const exe = CANDIDATES.find((p) => fs.existsSync(p));
const available = !!exe && typeof WebSocket === "function";

async function launch() {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "escritorio-chrome-"));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(exe, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
    "--no-first-run", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
  let tabs;
  for (let i = 0; i < 80 && !tabs; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await new Promise((r) => setTimeout(r, 125)); }
  }
  if (!tabs) { proc.kill(); throw new Error("Chrome nao respondeu"); }
  const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let n = 0;
  const pending = new Map();
  const page = { errors: [], requests: [] };
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result || { erroCdp: d.error }); pending.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") page.errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") page.errors.push(d.params.args.map((a) => a.value ?? a.description).join(" "));
    if (d.method === "Network.requestWillBeSent") page.requests.push(new URL(d.params.request.url).pathname);
  };
  const send = (method, params = {}) => new Promise((ok) => { const id = ++n; pending.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable"); await send("Network.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  page.open = async (url, setup) => {
    page.errors.length = 0; page.requests.length = 0;
    if (setup) await send("Page.addScriptToEvaluateOnNewDocument", { source: setup });
    await send("Page.navigate", { url });
  };
  page.eval = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.erroCdp) throw new Error("Chrome recusou: " + JSON.stringify(r.erroCdp));
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  // espera ate a expressao ser verdadeira (ou estoura o tempo)
  page.until = async (expr, ms = 20000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) { try { if (await page.eval(expr)) return true; } catch {} await new Promise((r) => setTimeout(r, 100)); }
    throw new Error("tempo esgotado esperando: " + expr);
  };
  // salva um PNG do que esta na tela
  page.screenshot = async (arquivo) => {
    const r = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(arquivo, Buffer.from(r.data, "base64"));
    return arquivo;
  };
  page.close = async () => {
    try { ws.close(); } catch {}
    // no Windows o kill() so fecha o processo principal; taskkill /T leva os filhos junto
    if (process.platform === "win32") { try { require("child_process").execFileSync("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { stdio: "ignore" }); } catch {} }
    else proc.kill();
    await new Promise((r) => setTimeout(r, 300));
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}
  };
  return page;
}

module.exports = { available, launch };
