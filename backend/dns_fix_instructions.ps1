# Fix DNS for MongoDB Atlas Connectivity
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "DNS Fix for MongoDB Atlas Connection" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current Issue:" -ForegroundColor Yellow
Write-Host "  Your DNS server (172.19.2.101) is timing out"
Write-Host "  MongoDB Atlas domains cannot be resolved"
Write-Host ""

Write-Host "Recommended Solution:" -ForegroundColor Green
Write-Host "  1. Change DNS to Google DNS (8.8.8.8, 8.8.4.4)"
Write-Host "  2. Or use Cloudflare DNS (1.1.1.1, 1.0.0.1)"
Write-Host ""

Write-Host "Quick Fix: Manual Method (Recommended)" -ForegroundColor White
Write-Host "1. Open Windows Settings -> Network & Internet"
Write-Host "2. Click 'Change adapter options'"
Write-Host "3. Right-click your active network -> Properties"
Write-Host "4. Select 'Internet Protocol Version 4 (TCP/IPv4)' -> Properties"
Write-Host "5. Choose 'Use the following DNS server addresses:'"
Write-Host "   Preferred DNS: 8.8.8.8"
Write-Host "   Alternate DNS: 8.8.4.4"
Write-Host "6. Click OK and restart your connection"
Write-Host ""

Write-Host "NOTE: The backend is currently running in DEMO MODE" -ForegroundColor Yellow
Write-Host "All features work, but data is temporary (not saved)" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
