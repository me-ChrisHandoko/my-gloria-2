#!/bin/bash

# Test script to verify validation error handling
# This will test the CREATE roles endpoint with invalid data

echo "=== Testing CREATE roles with validation errors ==="
echo ""

# Test 1: Missing all required fields
echo "Test 1: Missing all required fields"
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{}' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 2: Missing hierarchyLevel
echo "Test 2: Missing hierarchyLevel"
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "TEST_ROLE",
    "name": "Test Role"
  }' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 3: Invalid hierarchyLevel (too low)
echo "Test 3: Invalid hierarchyLevel (too low)"
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "TEST_ROLE",
    "name": "Test Role",
    "hierarchyLevel": 0
  }' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 4: Invalid hierarchyLevel (too high)
echo "Test 4: Invalid hierarchyLevel (too high)"
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "TEST_ROLE",
    "name": "Test Role",
    "hierarchyLevel": 11
  }' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 5: Empty required fields
echo "Test 5: Empty required fields"
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "",
    "name": "",
    "hierarchyLevel": 5
  }' \
  | jq '.'
echo ""
echo "---"
echo ""

# Test 6: Valid data (should succeed)
echo "Test 6: Valid data (should succeed)"
curl -X POST http://localhost:3000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "TEST_ROLE_VALID",
    "name": "Test Role Valid",
    "description": "This is a test role",
    "hierarchyLevel": 5
  }' \
  | jq '.'
echo ""

echo "=== Tests completed ==="
