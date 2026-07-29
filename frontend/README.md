# Nova Core

# Projeto Frontend – Assistente de IA Futurista

Quero criar um frontend extremamente profissional para um assistente pessoal inspirado na experiência futurista de filmes de ficção científica, mas com identidade própria. Não copie interfaces existentes. Crie um design original, elegante e moderno, no nível de um produto comercial premium.

## Tecnologias

- React + TypeScript + Vite

- Tailwind CSS + shadcn/ui

- Framer Motion

- Lucide Icons

- Zustand (estado global)

- react-router-dom

Todo o código deve ser organizado, tipado, reutilizável e preparado para integração futura com backend em Python (FastAPI), Supabase e WebSocket — sem exigir refatoração da interface quando isso acontecer.

---

## Tema

- Fundo preto profundo (#050505), azul neon, ciano, branco, detalhes em roxo.

- Estética HUD (Heads-Up Display), premium, limpa, pouco texto, animações suaves.

- Tipografia futurista (ex: "Space Grotesk" ou "Sora") para títulos, fonte legível neutra para corpo de texto.

- Cores, espaçamentos e raios de borda definidos como design tokens (CSS variables + tailwind.config), nunca hardcoded nos componentes — isso permite trocar tema/skin no futuro sem reescrever telas.

- Efeitos: glow, glassmorphism, blur, linhas luminosas, partículas, gradientes, anéis giratórios, micro animações, hover elegante, transições suaves. Usar blur pesado com moderação (poucas camadas simultâneas) para preservar performance, e respeitar `prefers-reduced-motion`.

---

## Estado global do assistente

Criar uma store (Zustand) central com o estado do assistente, consumida por Orb, botão de microfone e chat:

- `idle` | `listening` | `processing` | `speaking`

- Orb e demais componentes reagem visualmente a esse estado (cor/intensidade/animação), não guardam estado próprio duplicado.

---

## Tela Inicial (Splash)

Animação de inicialização ao abrir o app (ex: "Inicializando sistemas...", "Verificando módulos...", "Conectando memória...", "Interface carregada."), depois transição para a Dashboard. Textos como constantes mockadas, fáceis de trocar depois.

## Tela de Boas-vindas

Saudação dinâmica baseada em hora do dia (mock agora, lógica real depois), ex: "Boa noite. Bem-vindo de volta. Todos os sistemas operando normalmente."

---

## Dashboard Principal

Tela cheia. No centro, componente `AIOrb`:

- Construído em SVG + Framer Motion.

- Estados visuais distintos para idle / listening / processing / speaking (cor, pulso, anéis, partículas, brilho).

- Anéis giratórios, leve reação de amplitude (mock) durante "speaking".

### Painel esquerdo — Histórico de Conversas

Lista de conversas, campo de pesquisa, botão "Nova Conversa". Incluir estado vazio (nenhuma conversa ainda) e skeleton de carregamento.

### Painel direito — Status do Sistema

Componentes `StatusCard` para CPU, RAM, GPU, Temperatura, Disco, Rede — com dados mockados hoje, mas tipados (`SystemStats`) para receber dados reais depois via WebSocket.

### Barra Superior

Relógio digital, data, clima (mock), ícone de usuário, notificações (com sistema de toast), configurações.

### Área de Chat

Campo de mensagem moderno, botão enviar, botão microfone (`VoiceButton`), botão anexar arquivo. Mensagens do usuário e da IA com animação de entrada. Incluir indicador "IA está digitando/pensando" e, quando a IA "fala", legendas ao vivo (captions) sincronizadas — reforça imersão e acessibilidade. Chips de sugestão de comando abaixo do input.

### Command Palette

Atalho Cmd/Ctrl+K abrindo busca rápida de comandos/telas — reforça a sensação de software premium.

---

## Tela Memória

Lembranças, preferências, conhecimentos, histórico — dados mockados, com estados de vazio.

## Tela Plugins

Loja de plugins com cards (Calendário, Spotify, WhatsApp, E-mail, Sistema, Home Assistant, Arduino) — apenas demonstração visual por enquanto.

## Tela Sistema

Dashboard técnica com gráficos fictícios (CPU, RAM, GPU, Rede, Processos, Temperatura), visual de centro de monitoramento.

## Tela Configurações

Tema, idioma, voz, microfone, modelo de IA, inicialização automática, atalhos.

## Tela Login/Auth (mock)

Tela simples de login/cadastro, mesmo sem lógica real — evita reestruturar rotas quando o Supabase Auth entrar depois.

## Tela Offline/Reconectando

Estado visual para quando a "conexão" (WebSocket futuro) cair — importante para parecer robusto desde já.

## Telas auxiliares

404 e "Sobre/versão".

---

## Componentização

`AIOrb`, `Sidebar`, `Topbar`, `ChatPanel`, `MemoryCard`, `PluginCard`, `SystemCard`, `VoiceButton`, `StatusCard`, `NotificationCard`, `CommandPalette`, `EmptyState`, `LoadingSkeleton`, `Toast`.

---

## Organização do projeto (feature-based) src/
features/
chat/ (componentes, hooks, tipos do chat)
memory/
plugins/
system/
voice/
components/ (componentes globais/genéricos: Sidebar, Topbar, Orb, UI base)
store/ (Zustand slices: chat, system, voice, ui)
services/ (interfaces + implementações mock: chatService, memoryService, pluginService, systemService, authService, voiceService)
hooks/ (useRealtimeConnection, useVoiceRecognition, useTextToSpeech)
mock/ (dados fictícios centralizados, com delay simulado)
types/
config/ (constantes, .env wrapper)
utils/
assets/ ---

## Camada de dados e integração futura (regra arquitetural principal)

Nenhum componente acessa dados diretamente — tudo passa por `services/`, que hoje retornam dados mockados (com delay artificial simulando rede) atrás de uma interface fixa. Quando o backend em FastAPI/Supabase estiver pronto, só a implementação interna do serviço muda — a UI não é tocada.

- Criar `.env.example` com placeholders: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WS_URL`.

- Definir tipos TypeScript já espelhando o schema esperado no banco: `Message`, `Conversation`, `Memory`, `Plugin`, `SystemStats`, `User`.

- `useRealtimeConnection`: hoje simula eventos via `setInterval`, no futuro conecta em WebSocket real, mesma interface pública.

- `useVoiceRecognition` / `useTextToSpeech`: hoje usam Web Speech API do navegador como stub funcional, preparados para trocar por streaming via FastAPI depois.

Não conectar nenhuma API real, Supabase ou backend agora — apenas simular. Mas toda a arquitetura deve deixar essa troca trivial.

---

## Responsividade

Desktop como prioridade absoluta (app pensado para Windows), compatível com tablet. Modo escuro obrigatório (único tema por enquanto).

---

## Objetivo

Frontend com aparência de produto comercial de alto nível, pronto para evoluir por anos sem precisar ser refeito — qualidade visual de software premium, animações elegantes, código organizado e desacoplado de qualquer fonte de dados específica.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d4d94f3-cec8-4d2d-b3f6-237cb2854412).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
