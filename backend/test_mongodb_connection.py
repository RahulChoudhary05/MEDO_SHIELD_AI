"""
MongoDB Connection Diagnostic Tool
===================================
Tests MongoDB Atlas connectivity and provides troubleshooting guidance.
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime


async def test_connection(connection_string: str, name: str):
    """Test a MongoDB connection string."""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}")
    
    try:
        print("🔄 Connecting...")
        client = AsyncIOMotorClient(
            connection_string,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        
        # Test the connection
        print("🔄 Pinging server...")
        result = await client.admin.command('ping')
        
        print("✓ Connection successful!")
        print(f"✓ Server response: {result}")
        
        # Get server info
        info = await client.server_info()
        print(f"✓ MongoDB version: {info.get('version', 'unknown')}")
        
        # List databases
        db_list = await client.list_database_names()
        print(f"✓ Available databases: {', '.join(db_list[:5])}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Connection failed!")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)[:300]}")
        
        # Provide specific guidance based on error type
        error_str = str(e).lower()
        if "dns" in error_str or "resolution" in error_str:
            print("\n💡 DNS Resolution Issue:")
            print("   → Your network cannot resolve MongoDB Atlas domain names")
            print("   → Solution 1: Change your DNS to Google DNS (8.8.8.8, 8.8.4.4)")
            print("   → Solution 2: Change your DNS to Cloudflare (1.1.1.1, 1.0.0.1)")
            print("   → Solution 3: Disable VPN/Proxy temporarily")
            print("   → Solution 4: Check Windows Firewall settings")
        elif "timeout" in error_str:
            print("\n💡 Connection Timeout:")
            print("   → MongoDB server is unreachable")
            print("   → Check your internet connection")
            print("   → Verify IP whitelist in MongoDB Atlas (should include 0.0.0.0/0)")
            print("   → Disable firewall/antivirus temporarily to test")
        elif "authentication" in error_str or "auth" in error_str:
            print("\n💡 Authentication Failed:")
            print("   → Check your username and password")
            print("   → Verify database user permissions in MongoDB Atlas")
        
        return False


async def main():
    """Run all connection tests."""
    print("\n" + "="*60)
    print("MongoDB Connection Diagnostic Tool")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Test Atlas connection
    atlas_url = "mongodb+srv://rahulchoudharysk:7qBpnPAD3IdqFphP@cluster0.f4bimdu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    atlas_success = await test_connection(atlas_url, "MongoDB Atlas (Cloud)")
    
    # Test local connection
    local_url = "mongodb://localhost:27017"
    local_success = await test_connection(local_url, "Local MongoDB")
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Atlas Connection: {'✓ WORKING' if atlas_success else '❌ FAILED'}")
    print(f"Local Connection: {'✓ WORKING' if local_success else '❌ FAILED'}")
    
    if not atlas_success and not local_success:
        print("\n⚠ RECOMMENDATION:")
        print("   → Your network is blocking MongoDB connections")
        print("   → The app will run in DEMO MODE (temporary data)")
        print("   → To fix: Follow the DNS troubleshooting steps above")
        print("   → Alternative: Install MongoDB Community locally")
        print("      Download: https://www.mongodb.com/try/download/community")
    elif atlas_success:
        print("\n✓ Atlas cloud database is working!")
        print("   → Your app will persist data to the cloud")
    elif local_success:
        print("\n✓ Local MongoDB is working!")
        print("   → Your app will use local database storage")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
        sys.exit(0)
