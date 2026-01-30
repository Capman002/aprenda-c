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
# Stage 2: Runtime (Backend + GCC)
# ==========================================
FROM python:3.11-slim-bullseye AS runtime

# Instalar dependências de sistema mínimas (GCC, Build Essentials)
# REMOVEMOS curl, wget e git da imagem final para reduzir superfície de ataque
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Instalar Bun manualmente (já que estamos numa base Debian Slim segura)
# Usamos o script oficial, mas validando checksum seria ainda mais senior.
ENV BUN_INSTALL=/usr/local/bun
ENV PATH=$BUN_INSTALL/bin:$PATH
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://bun.sh/install | bash && \
    apt-get remove -y curl && \
    apt-get autoremove -y

WORKDIR /app

# Criar usuario não-root para execução
# Isso é CRÍTICO: Se o hacker invadir, ele será 'appuser', não 'root'
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# Copiar dependências do backend
COPY package.json bun.lock ./
RUN bun install --production

# Copiar arquivos do backend
COPY src ./src

# Copiar build do frontend do Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Criar pasta de jobs com permissão para o usuário appuser
RUN mkdir .jobs && chown appuser:appuser .jobs

# Mudar para usuário limitado
USER appuser

# Expor porta
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Healthcheck nativo do Docker
HEALTHCHECK --interval=30s --timeout=3s \
  CMD bun run src/healthcheck.ts || exit 1

# Start
CMD ["bun", "run", "src/server/index.ts"]
