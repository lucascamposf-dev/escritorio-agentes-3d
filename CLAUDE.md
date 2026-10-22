# Escritório — painel visual dos agentes do opencode

Painel local que mostra, em forma de "escritório" (2D em SVG ou 3D com three.js), o que os agentes
do opencode estão fazendo: quem trabalha, qual ferramenta usa, pedidos de permissão, erros,
subagentes, contexto usado e custo.

## Arquitetura

```
opencode (porta 4096)  --SSE /event-->  server.js (porta 4747)  --SSE /events-->  index.html
```

- **server.js** — Node puro, sem dependências npm. Conecta em `http://127.0.0.1:OC_PORT/event`,
  traduz os eventos do opencode (`handle()`) para um estado único `S` e transmite um snapshot a
  cada mudança (com debounce de 120 ms em `push()`). Reconecta ao opencode a cada 3 s.
  Também serve `index.html` e `three.min.js`.
- **index.html** — página única, sem build. Três blocos de `<script>`:
  1. alternância 2D/3D (salva em `localStorage['office.v3d']`);
  2. sala 3D (`window.O3`), que **lê o estado dos cartões 2D do DOM** (`data-status`, `data-kind`)
     em vez de receber os dados diretamente; os subagentes 3D vêm de uma segunda conexão SSE;
  3. cartões 2D, painel (contexto, tempo, arquivos, custo, log), som/notificações e demo.
- **three.min.js** — three.js r160 vendorizado (build UMD global `THREE`, já depreciada).
- **events.log** — log de depuração: grava a 1ª ocorrência de cada tipo de evento do opencode
  (até 600 caracteres do payload; pode conter texto dos prompts).
- `*.bak`, `*.passo*` — cópias manuais antigas (o projeto não usa Git ainda).

### Modelo de estado (server.js)
- Dois agentes principais fixos: `plan` (Auditor) e `build` (Construtor). `main` indica qual está ativo.
- Status: `idle | working | waiting | error | done`; `kind`: `think | read | edit | bash | search | web | wait`.
- `done` volta a `idle` após 8 s; `error` após 20 s; `working` sem sinal por 120 s vira `idle`.
- Subagentes: sessões com `parentID`. Ficam em `childActive` (até 25 s sem sinal) e depois em
  `childDone` (8 s visíveis).

## Comandos

- Rodar: `node server.js` → abrir http://localhost:4747 (Node 18+; testado no v24).
- Variáveis: `PORT` (padrão 4747), `OC_PORT` (padrão 4096). O opencode precisa rodar com `--port 4096`.
- Testes manuais (endpoints de depuração):
  - `/set?agent=plan|build&status=idle|working|waiting|error|done&kind=edit&text=ola`
  - `/sub?id=a1&name=explore&task=buscar&text=procurando&kind=search&status=working|done`
  - `POST /state` com `{"agent":"build","status":"working","text":"..."}`
  - Botão "demo" na página percorre todos os estados; no console, `O3.setSubs([...])` simula subagentes.
- Não há testes automatizados, lint, nem `package.json`.

## Padrões de código

- JavaScript simples, sem frameworks nem build. CommonJS no servidor.
- Comentários e textos da interface em português, sem acentos nos comentários do código.
- Estilo compacto: funções curtas, muitas expressões numa linha, aspas duplas no servidor e
  simples na maior parte do front-end.
- Texto vindo do opencode deve ir para a tela sempre por `textContent` / `fillText`, nunca `innerHTML`.

## Cuidados importantes

- O servidor escuta só em `127.0.0.1` — mantenha assim.
- Os nomes de agente vindos de query string/JSON são usados como chave de `S.agents`: valide
  contra `plan`/`build` antes de usar (risco de `__proto__`).
- O 3D depende da classe/atributos dos cartões 2D (`.agent[data-who]`, `.bt`); renomear essas
  classes quebra o 3D silenciosamente.
- `index.html` é servido com `no-store`; `three.min.js` com cache de 1 dia.
- `events.log` pode conter trechos de prompts e caminhos de outros projetos — não compartilhar.
