# Add face authentication endpoints to existing FastAPI

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import json
import os
from pymongo import MongoClient

router = APIRouter()

# MongoDB connection - use same database as main.py
MONGODB_URL = os.environ.get('MONGODB_URL', 'mongodb://localhost:27017')
MONGODB_DB = os.environ.get('MONGODB_DB', 'ethervox_candidates')
mongo_client = MongoClient(MONGODB_URL)
mongo_db = mongo_client[MONGODB_DB]
voters_collection = mongo_db['voters']

class FaceRegisterRequest(BaseModel):
    voter_id: str
    face_descriptors: List[List[float]]

class FaceLoginRequest(BaseModel):
    face_descriptor: List[float]

def euclidean_distance(desc1, desc2):
    """Calculate euclidean distance between two descriptors"""
    return np.linalg.norm(np.array(desc1) - np.array(desc2))

def find_match(descriptor, threshold=0.5):
    """
    Find matching face in database (checks MongoDB)
    threshold: 0.5 for face-api.js (balanced security/usability)
    Typical ranges: 0.4 = strict, 0.5 = balanced, 0.6 = lenient
    Lower = stricter matching
    """
    best_match = None
    best_distance = float('inf')
    
    # Load all faces from MongoDB
    all_voters = voters_collection.find({"face_descriptor": {"$exists": True}})
    
    print(f"\n🔍 Searching for face match...")
    match_count = 0
    
    for voter in all_voters:
        voter_id = voter['voter_id']
        stored_descriptor = voter['face_descriptor']
        
        # Calculate distance
        distance = euclidean_distance(descriptor, stored_descriptor)
        match_count += 1
        
        print(f"   Voter {voter_id}: distance = {distance:.4f} (threshold: {threshold})")
        
        if distance < best_distance and distance < threshold:
            best_distance = distance
            best_match = voter_id
    
    print(f"📊 Checked {match_count} registered faces")
    if best_match:
        print(f"✅ Best match: {best_match} with distance {best_distance:.4f}")
    else:
        print(f"❌ No match found (best distance: {best_distance:.4f}, threshold: {threshold})")
    
    return best_match, best_distance

@router.post("/register-face")
async def register_face(request: FaceRegisterRequest):
    """Register face descriptors for a voter"""
    try:
        voter_id = request.voter_id
        
        # Average the face descriptors for better accuracy
        descriptors_array = np.array(request.face_descriptors)
        avg_descriptor = np.mean(descriptors_array, axis=0).tolist()
        
        # Store in MongoDB
        result = voters_collection.update_one(
            {"voter_id": voter_id},
            {"$set": {"face_descriptor": avg_descriptor}},
            upsert=True
        )
        
        print(f"✅ Face registered for voter: {voter_id}")
        print(f"📊 Saved to MongoDB: {result.modified_count > 0 or result.upserted_id is not None}")
        
        return {
            "success": True,
            "message": "Face registered successfully",
            "voter_id": voter_id
        }
    
    except Exception as e:
        print(f"❌ Face registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login-face")
async def login_face(request: FaceLoginRequest):
    """Authenticate voter by face"""
    try:
        descriptor = request.face_descriptor
        
        # Find matching face
        matched_voter, distance = find_match(descriptor)
        
        if matched_voter is None:
            raise HTTPException(
                status_code=401, 
                detail="Face not recognized. Please use password login or register your face."
            )
        
        print(f"✅ Face matched! Voter: {matched_voter}, Distance: {distance:.4f}")
        
        # Get voter role from MySQL
        import mysql.connector
        mysql_conn = None
        try:
            mysql_conn = mysql.connector.connect(
                host=os.environ.get('MYSQL_HOST', 'localhost'),
                user=os.environ.get('MYSQL_USER', 'root'),
                password=os.environ.get('MYSQL_PASSWORD', ''),
                database=os.environ.get('MYSQL_DB', 'ethervox_voting')
            )
            cursor = mysql_conn.cursor(dictionary=True)
            cursor.execute("SELECT role FROM voters WHERE voter_id = %s", (matched_voter,))
            voter_data = cursor.fetchone()
            role = voter_data['role'] if voter_data else 'user'
            cursor.close()
        finally:
            if mysql_conn:
                mysql_conn.close()
        
        # Generate JWT token
        from datetime import datetime, timedelta, timezone
        from jose import jwt as jose_jwt
        
        SECRET_KEY = os.environ.get('SECRET_KEY', 'ethervox-secret-key-2024')
        
        token_data = {
            "voter_id": matched_voter,
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(hours=24)
        }
        token = jose_jwt.encode(token_data, SECRET_KEY, algorithm="HS256")
        
        return {
            "success": True,
            "voter_id": matched_voter,
            "role": role,
            "token": token,
            "message": "Face authenticated successfully",
            "confidence": 1 - distance  # Higher is better
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Face login error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/face-registered/{voter_id}")
async def check_face_registered(voter_id: str):
    """Check if voter has registered face"""
    voter = voters_collection.find_one({"voter_id": voter_id, "face_descriptor": {"$exists": True}})
    return {
        "registered": voter is not None,
        "voter_id": voter_id
    }

@router.delete("/face/{voter_id}")
async def delete_face(voter_id: str):
    """Delete registered face"""
    result = voters_collection.update_one(
        {"voter_id": voter_id},
        {"$unset": {"face_descriptor": ""}}
    )
    if result.modified_count > 0:
        return {"success": True, "message": "Face deleted"}
    raise HTTPException(status_code=404, detail="Face not registered")
