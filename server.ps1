# AssetFlow Local HTTP Server (Zero-Dependency)
$port = 8080
$url = "http://localhost:$port/"

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
} catch {
    Write-Host "Port $port is busy or unavailable. Trying port 8081..." -ForegroundColor Yellow
    $port = 8081
    $url = "http://localhost:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " AssetFlow Live Server is RUNNING at:" -ForegroundColor Green
Write-Host " $url" -ForegroundColor Green
Write-Host " (Press Ctrl+C in this window to stop the server)" -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

# Automatically launch the default browser
try {
    Start-Process $url
} catch {
    Write-Host "Could not auto-open browser. Please visit $url manually." -ForegroundColor Yellow
}

$mimeMap = @{
    ".html"        = "text/html; charset=utf-8"
    ".css"         = "text/css; charset=utf-8"
    ".js"          = "application/javascript; charset=utf-8"
    ".json"        = "application/json; charset=utf-8"
    ".svg"         = "image/svg+xml"
    ".png"         = "image/png"
    ".jpg"         = "image/jpeg"
    ".jpeg"        = "image/jpeg"
    ".ico"         = "image/x-icon"
    ".woff"        = "font/woff"
    ".woff2"       = "font/woff2"
    ".ttf"         = "font/ttf"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        if ($path -eq "/" -or [string]::IsNullOrWhiteSpace($path)) { $path = "/index.html" }
        
        $localPath = Join-Path $PSScriptRoot ($path.TrimStart('/'))

        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $contentType = $mimeMap[$ext]
            if (-not $contentType) { $contentType = "application/octet-stream" }
            $response.ContentType = $contentType
            $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
} finally {
    if ($listener -ne $null -and $listener.IsListening) {
        $listener.Stop()
        $listener.Close()
    }
    Write-Host "Server stopped." -ForegroundColor Yellow
}
