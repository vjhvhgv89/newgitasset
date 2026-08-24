$endpoints = @(
    "http://localhost:8080/",
    "http://localhost:8080/style.css",
    "http://localhost:8080/app.js"
)

foreach ($url in $endpoints) {
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        Write-Host "SUCCESS: $url -> Status $($res.StatusCode), Length: $($res.RawContentLength) bytes"
    } catch {
        Write-Host "ERROR: $url -> $($_.Exception.Message)"
    }
}
