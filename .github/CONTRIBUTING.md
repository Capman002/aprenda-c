# Guia de Contribuição

Obrigado pelo interesse em contribuir com o **Aprenda C**! Este documento fornece diretrizes para garantir contribuições consistentes e de alta qualidade.

## Sumário

- [Código de Conduta](#código-de-conduta)
- [Tipos de Contribuição](#tipos-de-contribuição)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Fluxo de Trabalho](#fluxo-de-trabalho)
- [Padrões de Código](#padrões-de-código)
- [Padrões de Conteúdo](#padrões-de-conteúdo)
- [Commits e Pull Requests](#commits-e-pull-requests)

---

## Código de Conduta

Este projeto adota um ambiente colaborativo e respeitoso. Comportamentos inaceitáveis incluem:

- Linguagem ou imagens ofensivas
- Ataques pessoais ou políticos
- Assédio público ou privado
- Publicação de informações privadas de terceiros

Violações podem resultar em banimento das contribuições.

---

## Tipos de Contribuição

### Contribuições Aceitas

| Tipo                  | Descrição                                     |
| --------------------- | --------------------------------------------- |
| Correções de conteúdo | Erros técnicos, gramaticais ou desatualização |
| Melhorias de UX       | Acessibilidade, responsividade, performance   |
| Novos exercícios      | Práticas para o Playground C                  |
| Traduções             | Adaptações para outros idiomas                |
| Documentação          | Melhorias no README, guias, comentários       |

### Antes de Contribuir

1. Verifique se já existe uma issue relacionada
2. Para features grandes, abra uma issue para discussão **antes** de codificar
3. Leia a documentação existente

---

## Configuração do Ambiente

### Pré-requisitos

- **Bun** 1.3.0+ ([bun.sh](https://bun.sh))
- **Git** 2.40+
- Editor com suporte a TypeScript (VSCode recomendado)

### Setup

```bash
# Clone o repositório
git clone https://github.com/Capman002/aprenda-c.git
cd aprenda-c

# Instale dependências (raiz e frontend)
bun install
cd frontend && bun install && cd ..

# Inicie o ambiente de desenvolvimento
bun run dev:api      # Terminal 1 - Backend (porta 3000)
bun run dev:frontend # Terminal 2 - Frontend (porta 4321)
```

### Estrutura do Projeto

```
aprenda-c/
├── .github/                 # Templates e configurações GitHub
├── frontend/
│   ├── src/
│   │   ├── content/course/  # Conteúdo MDX do curso
│   │   ├── pages/           # Páginas Astro
│   │   ├── components/      # Componentes reutilizáveis
│   │   └── layouts/         # Layouts base
│   └── public/              # Assets estáticos
├── src/
│   └── server/              # API Elysia (Playground)
└── docs/                    # Documentação adicional
```

---

## Fluxo de Trabalho

### Branches

| Branch      | Propósito                     |
| ----------- | ----------------------------- |
| `main`      | Produção estável              |
| `develop`   | Integração de features        |
| `feature/*` | Novas funcionalidades         |
| `fix/*`     | Correções de bugs             |
| `docs/*`    | Atualizações de documentação  |
| `content/*` | Mudanças no conteúdo do curso |

### Processo

1. Fork o repositório
2. Crie uma branch descritiva: `git checkout -b feature/nome-descritivo`
3. Faça commits atômicos com mensagens claras
4. Mantenha sua branch atualizada com `develop`
5. Abra um Pull Request seguindo o template

---

## Padrões de Código

### TypeScript/JavaScript

- Use TypeScript estrito (`strict: true`)
- Prefira `const` sobre `let`; evite `var`
- Funções puras e imutabilidade quando possível
- Nomeação: `camelCase` para variáveis/funções, `PascalCase` para tipos/componentes

### Astro/MDX

- Um componente por arquivo
- Props tipadas com interfaces TypeScript
- Evite lógica complexa em arquivos `.astro`; extraia para helpers

### CSS

- Classes semânticas e descritivas
- Variáveis CSS para cores e espaçamentos
- Mobile-first quando aplicável

---

## Padrões de Conteúdo

### Estilo de Escrita

- **Tom:** Direto, técnico e respeitoso
- **Voz:** Ativa ("Execute o comando" vs "O comando deve ser executado")
- **Terminologia:** Mantenha consistência com o glossário do curso
- **Código:** Sempre testável e funcional

### Estrutura de Aulas

```mdx
---
title: Título da Aula
description: Descrição concisa
order: 1
---

## Objetivo

[O que o aluno aprenderá]

## Conceitos

[Explicação teórica]

## Prática

[Código e exercícios]

## Resumo

[Pontos-chave]
```

---

## Commits e Pull Requests

### Mensagens de Commit

Use o formato [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(escopo): descrição curta

[corpo opcional]

[rodapé opcional]
```

**Tipos válidos:**

| Tipo       | Uso                                |
| ---------- | ---------------------------------- |
| `feat`     | Nova funcionalidade                |
| `fix`      | Correção de bug                    |
| `docs`     | Documentação                       |
| `style`    | Formatação (sem mudança de lógica) |
| `refactor` | Refatoração de código              |
| `perf`     | Melhoria de performance            |
| `test`     | Adição/correção de testes          |
| `chore`    | Tarefas de build/config            |
| `content`  | Atualização de conteúdo do curso   |

**Exemplos:**

```bash
feat(playground): adiciona suporte a múltiplos arquivos
fix(course): corrige exemplo de ponteiros na aula 05-01
docs: atualiza README com instruções de deploy
content(módulo-06): adiciona exercícios de structs
```

### Pull Requests

- Título claro e descritivo
- Preencha o template completamente
- Vincule issues relacionadas
- Responda feedback de revisão prontamente

---

## Dúvidas?

- Abra uma [Discussion](https://github.com/Capman002/cs-masterclass/discussions)
- Consulte a documentação existente
- Revise PRs anteriores como referência

Obrigado por contribuir!
