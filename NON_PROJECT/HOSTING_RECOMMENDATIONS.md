# 🚀 FREE HOSTING OPTIONS FOR LOVNGE PLATFORM

**Generated:** March 22, 2026  
**Project:** Lovnge Platform (Full-stack: Next.js + NestJS + PostgreSQL)

---

## 📊 PROJECT ARCHITECTURE SUMMARY

| Component | Technology | Requirements |
|-----------|------------|--------------|
| **Frontend** | Next.js 15 | Node.js, Vercel-compatible |
| **Backend** | NestJS | Node.js, TypeScript |
| **Database** | PostgreSQL | Docker or managed DB |
| **Storage** | MinIO (S3-compatible) | Object storage |
| **Cache** | Redis | In-memory cache |
| **Email** | MailHog (dev) | SMTP service |

---

## 🎯 RECOMMENDED STACK FOR FREE HOSTING

### Option 1: **VERCEL + RAILWAY** (BEST CHOICE) ⭐⭐⭐⭐⭐

**Perfect for this project!**

| Service | What to Host | Free Tier | Why |
|---------|--------------|-----------|-----|
| **Vercel** | Next.js frontend | ✅ Unlimited | Made by Next.js creators |
| **Railway** | NestJS backend | $5 credit/month | Easy Docker deployment |
| **Neon** | PostgreSQL | ✅ Free 0.5GB | Serverless Postgres |
| **Upstash** | Redis | ✅ Free 10K ops/day | Serverless Redis |

**Total Cost:** $0/month (within free limits)

**Setup Guide:**

1. **Frontend on Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   cd apps/web
   vercel --prod
   ```

2. **Backend on Railway:**
   - Push code to GitHub
   - Connect Railway to repo
   - Set `apps/api` as root
   - Add `Dockerfile` (see below)

3. **Database on Neon:**
   - Sign up at https://neon.tech
   - Create database
   - Copy connection string
   - Add to Railway env vars

**Environment Variables:**
```env
# Vercel (Frontend)
NEXT_PUBLIC_API_URL=https://your-api.railway.app

# Railway (Backend)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
```

---

### Option 2: **RENDER** (ALL-IN-ONE) ⭐⭐⭐⭐

**Simplest deployment**

| Service | What to Host | Free Tier | Limitations |
|---------|--------------|-----------|-------------|
| **Render Web** | Next.js + NestJS | ✅ 750 hours/month | Sleeps after 15min idle |
| **Render PostgreSQL** | Database | ✅ Free 1GB | 90 days expiration |

**Pros:**
- Single platform for everything
- Easy setup from GitHub
- Automatic HTTPS

**Cons:**
- Services sleep on free tier
- Database expires after 90 days

**Setup:**
1. Push to GitHub
2. Connect Render
3. Create two services:
   - Web Service (Next.js): `apps/web`
   - Web Service (NestJS): `apps/api`
4. Add managed PostgreSQL

---

### Option 3: **FLY.IO** (DOCKER-FOCUSED) ⭐⭐⭐⭐

**Great for Docker deployments**

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| **VMs** | 3x shared-cpu-1x | 256MB RAM each |
| **PostgreSQL** | ✅ Free 1GB | Included |
| **Redis** | ✅ Free | Included |
| **Bandwidth** | 160GB/month | Generous |

**Perfect for this project because:**
- Can deploy both frontend and backend
- Includes PostgreSQL and Redis
- Docker-based (already configured!)

**Setup:**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy backend
cd apps/api
fly launch --name lovnge-api

# Deploy frontend
cd apps/web
fly launch --name lovnge-web

# Deploy Postgres
fly pg create --name lovnge-db

# Attach DB to apps
fly apps config set DATABASE_URL=postgres://...
```

**fly.toml for API:**
```toml
app = "lovnge-api"
primary_region = "fra"

[build]
  dockerfile = "apps/api/Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 3000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

---

### Option 4: **NETLIFY + COOLIFY** (SELF-HOSTED) ⭐⭐⭐

**For full control**

| Service | What to Host | Cost |
|---------|--------------|------|
| **Netlify** | Next.js frontend | ✅ Free |
| **Coolify** | Backend + DB (self-hosted VPS) | ~$5/month VPS |

**Requirements:**
- VPS (Hetzner, DigitalOcean, or Oracle Free Tier)
- Docker installed on VPS
- Domain name (optional but recommended)

**Coolify Setup:**
1. Get VPS (Oracle Cloud Free Tier: 4 ARM cores, 24GB RAM!)
2. Install Coolify:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Access at `http://your-vps-ip:8000`
4. Deploy NestJS + PostgreSQL + Redis via Coolify UI

---

## 🐳 DOCKERFILES FOR DEPLOYMENT

### API Dockerfile (NestJS)
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Build
RUN cd apps/api && npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Web Dockerfile (Next.js)
```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

RUN npm ci

COPY apps/web ./apps/web

RUN cd apps/web && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
```

---

## 🔧 ENVIRONMENT VARIABLES TEMPLATE

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Backend (.env.production)
```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://host:6379

# JWT
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# MinIO (if using)
MINIO_ENDPOINT=minio.yourdomain.com
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=models
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Update all `localhost` URLs to production URLs
- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Set up custom domain (optional)
- [ ] Create database backup strategy

### Post-Deployment
- [ ] Test login/registration
- [ ] Test model creation
- [ ] Test image uploads
- [ ] Verify API endpoints work
- [ ] Check error logging
- [ ] Monitor resource usage

---

## 💰 COST BREAKDOWN (FREE TIER LIMITS)

| Service | Free Tier | Paid Plan (if needed) |
|---------|-----------|----------------------|
| **Vercel** | 100GB bandwidth | $20/month (Pro) |
| **Railway** | $5 credit | $5/month (minimum) |
| **Neon** | 0.5GB storage | $0.08/GB-month |
| **Upstash Redis** | 10K ops/day | $0.10/10K ops |
| **Fly.io** | 3 VMs (256MB each) | $1.50/VM extra |

**Estimated Monthly Cost:**
- **Hobby project:** $0-5/month
- **Small production:** $10-20/month
- **Growing platform:** $30-50/month

---

## 🏆 FINAL RECOMMENDATION

### For Development/Testing:
**Use Fly.io** - Everything in one place, Docker-based, includes DB and Redis.

### For Production:
**Use Vercel + Railway + Neon** - Best performance, scalability, and free tier limits.

### For Full Control:
**Use Oracle Free Tier + Coolify** - 4 ARM cores + 24GB RAM free forever, but requires more setup.

---

## 📞 QUICK START COMMANDS

### Deploy to Vercel (Frontend)
```bash
cd apps/web
npm i -g vercel
vercel --prod
```

### Deploy to Railway (Backend)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd apps/api
railway init
railway up
```

### Deploy to Fly.io (Full Stack)
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch apps
fly launch --name lovnge-api --path apps/api
fly launch --name lovnge-web --path apps/web

# Create database
fly pg create --name lovnge-db

# Attach database
fly apps config set DATABASE_URL=postgres://... --app lovnge-api
```

---

**Generated by:** AI Coding Assistant  
**Date:** March 22, 2026  
**Status:** Ready for deployment
