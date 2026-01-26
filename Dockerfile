# Build stage
FROM oven/bun:1.3 AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json bun.lock ./
COPY frontend/package.json frontend/bun.lock ./frontend/

# Instalar dependências
RUN bun install --frozen-lockfile
RUN cd frontend && bun install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build do frontend
RUN cd frontend && bun run build

# Production stage
FROM oven/bun:1.3-slim

WORKDIR /app

# Copiar dependências e código do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Expor porta
EXPOSE 3000

# Iniciar servidor
CMD ["bun", "run", "start"]
