# Política de Segurança

## Versões Suportadas

| Versão | Suportada |
| ------ | --------- |
| 1.x.x  | Sim       |
| < 1.0  | Não       |

## Reportando Vulnerabilidades

Se você descobrir uma vulnerabilidade de segurança, **NÃO abra uma issue pública**.

### Processo de Reporte

1. Envie um email para: **[security@seu-dominio.com]** (substitua pelo seu email)
2. Inclua:
   - Descrição detalhada da vulnerabilidade
   - Passos para reprodução
   - Impacto potencial
   - Sugestão de correção (se houver)

### O que Esperar

- **Confirmação:** Resposta em até 48 horas
- **Investigação:** Avaliação em até 7 dias
- **Correção:** Patch prioritário para vulnerabilidades críticas
- **Crédito:** Reconhecimento público (se desejado)

### Escopo

Esta política cobre:

- Código-fonte do projeto
- Infraestrutura de build e deploy
- Dependências diretas

### Fora de Escopo

- Vulnerabilidades em serviços de terceiros
- Ataques de engenharia social
- Ataques físicos

## Boas Práticas de Segurança

Ao contribuir, siga:

- Nunca commite secrets, tokens ou credenciais
- Valide e sanitize inputs de usuário
- Use dependências atualizadas
- Evite `eval()` e execução dinâmica de código

---

Obrigado por ajudar a manter este projeto seguro.
