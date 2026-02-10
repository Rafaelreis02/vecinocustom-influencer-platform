# 🎯 VecinoCustom Influencer Platform

Plataforma interna de gestão de influencers para a VecinoCustom.

## 🚀 Funcionalidades

### ✅ MVP (Fase 1 - Esta Semana)
- 👥 **Gestão de Influencers**
  - CRUD completo (criar, editar, remover)
  - Perfil detalhado (Instagram, TikTok, contactos)
  - Notas e histórico
  
- 🎬 **Gestão de Campanhas**
  - Criar e organizar campanhas 
  - Associar influencers a campanhas
  - Tracking de vídeos/posts
  - Comparação de performance
  
- 🎫 **Gestão de Cupões**
  - Criar cupões manualmente
  - Tracking de uso
  - Performance por influencer
  
- 💰 **Pagamentos (Manual)**
  - Tracking de valores devidos
  - Status de pagamento
  - Histórico
  
- 📊 **Dashboard & Analytics**
  - Métricas por influencer
  - Métricas por campanha
  - Rankings e comparações
  
- 📁 **File Storage**
  - Upload de contratos
  - Media dos influencers
  - Assets de campanhas

### 🔜 Fase 2 (Próxima Semana)
- 🛍️ Integração Shopify (criação automática de cupões)
- 📱 Integração TikTok/Instagram (métricas automáticas)
- 📧 Email automático (onboarding, relatórios)
- 🔔 Notificações (Slack/Discord/WhatsApp)
- 📊 Analytics avançados

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Base de Dados:** PostgreSQL + Prisma ORM
- **Autenticação:** NextAuth.js
- **File Storage:** AWS S3 / Cloudflare R2
- **Hospedagem:** Vercel (ou self-hosted)

## 📦 Instalação

```bash
# Clonar repo
cd vecinocustom-app

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env

# Setup base de dados
npx prisma migrate dev

# Correr em dev
npm run dev
```

## 🔐 Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Shopify (quando pronto)
SHOPIFY_STORE_URL="..."
SHOPIFY_ACCESS_TOKEN="..."

# TikTok API (quando pronto)
TIKTOK_CLIENT_KEY="..."
TIKTOK_CLIENT_SECRET="..."

# Instagram API (quando pronto)
INSTAGRAM_APP_ID="..."
INSTAGRAM_APP_SECRET="..."

# File Storage
AWS_S3_BUCKET="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

## 📝 Notas

- Shopify integration pendente (mudança API Janeiro 2026)
- TikTok/Instagram: verificar se tem Business accounts
- Começar com gestão manual, automatizar depois

---

**Desenvolvido por:** OpenClaw AI  
**Cliente:** VecinoCustom  
**Data:** Fevereiro 2026
// Deploy fix
