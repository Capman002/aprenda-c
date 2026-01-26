# Guia de Deploy

Instruções para deploy do Aprenda C em diferentes ambientes.

## Sumário

- [Requisitos](#requisitos)
- [Deploy com Coolify](#deploy-com-coolify)
- [Deploy com Vercel](#deploy-com-vercel)
- [Deploy Manual (VPS)](#deploy-manual-vps)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Troubleshooting](#troubleshooting)

---

## Requisitos

### Mínimos

- 1 vCPU
- 512 MB RAM
- 1 GB armazenamento

### Recomendados

- 2 vCPU
- 1 GB RAM
- 5 GB armazenamento (para logs e cache)

---

## Deploy com Coolify

### Pré-requisitos

- Instância Coolify configurada
- Repositório GitHub conectado

### Passos

1. **Criar novo serviço**
   - Tipo: `Dockerfile`
   - Repositório: `github.com/Capman002/aprenda-c`
   - Branch: `main`

2. **Configurar Build**
   - Build Pack: `Dockerfile`
   - Dockerfile Path: `./Dockerfile`

3. **Configurar Portas**
   - Porta exposta: `3000`

4. **Variáveis de Ambiente**

   ```
   NODE_ENV=production
   PISTON_URL=https://emkc.org/api/v2/piston
   ```

5. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build completar

### Dockerfile (se necessário)

```dockerfile
FROM oven/bun:1.3

WORKDIR /app

# Copiar e instalar dependências
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build do frontend
WORKDIR /app/frontend
RUN bun install --frozen-lockfile
RUN bun run build

# Voltar para raiz
WORKDIR /app

# Expor porta
EXPOSE 3000

# Iniciar servidor
CMD ["bun", "run", "start"]
```

---

## Deploy com Vercel

> **Nota:** Vercel é ideal apenas para o frontend (estático). O backend precisa ser hospedado separadamente.

### Frontend (Astro)

1. **Conectar repositório**
   - Importe o projeto do GitHub
   - Root Directory: `frontend`

2. **Configurar Build**

   ```
   Build Command: bun run build
   Output Directory: dist
   Install Command: bun install
   ```

3. **Framework Preset**
   - Selecione: `Astro`

4. **Deploy**
   - Clique em "Deploy"

### Backend (Alternativas)

Para o backend, use:

- Railway
- Render
- Fly.io
- DigitalOcean App Platform

---

## Deploy Manual (VPS)

### 1. Preparar Servidor

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# Instalar Bun
curl -fsSL https://bun.sh/install | bash

# Instalar Git
sudo apt install git -y

# Instalar Nginx (proxy reverso)
sudo apt install nginx -y
```

### 2. Clonar e Configurar

```bash
cd /var/www
git clone https://github.com/Capman002/aprenda-c.git
cd aprenda-c

# Instalar dependências
bun install
cd frontend && bun install && bun run build && cd ..
```

### 3. Configurar Nginx

```nginx
# /etc/nginx/sites-available/aprenda-c
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend (arquivos estáticos)
    location / {
        root /var/www/aprenda-c/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API (proxy para Bun)
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/aprenda-c /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Configurar Systemd

```ini
# /etc/systemd/system/aprenda-c.service
[Unit]
Description=CS Masterclass API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/aprenda-c
ExecStart=/root/.bun/bin/bun run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable aprenda-c
sudo systemctl start aprenda-c
```

### 5. SSL com Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com
```

---

## Variáveis de Ambiente

| Variável     | Obrigatória | Default                          | Descrição                              |
| ------------ | ----------- | -------------------------------- | -------------------------------------- |
| `NODE_ENV`   | Não         | `development`                    | Ambiente (`development`, `production`) |
| `PORT`       | Não         | `3000`                           | Porta do servidor backend              |
| `PISTON_URL` | Não         | `https://emkc.org/api/v2/piston` | URL da Piston API                      |

### Exemplo `.env`

```env
NODE_ENV=production
PORT=3000
PISTON_URL=https://emkc.org/api/v2/piston
```

---

## Troubleshooting

### Build falha no frontend

```bash
# Limpar cache
cd frontend
rm -rf node_modules .astro dist
bun install
bun run build
```

### API não responde

```bash
# Verificar logs
journalctl -u aprenda-c -f

# Verificar se porta está em uso
lsof -i :3000
```

### Erro de CORS

Verifique se o middleware CORS está configurado corretamente em `src/server/index.ts`:

```typescript
import cors from "@elysiajs/cors";

app.use(
  cors({
    origin: ["https://seu-dominio.com"],
    methods: ["GET", "POST"],
  }),
);
```

### Piston API offline

- Verifique status: https://status.emkc.org
- Considere self-hosting: https://github.com/engineer-man/piston

---

_Última atualização: Janeiro 2026_
