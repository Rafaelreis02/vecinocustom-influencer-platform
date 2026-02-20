#!/bin/bash
#
# DEPLOY SCRIPT - VecinoCustom Influencer Platform
# Correr este script para fazer deploy de tudo
#

echo "🚀 Deploy Script - VecinoCustom"
echo "================================"
echo ""

# Verificar se está na pasta certa
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Não estás na pasta do projeto"
    echo "   Correr: cd vecinocustom-influencer-platform"
    exit 1
fi

echo "📦 Passo 1: Commit e Push para GitHub"
echo "--------------------------------------"
git add .
git commit -m "feat: Scott v2.0 - API integration with auth, cache support, and new scott-api.js script

- Add API key authentication (src/lib/api-auth.ts)
- Update analyze-influencer endpoint with auth + Redis cache support
- Create new Scott script using API instead of duplicated code
- Add setup script for Scott user creation
- Migration guide included" || echo "   (Nada para commitar)"

echo ""
echo "🔄 A fazer push..."
git push origin main

echo ""
echo "🚀 Passo 2: Deploy Vercel"
echo "--------------------------"
vercel --prod

echo ""
echo "✅ Deploy completo!"
echo ""
echo "📋 Próximo passo: Criar user Scott na DB"
echo "   node scripts/setup-scott.js"
echo ""
