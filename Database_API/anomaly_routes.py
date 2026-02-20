"""
EtherVox - FastAPI Routes for AI Anomaly Detection System
=========================================================
Exposes REST endpoints consumed by:
  * Frontend  app.js  (POST /anomaly/log-vote on every vote cast)
  * Admin dashboard    (GET /anomaly/health, /statistics, /flagged-voters)
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from anomaly_detection_simple import anomaly_detector, VotingAnomalyDetector

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class VoteLogRequest(BaseModel):
    voter_id: str
    candidate_id: int
    region: Optional[str] = "unknown"
    screen_resolution: Optional[str] = "1920x1080"
    timezone: Optional[str] = "UTC"


class SimulateRequest(BaseModel):
    """For testing: simulate N fraudulent votes to trigger detection."""
    count: int = 10
    voter_id: Optional[str] = "test-voter"
    ip_address: Optional[str] = "192.168.1.100"
    device_info: Optional[str] = "TestBot/1.0"
    candidate_id: int = 1


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------

@router.post("/log-vote")
async def log_vote_event(request: Request, vote_data: VoteLogRequest):
    """
    Log a vote and check for anomalies.
    Called by the frontend after every blockchain vote.
    """
    try:
        # Extract client info from HTTP request
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        vote_info = {
            "voter_id": vote_data.voter_id,
            "candidate_id": vote_data.candidate_id,
            "ip_address": ip_address,
            "device_info": user_agent,
            "location": vote_data.region,
        }

        result = anomaly_detector.log_vote(vote_info)

        # Tiered response based on risk
        if result["anomaly_score"] >= 0.6:
            return {
                **result,
                "status": "WARNING",
                "message": "Suspicious voting activity detected!",
                "action_required": True,
            }
        elif result["anomalies_detected"]:
            return {
                **result,
                "status": "CAUTION",
                "message": "Minor anomalies detected",
                "action_required": False,
            }
        else:
            return {
                **result,
                "status": "OK",
                "message": "Vote logged successfully",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_voting_statistics():
    """Return comprehensive voting & detection statistics."""
    return anomaly_detector.get_statistics()


@router.get("/flagged-voters")
async def get_flagged_voters():
    """Return all voters that crossed the suspicious threshold."""
    flagged = anomaly_detector.get_flagged_voters()
    return {"flagged_voters": flagged, "count": len(flagged)}


@router.get("/recent-anomalies")
async def get_recent_anomalies(hours: int = 24):
    """Return anomalous events from the last N hours (default 24)."""
    anomalies = anomaly_detector.get_recent_anomalies(hours=hours)
    return {"anomalies": anomalies, "count": len(anomalies)}


@router.post("/train-model")
async def train_anomaly_model():
    """Manually trigger Isolation Forest training."""
    success = anomaly_detector.train_model()
    if success:
        return {
            "success": True,
            "message": "Anomaly detection model trained successfully",
            "stats": anomaly_detector.ml_stats,
        }
    else:
        return {
            "success": False,
            "message": f"Not enough data to train (need >= 20 votes, have {len(anomaly_detector.vote_log)})",
            "votes_available": len(anomaly_detector.vote_log),
        }


@router.get("/health")
async def health_check():
    """System health dashboard endpoint."""
    stats = anomaly_detector.get_statistics()
    return {
        "status": "operational",
        "model_trained": stats["model_trained"],
        "total_votes_monitored": stats["total_votes"],
        "detection_systems": {
            "ip_monitoring": "Active",
            "device_tracking": "Active",
            "rapid_voting": "Active",
            "burst_detection": "Active",
            "bot_pattern": "Active",
            "regional_spike": "Active",
            "candidate_stuffing": "Active",
            "multi_ip_voter": "Active",
            "multi_device_voter": "Active",
            "ml_model": "Active" if stats["model_trained"] else "Training needed",
        },
    }


@router.post("/simulate-fraud")
async def simulate_fraud(sim: SimulateRequest):
    """
    Test endpoint: simulate rapid fraudulent votes so the detection
    system can be verified without a real election.
    """
    import asyncio

    results = []
    for i in range(sim.count):
        vote_info = {
            "voter_id": f"{sim.voter_id}-{i % 3}",
            "candidate_id": sim.candidate_id,
            "ip_address": sim.ip_address,
            "device_info": sim.device_info,
            "location": "test-region",
        }
        result = anomaly_detector.log_vote(vote_info)
        results.append(result)
        await asyncio.sleep(0.05)  # tiny delay to avoid exact-same-timestamp

    flagged_count = sum(1 for r in results if r["anomalies_detected"])
    return {
        "simulated": sim.count,
        "flagged": flagged_count,
        "detection_rate": f"{(flagged_count / sim.count * 100):.1f}%",
        "model_trained": anomaly_detector.model_trained,
        "sample_flags": results[-1]["flags"] if results else [],
        "message": f"Simulated {sim.count} votes — {flagged_count} flagged as anomalous",
    }


@router.delete("/reset")
async def reset_detector():
    """Reset all anomaly detection data (admin only)."""
    anomaly_detector.clear_data()
    return {"success": True, "message": "Anomaly detector reset successfully"}
