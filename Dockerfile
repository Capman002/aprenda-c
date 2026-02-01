# ==========================================
# Aprenda C - Backend API (Compilador)
# ==========================================
# Este container contém APENAS a API do compilador.
# O frontend é servido via Cloudflare Pages.
# ==========================================

FROM debian:bookworm-slim

# Instalar dependências de sistema (GCC + Bun)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar Bun
ENV BUN_INSTALL=/usr/local/bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN curl -fsSL https://bun.sh/install | bash

# Remover curl após instalação (reduz superfície de ataque)
RUN apt-get remove -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Criar usuario não-root para execução
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copiar dependências do backend (apenas o necessário)
COPY package.json bun.lock ./
# O workspace espera frontend/package.json, então criamos um dummy
RUN mkdir -p frontend && echo '{"name":"frontend-dummy","version":"1.0.0"}' > frontend/package.json
RUN bun install --production

# Copiar arquivos do backend
COPY src ./src

# Criar pasta de jobs com permissão
RUN mkdir -p .jobs && chown -R appuser:appuser .jobs /app

# Mudar para usuário limitado
USER appuser

# Configuração
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD bun run src/healthcheck.ts || exit 1

# Start
CMD ["bun", "run", "src/server/index.ts"]
