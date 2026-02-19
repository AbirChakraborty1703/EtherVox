"""
FastAPI Routes for Anomaly Detection System
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from anomaly_detection_simple import anomaly_detector

router = APIRouter()

class VoteLogRequest(BaseModel):
    voter_id: str
    candidate_id: int
    region: Optional[str] = "unknown"
    screen_resolution: Optional[str] = "1920x1080"
    timezone: Optional[str] = "UTC"

@router.post("/log-vote")
async def log_vote_event(request: Request, vote_data: VoteLogRequest):
    """
    Log a vote and check for anomalies
    """
    try:
        # Extract client info
        ip_address = request.client.host
        user_agent = request.headers.get('user-agent', 'unknown')
        
        # Prepare vote data
        vote_info = {
            'voter_id': vote_data.voter_id,
            'candidate_id': vote_data.candidate_id,
            'ip_address': ip_address,
            'device_info': user_agent,  # anomaly_detector expects 'device_info'
            'screen_resolution': vote_data.screen_resolution,
            'timezone': vote_data.timezone,
            'region': vote_data.region
        }
        
        # Log and analyze
        result = anomaly_detector.log_vote(vote_info)
        
        # If high-risk anomalies detected, return warning
        if result['anomaly_score'] >= 0.6:
            return {
                **result,
                'status': 'WARNING',
                'message': '⚠️ Suspicious voting activity detected!',
                'action_required': True
            }
        elif result['anomalies_detected']:
            return {
                **result,
                'status': 'CAUTION',
                'message': '⚡ Minor anomalies detected',
                'action_required': False
            }
        else:
            return {
                **result,
                'status': 'OK',
                'message': '✅ Vote logged successfully'
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_voting_statistics():
    """Get overall voting statistics"""
    return anomaly_detector.get_statistics()

@router.get("/flagged-voters")
async def get_flagged_voters():
    """Get list of voters with suspicious activity"""
    flagged = anomaly_detector.get_flagged_voters()
    return {
        'flagged_voters': flagged,
        'count': len(flagged)
    }

@router.post("/train-model")
async def train_anomaly_model():
    """Train the ML model with current voting data"""
    success = anomaly_detector.train_model()
    
    if success:
        return {
            'success': True,
            'message': '✅ Anomaly detection model trained successfully',
            'votes_used': len(anomaly_detector.vote_log)
        }
    else:
        return {
            'success': False,
            'message': '❌ Not enough data to train model (need at least 20 votes)',
            'votes_available': len(anomaly_detector.vote_log)
        }

@router.get("/health")
async def health_check():
    """Check anomaly detection system health"""
    stats = anomaly_detector.get_statistics()
    
    return {
        'status': 'operational',
        'model_trained': stats['model_trained'],
        'total_votes_monitored': stats['total_votes'],
        'detection_systems': {
            'ip_monitoring': '✅ Active',
            'device_tracking': '✅ Active',
            'regional_spike': '✅ Active',
            'temporal_patterns': '✅ Active',
            'ml_model': '✅ Active' if stats['model_trained'] else '⚠️ Training needed'
        }
    }

@router.delete("/reset")
async def reset_detector():
    """Reset all anomaly detection data (admin only)"""
    global anomaly_detector
    from anomaly_detection_simple import VotingAnomalyDetector
    anomaly_detector = VotingAnomalyDetector()
    
    return {
        'success': True,
        'message': 'Anomaly detector reset successfully'
    }
