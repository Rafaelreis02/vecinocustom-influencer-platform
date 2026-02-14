#!/bin/bash

# Test file upload to the documents API
# Replace with actual influencer ID from your database

INFLUENCER_ID="test-id-123"
TEST_FILE="/tmp/test-screenshot.png"

# Create a test PNG file (1MB)
convert -size 100x100 xc:blue "$TEST_FILE" 2>/dev/null || \
  dd if=/dev/urandom of="$TEST_FILE" bs=1024 count=1024 2>/dev/null

if [ ! -f "$TEST_FILE" ]; then
  echo "Erro: Não consegui criar ficheiro de teste"
  exit 1
fi

FILE_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE")
echo "Ficheiro de teste criado: $TEST_FILE (${FILE_SIZE} bytes)"

# Test the API
echo ""
echo "Testando upload para /api/influencers/$INFLUENCER_ID/documents"
echo "---"

curl -X POST "http://localhost:3000/api/influencers/$INFLUENCER_ID/documents" \
  -F "file=@$TEST_FILE" \
  -F "influencerId=$INFLUENCER_ID" \
  -w "\nStatus: %{http_code}\n"

rm -f "$TEST_FILE"
