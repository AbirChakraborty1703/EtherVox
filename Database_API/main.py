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
import mysql.connector
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from mysql.connector import errorcode
import jwt
from datetime import datetime, timedelta

# Loading the environment variables for database configuration
dotenv.load_dotenv()

# Initialize the FastAPI application instance
app = FastAPI()

# Define the allowed origins for Cross-Origin Resource Sharing (CORS)
origins = [
    "http://localhost:8080",    # Local development server
    "http://127.0.0.1:8080",   # Alternative localhost address
]

# Configure CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Allowed origin URLs
    allow_credentials=True,     # Allow credentials in requests
    allow_methods=["*"],        # Allow all HTTP methods
    allow_headers=["*"],        # Allow all headers
)

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
    print("✅ Database connection established successfully!")
    print(f"Connected to MySQL database: {os.environ.get('MYSQL_DB', 'ethervox_voting')}")
except mysql.connector.Error as err:
    # Handle database connection errors
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("❌ Something is wrong with your MySQL username or password")
        print("Please check your .env file and MySQL credentials")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("❌ Database does not exist")
        print("Please run the setup_database.sql script in MySQL Workbench first")
    else:
        print(f"❌ Database connection error: {err}")
    exit(1)

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
    
    print("🚀 Starting EtherVox Database API...")
    print("📊 API Documentation: http://127.0.0.1:8000/docs")
    print("🔗 Health Check: http://127.0.0.1:8000")
    print("🔑 Login Endpoint: http://127.0.0.1:8000/login")
    print()
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000, 
        log_level="info",
        reload=False
    )
