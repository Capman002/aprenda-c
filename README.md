# Aprenda C

![CI Status](https://github.com/Capman002/aprenda-c/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/Capman002/aprenda-c)
![Bun Version](https://img.shields.io/badge/Bun-v1.0%2B-black?logo=bun)
![GitHub Stars](https://img.shields.io/github/stars/Capman002/aprenda-c?style=social)

> Do Zero ao Embarcado: Fundamentos, Memória e Linguagens Modernas

Plataforma educacional open-source focada em programação de baixo nível, arquitetura de sistemas e linguagens de alta performance. Ideal para estudantes e desenvolvedores que buscam dominar C, sistemas embarcados, Zig e Rust.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Módulos do Curso](#módulos-do-curso)
- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Instalação](#instalação)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Contribuição](#contribuição)
- [Roadmap](#roadmap)
- [Licença](#licença)
- [Contato](#contato)

---

## Visão Geral

O **Aprenda C** é um projeto educacional open-source que oferece um currículo estruturado cobrindo fundamentos de computação até programação de sistemas embarcados. O diferencial está na abordagem prática com um **Playground integrado** para execução de código C diretamente no navegador.

### Objetivos do Projeto

- Desmistificar conceitos de baixo nível (memória, ponteiros, arquitetura)
- Ensinar boas práticas de programação sistemas
- Preparar desenvolvedores para trabalhar com sistemas embarcados
- Introduzir linguagens modernas focadas em performance (Zig, Rust)

---

## Módulos do Curso

| Módulo                            | Tópicos                                                            | Status       |
| --------------------------------- | ------------------------------------------------------------------ | ------------ |
| **01. Contexto Histórico**        | Origem da programação, Linguagem C, Máquinas e MCUs                | Completo     |
| **02. Fundamentos de Computação** | Binário, Hexadecimal, Arquitetura de processadores                 | Completo     |
| **03. Ambiente e Ferramentas**    | Compiladores, Makefile, CMake, GDB                                 | Completo     |
| **04. Sintaxe C Básico**          | Variáveis, Tipos, Controle de fluxo, Funções                       | Completo     |
| **05. Tipos e Memória**           | stdint.h, Ponteiros, Stack/Heap, Bitwise                           | Completo     |
| **06. Estruturas Avançadas**      | Structs, Unions, Strings, Serialização                             | Completo     |
| **07. Segurança e Boas Práticas** | Complexidade algorítmica, Vulnerabilidades clássicas               | Completo     |
| **08. ESP32 e Embarcados**        | Programação de microcontroladores, Zenoh, Segurança IoT            | Em progresso |
| **09. Git e Versionamento**       | Git internals, GitHub, Workflows profissionais                     | Completo     |
| **10. Linguagens Modernas**       | Zig (build system, comptime, allocators), Rust (ownership, traits) | Em progresso |

---

## Funcionalidades

### Playground Interativo

Execute código C diretamente no navegador com suporte a:

- Editor Monaco (syntax highlighting, autocomplete)
- Sistema de arquivos virtual (múltiplos arquivos .c/.h)
- Compilação e execução em tempo real via Piston API
- Saída colorida com suporte a ANSI codes
- Templates pré-configurados para exercícios

### Plataforma de Conteúdo

- Aulas em MDX com componentes interativos
- Vídeos incorporados do YouTube
- Navegação progressiva entre módulos
- Design responsivo e tema escuro
- Busca integrada (em desenvolvimento)

---

## Stack Tecnológica

### Frontend

| Tecnologia                                   | Propósito                     |
| -------------------------------------------- | ----------------------------- |
| [Astro](https://astro.build)                 | Framework de geração estática |
| [MDX](https://mdxjs.com)                     | Markdown com componentes      |
| [TypeScript](https://www.typescriptlang.org) | Tipagem estática              |
| Monaco Editor                                | Editor de código embutido     |

### Backend

| Tecnologia                     | Propósito                 |
| ------------------------------ | ------------------------- |
| [Bun](https://bun.sh)          | Runtime JavaScript        |
| [Elysia](https://elysiajs.com) | Framework HTTP            |
| Piston API                     | Execução segura de código |

### Infraestrutura

| Tecnologia     | Propósito         |
| -------------- | ----------------- |
| Coolify/Vercel | Deploy e hosting  |
| GitHub Actions | CI/CD (planejado) |

---

## Instalação

### Pré-requisitos

- **Bun** 1.3.0 ou superior
- **Git** 2.40 ou superior

### Clone e Setup

```bash
# Clone o repositório
git clone https://github.com/Capman002/aprenda-c.git
cd aprenda-c

# Instale dependências do projeto raiz
bun install

# Instale dependências do frontend
cd frontend && bun install && cd ..
```

---

## Uso

### Desenvolvimento Local

```bash
# Terminal 1: Backend (API do Playground)
bun run dev:api

# Terminal 2: Frontend (Astro)
bun run dev:frontend
```

Acesse:

- **Frontend:** http://localhost:4321
- **API:** http://localhost:3000

### Build de Produção

```bash
cd frontend
bun run build
bun run preview
```

---

## Estrutura do Projeto

```
aprenda-c/
├── .github/                  # Templates e configurações GitHub
│   ├── ISSUE_TEMPLATE/       # Templates de issues
│   ├── CONTRIBUTING.md       # Guia de contribuição
│   ├── CODE_OF_CONDUCT.md    # Código de conduta
│   └── SECURITY.md           # Política de segurança
├── docs/                     # Documentação técnica
│   ├── ARCHITECTURE.md       # Arquitetura do sistema
│   ├── API.md                # Documentação da API
│   └── DEPLOYMENT.md         # Guia de deploy
├── frontend/
│   ├── src/
│   │   ├── content/course/   # Conteúdo MDX do curso
│   │   ├── pages/            # Páginas Astro
│   │   ├── components/       # Componentes reutilizáveis
│   │   └── layouts/          # Layouts base
│   ├── public/               # Assets estáticos
│   └── astro.config.mjs      # Configuração Astro
├── src/
│   └── server/               # API Elysia
│       └── index.ts          # Entry point da API
├── LICENSE                   # Licença MIT
├── README.md                 # Este arquivo
└── package.json              # Dependências e scripts
```

---

## Contribuição

Contribuições são bem-vindas! Antes de contribuir:

1. Leia o [Guia de Contribuição](.github/CONTRIBUTING.md)
2. Verifique as [Issues abertas](https://github.com/Capman002/aprenda-c/issues)
3. Siga o [Código de Conduta](.github/CODE_OF_CONDUCT.md)

### Formas de Contribuir

- Correções de conteúdo técnico ou gramatical
- Novos exercícios para o Playground
- Melhorias de acessibilidade
- Traduções
- Documentação

---

## Roadmap

### Em Desenvolvimento

- [ ] Busca full-text no conteúdo
- [ ] Sistema de progresso do usuário
- [ ] Exportação de certificados
- [ ] Suporte a Zig no Playground
- [ ] Modo offline (PWA)

### Futuro

- [ ] Fórum de discussões integrado
- [ ] Gamificação (badges, streaks)
- [ ] API pública para integrações
- [ ] Tradução para inglês

---

## Licença

Este projeto está licenciado sob a **Licença MIT**. Consulte o arquivo [LICENSE](LICENSE) para detalhes.

Você é livre para:

- Usar comercialmente
- Modificar
- Distribuir
- Usar privativamente

Sob a condição de incluir o aviso de copyright e licença.

---

## Contato

- **Autor:** [Capman002](https://github.com/Capman002)
- **Apoiar:** [GitHub Sponsors](https://github.com/sponsors/Capman002/)
- **Issues:** [Abrir issue](https://github.com/Capman002/aprenda-c/issues)
- **Discussões:** [GitHub Discussions](https://github.com/Capman002/aprenda-c/discussions)

---

**Feito com dedicação para a comunidade de desenvolvedores.**
