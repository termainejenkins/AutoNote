# PowerShell script to test AutoNote services

# Function to check if a service is healthy
function Check-Health {
    param (
        [string]$Service,
        [string]$Url
    )
    Write-Host "Checking $Service health... " -NoNewline
    try {
        $response = Invoke-WebRequest -Uri "$Url/health" -Method GET -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "OK" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "Failed" -ForegroundColor Red
        return $false
    }
}

# Function to test service endpoints
function Test-Endpoint {
    param (
        [string]$Service,
        [string]$Method,
        [string]$Url,
        [string]$Data,
        [string]$Token
    )
    Write-Host "Testing $Service $Method $Url... " -NoNewline
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $Url -Method GET -Headers $headers -ErrorAction Stop
        }
        else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $headers -Body $Data -ErrorAction Stop
        }
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
            Write-Host "OK" -ForegroundColor Green
            return $response.Content
        }
    }
    catch {
        Write-Host "Failed (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
        return $null
    }
}

Write-Host "Starting AutoNote services test..."
Write-Host "--------------------------------"

# Check if services are running
Write-Host "`nChecking service health..."
Check-Health -Service "API Gateway" -Url "http://localhost:8000"
Check-Health -Service "Auth Service" -Url "http://localhost:8001"
Check-Health -Service "Note Service" -Url "http://localhost:8002"
Check-Health -Service "Content Service" -Url "http://localhost:8003"
Check-Health -Service "AI Service" -Url "http://localhost:8004"

Write-Host "`nTesting service endpoints..."
Write-Host "--------------------------------"

# Test Auth Service
Write-Host "`nTesting Auth Service:"
$registerData = @{
    email = "test@example.com"
    password = "testpass123"
    username = "testuser"
} | ConvertTo-Json

$loginData = @{
    username = "test@example.com"
    password = "testpass123"
} | ConvertTo-Json

Test-Endpoint -Service "Auth Service" -Method "POST" -Url "http://localhost:8001/users/register" -Data $registerData
$tokenResponse = Test-Endpoint -Service "Auth Service" -Method "POST" -Url "http://localhost:8001/token" -Data $loginData
$token = ($tokenResponse | ConvertFrom-Json).access_token

# Test Note Service
Write-Host "`nTesting Note Service:"
$noteData = @{
    title = "Test Note"
    content = "This is a test note"
    tags = @("test")
} | ConvertTo-Json

Test-Endpoint -Service "Note Service" -Method "POST" -Url "http://localhost:8002/notes" -Data $noteData -Token $token
Test-Endpoint -Service "Note Service" -Method "GET" -Url "http://localhost:8002/notes" -Token $token

# Test Content Service
Write-Host "`nTesting Content Service:"
$contentData = @{
    url = "https://example.com"
    type = "web"
} | ConvertTo-Json

Test-Endpoint -Service "Content Service" -Method "POST" -Url "http://localhost:8003/process" -Data $contentData -Token $token
Test-Endpoint -Service "Content Service" -Method "GET" -Url "http://localhost:8003/content" -Token $token

# Test AI Service
Write-Host "`nTesting AI Service:"
$aiData = @{
    content = "This is a test content for AI processing"
    operation = "summarize"
} | ConvertTo-Json

Test-Endpoint -Service "AI Service" -Method "POST" -Url "http://localhost:8004/process" -Data $aiData -Token $token
Test-Endpoint -Service "AI Service" -Method "GET" -Url "http://localhost:8004/results" -Token $token

# Test API Gateway
Write-Host "`nTesting API Gateway:"
Test-Endpoint -Service "API Gateway" -Method "GET" -Url "http://localhost:8000/health"
Test-Endpoint -Service "API Gateway" -Method "GET" -Url "http://localhost:8000/health/services"

Write-Host "`nTest completed!" 