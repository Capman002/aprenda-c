# ==========================================
# Stage 1: Build Frontend (Astro)
# ==========================================
FROM oven/bun:latest AS frontend-builder
WORKDIR /app/frontend
# Copiar apenas arquivos de dependência para cache layer
COPY frontend/package.json frontend/bun.lock ./
RUN bun install

# Copiar código fonte e buildar
COPY frontend .
RUN bun run build

# ==========================================
# Stage 2: Runtime (Caddy + Bun API + GCC)
# ==========================================
FROM debian:bookworm-slim AS runtime

# Instalar dependências de sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    curl \
    ca-certificates \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Instalar Caddy (servidor HTTP de alta performance)
RUN curl -fsSL https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_2.8.4_linux_amd64.tar.gz | tar -xz -C /usr/local/bin caddy

# Instalar Bun
ENV BUN_INSTALL=/usr/local/bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN curl -fsSL https://bun.sh/install | bash

# Remover curl após instalações (reduz superfície de ataque)
RUN apt-get remove -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Criar usuario não-root para execução
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copiar dependências do backend
COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/package.json
RUN bun install --production

# Copiar arquivos do backend
COPY src ./src

# Copiar build do frontend do Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copiar configuração do Caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Copiar configuração do Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Criar pasta de jobs com permissão
RUN mkdir -p .jobs && chown -R appuser:appuser .jobs /app

# Expor porta
ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 80

# Healthcheck via Caddy
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/api/health || exit 1

# Start via Supervisor (gerencia Caddy + Bun)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
