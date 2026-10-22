// Controle da janela do escritorio no Windows: restaurar, minimizar e "sempre por cima".
// Um unico PowerShell fica aberto em segundo plano com as funcoes do user32 ja compiladas
// e recebe um comando por linha (restore | minimize | pin | unpin), respondendo ok | none.
// Em outros sistemas, ou com ESCRITORIO_JANELA=0, tudo vira no-op (responde "none").
const { spawn } = require("child_process");

const TITLE = "Escritório"; // o <title> da pagina: e assim que a janela e encontrada

const PS = String.raw`
$src = @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class EscWin {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f);
  public static IntPtr Find(string title) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var t = new StringBuilder(256); GetWindowText(h, t, 256);
      if (t.ToString() != title) return true;
      var c = new StringBuilder(64); GetClassName(h, c, 64);
      if (!c.ToString().StartsWith("Chrome_WidgetWin")) return true; // janela do Edge/Chrome
      found = h; return false;
    }, IntPtr.Zero);
    return found;
  }
}
"@
Add-Type -TypeDefinition $src
$title = $env:ESCRITORIO_TITLE
[Console]::Out.WriteLine("ready")
while ($true) {
  $cmd = [Console]::In.ReadLine()
  if ($cmd -eq $null) { break }
  $h = [EscWin]::Find($title)
  if ($h -eq [IntPtr]::Zero) { [Console]::Out.WriteLine("none"); continue }
  switch ($cmd) {
    "restore"  { if ([EscWin]::IsIconic($h)) { [void][EscWin]::ShowWindow($h, 4) } }   # SW_SHOWNOACTIVATE: volta sem roubar o foco
    "minimize" { [void][EscWin]::ShowWindow($h, 6) }                                     # SW_MINIMIZE
    "pin"      { [void][EscWin]::SetWindowPos($h, [IntPtr](-1), 0, 0, 0, 0, 0x13) }      # HWND_TOPMOST, sem mover/redimensionar/ativar
    "unpin"    { [void][EscWin]::SetWindowPos($h, [IntPtr](-2), 0, 0, 0, 0, 0x13) }      # HWND_NOTOPMOST
  }
  [Console]::Out.WriteLine("ok")
}
`;

let proc = null, buf = "", waiting = [];

function start() {
  const encoded = Buffer.from(PS, "utf16le").toString("base64");
  proc = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded], {
    env: { ...process.env, ESCRITORIO_TITLE: TITLE }, windowsHide: true, stdio: ["pipe", "pipe", "ignore"],
  });
  let ready = false;
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!ready) { if (line === "ready") ready = true; continue; }
      const w = waiting.shift();
      if (w) w(line);
    }
  });
  const dead = () => { proc = null; buf = ""; for (const w of waiting.splice(0)) w("none"); };
  // o PowerShell em segundo plano nao pode segurar o Node aberto
  proc.unref(); proc.stdin.unref(); proc.stdout.unref();
  proc.on("exit", dead);
  proc.on("error", dead);
}

// manda um comando e devolve a resposta ("ok" | "none")
function powershell(cmd) {
  if (process.platform !== "win32" || process.env.ESCRITORIO_JANELA === "0") return Promise.resolve("none");
  if (!proc) start();
  return new Promise((ok) => {
    // sem resposta: reinicia o PowerShell para as respostas nao sairem fora de ordem
    const t = setTimeout(() => { stop(); ok("none"); }, 8000);
    const done = (r) => { clearTimeout(t); ok(r); };
    waiting.push(done);
    proc.stdin.write(cmd + "\n");
  });
}

let runner = powershell;
const send = (cmd) => runner(cmd);
const setRunner = (fn) => { runner = fn || powershell; }; // para os testes
const stop = () => { if (proc) { try { proc.stdin.end(); proc.kill(); } catch {} proc = null; } };
process.on("exit", stop);

module.exports = { TITLE, send, setRunner, stop };
