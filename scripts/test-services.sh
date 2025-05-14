#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a service is healthy
check_health() {
    local service=$1
    local url=$2
    echo -n "Checking $service health... "
    response=$(curl -s -w "\n%{http_code}" $url/health)
    status_code=$(echo "$response" | tail -n1)
    if [ "$status_code" -eq 200 ]; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}Failed${NC}"
        return 1
    fi
}

# Function to test service endpoints
test_endpoint() {
    local service=$1
    local method=$2
    local url=$3
    local data=$4
    echo -n "Testing $service $method $url... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" $url)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method -H "Content-Type: application/json" -d "$data" $url)
    fi
    
    status_code=$(echo "$response" | tail -n1)
    if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}Failed (Status: $status_code)${NC}"
        return 1
    fi
}

echo "Starting AutoNote services test..."
echo "--------------------------------"

# Check if services are running
echo "Checking service health..."
check_health "API Gateway" "http://localhost:8000"
check_health "Auth Service" "http://localhost:8001"
check_health "Note Service" "http://localhost:8002"
check_health "Content Service" "http://localhost:8003"
check_health "AI Service" "http://localhost:8004"

echo -e "\nTesting service endpoints..."
echo "--------------------------------"

# Test Auth Service
echo -e "\nTesting Auth Service:"
test_endpoint "Auth Service" "POST" "http://localhost:8001/users/register" '{"email":"test@example.com","password":"testpass123","username":"testuser"}'
test_endpoint "Auth Service" "POST" "http://localhost:8001/token" '{"username":"test@example.com","password":"testpass123"}'

# Get token for subsequent requests
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"test@example.com","password":"testpass123"}' http://localhost:8001/token | jq -r '.access_token')

# Test Note Service
echo -e "\nTesting Note Service:"
test_endpoint "Note Service" "POST" "http://localhost:8002/notes" '{"title":"Test Note","content":"This is a test note","tags":["test"]}' -H "Authorization: Bearer $TOKEN"
test_endpoint "Note Service" "GET" "http://localhost:8002/notes" -H "Authorization: Bearer $TOKEN"

# Test Content Service
echo -e "\nTesting Content Service:"
test_endpoint "Content Service" "POST" "http://localhost:8003/process" '{"url":"https://example.com","type":"web"}' -H "Authorization: Bearer $TOKEN"
test_endpoint "Content Service" "GET" "http://localhost:8003/content" -H "Authorization: Bearer $TOKEN"

# Test AI Service
echo -e "\nTesting AI Service:"
test_endpoint "AI Service" "POST" "http://localhost:8004/process" '{"content":"This is a test content for AI processing","operation":"summarize"}' -H "Authorization: Bearer $TOKEN"
test_endpoint "AI Service" "GET" "http://localhost:8004/results" -H "Authorization: Bearer $TOKEN"

# Test API Gateway
echo -e "\nTesting API Gateway:"
test_endpoint "API Gateway" "GET" "http://localhost:8000/health"
test_endpoint "API Gateway" "GET" "http://localhost:8000/health/services"

echo -e "\nTest completed!" 