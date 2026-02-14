#!/bin/bash

# Debug script para testar product search do portal
# Uso: ./debug-product-search.sh [token] [query]

TOKEN=${1:-"default-token"}
QUERY=${2:-"necklace"}

echo "==========================================="
echo "Portal Product Search Debug"
echo "==========================================="
echo ""
echo "Testing with:"
echo "  Token: $TOKEN"
echo "  Query: $QUERY"
echo ""

# Test local dev server (if running)
if curl -s http://localhost:3000/api/portal/$TOKEN/products?q=$QUERY > /dev/null 2>&1; then
  echo "LOCAL SERVER (localhost:3000):"
  curl -s -w "\nStatus: %{http_code}\n" http://localhost:3000/api/portal/$TOKEN/products?q=$QUERY | jq . || echo "Error calling local API"
  echo ""
fi

# Test Vercel deployment
echo "VERCEL DEPLOYMENT:"
echo "URL: https://vecinocustom-influencer-platform-cm2mckiz8.vercel.app/api/portal/$TOKEN/products?q=$QUERY"
curl -s -w "\nStatus: %{http_code}\n" https://vecinocustom-influencer-platform-cm2mckiz8.vercel.app/api/portal/$TOKEN/products?q=$QUERY | jq . || echo "Error calling Vercel API"

echo ""
echo "==========================================="
echo "Check browser console (F12) for detailed logs"
echo "==========================================="
