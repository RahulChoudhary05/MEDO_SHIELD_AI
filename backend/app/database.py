from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
import os
import dns.resolver

# Configure global DNS resolver to use public DNS servers (Google + Cloudflare)
# This bypasses local DNS that may be blocking MongoDB Atlas
def setup_dns_resolver():
    """Configure DNS resolver to use reliable public DNS servers."""
    try:
        # Set default DNS resolver globally
        default_resolver = dns.resolver.get_default_resolver()
        default_resolver.nameservers = ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']
        default_resolver.timeout = 10
        default_resolver.lifetime = 30
        print("✓ DNS resolver configured (Google DNS + Cloudflare)")
    except Exception as e:
        print(f"⚠ DNS resolver setup warning: {e}")

# Set up DNS immediately on module import
setup_dns_resolver()

class Settings(BaseSettings):
    model_config = ConfigDict(extra='ignore', env_file='.env')
    
    MONGODB_URL: str = "mongodb+srv://rahulchoudharysk:7qBpnPAD3IdqFphP@cluster0.f4bimdu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    MONGODB_FALLBACK_URL: str = ""
    MONGODB_DB: str = "neuro_shield"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FFT_SAMPLE_RATE: float = 30.0
    BASELINE_SESSIONS: int = 7
    DEVIATION_THRESHOLD: float = 2.5
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    MEDICATION_DATA_PATH: str = "backend/data/medications_sample.json"
    ALLOW_SAMPLE_MEDICATIONS: bool = False
    KAGGLE_API_TOKEN: str = ""
    KAGGLE_USERNAME: str = ""
    KAGGLE_KEY: str = ""
    KAGGLE_DATASET: str = ""
    KAGGLE_DATA_FILE: str = ""
    KAGGLE_DATA_DIR: str = "backend/data/kaggle"

settings = Settings()

class Database:
    client = None
    db = None
    demo_mode = False

    @classmethod
    async def connect_db(cls):
        """Connect to MongoDB Atlas using direct connection (bypass SRV DNS)."""
        print("🔄 Connecting to MongoDB Atlas...")
        
        # Direct connection string - bypass SRV DNS lookup that's being blocked
        # Resolved from SRV record: ac-inlt5ae-shard-00-00/01/02.f4bimdu.mongodb.net
        # Replica Set: atlas-lxbtdw-shard-0
        direct_connection = (
            f"mongodb://rahulchoudharysk:7qBpnPAD3IdqFphP@"
            f"ac-inlt5ae-shard-00-00.f4bimdu.mongodb.net:27017,"
            f"ac-inlt5ae-shard-00-01.f4bimdu.mongodb.net:27017,"
            f"ac-inlt5ae-shard-00-02.f4bimdu.mongodb.net:27017/"
            f"?replicaSet=atlas-lxbtdw-shard-0"
            f"&authSource=admin"
            f"&retryWrites=true"
            f"&w=majority"
            f"&tls=true"
            f"&tlsAllowInvalidCertificates=false"
        )
        
        print(f"   → Using direct connection (bypassing SRV DNS)")
        
        max_retries = 3
        
        for attempt in range(1, max_retries + 1):
            try:
                print(f"   → Attempt {attempt}/{max_retries}...")
                
                # Create client with optimized settings for Atlas
                cls.client = AsyncIOMotorClient(
                    direct_connection,
                    serverSelectionTimeoutMS=30000,
                    connectTimeoutMS=30000,
                    socketTimeoutMS=30000,
                    retryWrites=True,
                    retryReads=True,
                    maxPoolSize=50,
                    minPoolSize=10,
                    maxIdleTimeMS=45000,
                    waitQueueTimeoutMS=10000,
                )
                
                cls.db = cls.client[settings.MONGODB_DB]

                # Test connection with ping
                await cls.client.admin.command('ping')
                
                # Create indexes
                await cls._create_indexes()
                cls.demo_mode = False
                
                print(f"\n✅ Connected to MongoDB Atlas!")
                print(f"✅ Database: {settings.MONGODB_DB}")
                print(f"✅ Replica Set: atlas-lxbtdw-shard-0")
                print(f"✅ Data persistence: ENABLED\n")
                return
                
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)[:150]
                
                print(f"   ⚠ Attempt {attempt} failed: {error_type}")
                print(f"      {error_msg}")
                
                if attempt < max_retries:
                    import asyncio
                    print(f"   → Retrying in 2 seconds...")
                    await asyncio.sleep(2)
                    
                    # Close failed connection
                    if cls.client:
                        try:
                            cls.client.close()
                        except:
                            pass
                    cls.client = None
                    cls.db = None
                else:
                    # All retries exhausted
                    print(f"\n❌ CRITICAL: Failed to connect to MongoDB Atlas after {max_retries} attempts")
                    print(f"❌ Error: {error_type}")
                    print(f"\n🔧 Troubleshooting:")
                    print(f"   1. Check MongoDB Atlas is running")
                    print(f"   2. Verify credentials are correct")
                    print(f"   3. Check firewall allows port 27017")
                    print(f"   4. Ensure IP whitelist includes your IP (0.0.0.0/0 or specific)")
                    
                    # CRITICAL: Raise error instead of demo mode
                    raise RuntimeError(
                        f"Cannot start application: MongoDB Atlas connection failed. "
                        f"Error: {error_type} - {error_msg}"
                    )

    @classmethod
    def get_db(cls):
        """Get database instance (Atlas only, no demo mode)."""
        if cls.client is not None and cls.db is not None:
            return cls.db
        # If database is not connected, raise an error
        raise RuntimeError("Database not connected. Please ensure MongoDB Atlas is accessible.")

    @classmethod
    async def close_db(cls):
        """Close MongoDB connection."""
        if cls.client:
            try:
                cls.client.close()
                print("Disconnected from MongoDB")
            except Exception:
                pass

    @classmethod
    async def _create_indexes(cls):
        """Create database indexes for optimal performance."""
        if cls.db is None:
            return

        try:
            # Patients collection indexes
            patients_collection = cls.db["patients"]
            await patients_collection.create_index("user_id", unique=True)
            await patients_collection.create_index("email", unique=True)

            # Analysis sessions collection indexes
            sessions_collection = cls.db["analysis_sessions"]
            await sessions_collection.create_index("patient_id")
            await sessions_collection.create_index("created_at")
            await sessions_collection.create_index([("patient_id", 1), ("created_at", -1)])

            # Baselines collection indexes
            baselines_collection = cls.db["baselines"]
            await baselines_collection.create_index("patient_id", unique=True)

            # Risk assessments collection indexes
            risk_collection = cls.db["risk_assessments"]
            await risk_collection.create_index("patient_id")
            await risk_collection.create_index("session_id")

            print("Indexes created successfully")
        except Exception as e:
            print(f"Index creation skipped: {str(e)}")


class DemoDatabase:
    """Demo in-memory database for development without MongoDB."""
    _data = {
        "patients": {},
        "analysis_sessions": {},
        "baselines": {},
        "risk_assessments": {}
    }
    
    async def command(self, cmd, **kwargs):
        """Mock command method."""
        return {"ok": 1}
    
    def __getitem__(self, key):
        """Get collection by name."""
        return DemoCollection(key)


class DemoCollection:
    """Demo in-memory collection."""
    def __init__(self, name):
        self.name = name
        if name not in DemoDatabase._data:
            DemoDatabase._data[name] = {}
        self.data = DemoDatabase._data[name]
    
    async def find_one(self, query):
        """Find a single document."""
        for doc in self.data.values():
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                return doc
        return None
    
    async def find(self, query=None):
        """Find documents and return a demo cursor."""
        if query is None:
            results = list(self.data.values())
        else:
            results = []
            for doc in self.data.values():
                match = True
                for k, v in query.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    results.append(doc)
        return DemoCursor(results)
    
    async def insert_one(self, doc):
        """Insert a document."""
        doc_id = str(len(self.data))
        self.data[doc_id] = doc
        class Result:
            inserted_id = doc_id
        return Result()
    
    async def update_one(self, query, update):
        """Update a document."""
        for doc in self.data.values():
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                doc.update(update.get('$set', {}))
                return

    async def update_many(self, query, update):
        """Update multiple documents."""
        for doc in self.data.values():
            match = True
            for k, v in query.items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                doc.update(update.get('$set', {}))

    async def count_documents(self, query=None):
        cursor = await self.find(query)
        return len(await cursor.to_list(1000))
    
    async def create_index(self, name, unique=False):
        """Mock index creation."""
        pass


class DemoCursor:
    """Demo cursor with sort and to_list support."""
    def __init__(self, items):
        self.items = items

    def sort(self, key, direction):
        reverse = direction < 0
        self.items = sorted(self.items, key=lambda doc: doc.get(key), reverse=reverse)
        return self

    async def to_list(self, limit):
        if limit is None:
            return list(self.items)
        return list(self.items)[:limit]
