# Arquitetura do Sistema

Este documento descreve a arquitetura técnica do Aprenda C.

## Visão Geral

O sistema segue uma arquitetura **monorepo** com separação clara entre frontend e backend:

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente                              │
│                    (Navegador Web)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │     Backend     │
│   (Astro SSG)   │     │    (Elysia)     │
│   :4321         │     │    :3000        │
└────────┬────────┘     └────────┬────────┘
         │                       │
          │                       ▼
          │              ┌─────────────────┐
          │              │  Native Runner  │
          │              │ (GCC + Sandbox) │
          │              └─────────────────┘
          │
          ▼
┌─────────────────┐
│  Content Layer  │
│   (MDX Files)   │
└─────────────────┘
```

## Componentes

### Frontend (Astro)

**Responsabilidades:**

- Renderização estática do conteúdo do curso
- Interface do Playground com Monaco Editor
- Navegação e roteamento

**Tecnologias:**

- Astro 5.x com SSG (Static Site Generation)
- MDX para conteúdo rico
- TypeScript para tipagem
- CSS puro (sem frameworks)

**Estrutura de Diretórios:**

```
frontend/src/
├── content/
│   ├── course/           # Conteúdo MDX organizado por módulos
│   └── config.ts         # Schema de collections
├── pages/
│   └── ...               # Rotas
├── components/
│   └── PodcastOverlay.astro # Player interativo (Refatorado)
├── lib/
│   ├── gameStore.ts      # Gamificação (Singleton)
│   └── podcast/          # Lógica de Audio (Controller)
```

### Backend (Elysia)

**Responsabilidades:**

- Execução segura de código C (GPC/Spawn)
- Rate limiting e validação
- Servir arquivos estáticos (Fallback)

**Endpoints:**

| Método | Rota            | Descrição                |
| ------ | --------------- | ------------------------ |
| POST   | `/api/execute`  | Compila e executa código |
| GET    | `/api/health`   | Status do sistema        |
| GET    | `/api/runtimes` | Lista versões do GCC     |

**Estrutura Modular:**

```
src/server/
├── routes/      # Definição de endpoints (system, compiler, course)
├── middlewares/ # Lógica de serving e segurança
├── compiler/    # Serviço de execução nativa do GCC
├── setup.ts     # Configuração de Segurança (CORS, CSP)
└── index.ts     # Entry point
```

**Fluxo de Execução:**

```
Request → Validação Schema → Cria Dir Temp (.jobs) → Grava .c → GCC Compile → ./app Run → Captura Stdout → Cleanup → Response
```

### Native Runner (GCC)

Execução isolada localmente utilizando processos temporários e GCC instalado no sistema.

**Configuração:**

- Timeout: 2 a 5 segundos (process level)
- Isolamento: Diretórios temporários randômicos (`.jobs/UUID`)
- Cleanup: Remoção automática pós-execução

## Fluxo de Dados

### Renderização de Conteúdo

```
1. Build Time:
   MDX → Astro Content Collections → HTML estático

2. Request Time:
   Navegador → CDN/Server → HTML pré-renderizado
```

### Execução de Código (Playground)

```
1. Usuário escreve código no Monaco Editor
2. Frontend envia POST para /api/execute
3. Backend valida e aplica rate limit
4. Backend envia para Piston API
5. Piston compila/executa em container
6. Resultado retorna ao frontend
7. Output renderizado com cores ANSI
```

## Decisões Arquiteturais

### Por que Astro?

- **SSG:** Performance máxima para conteúdo estático
- **Partial Hydration:** JS mínimo enviado ao cliente
- **MDX Nativo:** Suporte first-class para conteúdo Markdown

### Por que Elysia/Bun?

- **Performance:** Significativamente mais rápido que Node.js
- **TypeScript Nativo:** Sem transpilação necessária
- **API Ergonômica:** Código mais limpo e type-safe

### Por que não SPA?

- Conteúdo majoritariamente estático (aulas)
- SEO importante para discoverability
- Menor bundle size

## Considerações de Segurança

1. **Input Validation:** Todo código enviado é validado antes de execução
2. **Rate Limiting:** Máximo de 10 requisições/minuto por IP
3. **Sandboxing:** Código executa em containers isolados (Piston)
4. **No Eval:** Nunca executamos código no servidor Node/Bun

## Escalabilidade

### Estratégia Atual (MVP)

- Single instance do backend
- CDN para assets estáticos
- Piston API como serviço externo

### Estratégia Futura

- Horizontal scaling do backend via containers
- Deploy serverless (se migrar para WebAssembly no futuro)
- Redis para cache de compilações frequentes
- Isolamento avançado via Docker (sandbox real) se necessário escalar para múltiplos usuários simultâneos concorrendo pro I/O

---

_Última atualização: Janeiro 2026_
