# Fix DNS for MongoDB Atlas Connectivity
# ========================================
# This script changes your DNS to Google DNS to resolve MongoDB Atlas domains

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "DNS Fix for MongoDB Atlas Connection" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "Current Issue:" -ForegroundColor Yellow
Write-Host "  → Your DNS server (172.19.2.101) is timing out"
Write-Host "  → MongoDB Atlas domains cannot be resolved"
Write-Host "  → This prevents cloud database connection`n"

Write-Host "Recommended Solution:" -ForegroundColor Green
Write-Host "  1. Change DNS to Google DNS (8.8.8.8, 8.8.4.4)"
Write-Host "  2. Or use Cloudflare DNS (1.1.1.1, 1.0.0.1)`n"

Write-Host "Quick Fix Options:`n" -ForegroundColor Cyan

Write-Host "Option 1: Manual Fix (Recommended)" -ForegroundColor White
Write-Host "==========" -ForegroundColor White
Write-Host "1. Open Windows Settings → Network & Internet"
Write-Host "2. Click 'Change adapter options'"
Write-Host "3. Right-click your active network → Properties"
Write-Host "4. Select 'Internet Protocol Version 4 (TCP/IPv4)' → Properties"
Write-Host "5. Choose 'Use the following DNS server addresses:'"
Write-Host "   Preferred DNS: 8.8.8.8"
Write-Host "   Alternate DNS: 8.8.4.4"
Write-Host "6. Click OK and restart your connection`n"

Write-Host "Option 2: PowerShell Command (Requires Admin)" -ForegroundColor White
Write-Host "==========" -ForegroundColor White
Write-Host "Run PowerShell as Administrator and execute:"
Write-Host "Get-NetAdapter | Where-Object {`$_.Status -eq 'Up'} | Set-DnsClientServerAddress -ServerAddresses ('8.8.8.8','8.8.4.4')" -ForegroundColor Yellow
Write-Host "`nThen restart the backend.`n"

Write-Host "Option 3: Install Local MongoDB (No DNS needed)" -ForegroundColor White
Write-Host "==========" -ForegroundColor White
Write-Host "1. Download: https://www.mongodb.com/try/download/community"
Write-Host "2. Install MongoDB Community Edition"
Write-Host "3. Restart the backend - it will auto-connect to localhost`n"

Write-Host "Option 4: Temporary VPN/Proxy Bypass" -ForegroundColor White
Write-Host "==========" -ForegroundColor White
Write-Host "1. Disable any active VPN connections"
Write-Host "2. Check Windows Firewall settings"
Write-Host "3. Temporarily disable antivirus DNS filtering`n"

Write-Host "============================================================`n" -ForegroundColor Cyan

# Detect current network adapter
Write-Host "Detecting network adapters...`n" -ForegroundColor Cyan
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}

if ($adapters) {
    Write-Host "Active Network Adapters:" -ForegroundColor Green
    $adapters | ForEach-Object {
        Write-Host "  → $($_.Name) ($($_.InterfaceDescription))"
        
        # Get current DNS settings
        $dnsSettings = Get-DnsClientServerAddress -InterfaceAlias $_.Name -AddressFamily IPv4
        if ($dnsSettings.ServerAddresses) {
            Write-Host "    Current DNS: $($dnsSettings.ServerAddresses -join ', ')" -ForegroundColor Yellow
        } else {
            Write-Host "    Current DNS: Automatic (DHCP)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} else {
    Write-Host "No active network adapters found." -ForegroundColor Red
}

Write-Host "`nNOTE: The backend is currently running in DEMO MODE" -ForegroundColor Yellow
Write-Host "All features work, but data is temporary (not saved)`n"

# Ask if user wants to attempt automatic fix
$response = Read-Host "Would you like to attempt automatic DNS fix? (Requires Admin) [y/N]"

if ($response -eq 'y' -or $response -eq 'Y') {
    # Check if running as admin
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Host "`n❌ This script is not running as Administrator." -ForegroundColor Red
        Write-Host "Please right-click PowerShell and select 'Run as Administrator'`n"
        exit 1
    }
    
    Write-Host "`nApplying Google DNS to all active adapters..." -ForegroundColor Cyan
    
    try {
        Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | ForEach-Object {
            $adapterName = $_.Name
            Write-Host "  Updating $adapterName..."
            Set-DnsClientServerAddress -InterfaceAlias $adapterName -ServerAddresses ('8.8.8.8','8.8.4.4')
        }
        
        Write-Host "`n✓ DNS updated successfully!" -ForegroundColor Green
        Write-Host "Please restart your backend server to test the connection`n"
        
    } catch {
        Write-Host "`n❌ Failed to update DNS: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please use manual method instead`n"
    }
} else {
    Write-Host "`nNo changes made. Please use one of the manual methods above.`n" -ForegroundColor Yellow
}

Write-Host "============================================================`n" -ForegroundColor Cyan
