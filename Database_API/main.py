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
import mysql.connector
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from mysql.connector import errorcode
import jwt
from datetime import datetime, timedelta
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

# Set UTF-8 encoding for Windows console
if sys.platform.startswith('win'):
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except:
        # Fallback if UTF-8 setting fails
        pass

# Loading the environment variables for database configuration
dotenv.load_dotenv()

# Initialize the FastAPI application instance
app = FastAPI()

# Define the allowed origins for Cross-Origin Resource Sharing (CORS)
origins = [
    "http://localhost:8080",    # Local development server
    "http://127.0.0.1:8080",   # Alternative localhost address
    "http://localhost:8081",    # New port for Express server
    "http://127.0.0.1:8081",   # Alternative localhost address for new port
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
    cursor = cnx.cursor(dictionary=True)  # Create database cursor for queries with dictionary results
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
    exit(1)

# ===============================================
# DATA MODELS
# ===============================================

# Pydantic model for candidate data
class CandidateModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=18, le=120)
    dateOfBirth: str = Field(..., description="Date in YYYY-MM-DD format")
    electionCenter: str = Field(..., min_length=1, max_length=200)
    party: str = Field(..., min_length=1, max_length=100)
    candidateAddress: str = Field(..., min_length=1, max_length=300)
    email: str = Field(..., pattern=r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
    phoneNumber: str = Field(..., min_length=10, max_length=15)
    candidateId: str = Field(..., min_length=1, max_length=50)
    candidatePassword: str = Field(..., min_length=8)
    electionStartDate: str = Field(..., description="Election start date in ISO format")
    electionEndDate: str = Field(..., description="Election end date in ISO format")
    createdAt: Optional[str] = Field(default_factory=lambda: datetime.now().isoformat())
    blockchainAddress: Optional[str] = None
    isActive: bool = Field(default=True)

class CandidateResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    age: int
    dateOfBirth: str
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
async def authenticate(request: Request):
    try:
        # Extract Bearer token from authorization header
        auth_header = request.headers.get('authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        
        api_key = auth_header.replace("Bearer ", "")
        
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
        # Check if user exists and credentials are valid
        cursor.execute(
            "SELECT voter_id FROM voters WHERE voter_id = %s AND password = %s", 
            (voter_id, password)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter ID or password"
            )
        
        # Try to get role if column exists, otherwise default to 'user'
        try:
            cursor.execute("SELECT role FROM voters WHERE voter_id = %s", (voter_id,))
            role_result = cursor.fetchone()
            user_role = role_result['role'] if role_result and 'role' in role_result else 'user'
        except mysql.connector.Error:
            # Role column doesn't exist, default to 'user' for regular users, 'admin' for A-prefixed IDs
            user_role = 'admin' if voter_id.startswith('A') else 'user'
        
        # Generate JWT token with user information
        token_payload = {
            'voter_id': user['voter_id'],
            'role': user_role,
            'exp': datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
        }
        
        token = jwt.encode(token_payload, os.environ.get('SECRET_KEY', 'default_secret'), algorithm='HS256')
        
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
async def get_role(voter_id, password):
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
    Create a new candidate profile in MongoDB
    
    Args:
        candidate (CandidateModel): Candidate data
    
    Returns:
        dict: Created candidate information with MongoDB ID
    """
    try:
        # Convert pydantic model to dict and prepare for MongoDB
        candidate_dict = candidate.dict()
        
        # Hash the password before storing (in production, use proper hashing)
        import hashlib
        candidate_dict['candidatePassword'] = hashlib.sha256(
            candidate_dict['candidatePassword'].encode()
        ).hexdigest()
        
        # Insert candidate into MongoDB
        result = await candidates_collection.insert_one(candidate_dict)
        
        # Get the created candidate
        created_candidate = await candidates_collection.find_one(
            {"_id": result.inserted_id}
        )
        
        # Convert ObjectId to string for JSON response
        created_candidate["_id"] = str(created_candidate["_id"])
        
        return {
            "message": "Candidate created successfully",
            "candidate": created_candidate,
            "mongodb_id": str(result.inserted_id)
        }
        
    except Exception as e:
        print(f"Error creating candidate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create candidate: {str(e)}"
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
                detail="Candidate not found"
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
                detail="Candidate not found"
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
        update_dict = candidate.dict()
        
        # Hash password if provided
        if update_dict.get('candidatePassword'):
            import hashlib
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
                detail="Candidate not found"
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
                detail="Candidate not found"
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
