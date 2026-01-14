#!/bin/bash

# Script de prueba para la Edge Function receive-payment
# Uso: ./test-payment.sh [production|local]

MODE="${1:-local}"

if [ "$MODE" = "production" ]; then
  echo "🚀 Testing PRODUCTION endpoint"
  echo "⚠️  Make sure to set these variables:"
  echo "   - PROJECT_REF: Your Supabase project reference"
  echo "   - API_KEY: Your FINANCE_APP_API_KEY"
  echo ""

  if [ -z "$PROJECT_REF" ] || [ -z "$API_KEY" ]; then
    echo "❌ Error: Set PROJECT_REF and API_KEY environment variables"
    echo "Example:"
    echo "  export PROJECT_REF=your-project-ref"
    echo "  export API_KEY=your-api-key"
    echo "  ./test-payment.sh production"
    exit 1
  fi

  URL="https://${PROJECT_REF}.supabase.co/functions/v1/receive-payment"
else
  echo "🏠 Testing LOCAL endpoint"
  echo "Make sure to run: supabase functions serve"
  echo ""
  URL="http://localhost:54321/functions/v1/receive-payment"
  API_KEY="${API_KEY:-test-key-local}"
fi

echo "URL: $URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Successful payment
echo "📝 Test 1: Successful Payment"
curl -X POST "$URL" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "fullName": "Juan Pérez",
    "amount": 1500,
    "transactionId": "TEST-001",
    "note": "Pago de prueba"
  }' | jq .

echo -e "\n---\n"

# Test 2: Duplicate payment (idempotency)
echo "📝 Test 2: Duplicate Payment (Idempotency)"
curl -X POST "$URL" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "fullName": "Juan Pérez",
    "amount": 1500,
    "transactionId": "TEST-001",
    "note": "Pago duplicado"
  }' | jq .

echo -e "\n---\n"

# Test 3: User not found
echo "📝 Test 3: User Not Found"
curl -X POST "$URL" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "inexistente@example.com",
    "fullName": "Usuario Falso",
    "amount": 2000,
    "transactionId": "TEST-002"
  }' | jq .

echo -e "\n---\n"

# Test 4: Invalid API key
echo "📝 Test 4: Invalid API Key"
curl -X POST "$URL" \
  -H "x-api-key: invalid-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "fullName": "Juan Pérez",
    "amount": 1500,
    "transactionId": "TEST-003"
  }' | jq .

echo -e "\n---\n"

# Test 5: Missing required fields
echo "📝 Test 5: Missing Required Fields"
curl -X POST "$URL" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@test.com",
    "amount": 1500
  }' | jq .

echo -e "\n---\n"
echo "✅ All tests completed!"
