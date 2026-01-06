# EtherVox Anomaly Detection Testing Script
# Run this to test the fraud detection system

Write-Host "`n🧪 Testing EtherVox Anomaly Detection System`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/health' -Method Get
    Write-Host "✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Total Votes: $($health.total_votes_monitored)" -ForegroundColor Gray
    Write-Host "   ML Model: $($health.detection_systems.ml_model)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API is not running! Start with: python Database_API/main.py" -ForegroundColor Red
    exit
}

# Test 2: Normal Vote
Write-Host "`nTest 2: Normal Vote" -ForegroundColor Yellow
$vote1 = @{
    voter_id = 'U001'
    candidate_id = 1
    region = 'Maharashtra'
} | ConvertTo-Json

$result1 = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/log-vote' -Method Post -Body $vote1 -ContentType 'application/json'
Write-Host "   Status: $($result1.status)" -ForegroundColor Green
Write-Host "   Risk Score: $($result1.risk_score)" -ForegroundColor Gray
Write-Host "   Message: $($result1.message)" -ForegroundColor Gray

# Test 3: Simulate Multiple Votes from Same IP (IP Abuse)
Write-Host "`nTest 3: IP Abuse Detection (voting 6 times)" -ForegroundColor Yellow
for ($i = 1; $i -le 6; $i++) {
    $vote = @{
        voter_id = "U00$i"
        candidate_id = 1
        region = 'Maharashtra'
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/log-vote' -Method Post -Body $vote -ContentType 'application/json'
    
    if ($result.anomalies_detected) {
        Write-Host "   Vote $i : ⚠️  ANOMALY DETECTED!" -ForegroundColor Red
        Write-Host "   Risk Score: $($result.risk_score)" -ForegroundColor Red
        Write-Host "   Anomaly: $($result.anomaly_details[0].type) - $($result.anomaly_details[0].message)" -ForegroundColor Yellow
    } else {
        Write-Host "   Vote $i : ✅ Normal (Risk: $($result.risk_score))" -ForegroundColor Green
    }
    Start-Sleep -Milliseconds 500
}

# Test 4: Check Statistics
Write-Host "`nTest 4: View Statistics" -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/statistics' -Method Get
Write-Host "   Total Votes: $($stats.total_votes)" -ForegroundColor Gray
Write-Host "   Unique IPs: $($stats.unique_ips)" -ForegroundColor Gray
Write-Host "   Unique Devices: $($stats.unique_devices)" -ForegroundColor Gray
Write-Host "   Suspicious IPs: $($stats.suspicious_ips)" -ForegroundColor $(if ($stats.suspicious_ips -gt 0) { 'Red' } else { 'Green' })
Write-Host "   Suspicious Devices: $($stats.suspicious_devices)" -ForegroundColor $(if ($stats.suspicious_devices -gt 0) { 'Red' } else { 'Green' })

# Test 5: View Flagged Voters
Write-Host "`nTest 5: Flagged Voters" -ForegroundColor Yellow
$flagged = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/flagged-voters' -Method Get
if ($flagged.count -gt 0) {
    Write-Host "   🚨 Found $($flagged.count) suspicious activities:" -ForegroundColor Red
    foreach ($flag in $flagged.flagged_voters) {
        Write-Host "      - $($flag.type): $($flag.identifier) ($($flag.vote_count) votes)" -ForegroundColor Yellow
        Write-Host "        Voters: $($flag.voter_ids -join ', ')" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ No suspicious activity detected" -ForegroundColor Green
}

# Test 6: Regional Spike Test
Write-Host "`nTest 6: Regional Spike Detection" -ForegroundColor Yellow
Write-Host "   Simulating rapid votes from Mumbai..." -ForegroundColor Gray
for ($i = 1; $i -le 12; $i++) {
    $vote = @{
        voter_id = "M00$i"
        candidate_id = 2
        region = 'Mumbai'
    } | ConvertTo-Json
    
    $result = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/log-vote' -Method Post -Body $vote -ContentType 'application/json'
    
    if ($result.anomaly_details.type -contains 'REGIONAL_SPIKE') {
        Write-Host "   ⚠️  Regional spike detected at vote $i !" -ForegroundColor Red
        break
    }
    Start-Sleep -Milliseconds 200
}

# Final Statistics
Write-Host "`n📊 Final Statistics:" -ForegroundColor Cyan
$finalStats = Invoke-RestMethod -Uri 'http://127.0.0.1:8001/anomaly/statistics' -Method Get
Write-Host "   Total Votes Monitored: $($finalStats.total_votes)" -ForegroundColor White
Write-Host "   Suspicious IPs: $($finalStats.suspicious_ips)" -ForegroundColor $(if ($finalStats.suspicious_ips -gt 0) { 'Red' } else { 'Green' })
Write-Host "   Suspicious Devices: $($finalStats.suspicious_devices)" -ForegroundColor $(if ($finalStats.suspicious_devices -gt 0) { 'Red' } else { 'Green' })

Write-Host "`n✅ Testing Complete!" -ForegroundColor Green
Write-Host "   View full docs: http://127.0.0.1:8001/docs" -ForegroundColor Gray
Write-Host "   API Health: http://127.0.0.1:8001/anomaly/health`n" -ForegroundColor Gray
