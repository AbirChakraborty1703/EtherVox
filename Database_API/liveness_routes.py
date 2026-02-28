"""
Liveness Detection API Routes
==============================

FastAPI routes for AI-based liveness detection in the voting system.

Endpoints:
- POST /start-liveness: Initialize a new liveness check session
- POST /check-liveness: Process frame for liveness detection
- POST /verify-liveness: Final verification before voting
- POST /reset-liveness: Reset liveness session

Author: EtherVox Development Team
Version: 1.0.0
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
from pymongo import MongoClient
from liveness_detection import get_liveness_detector, LivenessDetector
import logging
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# MongoDB connection for storing liveness check logs - use same database as main.py
MONGODB_URL = os.environ.get('MONGODB_URL', 'mongodb://localhost:27017')
MONGODB_DB = os.environ.get('MONGODB_DB', 'ethervox_candidates')
mongo_client = MongoClient(MONGODB_URL)
mongo_db = mongo_client[MONGODB_DB]
liveness_logs_collection = mongo_db['liveness_logs']

# In-memory session storage (for production, use Redis or similar)
liveness_sessions = {}

# Session timeout (15 minutes)
SESSION_TIMEOUT = timedelta(minutes=15)


class LivenessStartRequest(BaseModel):
    """Request model for starting a liveness check."""
    voter_id: str = Field(..., description="Unique voter identifier")
    session_type: Optional[str] = Field("voting", description="Type of session (voting, registration)")


class LivenessCheckRequest(BaseModel):
    """Request model for processing a frame."""
    session_id: str = Field(..., description="Liveness session ID")
    frame: str = Field(..., description="Base64 encoded image frame")


class LivenessVerifyRequest(BaseModel):
    """Request model for final liveness verification."""
    session_id: str = Field(..., description="Liveness session ID")
    voter_id: str = Field(..., description="Voter ID for verification")


class LivenessResetRequest(BaseModel):
    """Request model for resetting liveness session."""
    session_id: str = Field(..., description="Liveness session ID")


@router.post("/start-liveness")
async def start_liveness_check(request: LivenessStartRequest):
    """
    Initialize a new liveness detection session.
    
    Returns:
        session_id: Unique identifier for this liveness check session
        instructions: Instructions for the user
    """
    try:
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        # Create new liveness detector instance for this session
        detector = LivenessDetector()
        
        # Store session data
        liveness_sessions[session_id] = {
            "voter_id": request.voter_id,
            "detector": detector,
            "created_at": datetime.now(),
            "session_type": request.session_type,
            "attempts": 0,
            "completed": False
        }
        
        logger.info(f"Started liveness check session: {session_id} for voter: {request.voter_id}")
        
        return {
            "success": True,
            "session_id": session_id,
            "instructions": {
                "step_1": "Blink your eyes naturally at least 2 times",
                "step_2": "Turn your head slowly to the LEFT",
                "step_3": "Turn your head slowly to the RIGHT",
                "note": "Complete all steps within 15 seconds"
            },
            "max_duration": 15,
            "requirements": {
                "min_blinks": 2,
                "head_movement": "left and right"
            }
        }
        
    except Exception as e:
        logger.error(f"Error starting liveness check: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start liveness check: {str(e)}"
        )


@router.post("/check-liveness")
async def check_liveness_frame(request: LivenessCheckRequest):
    """
    Process a single frame for liveness detection.
    
    Returns real-time feedback on:
    - Blink detection
    - Head movement
    - Overall confidence
    - Whether liveness is confirmed
    """
    try:
        # Validate session
        if request.session_id not in liveness_sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired session ID"
            )
        
        session = liveness_sessions[request.session_id]
        
        # Check session timeout
        if datetime.now() - session["created_at"] > SESSION_TIMEOUT:
            del liveness_sessions[request.session_id]
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Session expired. Please start a new liveness check."
            )
        
        detector: LivenessDetector = session["detector"]
        session["attempts"] += 1
        
        # Process the frame
        result = detector.process_base64_frame(request.frame)
        
        # Check if liveness is confirmed
        if result.get("is_live", False):
            session["completed"] = True
            session["completed_at"] = datetime.now()
            
            # Log successful liveness check
            log_entry = {
                "session_id": request.session_id,
                "voter_id": session["voter_id"],
                "timestamp": datetime.now(),
                "result": "SUCCESS",
                "blink_count": result["blink_count"],
                "confidence": result["confidence"],
                "attempts": session["attempts"],
                "session_type": session["session_type"]
            }
            liveness_logs_collection.insert_one(log_entry)
            
            logger.info(f"Liveness confirmed for session: {request.session_id}")
            
            return {
                "success": True,
                "is_live": True,
                "message": "Liveness confirmed! You may proceed.",
                "confidence": result["confidence"],
                "details": {
                    "blink_count": result["blink_count"],
                    "head_movement": "completed",
                    "attempts": session["attempts"]
                },
                "visualization": result.get("visualization_frame", "")
            }
        
        # Check for timeout
        if result.get("timeout", False):
            # Log failed attempt
            log_entry = {
                "session_id": request.session_id,
                "voter_id": session["voter_id"],
                "timestamp": datetime.now(),
                "result": "TIMEOUT",
                "blink_count": result["blink_count"],
                "confidence": result["confidence"],
                "attempts": session["attempts"],
                "session_type": session["session_type"]
            }
            liveness_logs_collection.insert_one(log_entry)
            
            del liveness_sessions[request.session_id]
            
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Liveness check timed out. Please try again."
            )
        
        # Return current status
        return {
            "success": True,
            "is_live": False,
            "message": result["status"],
            "confidence": result["confidence"],
            "details": {
                "blink_count": result["blink_count"],
                "left_turn": result.get("left_turn", False),
                "right_turn": result.get("right_turn", False),
                "ear": result.get("ear", 0),
                "yaw": result.get("yaw", 0)
            },
            "visualization": result.get("visualization_frame", "")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing liveness frame: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process frame: {str(e)}"
        )


@router.post("/verify-liveness")
async def verify_liveness_completion(request: LivenessVerifyRequest):
    """
    Verify that liveness check was completed successfully.
    This should be called before allowing a vote transaction.
    
    Returns:
        verified: Boolean indicating if liveness was confirmed
        can_vote: Boolean indicating if user can proceed to vote
    """
    try:
        # Check if session exists
        if request.session_id not in liveness_sessions:
            # Check in database for recent completion
            recent_check = liveness_logs_collection.find_one({
                "session_id": request.session_id,
                "voter_id": request.voter_id,
                "result": "SUCCESS",
                "timestamp": {"$gte": datetime.now() - timedelta(minutes=5)}
            })
            
            if recent_check:
                return {
                    "success": True,
                    "verified": True,
                    "can_vote": True,
                    "message": "Liveness verified from recent check",
                    "confidence": recent_check.get("confidence", 0),
                    "timestamp": recent_check["timestamp"].isoformat()
                }
            
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No valid liveness check found. Please complete liveness detection."
            )
        
        session = liveness_sessions[request.session_id]
        
        # Verify voter ID matches
        if session["voter_id"] != request.voter_id:
            logger.warning(f"Voter ID mismatch in liveness verification: {request.voter_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Voter ID does not match session"
            )
        
        # Check if liveness was completed
        if not session.get("completed", False):
            return {
                "success": False,
                "verified": False,
                "can_vote": False,
                "message": "Liveness check not completed. Please complete all steps.",
                "attempts": session["attempts"]
            }
        
        # Verify completion is recent (within 5 minutes)
        completed_at = session.get("completed_at")
        if completed_at and datetime.now() - completed_at > timedelta(minutes=5):
            return {
                "success": False,
                "verified": False,
                "can_vote": False,
                "message": "Liveness check expired. Please perform a new check.",
                "expired": True
            }
        
        logger.info(f"Liveness verified for voter: {request.voter_id}")
        
        return {
            "success": True,
            "verified": True,
            "can_vote": True,
            "message": "Liveness verified. You can now proceed to vote.",
            "session_id": request.session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying liveness: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify liveness: {str(e)}"
        )


@router.post("/reset-liveness")
async def reset_liveness_session(request: LivenessResetRequest):
    """
    Reset a liveness detection session to start over.
    """
    try:
        if request.session_id in liveness_sessions:
            session = liveness_sessions[request.session_id]
            detector: LivenessDetector = session["detector"]
            detector.reset()
            
            session["attempts"] = 0
            session["completed"] = False
            session["created_at"] = datetime.now()
            
            logger.info(f"Reset liveness session: {request.session_id}")
            
            return {
                "success": True,
                "message": "Liveness session reset. You can start over.",
                "session_id": request.session_id
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting liveness session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset session: {str(e)}"
        )


@router.get("/liveness-stats/{voter_id}")
async def get_liveness_stats(voter_id: str):
    """
    Get liveness check statistics for a voter.
    
    Returns:
        total_checks: Total liveness checks performed
        successful_checks: Number of successful checks
        average_confidence: Average confidence score
        last_check: Timestamp of last check
    """
    try:
        # Query all liveness logs for this voter
        logs = list(liveness_logs_collection.find(
            {"voter_id": voter_id},
            {"_id": 0, "timestamp": 1, "result": 1, "confidence": 1, "attempts": 1}
        ).sort("timestamp", -1))
        
        if not logs:
            return {
                "success": True,
                "voter_id": voter_id,
                "total_checks": 0,
                "successful_checks": 0,
                "average_confidence": 0,
                "last_check": None
            }
        
        successful_logs = [log for log in logs if log["result"] == "SUCCESS"]
        
        avg_confidence = sum(log["confidence"] for log in successful_logs) / len(successful_logs) if successful_logs else 0
        
        return {
            "success": True,
            "voter_id": voter_id,
            "total_checks": len(logs),
            "successful_checks": len(successful_logs),
            "failed_checks": len(logs) - len(successful_logs),
            "average_confidence": round(avg_confidence, 2),
            "last_check": logs[0]["timestamp"].isoformat() if logs else None,
            "recent_checks": logs[:5]  # Last 5 checks
        }
        
    except Exception as e:
        logger.error(f"Error fetching liveness stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch statistics: {str(e)}"
        )


# Cleanup expired sessions periodically
@router.get("/cleanup-sessions")
async def cleanup_expired_sessions():
    """
    Clean up expired liveness sessions.
    This should be called periodically or via a scheduled task.
    """
    try:
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, session in list(liveness_sessions.items()):
            if current_time - session["created_at"] > SESSION_TIMEOUT:
                expired_sessions.append(session_id)
                del liveness_sessions[session_id]
        
        logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
        
        return {
            "success": True,
            "cleaned_sessions": len(expired_sessions),
            "active_sessions": len(liveness_sessions)
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup sessions: {str(e)}"
        )
