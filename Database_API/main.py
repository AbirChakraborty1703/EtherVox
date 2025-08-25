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
        user=os.environ['MYSQL_USER'],        # Database username
        password=os.environ['MYSQL_PASSWORD'], # Database password
        host=os.environ['MYSQL_HOST'],        # Database host
        database=os.environ['MYSQL_DB'],      # Database name
    )
    cursor = cnx.cursor()  # Create database cursor for queries
except mysql.connector.Error as err:
    # Handle database connection errors
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
        print("Something is wrong with your user name or password")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
        print("Database does not exist")
    else:
        print(err)

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
async def login(request: Request, voter_id: str, password: str):
    await authenticate(request)  # Verify request authorization
    role = await get_role(voter_id, password)  # Get user role

    # Generate JWT token with user credentials and role
    token = jwt.encode({'password': password, 'voter_id': voter_id, 'role': role}, os.environ['SECRET_KEY'], algorithm='HS256')

    return {'token': token, 'role': role}

# Helper function to determine user role based on credentials
async def get_role(voter_id, password):
    try:
        # Query database for user role with credentials
        cursor.execute("SELECT role FROM voters WHERE voter_id = %s AND password = %s", (voter_id, password,))
        role = cursor.fetchone()
        if role:
            return role[0]  # Return the role if found
        else:
            # Raise exception for invalid credentials
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid voter id or password"
            )
    except mysql.connector.Error as err:
        # Handle database query errors
        print(err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error"
        )
