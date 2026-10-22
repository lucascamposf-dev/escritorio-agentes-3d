# Escritório — painel 3D dos agentes do opencode e do Claude Code

Escritório 3D (three.js) onde os agentes viram personagens: sentam na mesa redonda para trabalhar,
pedem permissão acenando, comemoram ao terminar e, livres, bebem água, tomam café, deitam no sofá
ou jogam basquete. Cada subagente entra pela porta, ganha uma salinha, trabalha, entrega o
resultado e vai embora. HUD por cima com contexto, tempo, custo, arquivos e log.

## Arquitetura

```
opencode (porta 4096)  --SSE /event------>  server.js (porta 4747)  --SSE /events-->  index.html + js/
Claude Code (hooks) --claude-hook.js--POST /claude-->        |
                                                    janela.js (PowerShell/user32: restaura, minimiza, fixa)
```

### Servidor (Node puro, CommonJS, sem dependências)
- **server.js** — estado único `S`, traduz eventos do opencode (`handle()`) e do Claude Code
  (`handleClaude()`), transmite snapshots (debounce de 120 ms em `push()`). Serve `index.html` e
  as pastas `js/`, `css/`, `vendor/` (`serveStatic()`, sem sair delas). Só liga porta/intervalos
  quando roda como `node server.js` (`start()`); os testes importam as funções.
- **janela.js** — um PowerShell em segundo plano acha a janela pelo título ("Escritório") e
  restaura (sem roubar o foco), minimiza e fixa por cima. `wakeWindow()` no server.js chama isso
  quando o agente começa a trabalhar; o botão "ocultar" segura a janela até o próximo pedido.
- **claude-hook.js** / **instalar-claude.js** — hook do Claude Code e o instalador
  (`~/.claude/settings.json`, aponta para `E:/escritorio/claude-hook.js`).

### Página (módulos ES, sem build; `js/package.json` marca a pasta como ESM)
- **index.html** — só a estrutura do HUD e o import map do three.js.
- **js/main.js** — liga conexão, HUD e a cena 3D (carregada à parte: se o WebGL falhar, o HUD fica).
  `window.ESC` expõe estado e cena para testes/Console.
- **js/app/** — `conexao.js` (a única `EventSource('/events')`), `hud.js`, `avisos.js` (sons e
  notificações), `demo.js`, `config.js` (preferências no localStorage: tema, skins, qualidade,
  câmera...), `aparencia.js` (gaveta de temas e skins, miniaturas 3D, editor de personagem).
- **js/office3d/**
  - `engine.js` — renderer, câmera (livre/seguir/cinema), luzes base, reflexos, bloom, qualidade.
  - `layout.js` — **a planta** (mesa redonda e 8 lugares, 8 salinhas, copa, filtro, lounge, quadra,
    porta, telão, lugares de atividades `SPOTS`, decoração `DECO`, obstáculos). Tudo lê daqui.
  - `nav.js` — caminhos (A* em grade de 20 cm, com folga dos móveis).
  - `geo.js` — `Kit`: materiais/geometrias em cache, peças, texturas em canvas, `mesclar()`.
  - `sala.js` + `vista.js` + `temas/*.js` — a sala de um tema (5 temas; para criar outro, copie um
    arquivo de `temas/` e registre em `temas/index.js`).
  - `personagem.js` + `skins.js` — boneco articulado e poses; 13 skins prontas + aleatória com semente.
  - `ator.js` — personagem com fila de tarefas (ir, direto, virar, sentar, levantar, fazer, func).
  - `diretor.js` — estado → comportamento (principais, subagentes, figurantes, aspirador, basquete,
    telas, telão, câmera seguir); `baloes.js` — balões HTML (empilham quando se cruzam).

### Modelo de estado (server.js)
- Agentes principais fixos `plan` (Auditor) e `build` (Construtor); `main` é o ativo.
- Status `idle | working | waiting | error | done`; `kind` `think | read | edit | bash | search | web | wait`.
- `S.session` = sessão principal atual (personagens aleatórios mudam a cada sessão nova).
- Subagentes: `S.subs` (`working`/`done`); custo e arquivos contados por projeto.

## Comandos

- Projeto em **`E:\escritorio`** (o disco C: desta máquina vive lotado). Temporários (downloads,
  perfis do Chrome dos testes) em `E:\temp\escritorio`.
- Rodar: `node server.js` (ou `npm start`) → http://localhost:4747. Node 22+ (testado no v24).
- Testes: `TEMP=E:\temp\escritorio TMP=E:\temp\escritorio npm test` (~2–5 min; o navegador roda
  em qualidade baixa). `ESCRITORIO_PRINTS=<pasta>` salva capturas de tela (em qualidade alta).
  Rodar um só: `node --test --test-name-pattern="vida" test/navegador.test.js`.
- Nos testes de navegador, `ESC.escritorio.engine.escala`/`passoMax` aceleram o tempo.
- Variáveis: `PORT`, `OC_PORT`, `OPEN_BROWSER=0`, `ESCRITORIO_JANELA=0` (sem controle da janela),
  `ESCRITORIO_LOG=1` / `ESCRITORIO_LOG_FILE`, no hook `ESCRITORIO_PORT`.
- Depuração: `/set?agent=…&status=…&kind=…&text=…`, `/sub?id=…&name=…&text=…&kind=…&status=working|done`,
  botão ▶ (demo).

## Padrões de código

- JavaScript simples, sem frameworks nem build. Comentários e textos em português; comentários
  do código sem acentos. Estilo compacto, 2 espaços.
- Texto vindo dos agentes vai para a tela por `textContent` / `fillText`, nunca `innerHTML`.
- Toda mudança vem com teste em `test/` e um commit; só comite com `fail 0` no `npm test`.

## Cuidados importantes

- Segurança: o servidor escuta só em `127.0.0.1`; `allowed()` recusa outros sites (Host, Origin,
  Sec-Fetch-Site). Nunca `Access-Control-Allow-Origin: *`. Nomes de agente passam por `isAgent()`.
  POST usa `readBody()` (limite 10 MB). Estáticos só de `js/`, `css/`, `vendor/`.
- GPU: geometrias de peças/personagens vêm do cache do `Kit` (largura do personagem é escala,
  não medida). Peças mescladas de um personagem são dele: `Personagem.liberar()` ao trocar/remover.
  O teste "5 temas" pega vazamento ao trocar de tema.
- Desempenho: `Kit.malha` só dá sombra a peças > ~25 cm; móveis parados são mesclados
  (`kit.mesclar`) — **não** mescle nada que anime (porta, relógio, salinhas como um todo,
  decorações com `tick`).
- A planta é compartilhada pelos temas: ao mexer em `layout.js`, rode `test/planta.test.js`
  (todo lugar tem que ser alcançável a partir da porta).
- `events.log` (quando ligado) contém prompts e comandos — não compartilhar (`.gitignore`).
