# Deployment Guide - Análise Planilha

This guide provides step-by-step instructions for deploying the application to various environments.

## Table of Contents

1. [Vercel (Recommended)](#vercel-recommended)
2. [Docker](#docker)
3. [Traditional Server](#traditional-server)
4. [Environment Configuration](#environment-configuration)
5. [Pre-Deployment Checklist](#pre-deployment-checklist)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Vercel (Recommended)

Vercel is the easiest way to deploy React + Vite applications with automatic CI/CD.

### Prerequisites

- GitHub account with repo
- Vercel account (sign up at https://vercel.com)
- Git installed locally

### Step 1: Connect Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select "GitHub" and authorize
4. Find and select `analise-planilha` repository
5. Click "Import"

### Step 2: Configure Project

**Framework**: Vite  
**Build Command**: `pnpm build`  
**Output Directory**: `dist`  
**Install Command**: `pnpm install`

### Step 3: Set Environment Variables

Go to **Settings → Environment Variables** and add:

```
VITE_API_URL=https://api.yourdomain.com
VITE_LOG_LEVEL=info
VITE_ENABLE_ERROR_TRACKING=false
```

**Production** environment gets priority if different from development.

### Step 4: Deploy

Click "Deploy" to start first deployment (usually ~2-3 minutes).

Every push to `main` branch triggers automatic re-deployment.

### View Deployment

- **Production**: `https://analise-planilha.vercel.app` (or custom domain)
- **Preview**: `https://analise-planilha-[branch].vercel.app`
- **Analytics**: Dashboard shows request metrics

### Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your custom domain
3. Update DNS records according to Vercel instructions
4. Wait 24-48 hours for propagation

### Rollback

If deployment breaks:

1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **⋮ → Promote to Production**

---

## Docker

For self-hosted or container-based deployments.

### Build Docker Image

1. **Create Dockerfile** (if not exists):

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build app
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run SPA
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["serve", "-s", "dist", "-l", "3000"]
```

2. **Build image**:

```bash
docker build -t analise-planilha:latest .
```

3. **Run container**:

```bash
docker run -p 3000:3000 \
  -e VITE_API_URL=https://api.yourdomain.com \
  analise-planilha:latest
```

### Docker Compose

For multi-container setups:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: ${VITE_API_URL}
      VITE_LOG_LEVEL: info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:  # Optional reverse proxy
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
```

Deploy:

```bash
docker-compose up -d
```

### Push to Docker Registry

```bash
# Tag image
docker tag analise-planilha:latest myregistry/analise-planilha:latest

# Login (adjust registry)
docker login -u username myregistry

# Push
docker push myregistry/analise-planilha:latest
```

---

## Traditional Server

For deployment on VPS, shared hosting, or traditional servers.

### Prerequisites

- SSH access to server
- Node.js 18+ installed
- pnpm installed globally
- Web server (Nginx or Apache) for reverse proxy

### Step 1: Clone Repository

```bash
ssh user@server.com

cd /var/www
git clone https://github.com/Trustcorporation88/analise-planilha.git
cd analise-planilha
```

### Step 2: Install & Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

### Step 3: Setup Web Server

**Nginx configuration** (`/etc/nginx/sites-available/analise-planilha`):

```nginx
server {
    listen 80;
    server_name analise-planilha.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name analise-planilha.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/analise-planilha.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analise-planilha.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    root /var/www/analise-planilha/dist;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/analise-planilha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Setup SSL (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d analise-planilha.yourdomain.com
```

### Step 5: Auto-Deployment (Optional)

Create webhook handler for auto-pull from GitHub:

```bash
# Install webhook
sudo apt-get install webhook

# Create hooks.json
cat > /etc/webhook/hooks.json << 'EOF'
[
  {
    "id": "analise-planilha-webhook",
    "execute-command": "/home/user/redeploy.sh",
    "command-working-directory": "/var/www/analise-planilha",
    "trigger-rule": {
      "match": {
        "type": "payload-hash-sha256",
        "secret": "your-github-webhook-secret",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
EOF
```

Redeploy script (`/home/user/redeploy.sh`):

```bash
#!/bin/bash
cd /var/www/analise-planilha
git pull origin main
pnpm install --frozen-lockfile
pnpm build
sudo systemctl reload nginx
echo "Deployment complete at $(date)" >> /var/log/analise-planilha-deploy.log
```

---

## Environment Configuration

### Development (`.env.local`)

```
VITE_API_URL=http://localhost:3000/api
VITE_LOG_LEVEL=debug
VITE_ENABLE_ERROR_TRACKING=false
```

### Staging (Vercel Environment Variables)

```
VITE_API_URL=https://staging-api.yourdomain.com
VITE_LOG_LEVEL=info
VITE_ENABLE_ERROR_TRACKING=true
```

### Production (Vercel Environment Variables)

```
VITE_API_URL=https://api.yourdomain.com
VITE_LOG_LEVEL=warn
VITE_ENABLE_ERROR_TRACKING=true
VITE_MAX_FILE_SIZE=104857600
```

### Database & API

Configure backend services:

- **API Endpoint**: Set `VITE_API_URL` to your backend
- **Auth**: Configure OAuth/JWT based on API
- **Database**: Use environment-specific configs

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass: `pnpm lint && pnpm build`
- [ ] No console errors in development
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Database migrations run
- [ ] Backup created (for existing deployments)
- [ ] SSL certificate valid
- [ ] CDN cache cleared (if applicable)
- [ ] Security headers configured
- [ ] Error tracking enabled
- [ ] Monitoring/alerting set up
- [ ] Rollback plan documented

---

## Monitoring & Troubleshooting

### Vercel Monitoring

- **Build failures**: Check Logs tab, fix errors, re-push
- **Runtime errors**: View Function Logs in dashboard
- **Performance**: Use Analytics dashboard

### Docker/Server Monitoring

```bash
# View logs
docker logs <container-id>
tail -f /var/log/analise-planilha-deploy.log

# Check memory/CPU
docker stats <container-id>

# Restart if needed
docker restart <container-id>
sudo systemctl restart analise-planilha
```

### Common Issues

**Build fails with dependency errors:**
```bash
rm -rf dist node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

**App shows blank page:**
- Check browser console for errors
- Verify API_URL is correct
- Clear browser cache
- Check Nginx logs: `tail -f /var/log/nginx/error.log`

**Slow performance:**
- Enable Gzip compression
- Use CDN for static assets
- Optimize images
- Check API response times

**Memory leaks:**
- Monitor with DevTools Performance tab
- Check for uncleared intervals/listeners
- Update dependencies: `pnpm update`

### Enable CORS (if API is separate)

Add to API server (Node.js/Express example):

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://analise-planilha.yourdomain.com',
  credentials: true
}));
```

---

## Security Best Practices

- ✅ Use HTTPS only (SSL/TLS)
- ✅ Set Security Headers (done in Nginx config above)
- ✅ Rotate secrets regularly
- ✅ Keep dependencies updated: `pnpm update`
- ✅ Use environment-specific API URLs
- ✅ Never commit `.env` files
- ✅ Enable CORS only for trusted origins
- ✅ Implement rate limiting on API
- ✅ Use Content Security Policy (CSP)

---

## Performance Optimization

### Enable Compression

```bash
# Gzip (already configured in Nginx above)
gzip on;

# Brotli (optional, faster compression)
sudo apt-get install brotli
```

### Cache Busting

Vite automatically includes hash in filenames:
- `assets/index-abc123.js` (automatically busted on changes)

### Lazy Loading

Use React Router's lazy loading:

```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

---

## Rollback Procedure

### If deployment breaks:

1. **Identify issue** - Check logs
2. **Revert code** - `git revert <commit-hash>`
3. **Push revert** - Triggers re-deployment
4. **Verify fix** - Test staging first
5. **Notify team** - Document what happened

### For Vercel:

1. Go to Deployments
2. Select previous working deployment
3. Click ⋮ → Promote to Production
4. Wait for deployment to complete

---

## Support & Resources

- Vercel Docs: https://vercel.com/docs
- Docker Docs: https://docs.docker.com
- Nginx Docs: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/

---

Last Updated: 2026-05-31  
Maintained by: Development Team
