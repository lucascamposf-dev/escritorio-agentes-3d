# Escritório 3D dos Agentes de IA

Painel em **3D** que mostra, em tempo real, o que os agentes de IA estão fazendo enquanto programam: o **Claude Code** e o **opencode**. Cada agente vira um personagem num escritório. Ele senta na mesa para trabalhar, acena quando precisa de permissão e comemora quando termina. Quando está livre, toma café, deita no sofá ou joga basquete.

Cada **subagente** entra pela porta, ganha uma salinha, trabalha, entrega o resultado e vai embora. Um HUD por cima mostra o contexto usado, o tempo, o custo, os arquivos alterados e o log.

> Para ver sem um agente real, rode o projeto e clique em **Demo**: ele percorre todos os estados e anima vários subagentes.

## Arquitetura

```
opencode (porta 4096) ──SSE /event──►  server.js (porta 4747) ──SSE /events──►  navegador (three.js)
Claude Code (hooks) ──claude-hook.js──POST /claude──►  │
                                                 janela.js: restaura, minimiza e fixa a janela
celular ──Tailscale + token──► painel remoto;  avisos ──► ntfy
```

- **Servidor em Node.js puro, sem dependências:** traduz os eventos do opencode e os hooks do Claude Code para um único estado e transmite esse estado ao navegador por **Server-Sent Events**, com debounce de 120 ms.
- **Cena 3D com three.js**, em módulos ES: personagens, navegação pela sala, balões de fala e 5 temas (moderno, loft, aconchegante, cyberpunk e espacial).
- **Pedidos de permissão:** quando o Claude Code pede permissão, o personagem acena. Você pode responder pelo próprio painel, inclusive pelo celular.
- **Janela inteligente:** a janela volta sozinha quando um agente começa a trabalhar, e tem as opções "ocultar" e "sempre por cima" (PowerShell + user32).
- **Acesso pelo celular com segurança:** um segundo servidor escuta **apenas no IP do Tailscale**. O login é por token, gravado em cookie HttpOnly e comparado em tempo constante, e os avisos chegam pelo ntfy.
- **Interface responsiva:** em tela estreita, os botões viram menu lateral e o HUD vai para uma gaveta.

## Testes

São 51 testes automatizados com o test runner nativo do Node. Eles cobrem eventos, SSE, rotas HTTP, acesso remoto, controle da janela, planta do escritório e navegação.

```bash
npm test
```

## Como rodar

Requer Node.js 18 ou mais novo.

```bash
npm start                  # abre o painel em http://localhost:4747
node instalar-claude.js    # liga os hooks do Claude Code ao painel (opcional)
node remoto.js             # gera token e link para usar pelo celular (opcional)
```

O `remoto.json`, que guarda o token e o tópico do ntfy, e os logs ficam fora do Git.
