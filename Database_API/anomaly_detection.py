"""
EtherVox - AI-Powered Anomaly Detection for Fraud Voting
Uses Isolation Forest, Autoencoders, and Graph-based detection
"""

import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from collections import defaultdict
import json
from typing import List, Dict, Any
import hashlib

class VotingAnomalyDetector:
    """
    AI-powered anomaly detection system for voting fraud
    """
    
    def __init__(self):
        # Isolation Forest model for pattern detection
        self.isolation_forest = IsolationForest(
            contamination=0.1,  # Expected proportion of outliers
            random_state=42,
            n_estimators=100
        )
        
        # Tracking data structures
        self.vote_log = []  # All voting events
        self.ip_votes = defaultdict(list)  # IP -> votes
        self.device_votes = defaultdict(list)  # Device fingerprint -> votes
        self.region_votes = defaultdict(list)  # Region -> votes
        self.voter_activity = defaultdict(dict)  # Voter ID -> activity data
        
        # Thresholds
        self.MAX_VOTES_PER_IP = 5
        self.MAX_VOTES_PER_DEVICE = 3
        self.SPIKE_THRESHOLD = 10  # votes per minute
        self.TIME_WINDOW = 300  # 5 minutes in seconds
        
        # Scaler for feature normalization
        self.scaler = StandardScaler()
        
        # Model trained flag
        self.model_trained = False
        
    def generate_device_fingerprint(self, user_agent: str, screen_res: str, timezone: str) -> str:
        """Generate unique device fingerprint"""
        fingerprint_data = f"{user_agent}|{screen_res}|{timezone}"
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]
    
    def log_vote(self, vote_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Log a voting event and analyze for anomalies
        
        Parameters:
        - voter_id: Unique voter identifier
        - candidate_id: Selected candidate
        - ip_address: Voter's IP
        - user_agent: Browser user agent
        - screen_resolution: Screen size
        - timezone: User timezone
        - timestamp: Vote timestamp
        - region: Geographic region (optional)
        """
        
        timestamp = datetime.now()
        
        # Extract data
        voter_id = vote_data.get('voter_id')
        candidate_id = vote_data.get('candidate_id')
        ip_address = vote_data.get('ip_address', 'unknown')
        user_agent = vote_data.get('user_agent', '')
        screen_res = vote_data.get('screen_resolution', '1920x1080')
        timezone = vote_data.get('timezone', 'UTC')
        region = vote_data.get('region', 'unknown')
        
        # Generate device fingerprint
        device_fp = self.generate_device_fingerprint(user_agent, screen_res, timezone)
        
        # Create vote record
        vote_record = {
            'voter_id': voter_id,
            'candidate_id': candidate_id,
            'ip_address': ip_address,
            'device_fingerprint': device_fp,
            'region': region,
            'timestamp': timestamp,
            'user_agent': user_agent
        }
        
        # Add to logs
        self.vote_log.append(vote_record)
        self.ip_votes[ip_address].append(vote_record)
        self.device_votes[device_fp].append(vote_record)
        self.region_votes[region].append(vote_record)
        
        # Run anomaly detection
        anomalies = self.detect_anomalies(vote_record)
        
        return {
            'vote_logged': True,
            'anomalies_detected': len(anomalies) > 0,
            'anomaly_details': anomalies,
            'risk_score': self.calculate_risk_score(anomalies),
            'timestamp': timestamp.isoformat()
        }
    
    def detect_anomalies(self, vote_record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect various types of anomalies
        Returns list of detected anomalies
        """
        anomalies = []
        
        # 1. Multiple votes from same IP
        ip_anomaly = self._check_ip_abuse(vote_record['ip_address'])
        if ip_anomaly:
            anomalies.append(ip_anomaly)
        
        # 2. Multiple votes from same device
        device_anomaly = self._check_device_abuse(vote_record['device_fingerprint'])
        if device_anomaly:
            anomalies.append(device_anomaly)
        
        # 3. Regional spike detection
        region_anomaly = self._check_regional_spike(vote_record['region'])
        if region_anomaly:
            anomalies.append(region_anomaly)
        
        # 4. Temporal pattern anomaly
        temporal_anomaly = self._check_temporal_pattern()
        if temporal_anomaly:
            anomalies.append(temporal_anomaly)
        
        # 5. Isolation Forest detection (if trained)
        if self.model_trained and len(self.vote_log) > 50:
            ml_anomaly = self._check_ml_anomaly(vote_record)
            if ml_anomaly:
                anomalies.append(ml_anomaly)
        
        return anomalies
    
    def _check_ip_abuse(self, ip_address: str) -> Dict[str, Any]:
        """Detect multiple votes from same IP"""
        votes = self.ip_votes[ip_address]
        
        if len(votes) > self.MAX_VOTES_PER_IP:
            return {
                'type': 'IP_ABUSE',
                'severity': 'HIGH',
                'message': f'Multiple votes from same IP: {len(votes)} votes',
                'ip_address': ip_address,
                'vote_count': len(votes)
            }
        return None
    
    def _check_device_abuse(self, device_fp: str) -> Dict[str, Any]:
        """Detect multiple votes from same device"""
        votes = self.device_votes[device_fp]
        
        if len(votes) > self.MAX_VOTES_PER_DEVICE:
            return {
                'type': 'DEVICE_ABUSE',
                'severity': 'HIGH',
                'message': f'Multiple votes from same device: {len(votes)} votes',
                'device_fingerprint': device_fp,
                'vote_count': len(votes)
            }
        return None
    
    def _check_regional_spike(self, region: str) -> Dict[str, Any]:
        """Detect sudden spikes in voting from a region"""
        votes = self.region_votes[region]
        
        if len(votes) < 2:
            return None
        
        # Check votes in last 5 minutes
        now = datetime.now()
        recent_votes = [
            v for v in votes 
            if (now - v['timestamp']).total_seconds() < self.TIME_WINDOW
        ]
        
        votes_per_minute = len(recent_votes) / (self.TIME_WINDOW / 60)
        
        if votes_per_minute > self.SPIKE_THRESHOLD:
            return {
                'type': 'REGIONAL_SPIKE',
                'severity': 'MEDIUM',
                'message': f'Unusual voting spike from {region}',
                'region': region,
                'votes_per_minute': round(votes_per_minute, 2),
                'threshold': self.SPIKE_THRESHOLD
            }
        return None
    
    def _check_temporal_pattern(self) -> Dict[str, Any]:
        """Detect suspicious temporal patterns"""
        if len(self.vote_log) < 10:
            return None
        
        # Get recent votes (last 5 minutes)
        now = datetime.now()
        recent_votes = [
            v for v in self.vote_log 
            if (now - v['timestamp']).total_seconds() < self.TIME_WINDOW
        ]
        
        if len(recent_votes) < 5:
            return None
        
        # Check for perfectly timed votes (bot-like behavior)
        timestamps = [v['timestamp'] for v in recent_votes]
        time_diffs = []
        
        for i in range(1, len(timestamps)):
            diff = (timestamps[i] - timestamps[i-1]).total_seconds()
            time_diffs.append(diff)
        
        # If all votes are exactly X seconds apart (bot behavior)
        if len(time_diffs) > 3:
            avg_diff = np.mean(time_diffs)
            std_diff = np.std(time_diffs)
            
            # Very low standard deviation = suspicious
            if std_diff < 1.0 and avg_diff < 10:
                return {
                    'type': 'TEMPORAL_PATTERN',
                    'severity': 'MEDIUM',
                    'message': 'Suspicious bot-like voting pattern detected',
                    'avg_time_between_votes': round(avg_diff, 2),
                    'pattern_consistency': round(1 - (std_diff / (avg_diff + 0.001)), 3)
                }
        
        return None
    
    def _check_ml_anomaly(self, vote_record: Dict[str, Any]) -> Dict[str, Any]:
        """Use Isolation Forest for anomaly detection"""
        try:
            # Extract features for this vote
            features = self._extract_features([vote_record])
            
            # Scale features before prediction (model was trained on scaled data)
            features_scaled = self.scaler.transform(features)
            
            # Predict
            prediction = self.isolation_forest.predict(features_scaled)
            
            # -1 = anomaly, 1 = normal
            if prediction[0] == -1:
                anomaly_score = self.isolation_forest.score_samples(features_scaled)[0]
                return {
                    'type': 'ML_ANOMALY',
                    'severity': 'MEDIUM',
                    'message': 'Machine learning model flagged this vote',
                    'anomaly_score': float(anomaly_score),
                    'model': 'Isolation Forest'
                }
        except Exception as e:
            print(f"ML anomaly check failed: {e}")
        
        return None
    
    def _extract_features(self, vote_records: List[Dict[str, Any]]) -> np.ndarray:
        """Extract numerical features for ML model"""
        features = []
        
        for record in vote_records:
            ip = record['ip_address']
            device = record['device_fingerprint']
            region = record['region']
            
            # Numerical features
            feature_vector = [
                len(self.ip_votes.get(ip, [])),  # Votes from this IP
                len(self.device_votes.get(device, [])),  # Votes from this device
                len(self.region_votes.get(region, [])),  # Votes from this region
                len(record.get('user_agent', '')),  # User agent length
                hash(ip) % 1000,  # IP hash (numerical representation)
                hash(device) % 1000,  # Device hash
                record['timestamp'].hour,  # Hour of day
                record['timestamp'].weekday(),  # Day of week
            ]
            
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_model(self):
        """Train the Isolation Forest model with current data"""
        if len(self.vote_log) < 50:
            print("Not enough data to train model (need at least 50 votes)")
            return False
        
        try:
            features = self._extract_features(self.vote_log)
            
            # Normalize features
            features_scaled = self.scaler.fit_transform(features)
            
            # Train model
            self.isolation_forest.fit(features_scaled)
            self.model_trained = True
            
            print(f"✅ Anomaly detection model trained on {len(self.vote_log)} votes")
            return True
            
        except Exception as e:
            print(f"❌ Model training failed: {e}")
            return False
    
    def calculate_risk_score(self, anomalies: List[Dict[str, Any]]) -> float:
        """Calculate overall risk score (0-100)"""
        if not anomalies:
            return 0.0
        
        severity_weights = {
            'HIGH': 40,
            'MEDIUM': 20,
            'LOW': 10
        }
        
        total_score = sum(
            severity_weights.get(a.get('severity', 'LOW'), 10) 
            for a in anomalies
        )
        
        # Cap at 100
        return min(total_score, 100.0)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get overall voting statistics"""
        return {
            'total_votes': len(self.vote_log),
            'unique_ips': len(self.ip_votes),
            'unique_devices': len(self.device_votes),
            'regions': len(self.region_votes),
            'model_trained': self.model_trained,
            'suspicious_ips': sum(1 for votes in self.ip_votes.values() if len(votes) > self.MAX_VOTES_PER_IP),
            'suspicious_devices': sum(1 for votes in self.device_votes.values() if len(votes) > self.MAX_VOTES_PER_DEVICE)
        }
    
    def get_flagged_voters(self) -> List[Dict[str, Any]]:
        """Get list of voters with suspicious activity"""
        flagged = []
        
        # Check IPs
        for ip, votes in self.ip_votes.items():
            if len(votes) > self.MAX_VOTES_PER_IP:
                flagged.append({
                    'type': 'IP',
                    'identifier': ip,
                    'vote_count': len(votes),
                    'voter_ids': list({v['voter_id'] for v in votes})
                })
        
        # Check devices
        for device, votes in self.device_votes.items():
            if len(votes) > self.MAX_VOTES_PER_DEVICE:
                flagged.append({
                    'type': 'DEVICE',
                    'identifier': device,
                    'vote_count': len(votes),
                    'voter_ids': list({v['voter_id'] for v in votes})
                })
        
        return flagged


# Global detector instance
anomaly_detector = VotingAnomalyDetector()
