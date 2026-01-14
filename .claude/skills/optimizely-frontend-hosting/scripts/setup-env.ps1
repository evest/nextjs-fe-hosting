# Optimizely Frontend Hosting - Environment Variable Setup
#
# This script helps set up the required environment variables for deployment

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Environment Variable Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need three values from the PaaS Portal:" -ForegroundColor White
Write-Host "1. Navigate to PaaS Portal > Your Frontend Project > API tab" -ForegroundColor White
Write-Host "2. Click 'Add API Credentials' if you haven't already" -ForegroundColor White
Write-Host "3. Copy the following values:" -ForegroundColor White
Write-Host "   - Project ID" -ForegroundColor White
Write-Host "   - Client Key" -ForegroundColor White
Write-Host "   - Client Secret" -ForegroundColor White
Write-Host ""

# Check if variables are already set
$hasProjectId = [bool]$env:OPTI_PROJECT_ID
$hasClientKey = [bool]$env:OPTI_CLIENT_KEY
$hasClientSecret = [bool]$env:OPTI_CLIENT_SECRET

if ($hasProjectId -and $hasClientKey -and $hasClientSecret) {
    Write-Host "Environment variables are already set:" -ForegroundColor Green
    Write-Host "  OPTI_PROJECT_ID: $env:OPTI_PROJECT_ID" -ForegroundColor White
    Write-Host "  OPTI_CLIENT_KEY: $env:OPTI_CLIENT_KEY" -ForegroundColor White
    Write-Host "  OPTI_CLIENT_SECRET: [hidden]" -ForegroundColor White
    Write-Host ""
    $overwrite = Read-Host "Do you want to overwrite these values? (y/n)"
    if ($overwrite -ne 'y') {
        Write-Host "Keeping existing values." -ForegroundColor Cyan
        exit 0
    }
}

# Prompt for values
Write-Host "Please enter your credentials:" -ForegroundColor Yellow
Write-Host ""

$projectId = Read-Host "Project ID"
$clientKey = Read-Host "Client Key"
$clientSecret = Read-Host "Client Secret" -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)

# Validate inputs
if (-not $projectId -or -not $clientKey -or -not $clientSecretPlain) {
    Write-Host "ERROR: All values are required." -ForegroundColor Red
    exit 1
}

Write-Host ""
$scope = Read-Host "Set variables for (1) Current session only or (2) Permanently for user? (1/2)"

if ($scope -eq "2") {
    # Set permanently
    Write-Host "Setting environment variables permanently..." -ForegroundColor Cyan
    [System.Environment]::SetEnvironmentVariable("OPTI_PROJECT_ID", $projectId, "User")
    [System.Environment]::SetEnvironmentVariable("OPTI_CLIENT_KEY", $clientKey, "User")
    [System.Environment]::SetEnvironmentVariable("OPTI_CLIENT_SECRET", $clientSecretPlain, "User")
    
    # Also set for current session
    $env:OPTI_PROJECT_ID = $projectId
    $env:OPTI_CLIENT_KEY = $clientKey
    $env:OPTI_CLIENT_SECRET = $clientSecretPlain
    
    Write-Host "Environment variables set permanently for user!" -ForegroundColor Green
    Write-Host "They will persist across PowerShell sessions." -ForegroundColor Green
}
else {
    # Set for current session only
    Write-Host "Setting environment variables for current session..." -ForegroundColor Cyan
    $env:OPTI_PROJECT_ID = $projectId
    $env:OPTI_CLIENT_KEY = $clientKey
    $env:OPTI_CLIENT_SECRET = $clientSecretPlain
    
    Write-Host "Environment variables set for current session!" -ForegroundColor Green
    Write-Host "Note: These will be lost when you close PowerShell." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "You can now run the deployment script." -ForegroundColor White
Write-Host ""

# Verify by showing the values (hide secret)
Write-Host "Current values:" -ForegroundColor Cyan
Write-Host "  OPTI_PROJECT_ID: $env:OPTI_PROJECT_ID" -ForegroundColor White
Write-Host "  OPTI_CLIENT_KEY: $env:OPTI_CLIENT_KEY" -ForegroundColor White
Write-Host "  OPTI_CLIENT_SECRET: [configured]" -ForegroundColor White
Write-Host ""
