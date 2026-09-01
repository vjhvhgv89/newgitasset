# Diagnostics script for AssetFlow local server
$ports = @(8080, 8081)
$endpoints = @("/", "/style.css", "/app.js")

Write-Host "`n--- Testing Local Server Health ---" -ForegroundColor Cyan

$serverFound = $false
foreach ($port in $ports) {
    $baseUrl = "http://localhost:$port"
    try {
        $test = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        Write-Host "[OK] Server detected running on $baseUrl" -ForegroundColor Green
        $serverFound = $true
        
        foreach ($path in $endpoints) {
            $url = "$baseUrl$path"
            try {
                $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
                Write-Host "  -> SUCCESS: $path (Status: $($res.StatusCode), Size: $($res.RawContentLength) bytes)" -ForegroundColor Gray
            } catch {
                Write-Host "  -> FAIL: $path ($($_.Exception.Message))" -ForegroundColor Red
            }
        }
        break
    } catch {
        # Port not listening
    }
}

if (-not $serverFound) {
    Write-Host "[INFO] No server currently listening on port 8080 or 8081." -ForegroundColor Yellow
    Write-Host "To start the server, run: .\go_live.bat or powershell -ExecutionPolicy Bypass -File server.ps1`n" -ForegroundColor Yellow
}
