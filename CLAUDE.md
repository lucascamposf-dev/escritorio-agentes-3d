# Escritório — painel visual dos agentes do opencode e do Claude Code

Painel local que mostra, em forma de "escritório" (2D em SVG ou 3D com three.js), o que os agentes
estão fazendo: quem trabalha, qual ferramenta usa, pedidos de permissão, erros, subagentes,
contexto usado e custo.

## Arquitetura

```
opencode (porta 4096)  --SSE /event------>  server.js (porta 4747)  --SSE /events-->  index.html
Claude Code (hooks) --claude-hook.js--POST /claude-->
```

- **server.js** — Node puro, sem dependências npm.
  - opencode: conecta em `http://127.0.0.1:OC_PORT/event`, lê o fluxo com `sseEvents()` e traduz
    cada evento em `handle()`. Reconecta a cada 3 s.
  - Claude Code: recebe os eventos dos hooks em `POST /claude` e traduz em `handleClaude()`.
    O contexto e o modelo vêm do final da transcrição (`ccUsage()`). Pode abrir a janela do
    escritório sozinho (`openOffice()`, desligado com `OPEN_BROWSER=0`).
  - Mantém um estado único `S` e transmite um snapshot a cada mudança (debounce de 120 ms em `push()`).
  - Só liga porta, intervalos e conexão quando roda como `node server.js` (`start()`); quando é
    importado (testes), só exporta as funções.
- **claude-hook.js** — chamado pelo Claude Code em cada evento; repassa o JSON para `/claude` e,
  se o servidor estiver fechado, liga o `server.js` em segundo plano.
- **instalar-claude.js** — adiciona/remove (`--remover`) o hook em `~/.claude/settings.json`
  (faz backup em `settings.json.backup-escritorio`).
- **index.html** — página única, sem build. Três blocos de `<script>`:
  1. alternância 2D/3D (salva em `localStorage['office.v3d']`);
  2. sala 3D (`window.O3`): baixa o `three.min.js` só quando o 3D é ligado; **lê o estado dos
     cartões 2D do DOM** (`data-status`, `data-kind`, `.bt`); os subagentes chegam em `O3.subs`;
  3. cartões 2D, painel (contexto, tempo, arquivos, custo, log), som/notificações, demo e a
     **única** conexão `EventSource('/events')` da página.
- **three.min.js** — three.js r160 vendorizado (build UMD global `THREE`, já depreciada).
- **test/** — testes com `node:test`. `browser.js` controla um Chrome/Edge headless pelo
  protocolo DevTools (sem dependências).

### Modelo de estado (server.js)
- Dois agentes principais fixos: `plan` (Auditor) e `build` (Construtor). `main` indica qual está ativo.
- Status: `idle | working | waiting | error | done`; `kind`: `think | read | edit | bash | search | web | wait`.
- `done` volta a `idle` após 8 s; `error` após 20 s; `working` sem sinal por 120 s vira `idle`.
- Subagentes: sessões com `parentID` (opencode) ou ids `cc:*` (Claude Code). Ficam em
  `childActive` (até 25 s sem sinal) e depois em `childDone` (8 s visíveis).
- Custo e arquivos editados são contados **por projeto** (`projects`, via `proj()`); o painel
  mostra os do projeto atual (`S.project`).
- Toda coleção que cresce com eventos tem limite (`cap()`).

## Comandos

- Rodar: `node server.js` (ou `npm start`) → http://localhost:4747. Node 22+ (testado no v24).
- Testes: `npm test`. O teste de navegador é pulado se não houver Chrome/Edge (`CHROME_PATH`
  aponta outro). O teste do 3D leva ~20 s (o robô anda pela sala).
- Ligar ao Claude Code: `node instalar-claude.js` (remover: `--remover`).
- Variáveis: `PORT` (4747), `OC_PORT` (4096), `OPEN_BROWSER=0`, `ESCRITORIO_LOG=1` (liga o
  `events.log`), `ESCRITORIO_LOG_FILE` (outro caminho para o log). No hook: `ESCRITORIO_PORT`.
- Endpoints de depuração:
  - `/set?agent=plan|build&status=idle|working|waiting|error|done&kind=edit&text=ola`
  - `/sub?id=a1&name=explore&task=buscar&text=procurando&kind=search&status=working|done`
  - `POST /state` com `{"agent":"build","status":"working","text":"..."}`
  - Botão "demo" percorre todos os estados (clicar num personagem só muda a tela no demo ou sem
    servidor); no console, `O3.setSubs([...])` simula subagentes no 3D.

## Padrões de código

- JavaScript simples, sem frameworks nem build. CommonJS no servidor.
- Comentários e textos da interface em português; comentários do código sem acentos.
- Estilo compacto: funções curtas, muitas expressões numa linha, aspas duplas no servidor e
  simples na maior parte do front-end. Indentação de 2 espaços.
- Texto vindo dos agentes vai para a tela sempre por `textContent` / `fillText`, nunca `innerHTML`.
- Toda correção vem com teste em `test/` (um commit por mudança).

## Cuidados importantes

- O servidor escuta só em `127.0.0.1` e `allowed()` recusa (403) requests de outros sites
  (Host diferente de localhost/127.0.0.1, `Origin` de outro endereço, `Sec-Fetch-Site`
  cross-site/same-site). Não volte a pôr `Access-Control-Allow-Origin: *`.
- Nomes de agente vindos de fora passam por `isAgent()` antes de virar chave de `S.agents`
  (risco de `__proto__`).
- Corpos de POST usam `readBody()` (UTF-8 correto, limite de 10 MB).
- Objetos 3D criados dinamicamente precisam ser liberados da GPU ao sair (`freeBot()`).
- O 3D depende de `.agent[data-who]`, `data-status`, `data-kind` e `.bt` dos cartões 2D;
  renomear isso quebra o 3D silenciosamente (o teste de navegador pega).
- `events.log` (quando ligado) contém prompts e comandos — não compartilhar. Está no `.gitignore`.
