// Servidor local do escritorio.
// - Conecta no servidor do opencode (opencode --port 4096) e le o fluxo /event.
// - Mantem um estado completo (quem trabalha, o que faz, permissao, erro, contexto...).
// - Envia esse estado para a pagina (index.html) via SSE em /events.
// - Recebe os eventos do Claude Code (hooks) em POST /claude.
// Uso: node server.js   (abre em http://localhost:4747)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4747;
const OC_PORT = process.env.OC_PORT || 4096;
const LOG = path.join(__dirname, "events.log");

const mk = () => ({ status: "idle", text: "", kind: "think", since: 0, until: 0 });
const S = {
  oc: false,
  cc: false, // Claude Code ativo
  project: "",
  model: "",
  ctxTokens: 0,
  cost: 0,
  files: 0,
  subagents: 0,
  subs: [], // lista de subagentes: { id, name, task, text, kind, status: working|done, parent }
  log: [],
  agents: { plan: mk(), build: mk() },
};
let main = "build";
let lastSignal = 0;
const clients = new Set();
const sessions = new Map(); // sessionID -> { parentID }
const costs = new Map(); // messageID -> cost
const edited = new Set(); // arquivos editados
const childActive = new Map(); // sessionID de subagente -> ultimo sinal
const childInfo = new Map(); // sessionID de subagente -> { name, task, text, kind }
const childDone = new Map(); // sessionID de subagente -> quando terminou (fica visivel por alguns segundos)
const loggedParts = new Set();
const sampled = new Set();

// ---------- utilitarios ----------
const cut = (s, n) => { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const base = (p) => String(p || "").split(/[\\/]/).filter(Boolean).pop() || "";
const other = (w) => (w === "plan" ? "build" : "plan");
const pick = (name) => {
  const n = String(name || "").toLowerCase();
  if (n.includes("plan")) return "plan";
  if (n.includes("build")) return "build";
  return null; // subagentes (explore, general...) nao trocam o agente principal
};
const isChild = (sid) => !!(sid && sessions.get(sid) && sessions.get(sid).parentID);
const note = (line) => { try { fs.appendFileSync(LOG, line + "\n"); } catch {} };

// ---------- subagentes ----------
function touchChild(sid) {
  childActive.set(sid, Date.now());
  childDone.delete(sid);
}
function endChild(sid, force) {
  if (!childActive.has(sid) && !force) return;
  childActive.delete(sid);
  childDone.set(sid, Date.now());
}
function subView(id, status) {
  const i = childInfo.get(id) || {};
  return { id, name: i.name || "subagente", task: i.task || "", text: i.text || "", kind: i.kind || "think", status, parent: main };
}

// ---------- estado e envio ----------
let pending = null;
function snapshot() {
  const now = Date.now();
  for (const [k, t] of childActive) if (now - t > 25000) endChild(k);
  for (const [k, t] of childDone) if (now - t > 8000) childDone.delete(k);
  if (childInfo.size > 60) {
    for (const k of childInfo.keys()) {
      if (!childActive.has(k) && !childDone.has(k)) childInfo.delete(k);
      if (childInfo.size <= 40) break;
    }
  }
  S.subagents = childActive.size;
  S.subs = [
    ...[...childActive.keys()].map((id) => subView(id, "working")),
    ...[...childDone.keys()].map((id) => subView(id, "done")),
  ];
  S.files = edited.size;
  S.cost = [...costs.values()].reduce((a, b) => a + b, 0);
  S.now = now;
  return S;
}
function push() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    const msg = `data: ${JSON.stringify(snapshot())}\n\n`;
    for (const r of clients) r.write(msg);
  }, 120);
}
function addLog(text) {
  const last = S.log[S.log.length - 1];
  if (last && last.text === text) return;
  S.log.push({ t: Date.now(), agent: main, text });
  if (S.log.length > 8) S.log.shift();
}
function setA(who, status, text, kind) {
  const a = S.agents[who];
  if (!a) return false;
  if (status === "working" && (a.status === "idle" || a.status === "done" || a.status === "error")) a.since = Date.now();
  if (status === "waiting" && !a.since) a.since = Date.now();
  a.status = status;
  if (text !== undefined) a.text = text;
  if (kind !== undefined) a.kind = kind;
  if (status === "working" || status === "waiting") lastSignal = Date.now();
  if (status === "done") a.until = Date.now() + 8000;
  if (status === "error") a.until = Date.now() + 20000;
  if (status === "idle") a.since = 0;
  push();
  return true;
}
function work(text, kind) {
  const o = other(main);
  if (S.agents[o].status === "working" || S.agents[o].status === "waiting") setA(o, "idle");
  if (S.agents[main].status === "waiting") return; // espera a resposta da permissao
  setA(main, "working", text, kind);
}
function finish() {
  for (const k of [...childActive.keys()]) endChild(k);
  for (const w of ["plan", "build"]) {
    const a = S.agents[w];
    if (a.status === "working") setA(w, "done", "pronto!", "think");
    else if (a.status === "waiting") setA(w, "idle");
  }
  addLog("terminou");
  push();
}
function idleAll() {
  for (const w of ["plan", "build"]) if (S.agents[w].status !== "idle") setA(w, "idle");
}

// ---------- traducao dos eventos do opencode ----------
function describe(part) {
  const tool = String(part.tool || "").toLowerCase();
  const input = (part.state && part.state.input) || {};
  const file = base(input.filePath || input.path || input.file || input.filename || "");
  switch (tool) {
    case "read": return ["lendo " + (file || "arquivo"), "read"];
    case "edit": case "write": case "patch": case "multiedit": case "apply_patch":
      return ["editando " + (file || "arquivo"), "edit"];
    case "bash": return ["rodando " + cut(input.command || input.description || "comando", 40), "bash"];
    case "grep": return ["procurando " + cut(input.pattern || "", 32), "search"];
    case "glob": return ["procurando arquivos " + cut(input.pattern || "", 28), "search"];
    case "list": case "ls": return ["listando " + (file || "pasta"), "search"];
    case "webfetch": case "websearch": case "codesearch": return ["pesquisando na web", "web"];
    case "task": return ["chamando subagente" + (input.description ? ": " + cut(input.description, 30) : ""), "think"];
    case "todowrite": case "todoread": return ["organizando tarefas", "think"];
    default: return [cut(part.tool || "trabalhando", 30), "think"];
  }
}
const isEditTool = (t) => ["edit", "write", "patch", "multiedit", "apply_patch"].includes(String(t || "").toLowerCase());

function sample(t, p) {
  let key = t;
  if (t === "message.part.updated" && p.part) key += ":" + p.part.type + ":" + (p.part.tool || "");
  if (t === "message.updated" && p.info) key += ":" + p.info.role + ":" + (p.info.agent || p.info.mode || "");
  if (sampled.has(key)) return;
  sampled.add(key);
  note(key + " " + JSON.stringify(p).slice(0, 600));
}

function handle(ev) {
  const t = ev && ev.type;
  const p = (ev && ev.properties) || {};
  if (!t) return;
  sample(t, p);

  switch (t) {
    case "session.created":
    case "session.updated": {
      const i = p.info || {};
      if (i.id) {
        sessions.set(i.id, { parentID: i.parentID });
        if (i.parentID) {
          const old = childInfo.get(i.id) || {};
          const m = /\(@([\w-]+)\s+subagent\)/i.exec(i.title || "");
          childInfo.set(i.id, {
            name: (m && m[1]) || old.name || "subagente",
            task: cut((i.title || "").replace(/\s*\(@[\w-]+\s+subagent\)\s*$/i, ""), 60) || old.task || "",
            text: old.text || "",
            kind: old.kind || "think",
          });
        }
        if (!i.parentID && i.directory) { const d = base(i.directory); if (d && d !== S.project) { S.project = d; push(); } }
      }
      break;
    }

    case "message.updated": {
      const i = p.info;
      if (!i) break;
      if (isChild(i.sessionID)) { touchChild(i.sessionID); lastSignal = Date.now(); push(); break; }
      const a = pick(i.agent || i.mode);
      if (a) main = a;
      if (i.role === "assistant") {
        if (i.modelID) S.model = i.modelID;
        if (typeof i.cost === "number" && i.id) costs.set(i.id, i.cost);
        const tk = i.tokens;
        if (tk) {
          const sum = (tk.input || 0) + (tk.output || 0) + (tk.reasoning || 0) + ((tk.cache && tk.cache.read) || 0) + ((tk.cache && tk.cache.write) || 0);
          if (sum > 0) S.ctxTokens = sum;
        }
        if (S.agents[main].status !== "working") work("pensando…", "think");
        else { lastSignal = Date.now(); push(); }
      }
      break;
    }

    case "message.part.updated": {
      const part = p.part;
      if (!part) break;
      const child = isChild(part.sessionID);
      if (child) touchChild(part.sessionID);
      let text, kind;
      if (part.type === "tool") {
        [text, kind] = describe(part);
        const st = part.state && part.state.status;
        if (st === "completed" && isEditTool(part.tool)) {
          const f = (part.state.input && (part.state.input.filePath || part.state.input.path)) || "";
          if (f) edited.add(f);
        }
        const id = part.id || part.callID;
        if (id && !loggedParts.has(id)) { loggedParts.add(id); addLog((child ? "↳ " : "") + text); }
      } else if (part.type === "reasoning") { text = "pensando…"; kind = "think"; }
      else if (part.type === "text") { text = "escrevendo a resposta…"; kind = "edit"; }
      else break;
      if (child) {
        const ci = childInfo.get(part.sessionID) || { name: "subagente", task: "" };
        childInfo.set(part.sessionID, { ...ci, text, kind });
        text = "↳ " + text;
      }
      work(text, kind);
      break;
    }

    case "permission.asked":
    case "permission.updated": {
      const what = p.permission || p.type || "acao";
      const pat = (Array.isArray(p.patterns) ? p.patterns[0] : p.pattern) || p.title || "";
      const txt = "pedindo permissão: " + what + (pat ? " " + cut(pat, 36) : "");
      const o = other(main);
      if (S.agents[o].status === "working") setA(o, "idle");
      setA(main, "waiting", txt, "wait");
      addLog(txt);
      break;
    }
    case "permission.replied": {
      if (S.agents[main].status === "waiting") setA(main, "working", "continuando…", "think");
      break;
    }

    case "session.error": {
      if (p.sessionID && isChild(p.sessionID)) break;
      const e = p.error || {};
      const name = e.name || "";
      if (/abort/i.test(name)) { idleAll(); break; }
      const msg = cut((e.data && e.data.message) || e.message || name || "erro", 90);
      const o = other(main);
      if (S.agents[o].status !== "idle") setA(o, "idle");
      setA(main, "error", msg, "think");
      addLog("erro: " + msg);
      break;
    }

    case "session.status": {
      const sid = p.sessionID;
      const st = p.status || {};
      if (sid && isChild(sid)) { if (st.type === "idle") { endChild(sid); push(); } break; }
      if (st.type === "retry") work("⚠ tentando de novo (" + (st.attempt || "?") + "): " + cut(st.message || "", 60), "think");
      else if (st.type === "busy") { if (S.agents[main].status !== "working") work("trabalhando…", "think"); }
      else if (st.type === "idle") finish();
      break;
    }

    case "session.idle": {
      const sid = p.sessionID;
      if (sid && isChild(sid)) { endChild(sid); push(); break; }
      finish();
      break;
    }
  }
}

// ---------- Claude Code (eventos enviados pelos hooks em POST /claude) ----------
const { exec } = require("child_process");
const ccSessions = new Map(); // session_id -> ultimo sinal
const ccSubs = new Map(); // agent_id do subagente -> id usado na tela
let lastOpen = 0;

function openOffice() {
  if (process.env.OPEN_BROWSER === "0") return;
  if (clients.size > 0 || Date.now() - lastOpen < 60000) return; // ja esta aberto
  lastOpen = Date.now();
  const url = `http://localhost:${PORT}`;
  if (process.platform === "win32") {
    // abre como janela de aplicativo (igual a do opencode); se nao tiver Edge, usa o navegador padrao
    exec(`start "" msedge --app=${url} --window-size=900,620`, (err) => { if (err) exec(`start "" ${url}`); });
  } else if (process.platform === "darwin") exec(`open ${url}`);
  else exec(`xdg-open ${url}`);
}

function ccRefresh() {
  const now = Date.now();
  for (const [k, t] of ccSessions) if (now - t > 30 * 60000) ccSessions.delete(k);
  const on = ccSessions.size > 0;
  if (S.cc !== on) { S.cc = on; push(); }
}

// le o final da transcricao para mostrar modelo e tamanho do contexto
function ccUsage(file) {
  try {
    if (!file || !fs.existsSync(file)) return;
    const size = fs.statSync(file).size;
    const len = Math.min(size, 256 * 1024);
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    const lines = buf.toString("utf8").split("\n").reverse();
    for (const l of lines) {
      if (!l.includes('"usage"')) continue;
      try {
        const m = JSON.parse(l).message;
        if (!m || !m.usage) continue;
        const u = m.usage;
        const sum = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        if (sum > 0) S.ctxTokens = sum;
        if (m.model) S.model = m.model;
        return;
      } catch {}
    }
  } catch {}
}

function ccDescribe(name, input) {
  input = input || {};
  const file = base(input.file_path || input.notebook_path || input.path || "");
  switch (name) {
    case "Read": return ["lendo " + (file || "arquivo"), "read"];
    case "Edit": case "MultiEdit": case "Write": case "NotebookEdit": return ["editando " + (file || "arquivo"), "edit"];
    case "Bash": case "PowerShell": case "BashOutput": return ["rodando " + cut(input.command || input.description || "comando", 40), "bash"];
    case "Grep": return ["procurando " + cut(input.pattern || "", 32), "search"];
    case "Glob": return ["procurando arquivos " + cut(input.pattern || "", 28), "search"];
    case "LS": return ["listando " + (file || "pasta"), "search"];
    case "WebFetch": case "WebSearch": return ["pesquisando na web", "web"];
    case "Task": case "Agent": return ["chamando subagente" + (input.description ? ": " + cut(input.description, 30) : ""), "think"];
    case "TodoWrite": case "TaskCreate": case "TaskUpdate": return ["organizando tarefas", "think"];
    default:
      if (String(name).startsWith("mcp__")) return ["usando " + cut(String(name).split("__").slice(1).join(" "), 30), "web"];
      return [cut(name || "trabalhando", 30), "think"];
  }
}

// descobre a qual subagente da tela pertence um evento vindo de dentro de um subagente
function ccChild(p) {
  if (!p.agent_id) return null;
  if (ccSubs.has(p.agent_id)) return ccSubs.get(p.agent_id);
  const used = new Set(ccSubs.values());
  const free = [...childActive.keys()].reverse().find((k) => k.startsWith("cc:") && !used.has(k));
  const id = free || "cc:" + p.agent_id;
  ccSubs.set(p.agent_id, id);
  if (!childInfo.has(id)) childInfo.set(id, { name: p.agent_type || "subagente", task: "", text: "", kind: "think" });
  return id;
}

function handleClaude(p) {
  const ev = p.hook_event_name;
  if (!ev) return;
  note("claude:" + ev + " " + JSON.stringify(p).slice(0, 400));
  if (p.session_id) ccSessions.set(p.session_id, Date.now());
  if (p.cwd) { const d = base(p.cwd); if (d && d !== S.project) S.project = d; }
  ccRefresh();

  switch (ev) {
    case "SessionStart":
      openOffice();
      ccUsage(p.transcript_path);
      push();
      break;

    case "UserPromptSubmit":
      openOffice();
      main = p.permission_mode === "plan" ? "plan" : "build";
      if (S.agents[main].status === "waiting") S.agents[main].status = "working";
      work("pensando…", "think");
      addLog("novo pedido");
      break;

    case "PreToolUse": {
      const [text, kind] = ccDescribe(p.tool_name, p.tool_input);
      if (p.tool_name === "ExitPlanMode") main = "plan";
      if (p.tool_name === "Task" || p.tool_name === "Agent") {
        const id = "cc:" + (p.tool_use_id || Date.now());
        const i = p.tool_input || {};
        childInfo.set(id, { name: i.subagent_type || "subagente", task: cut(i.description || i.prompt || "", 60), text: "começando…", kind: "think" });
        touchChild(id);
        addLog(text);
        work(text, kind);
        break;
      }
      const child = ccChild(p);
      if (child) {
        const ci = childInfo.get(child) || {};
        childInfo.set(child, { ...ci, text, kind });
        touchChild(child);
        addLog("↳ " + text);
        work("↳ " + text, kind);
        break;
      }
      addLog(text);
      if (S.agents[main].status === "waiting") S.agents[main].status = "working";
      work(text, kind);
      break;
    }

    case "PostToolUse":
    case "PostToolUseFailure": {
      const i = p.tool_input || {};
      if (["Edit", "MultiEdit", "Write", "NotebookEdit"].includes(p.tool_name) && (i.file_path || i.notebook_path)) edited.add(i.file_path || i.notebook_path);
      if (p.tool_name === "Task" || p.tool_name === "Agent") {
        const id = "cc:" + p.tool_use_id;
        endChild(id, true);
        for (const [k, v] of ccSubs) if (v === id) ccSubs.delete(k);
      }
      if (S.agents[main].status === "waiting") S.agents[main].status = "working";
      ccUsage(p.transcript_path);
      lastSignal = Date.now();
      push();
      break;
    }

    case "PermissionRequest":
    case "Notification": {
      const type = p.notification_type || "";
      if (ev === "Notification" && type && type !== "permission_prompt") break; // "idle_prompt" etc. nao muda nada
      if (ev === "Notification" && !type && !/permiss|permission|approve/i.test(p.message || "")) break;
      const txt = ev === "PermissionRequest"
        ? "pedindo permissão: " + cut(ccDescribe(p.tool_name, p.tool_input)[0], 40)
        : cut(p.message || "pedindo permissão", 60);
      const o = other(main);
      if (S.agents[o].status === "working") setA(o, "idle");
      setA(main, "waiting", txt, "wait");
      addLog(txt);
      break;
    }

    case "SubagentStop": {
      const id = p.agent_id && ccSubs.get(p.agent_id);
      if (id) { endChild(id, true); ccSubs.delete(p.agent_id); }
      push();
      break;
    }

    case "PreCompact":
      work("organizando a memória…", "think");
      break;

    case "StopFailure": {
      const msg = cut(p.error || p.message || "erro na API", 90);
      setA(main, "error", msg, "think");
      addLog("erro: " + msg);
      break;
    }

    case "Stop":
      ccUsage(p.transcript_path);
      ccSubs.clear();
      finish();
      break;

    case "SessionEnd":
      ccSessions.delete(p.session_id);
      ccRefresh();
      if (!ccSessions.size && !S.oc) idleAll();
      break;
  }
}

// ---------- conexao com o servidor do opencode ----------
function connectOpencode() {
  let finished = false;
  const retry = () => {
    if (finished) return;
    finished = true;
    if (S.oc) { S.oc = false; idleAll(); push(); }
    setTimeout(connectOpencode, 3000);
  };
  const req = http.get(
    { host: "127.0.0.1", port: OC_PORT, path: "/event", headers: { Accept: "text/event-stream" } },
    (res) => {
      if (res.statusCode !== 200) { res.resume(); return retry(); }
      S.oc = true;
      push();
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        buf += chunk.replace(/\r/g, "");
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const line = block.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try { handle(JSON.parse(line.slice(5).trim())); } catch {}
        }
      });
      res.on("end", retry);
      res.on("error", retry);
    }
  );
  req.on("error", retry);
}

// ---------- relogio: expira "pronto"/"erro" e cobre eventos de fim perdidos ----------
function tick() {
  const now = Date.now();
  for (const w of ["plan", "build"]) {
    const a = S.agents[w];
    if ((a.status === "done" || a.status === "error") && now > a.until) setA(w, "idle");
    if (a.status === "working" && now - lastSignal > 120000) setA(w, "idle");
  }
  if (childActive.size || childDone.size) push();
}

// ---------- HTTP ----------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  if (url.pathname === "/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  // teste manual: /set?agent=plan&status=working|waiting|error|done|idle&kind=edit&text=ola
  if (url.pathname === "/set") {
    const q = url.searchParams;
    const who = q.get("agent");
    const status = q.get("status") || "working";
    const ok = ["idle", "working", "waiting", "error", "done"].includes(status) &&
      setA(who, status, q.get("text") || (status === "working" ? "teste manual" : ""), q.get("kind") || "think");
    if (ok && status !== "idle") main = who;
    res.writeHead(ok ? 200 : 400);
    return res.end(ok ? "ok" : "use agent=plan|build e status=idle|working|waiting|error|done");
  }

  // teste manual de subagente: /sub?id=a1&name=explore&task=buscar&text=procurando&kind=search&status=working|done
  if (url.pathname === "/sub") {
    const q = url.searchParams;
    const id = q.get("id") || "teste";
    if ((q.get("status") || "working") === "done") {
      endChild(id, true);
    } else {
      const old = childInfo.get(id) || {};
      childInfo.set(id, {
        name: q.get("name") || old.name || "explore",
        task: q.get("task") || old.task || "",
        text: q.get("text") || old.text || "",
        kind: q.get("kind") || old.kind || "think",
      });
      touchChild(id);
    }
    push();
    res.writeHead(200);
    return res.end("ok");
  }

  // eventos dos hooks do Claude Code
  if (url.pathname === "/claude" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { handleClaude(JSON.parse(body || "{}")); res.writeHead(200); }
      catch { res.writeHead(400); }
      res.end();
    });
    return;
  }

  if (url.pathname === "/state" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}");
        res.writeHead(setA(j.agent, j.status === "working" ? "working" : "idle", j.text, j.kind) ? 200 : 400);
      } catch { res.writeHead(400); }
      res.end();
    });
    return;
  }

    if (url.pathname === "/three.min.js") {
    const f = path.join(__dirname, "three.min.js");
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "max-age=86400" });
    return fs.createReadStream(f).pipe(res);
  }

  if (url.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  }

  res.writeHead(404);
  res.end();
});

function start() {
  connectOpencode();
  setInterval(tick, 1000);
  setInterval(() => { for (const r of clients) r.write(": ping\n\n"); }, 20000);
  setInterval(ccRefresh, 60000);
  // 127.0.0.1: so aceita conexoes da propria maquina
  server.listen(PORT, "127.0.0.1", () =>
    console.log(`Escritorio em http://localhost:${PORT} (ouvindo opencode na porta ${OC_PORT} e Claude Code em /claude)`));
}

// "node server.js" liga tudo; os testes so importam as funcoes
if (require.main === module) start();
module.exports = { S, server, handle, handleClaude, snapshot, setA };