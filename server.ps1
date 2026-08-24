$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server listening at http://localhost:$port/"

$mimeMap = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath
    if ($path -eq "/") { $path = "/index.html" }
    
    $localPath = Join-Path $PSScriptRoot ($path.TrimStart('/'))

    if (Test-Path $localPath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
        $contentType = $mimeMap[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }
        $response.ContentType = $contentType

        $bytes = [System.IO.File]::ReadAllBytes($localPath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.StatusCode = 200
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}
