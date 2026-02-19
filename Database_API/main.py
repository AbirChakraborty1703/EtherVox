"""
EtherVox Decentralized Voting System - Database API

@file main.py
@author EtherVox Development Team
@description FastAPI backend service for voter authentication and database management
@version 1.0.0

Features:
- JWT token authentication
- MySQL database integration
- CORS support for frontend communication
- RESTful API endpoints
- Secure voter credential management
"""

# Import required modules for API functionality
import dotenv
import os
import sys
import json
import mysql.connector
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from mysql.connector import errorcode
import jwt
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import bcrypt

# ===============================================
# CONSTANTS
# ===============================================
BEARER_PREFIX = "Bearer "
AUTH_HEADER_MISSING = "Missing or invalid authorization header"
CANDIDATE_NOT_FOUND = "Candidate not found"

# Set UTF-8 encoding for Windows console
if sys.platform.startswith('win'):
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except (AttributeError, ValueError, TypeError) as e:
        # Fallback if UTF-8 setting fails
        print(f"[WARNING] UTF-8 encoding setup failed: {e}")

# Loading the environment variables for database configuration
# Load from parent directory's .env file (override=True ensures .env wins over existing env vars)
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
dotenv.load_dotenv(env_path, override=True)
print(f"[INFO] Loading environment from: {env_path}")
print(f"[INFO] .env file exists: {os.path.isfile(env_path)}")
print(f"[INFO] SECRET_KEY loaded: {'Yes' if os.environ.get('SECRET_KEY') else 'No (using fallback)'}")

# Load SECRET_KEY AFTER dotenv so we get the real value from .env
SECRET_KEY_FALLBACK = os.environ.get('SECRET_KEY', 'ethervox-secret-key-2024')
print(f"[INFO] SECRET_KEY in use (first 20 chars): {SECRET_KEY_FALLBACK[:20]}...")

# Initialize the FastAPI application instance
app = FastAPI()

# Define the allowed origins for Cross-Origin Resource Sharing (CORS)
origins = [
    "http://localhost:8080",    # Local development server
    "http://127.0.0.1:8080",   # Alternative localhost address
    "http://localhost:8081",    # New port for Express server
    "http://127.0.0.1:8081",   # Alternative localhost address for new port
    "http://localhost",         # Default localhost
    "http://127.0.0.1",        # Default 127.0.0.1
    "*"                         # Allow all origins for development
]

# Configure CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Allowed origin URLs
    allow_credentials=True,     # Allow credentials in requests
    allow_methods=["*"],        # Allow all HTTP methods
    allow_headers=["*"],        # Allow all headers
)

# ===============================================
# DATABASE CONNECTIONS
# ===============================================

# ===============================================
# REGISTER AI/ML FEATURE ROUTERS
# ===============================================
try:
    from anomaly_routes import router as anomaly_router
    app.include_router(anomaly_router, prefix="/anomaly", tags=["Anomaly Detection"])
    print("[OK] Anomaly detection routes registered")
except ImportError as e:
    print(f"[WARNING] Anomaly detection routes not available: {e}")

try:
    from face_auth_routes import router as face_auth_router
    app.include_router(face_auth_router, prefix="/face-auth", tags=["Face Authentication"])
    print("[OK] Face authentication routes registered")
except ImportError as e:
    print(f"[WARNING] Face authentication routes not available: {e}")

try:
    from liveness_routes import router as liveness_router
    app.include_router(liveness_router, prefix="/liveness", tags=["Liveness Detection"])
    print("[OK] Liveness detection routes registered")
except ImportError as e:
    print(f"[WARNING] Liveness detection routes not available: {e}")

# Establish MySQL database connection using environment variables
try:
    cnx = mysql.connector.connect(
        user=os.environ.get('MYSQL_USER', 'root'),              # Database username
        password=os.environ.get('MYSQL_PASSWORD', ''),          # Database password
        host=os.environ.get('MYSQL_HOST', 'localhost'),         # Database host
        port=int(os.environ.get('MYSQL_PORT', '3306')),         # Database port
        database=os.environ.get('MYSQL_DB', 'ethervox_voting'), # Database name
        charset='utf8mb4',                                       # Character set
        collation='utf8mb4_unicode_ci',                         # Collation
        autocommit=True                                         # Auto-commit transactions
    )
    # Use DictCursor to return results as dictionaries instead of tuples
    cursor = cnx.cursor(dictionary=True)
    print("[OK] MySQL Database connection established successfully!")
    print(f"Connected to MySQL database: {os.environ.get('MYSQL_DB', 'ethervox_voting')}")
except mysql.connector.Error as err:
    # Handle database connection errors
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("[ERROR] Something is wrong with your MySQL username or password")
        print("Please check your .env file and MySQL credentials")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("[ERROR] Database does not exist")
        print("Please run the setup_database.sql script in MySQL Workbench first")
    else:
        print(f"[ERROR] Database connection error: {err}")
    exit(1)

# Establish MongoDB connection for candidate data storage
try:
    # MongoDB connection URL from environment variables
    MONGODB_URL = os.environ.get('MONGODB_URL', 'mongodb://localhost:27017')
    MONGODB_DB = os.environ.get('MONGODB_DB', 'ethervox_candidates')
    MONGODB_COLLECTION = os.environ.get('MONGODB_COLLECTION', 'candidates')
    
    # Create MongoDB client
    mongo_client = AsyncIOMotorClient(MONGODB_URL)
    mongo_db = mongo_client[MONGODB_DB]
    candidates_collection = mongo_db[MONGODB_COLLECTION]
    
    print("[OK] MongoDB Database connection established successfully!")
    print(f"Connected to MongoDB database: {MONGODB_DB}")
    print(f"Candidate collection: {MONGODB_COLLECTION}")
    
except Exception as err:
    print(f"[ERROR] MongoDB connection error: {err}")
    print("Make sure MongoDB is running on your system")
    print("You can start MongoDB using: mongod --dbpath Database_API/mongodb_data")
    exit(1)

# ===============================================
# BLOCKCHAIN (WEB3) CONNECTION
# ===============================================
# Server-side Web3 connection to Ganache for automatic candidate sync
# This eliminates the need for MetaMask or CLI commands

w3 = None
voting_contract = None
blockchain_account = None

def init_blockchain():
    """Initialize Web3 connection and Voting contract for server-side blockchain operations."""
    global w3, voting_contract, blockchain_account
    try:
        from web3 import Web3

        # Connect to Ganache (local Ethereum node)
        ganache_url = os.environ.get('GANACHE_URL', 'http://127.0.0.1:7545')
        w3 = Web3(Web3.HTTPProvider(ganache_url))

        if not w3.is_connected():
            print(f"[WARNING] Cannot connect to Ganache at {ganache_url}")
            print("[WARNING] Blockchain auto-sync will be disabled")
            w3 = None
            return False

        # Get the first Ganache account (contract deployer / owner)
        accounts = w3.eth.accounts
        if not accounts:
            print("[WARNING] No Ganache accounts available")
            w3 = None
            return False
        blockchain_account = accounts[0]

        # Load contract ABI and address from build artifacts
        contract_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'build', 'contracts', 'Voting.json'
        )

        if not os.path.isfile(contract_path):
            print(f"[WARNING] Contract artifacts not found at {contract_path}")
            print("[WARNING] Please deploy the contract first: truffle migrate --reset")
            w3 = None
            return False

        with open(contract_path, 'r') as f:
            contract_json = json.load(f)

        abi = contract_json['abi']
        networks = contract_json.get('networks', {})

        # Find deployed address (try network 5777, then any available)
        deployed = networks.get('5777') or networks.get('1337')
        if not deployed:
            for net_id, net_data in networks.items():
                if net_data.get('address'):
                    deployed = net_data
                    break

        if not deployed or not deployed.get('address'):
            print("[WARNING] Voting contract not deployed on any network")
            print("[WARNING] Please deploy: truffle migrate --reset")
            w3 = None
            return False

        contract_address = deployed['address']
        voting_contract = w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=abi
        )

        # Verify the account is the contract owner
        owner = voting_contract.functions.owner().call()
        if owner.lower() != blockchain_account.lower():
            print(f"[WARNING] Ganache account {blockchain_account} is not the contract owner ({owner})")
            print("[WARNING] Using contract owner account instead")
            blockchain_account = owner

        count = voting_contract.functions.getCountCandidates().call()
        print(f"[OK] Blockchain connected: Ganache at {ganache_url}")
        print(f"[OK] Voting contract at: {contract_address}")
        print(f"[OK] Using account: {blockchain_account}")
        print(f"[OK] Candidates on blockchain: {count}")
        return True

    except ImportError:
        print("[WARNING] web3 package not installed. Run: pip install web3")
        print("[WARNING] Blockchain auto-sync will be disabled")
        w3 = None
        return False
    except Exception as e:
        print(f"[WARNING] Blockchain initialization failed: {e}")
        print("[WARNING] Blockchain auto-sync will be disabled")
        w3 = None
        return False

# Initialize blockchain on module load
init_blockchain()


async def add_candidate_to_blockchain(candidate_data: dict) -> dict:
    """
    Add a single candidate to the blockchain via server-side Web3.
    No MetaMask needed — uses Ganache account directly.

    Returns dict with 'success', 'tx_hash', 'error' keys.
    """
    global w3, voting_contract, blockchain_account

    if not w3 or not voting_contract or not blockchain_account:
        return {"success": False, "tx_hash": None, "error": "Blockchain not connected"}

    try:
        # Check if candidate already exists on blockchain (prevent duplicates)
        count = voting_contract.functions.getCountCandidates().call()
        for i in range(1, count + 1):
            try:
                bc_candidate = voting_contract.functions.getCandidate(i).call()
                # bc_candidate[12] is candidateId
                if str(bc_candidate[12]).lower().strip() == str(candidate_data.get('candidateId', '')).lower().strip():
                    print(f"[BLOCKCHAIN] Candidate {candidate_data.get('candidateId')} already exists on blockchain (ID: {i})")
                    return {
                        "success": True,
                        "tx_hash": "already_synced",
                        "error": None,
                        "already_existed": True
                    }
            except Exception:
                continue

        # Build transaction
        tx = voting_contract.functions.addCandidate(
            str(candidate_data.get('name', 'Unknown')),
            int(candidate_data.get('age', 18)),
            str(candidate_data.get('dateOfBirth', '01-01-2000')),
            str(candidate_data.get('panNumber', 'XXXXX0000X')),
            str(candidate_data.get('aadharNumber', '000000000000')).replace(' ', ''),
            str(candidate_data.get('voterEpicNumber', 'XXX0000000')),
            str(candidate_data.get('electionCenter', 'Default Election Center')),
            str(candidate_data.get('party', 'Independent')),
            str(candidate_data.get('candidateAddress', 'Not Provided')),
            str(candidate_data.get('email', 'not@provided.com')),
            str(candidate_data.get('phoneNumber', '0000000000')),
            str(candidate_data.get('candidateId', 'UNKNOWN')),
            str(candidate_data.get('candidatePassword', 'hashed_password'))
        ).transact({
            'from': blockchain_account,
            'gas': 3000000
        })

        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx)
        tx_hash = receipt['transactionHash'].hex()

        print(f"[BLOCKCHAIN] ✅ Candidate '{candidate_data.get('name')}' added to blockchain. TX: {tx_hash}")
        return {"success": True, "tx_hash": tx_hash, "error": None, "already_existed": False}

    except Exception as e:
        error_msg = str(e)
        print(f"[BLOCKCHAIN] ❌ Failed to add '{candidate_data.get('name')}' to blockchain: {error_msg}")
        return {"success": False, "tx_hash": None, "error": error_msg}

# ===============================================
# STARTUP EVENT - Verify MongoDB Connection
# ===============================================

@app.on_event("startup")
async def startup_db_client():
    """
    Verify MongoDB connection on startup
    """
    try:
        # Test MongoDB connection
        await mongo_db.command('ping')
        print("[STARTUP] MongoDB connection verified successfully!")
        
        # Count candidates in database
        candidate_count = await candidates_collection.count_documents({})
        print(f"[INFO] Found {candidate_count} candidates in database")
        
    except Exception as e:
        print(f"[WARNING] MongoDB connection test failed: {e}")
        print("[WARNING] Candidate login may not work until MongoDB is properly connected")

@app.on_event("shutdown")
async def shutdown_db_client():
    """
    Close MongoDB connection on shutdown
    """
    mongo_client.close()
    print("[SHUTDOWN] MongoDB connection closed")

# ===============================================
# DATA MODELS
# ===============================================

# Pydantic model for candidate data
class CandidateModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=18, le=120)
    dateOfBirth: str = Field(..., description="Date in YYYY-MM-DD format")
    panNumber: str = Field(..., min_length=10, max_length=10, pattern=r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', description="PAN Number (Format: ABCDE1234F)")
    aadharNumber: str = Field(..., min_length=12, max_length=14, description="Aadhar Number (12 digits, may include spaces)")
    voterEpicNumber: str = Field(..., min_length=10, max_length=10, pattern=r'^[A-Z]{3}[0-9]{7}$', description="Voter EPIC Number (Format: ABC1234567)")
    electionCenter: Optional[str] = Field(default="Default Election Center", max_length=200)
    party: str = Field(..., min_length=1, max_length=100)
    candidateAddress: str = Field(..., min_length=1, max_length=300)
    email: str = Field(..., pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    phoneNumber: str = Field(..., min_length=10, max_length=15)
    candidateId: str = Field(..., min_length=1, max_length=50)
    candidatePassword: str = Field(..., min_length=8)
    electionStartDate: Optional[str] = Field(default=None, description="Election start date in ISO format")
    electionEndDate: Optional[str] = Field(default=None, description="Election end date in ISO format")
    createdAt: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())
    blockchainAddress: Optional[str] = Field(default=None, description="Blockchain transaction hash")
    blockchainAccount: Optional[str] = Field(default=None, description="MetaMask account that added the candidate")
    isActive: bool = Field(default=True)

class CandidateResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    age: int
    dateOfBirth: str
    panNumber: str
    aadharNumber: str
    voterEpicNumber: str
    electionCenter: str
    party: str
    candidateAddress: str
    email: str
    phoneNumber: str
    candidateId: str
    electionStartDate: str
    electionEndDate: str
    createdAt: str
    blockchainAddress: Optional[str] = None
    isActive: bool

    class Config:
        populate_by_name = True

# ===============================================
# AUTHENTICATION MIDDLEWARE
# ===============================================

# Authentication middleware to verify voter credentials
def authenticate(request: Request):
    """
    Synchronous authentication function to verify voter credentials.
    Note: This is not async as it performs blocking database operations.
    """
    try:
        # Extract Bearer token from authorization header
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith(BEARER_PREFIX):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=AUTH_HEADER_MISSING
            )
        
        api_key = auth_header.replace(BEARER_PREFIX, "")
        
        # Verify voter exists in database using parameterized query
        cursor.execute("SELECT voter_id FROM voters WHERE voter_id = %s", (api_key,))
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
    except mysql.connector.Error as db_err:
        print(f"Database error in authentication: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database authentication error"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

# Login endpoint for voter authentication and JWT token generation
@app.get("/login")
async def login(voter_id: str, password: str):
    """
    Authenticate user and return JWT token
    
    Args:
        voter_id (str): The voter's unique identifier
        password (str): The voter's password
    
    Returns:
        dict: Contains JWT token and user role
    """
    try:
        # First, fetch user from database
        cursor.execute(
            "SELECT voter_id, password FROM voters WHERE voter_id = %s", 
            (voter_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter ID or password"
            )
        
        # Verify password - check if it's bcrypt hashed or plain text
        stored_password = user['password']
        password_valid = False
        
        if stored_password and stored_password.startswith('$2b$'):
            # Bcrypt hashed password
            password_valid = bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8'))
        else:
            # Plain text password (for backwards compatibility)
            password_valid = (password == stored_password)
        
        if not password_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter ID or password"
            )
        
        # Try to get role if column exists, otherwise default to 'user'
        try:
            cursor.execute("SELECT role FROM voters WHERE voter_id = %s", (voter_id,))
            role_result = cursor.fetchone()
            if role_result and 'role' in role_result:
                user_role = role_result['role']
            else:
                user_role = 'admin' if voter_id.startswith('A') else 'user'
        except mysql.connector.Error:
            # Role column doesn't exist, default to 'user' for regular users, 'admin' for A-prefixed IDs
            user_role = 'admin' if voter_id.startswith('A') else 'user'
        
        # Generate JWT token with user information
        token_payload = {
            'voter_id': user['voter_id'],
            'role': user_role,
            'exp': datetime.now(timezone.utc) + timedelta(hours=24)  # Token expires in 24 hours
        }
        
        token = jwt.encode(token_payload, SECRET_KEY_FALLBACK, algorithm='HS256')
        
        return {
            'success': True,
            'token': token,
            'role': user_role,
            'user': {
                'voter_id': user['voter_id']
            }
        }
        
    except mysql.connector.Error as db_err:
        print(f"Database error in login: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error during authentication"
        )
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

# Helper function to determine user role based on credentials (deprecated - now handled in login)
def get_role(voter_id, password):
    """
    Synchronous function to get user role.
    Note: This is not async as it performs blocking database operations.
    """
    try:
        # Query database for user with credentials
        cursor.execute("SELECT voter_id FROM voters WHERE voter_id = %s AND password = %s", (voter_id, password,))
        result = cursor.fetchone()
        if result:
            # Default role logic: admin if starts with 'A', otherwise user
            return 'admin' if voter_id.startswith('A') else 'user'
        else:
            # Raise exception for invalid credentials
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter id or password"
            )
    except mysql.connector.Error as db_err:
        print(f"Database error in get_role: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )

# ===============================================
# CANDIDATE MANAGEMENT ENDPOINTS (MongoDB)
# ===============================================

@app.post("/candidates")
async def create_candidate(candidate: CandidateModel):
    """
    Create a new candidate profile in MongoDB and AUTOMATICALLY sync to blockchain.
    No MetaMask or CLI commands needed — server handles blockchain registration.
    
    Args:
        candidate (CandidateModel): Candidate data
    
    Returns:
        dict: Created candidate information with MongoDB ID and blockchain status
    """
    try:
        # Convert pydantic model to dict and prepare for MongoDB
        candidate_dict = candidate.model_dump()
        
        # Keep the raw password for blockchain (contract stores as-is)
        raw_password = candidate_dict['candidatePassword']
        
        # Hash the password before storing in MongoDB
        candidate_dict['candidatePassword'] = hashlib.sha256(
            raw_password.encode()
        ).hexdigest()
        
        # Insert candidate into MongoDB first
        result = await candidates_collection.insert_one(candidate_dict)
        mongo_id = str(result.inserted_id)
        
        # ========================================
        # AUTO-SYNC TO BLOCKCHAIN (server-side)
        # ========================================
        blockchain_result = {"success": False, "tx_hash": None, "error": "Not attempted"}
        
        if w3 and voting_contract:
            # Use SHA-256 hashed password for blockchain (consistent with sync-all endpoint)
            blockchain_data = candidate.model_dump()
            blockchain_data['candidatePassword'] = candidate_dict['candidatePassword']  # SHA-256 hash
            
            blockchain_result = await add_candidate_to_blockchain(blockchain_data)
            
            if blockchain_result["success"]:
                # Update MongoDB with blockchain sync status
                await candidates_collection.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {
                        "syncedToBlockchain": True,
                        "blockchainAddress": blockchain_result["tx_hash"],
                        "blockchainAccount": blockchain_account,
                        "syncedAt": datetime.now().isoformat()
                    }}
                )
                print(f"[AUTO-SYNC] ✅ Candidate '{candidate_dict.get('name')}' saved to MongoDB + blockchain")
            else:
                print(f"[AUTO-SYNC] ⚠️ Candidate saved to MongoDB but blockchain sync failed: {blockchain_result['error']}")
        else:
            print(f"[AUTO-SYNC] ⚠️ Blockchain not connected — candidate saved to MongoDB only")
        
        # Get the created candidate (with sync status updates)
        created_candidate = await candidates_collection.find_one(
            {"_id": result.inserted_id}
        )
        
        # Convert ObjectId to string for JSON response
        created_candidate["_id"] = str(created_candidate["_id"])
        
        return {
            "message": "Candidate created successfully",
            "candidate": created_candidate,
            "mongodb_id": mongo_id,
            "blockchain": {
                "synced": blockchain_result["success"],
                "tx_hash": blockchain_result.get("tx_hash"),
                "error": blockchain_result.get("error")
            }
        }
        
    except Exception as e:
        print(f"Error creating candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create candidate: {str(e)}"
        )


@app.post("/candidates/sync-all")
async def sync_all_candidates_to_blockchain():
    """
    Sync ALL unsynced candidates from MongoDB to blockchain (server-side).
    Called by the 'Sync All to Blockchain' button — no MetaMask needed.
    
    Returns:
        dict: Summary of sync results
    """
    if not w3 or not voting_contract:
        # Try to reconnect
        init_blockchain()
        if not w3 or not voting_contract:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Blockchain not connected. Please ensure Ganache is running."
            )
    
    try:
        # Fetch all active candidates from MongoDB
        candidates = []
        async for candidate in candidates_collection.find({"isActive": True}):
            candidates.append(candidate)
        
        if not candidates:
            return {"message": "No candidates found in database", "synced": 0, "failed": 0, "already_synced": 0}
        
        success_count = 0
        fail_count = 0
        already_synced_count = 0
        errors = []
        
        for candidate in candidates:
            candidate_id_str = str(candidate["_id"])
            
            # Prepare data for blockchain
            blockchain_data = {
                "name": candidate.get("name", "Unknown"),
                "age": candidate.get("age", 18),
                "dateOfBirth": candidate.get("dateOfBirth", "01-01-2000"),
                "panNumber": candidate.get("panNumber", "XXXXX0000X"),
                "aadharNumber": candidate.get("aadharNumber", "000000000000"),
                "voterEpicNumber": candidate.get("voterEpicNumber", "XXX0000000"),
                "electionCenter": candidate.get("electionCenter", "Default Election Center"),
                "party": candidate.get("party", "Independent"),
                "candidateAddress": candidate.get("candidateAddress", "Not Provided"),
                "email": candidate.get("email", "not@provided.com"),
                "phoneNumber": candidate.get("phoneNumber", "0000000000"),
                "candidateId": candidate.get("candidateId", "UNKNOWN"),
                # Use stored password (SHA-256 hash) — consistent for all synced candidates
                "candidatePassword": candidate.get("candidatePassword", "hashed_password")
            }
            
            result = await add_candidate_to_blockchain(blockchain_data)
            
            if result["success"]:
                if result.get("already_existed"):
                    already_synced_count += 1
                    # Still mark as synced in MongoDB if not already
                    if not candidate.get("syncedToBlockchain"):
                        await candidates_collection.update_one(
                            {"_id": candidate["_id"]},
                            {"$set": {
                                "syncedToBlockchain": True,
                                "blockchainAddress": result["tx_hash"],
                                "blockchainAccount": blockchain_account,
                                "syncedAt": datetime.now().isoformat()
                            }}
                        )
                else:
                    success_count += 1
                    # Update MongoDB with blockchain info
                    await candidates_collection.update_one(
                        {"_id": candidate["_id"]},
                        {"$set": {
                            "syncedToBlockchain": True,
                            "blockchainAddress": result["tx_hash"],
                            "blockchainAccount": blockchain_account,
                            "syncedAt": datetime.now().isoformat()
                        }}
                    )
            else:
                fail_count += 1
                errors.append(f"{candidate.get('name', 'Unknown')}: {result['error']}")
        
        # Get final blockchain count
        final_count = voting_contract.functions.getCountCandidates().call()
        
        return {
            "message": "Sync complete",
            "total_candidates": len(candidates),
            "newly_synced": success_count,
            "already_synced": already_synced_count,
            "failed": fail_count,
            "errors": errors,
            "blockchain_total": int(final_count)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync-all: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )

@app.get("/candidates")
async def get_all_candidates():
    """
    Get all candidates from MongoDB
    
    Returns:
        dict: List of all candidates
    """
    try:
        candidates = []
        async for candidate in candidates_collection.find({"isActive": True}):
            candidate["_id"] = str(candidate["_id"])
            # Remove password from response
            candidate.pop("candidatePassword", None)
            candidates.append(candidate)
        
        return {
            "message": "Candidates retrieved successfully",
            "count": len(candidates),
            "candidates": candidates
        }
        
    except Exception as e:
        print(f"Error retrieving candidates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve candidates: {str(e)}"
        )

@app.get("/candidates/{candidate_id}")
async def get_candidate_by_id(candidate_id: str):
    """
    Get a specific candidate by MongoDB ID
    
    Args:
        candidate_id (str): MongoDB ObjectId of the candidate
    
    Returns:
        dict: Candidate information
    """
    try:
        # Find candidate by MongoDB ObjectId
        candidate = await candidates_collection.find_one(
            {"_id": ObjectId(candidate_id)}
        )
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Convert ObjectId to string and remove password
        candidate["_id"] = str(candidate["_id"])
        candidate.pop("candidatePassword", None)
        
        return {
            "message": "Candidate retrieved successfully",
            "candidate": candidate
        }
        
    except Exception as e:
        print(f"Error retrieving candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve candidate: {str(e)}"
        )

@app.get("/candidates/search/{candidate_unique_id}")
async def get_candidate_by_unique_id(candidate_unique_id: str):
    """
    Get a candidate by their unique candidate ID
    
    Args:
        candidate_unique_id (str): Unique candidate ID
    
    Returns:
        dict: Candidate information
    """
    try:
        candidate = await candidates_collection.find_one(
            {"candidateId": candidate_unique_id, "isActive": True}
        )
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Convert ObjectId to string and remove password
        candidate["_id"] = str(candidate["_id"])
        candidate.pop("candidatePassword", None)
        
        return {
            "message": "Candidate retrieved successfully",
            "candidate": candidate
        }
        
    except Exception as e:
        print(f"Error retrieving candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve candidate: {str(e)}"
        )

@app.put("/candidates/{candidate_id}")
async def update_candidate(candidate_id: str, candidate: CandidateModel):
    """
    Update a candidate's information
    
    Args:
        candidate_id (str): MongoDB ObjectId of the candidate
        candidate (CandidateModel): Updated candidate data
    
    Returns:
        dict: Updated candidate information
    """
    try:
        # Convert pydantic model to dict
        update_dict = candidate.model_dump()
        
        # Hash password if provided
        if update_dict.get('candidatePassword'):
            update_dict['candidatePassword'] = hashlib.sha256(
                update_dict['candidatePassword'].encode()
            ).hexdigest()
        
        # Update the document
        result = await candidates_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Get updated candidate
        updated_candidate = await candidates_collection.find_one(
            {"_id": ObjectId(candidate_id)}
        )
        
        # Convert ObjectId to string and remove password
        updated_candidate["_id"] = str(updated_candidate["_id"])
        updated_candidate.pop("candidatePassword", None)
        
        return {
            "message": "Candidate updated successfully",
            "candidate": updated_candidate
        }
        
    except Exception as e:
        print(f"Error updating candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update candidate: {str(e)}"
        )

@app.patch("/candidates/{candidate_id}")
async def patch_candidate(candidate_id: str, update_data: Dict[str, Any]):
    """
    Partially update a candidate's information (for blockchain sync, etc.)
    
    Args:
        candidate_id (str): MongoDB ObjectId of the candidate
        update_data (dict): Fields to update
    
    Returns:
        dict: Updated candidate information
    """
    try:
        # Remove any fields that shouldn't be updated via PATCH
        protected_fields = ["_id", "candidateId"]
        for field in protected_fields:
            update_data.pop(field, None)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields to update"
            )
        
        # Update the document
        result = await candidates_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Get updated candidate
        updated_candidate = await candidates_collection.find_one(
            {"_id": ObjectId(candidate_id)}
        )
        
        # Convert ObjectId to string and remove password
        updated_candidate["_id"] = str(updated_candidate["_id"])
        updated_candidate.pop("candidatePassword", None)
        
        return {
            "message": "Candidate updated successfully",
            "candidate": updated_candidate,
            "updated_fields": list(update_data.keys())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error patching candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to patch candidate: {str(e)}"
        )

@app.delete("/candidates/{candidate_id}")
async def delete_candidate(candidate_id: str):
    """
    Soft delete a candidate (mark as inactive)
    
    Args:
        candidate_id (str): MongoDB ObjectId of the candidate
    
    Returns:
        dict: Deletion confirmation
    """
    try:
        # Soft delete by setting isActive to False
        result = await candidates_collection.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"isActive": False}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        return {
            "message": "Candidate deleted successfully",
            "candidate_id": candidate_id
        }
        
    except Exception as e:
        print(f"Error deleting candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete candidate: {str(e)}"
        )

# ===============================================
# CANDIDATE SEARCH BY AREA ENDPOINT
# ===============================================

@app.get("/candidates/area/{election_area}")
async def get_candidates_by_area(election_area: str):
    """
    Get all candidates for a specific election area/constituency
    
    Args:
        election_area (str): The election area or constituency name
    
    Returns:
        dict: List of candidates in the specified area
    """
    try:
        # Search for candidates in the specified election area (case-insensitive)
        candidates = []
        query = {
            "isActive": True,
            "electionCenter": {"$regex": election_area, "$options": "i"}
        }
        
        async for candidate in candidates_collection.find(query):
            candidate["_id"] = str(candidate["_id"])
            # Remove password from response
            candidate.pop("candidatePassword", None)
            candidates.append(candidate)
        
        return {
            "message": f"Candidates retrieved for area: {election_area}",
            "area": election_area,
            "count": len(candidates),
            "candidates": candidates
        }
        
    except Exception as e:
        print(f"Error retrieving candidates by area: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve candidates: {str(e)}"
        )

@app.get("/candidates/info/{candidate_unique_id}")
async def get_candidate_info_by_id(candidate_unique_id: str):
    """
    Get candidate basic info (ID, Name, Area) by their unique candidate ID
    
    Args:
        candidate_unique_id (str): Unique candidate ID
    
    Returns:
        dict: Candidate basic information (ID, Name, Election Area)
    """
    try:
        candidate = await candidates_collection.find_one(
            {"candidateId": candidate_unique_id, "isActive": True}
        )
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Return only the basic info needed for SetVote page
        return {
            "message": "Candidate info retrieved successfully",
            "candidateInfo": {
                "candidateId": candidate.get("candidateId"),
                "name": candidate.get("name"),
                "electionArea": candidate.get("electionCenter"),
                "party": candidate.get("party"),
                "isActive": candidate.get("isActive", True)
            }
        }
        
    except Exception as e:
        print(f"Error retrieving candidate info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve candidate info: {str(e)}"
        )

# ===============================================
# VOTING DATES MANAGEMENT (MongoDB)
# ===============================================

class VotingDatesModel(BaseModel):
    votingStartDate: str = Field(..., description="Voting start date in ISO format")
    votingEndDate: str = Field(..., description="Voting end date in ISO format")
    votingStartTimestamp: int = Field(..., description="Unix timestamp for start")
    votingEndTimestamp: int = Field(..., description="Unix timestamp for end")
    blockchainTxHash: Optional[str] = Field(default=None, description="Blockchain transaction hash")
    blockchainAccount: Optional[str] = Field(default=None, description="Admin account that set the dates")
    createdAt: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())
    isActive: bool = Field(default=True)

@app.post("/voting-dates")
async def set_voting_dates(voting_dates: VotingDatesModel):
    """
    Save voting dates to MongoDB
    
    Args:
        voting_dates (VotingDatesModel): Voting dates data
    
    Returns:
        dict: Created voting dates record
    """
    try:
        # Convert pydantic model to dict
        dates_dict = voting_dates.model_dump()
        
        # Deactivate any previous voting dates
        await mongo_db.voting_dates.update_many(
            {"isActive": True},
            {"$set": {"isActive": False}}
        )
        
        # Insert new voting dates
        result = await mongo_db.voting_dates.insert_one(dates_dict)
        
        # Get the created record
        created_dates = await mongo_db.voting_dates.find_one(
            {"_id": result.inserted_id}
        )
        
        # Convert ObjectId to string
        created_dates["_id"] = str(created_dates["_id"])
        
        return {
            "message": "Voting dates saved successfully",
            "voting_dates": created_dates,
            "mongodb_id": str(result.inserted_id)
        }
        
    except Exception as e:
        print(f"Error saving voting dates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save voting dates: {str(e)}"
        )

@app.get("/voting-dates")
async def get_voting_dates():
    """
    Get current active voting dates from MongoDB
    
    Returns:
        dict: Current voting dates information
    """
    try:
        # Find the most recent active voting dates
        voting_dates = await mongo_db.voting_dates.find_one(
            {"isActive": True},
            sort=[("createdAt", -1)]
        )
        
        if not voting_dates:
            return {
                "message": "No voting dates configured",
                "voting_dates": None
            }
        
        # Convert ObjectId to string
        voting_dates["_id"] = str(voting_dates["_id"])
        
        return {
            "message": "Voting dates retrieved successfully",
            "voting_dates": voting_dates
        }
        
    except Exception as e:
        print(f"Error retrieving voting dates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve voting dates: {str(e)}"
        )

# ===============================================
# CANDIDATE AUTHENTICATION & MANAGEMENT ENDPOINTS
# ===============================================

# Candidate login model
class CandidateLoginRequest(BaseModel):
    candidateId: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

# Candidate login endpoint
@app.post("/api/candidate/login")
async def candidate_login(login_data: CandidateLoginRequest):
    """
    Authenticate candidate and return JWT token
    """
    try:
        # Find candidate by candidateId
        candidate = await candidates_collection.find_one({
            "candidateId": login_data.candidateId
        })
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid candidate ID or password"
            )
        
        # Hash the incoming password to compare with stored hashed password
        import hashlib
        hashed_password = hashlib.sha256(login_data.password.encode()).hexdigest()
        
        # Verify password
        if candidate.get("candidatePassword") != hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid candidate ID or password"
            )
        
        # Check if candidate is active
        if not candidate.get("isActive", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Candidate account is inactive"
            )
        
        # Generate JWT token
        token_data = {
            'candidateId': candidate['candidateId'],
            'name': candidate['name'],
            'role': 'candidate',
            'exp': datetime.now(timezone.utc) + timedelta(hours=24)
        }
        
        token = jwt.encode(token_data, SECRET_KEY_FALLBACK, algorithm='HS256')
        
        return {
            "success": True,
            "token": token,
            "candidateId": candidate['candidateId'],
            "name": candidate['name'],
            "message": "Candidate authentication successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during candidate login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

# Get candidate profile endpoint
@app.get("/api/candidate/profile")
async def get_candidate_profile(request: Request):
    """
    Get candidate profile information (requires JWT authentication)
    """
    try:
        # Extract and verify JWT token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith(BEARER_PREFIX):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=AUTH_HEADER_MISSING
            )
        
        token = auth_header.replace(BEARER_PREFIX, "")
        
        try:
            payload = jwt.decode(token, SECRET_KEY_FALLBACK, algorithms=['HS256'])
            candidate_id = payload.get('candidateId')
            
            if not candidate_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Fetch candidate from MongoDB
        candidate = await candidates_collection.find_one({
            "candidateId": candidate_id
        })
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Convert ObjectId to string
        candidate["_id"] = str(candidate["_id"])
        
        # Remove password from response
        candidate.pop("candidatePassword", None)
        
        return candidate
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching candidate profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profile: {str(e)}"
        )

# Password reset model
class PasswordResetRequest(BaseModel):
    currentPassword: str = Field(..., min_length=6)
    newPassword: str = Field(..., min_length=8)

# Reset candidate password endpoint
@app.put("/api/candidate/reset-password")
async def reset_candidate_password(request: Request, reset_data: PasswordResetRequest):
    """
    Reset candidate password (requires JWT authentication)
    """
    try:
        # Extract and verify JWT token
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith(BEARER_PREFIX):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=AUTH_HEADER_MISSING
            )
        
        token = auth_header.replace(BEARER_PREFIX, "")
        
        try:
            payload = jwt.decode(token, SECRET_KEY_FALLBACK, algorithms=['HS256'])
            candidate_id = payload.get('candidateId')
            
            if not candidate_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Find candidate
        candidate = await candidates_collection.find_one({
            "candidateId": candidate_id
        })
        
        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=CANDIDATE_NOT_FOUND
            )
        
        # Verify current password (hash before comparing since stored passwords are SHA256)
        hashed_current = hashlib.sha256(reset_data.currentPassword.encode()).hexdigest()
        if candidate.get("candidatePassword") != hashed_current:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current password is incorrect"
            )
        
        # Check if new password is different
        if reset_data.currentPassword == reset_data.newPassword:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password"
            )
        
        # Update password (hash before storing)
        hashed_new = hashlib.sha256(reset_data.newPassword.encode()).hexdigest()
        result = await candidates_collection.update_one(
            {"candidateId": candidate_id},
            {"$set": {"candidatePassword": hashed_new}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {
            "success": True,
            "message": "Password updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resetting password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset password: {str(e)}"
        )

# ===============================================
# HEALTH CHECK ENDPOINT
# ===============================================

# Health check endpoint
@app.get("/")
async def root():
    """API health check endpoint"""
    return {
        "message": "EtherVox Database API is running!",
        "status": "healthy",
        "database": "connected"
    }

# Server startup
if __name__ == "__main__":
    import uvicorn
    
    print("[STARTUP] Starting EtherVox Database API...")
    print("[INFO] API Documentation: http://127.0.0.1:8001/docs")
    print("[INFO] Health Check: http://127.0.0.1:8001")
    print("[INFO] Login Endpoint: http://127.0.0.1:8001/login")
    print()
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8001, 
        log_level="info",
        reload=False
    )
