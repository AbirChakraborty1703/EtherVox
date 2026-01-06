"""
EtherVox - Simple Rule-Based Anomaly Detection for Fraud Voting
Lightweight version without sklearn dependencies
"""

from datetime import datetime, timedelta
from collections import defaultdict
import json
from typing import List, Dict, Any
import hashlib

class VotingAnomalyDetector:
    """
    Rule-based anomaly detection system for voting fraud
    """
    
    def __init__(self):
        # Tracking data structures
        self.vote_log = []  # All voting events
        self.voter_behavior = defaultdict(lambda: {
            'vote_count': 0,
            'ip_addresses': set(),
            'devices': set(),
            'timestamps': [],
            'locations': []
        })
        self.ip_vote_count = defaultdict(int)
        self.device_vote_count = defaultdict(int)
        self.suspicious_voters = set()
        
        # Detection thresholds
        self.RAPID_VOTING_SECONDS = 5  # Suspicious if votes < 5 seconds apart
        self.MAX_VOTES_PER_IP = 10
        self.MAX_VOTES_PER_DEVICE = 10
        self.BURST_THRESHOLD = 5  # Number of votes in burst
        self.BURST_WINDOW_MINUTES = 1
        
    def add_voting_event(self, voter_id: str, candidate_id: int, 
                        ip_address: str = None, device_info: str = None,
                        location: str = None, blockchain_hash: str = None):
        """
        Log a voting event and detect anomalies
        """
        timestamp = datetime.now()
        
        # Create voting event record
        event = {
            'voter_id': voter_id,
            'candidate_id': candidate_id,
            'timestamp': timestamp,
            'ip_address': ip_address or 'unknown',
            'device_info': device_info or 'unknown',
            'location': location or 'unknown',
            'blockchain_hash': blockchain_hash,
            'anomaly_score': 0.0,
            'flags': []
        }
        
        # Update tracking structures
        behavior = self.voter_behavior[voter_id]
        behavior['vote_count'] += 1
        if ip_address:
            behavior['ip_addresses'].add(ip_address)
            self.ip_vote_count[ip_address] += 1
        if device_info:
            behavior['devices'].add(device_info)
            self.device_vote_count[device_info] += 1
        behavior['timestamps'].append(timestamp)
        if location:
            behavior['locations'].append(location)
        
        # Run anomaly checks
        flags = []
        anomaly_score = 0.0
        
        # Check 1: Multiple votes from same IP
        if ip_address and self.ip_vote_count[ip_address] > self.MAX_VOTES_PER_IP:
            flags.append(f"EXCESSIVE_IP_VOTES: {self.ip_vote_count[ip_address]} votes from same IP")
            anomaly_score += 0.3
            
        # Check 2: Multiple votes from same device
        if device_info and self.device_vote_count[device_info] > self.MAX_VOTES_PER_DEVICE:
            flags.append(f"EXCESSIVE_DEVICE_VOTES: {self.device_vote_count[device_info]} votes from same device")
            anomaly_score += 0.3
            
        # Check 3: Rapid voting (same voter voting too quickly)
        if len(behavior['timestamps']) > 1:
            time_diff = (timestamp - behavior['timestamps'][-2]).total_seconds()
            if time_diff < self.RAPID_VOTING_SECONDS:
                flags.append(f"RAPID_VOTING: {time_diff:.1f}s between votes")
                anomaly_score += 0.4
                
        # Check 4: Voter using multiple IPs
        if len(behavior['ip_addresses']) > 3:
            flags.append(f"MULTIPLE_IPS: Voter used {len(behavior['ip_addresses'])} different IPs")
            anomaly_score += 0.2
            
        # Check 5: Voter using multiple devices
        if len(behavior['devices']) > 3:
            flags.append(f"MULTIPLE_DEVICES: Voter used {len(behavior['devices'])} different devices")
            anomaly_score += 0.2
            
        # Check 6: Burst voting detection (many votes in short time)
        recent_votes = [ts for ts in behavior['timestamps'] 
                       if (timestamp - ts).total_seconds() < self.BURST_WINDOW_MINUTES * 60]
        if len(recent_votes) >= self.BURST_THRESHOLD:
            flags.append(f"BURST_VOTING: {len(recent_votes)} votes in {self.BURST_WINDOW_MINUTES} minutes")
            anomaly_score += 0.5
            
        # Cap anomaly score at 1.0
        anomaly_score = min(anomaly_score, 1.0)
        
        # Update event with detection results
        event['anomaly_score'] = anomaly_score
        event['flags'] = flags
        
        # Flag suspicious voters
        if anomaly_score > 0.5:
            self.suspicious_voters.add(voter_id)
            event['is_suspicious'] = True
        else:
            event['is_suspicious'] = False
            
        # Add to log
        self.vote_log.append(event)
        
        return event
        
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get detection statistics
        """
        total_votes = len(self.vote_log)
        flagged_votes = sum(1 for event in self.vote_log if event['flags'])
        suspicious_count = len(self.suspicious_voters)
        
        # Calculate average anomaly score
        avg_anomaly_score = 0.0
        if total_votes > 0:
            avg_anomaly_score = sum(event['anomaly_score'] for event in self.vote_log) / total_votes
            
        # Find most common flags
        flag_counts = defaultdict(int)
        for event in self.vote_log:
            for flag in event['flags']:
                flag_type = flag.split(':')[0]
                flag_counts[flag_type] += 1
                
        return {
            'total_votes_analyzed': total_votes,
            'flagged_votes': flagged_votes,
            'suspicious_voters': suspicious_count,
            'fraud_detection_rate': f"{(flagged_votes/total_votes*100) if total_votes > 0 else 0:.1f}%",
            'average_anomaly_score': f"{avg_anomaly_score:.3f}",
            'most_common_flags': dict(sorted(flag_counts.items(), key=lambda x: x[1], reverse=True)[:5]),
            'unique_ips': len(self.ip_vote_count),
            'unique_devices': len(self.device_vote_count),
            'detection_method': 'Rule-Based Analysis'
        }
        
    def get_flagged_voters(self) -> List[Dict[str, Any]]:
        """
        Get list of suspicious voters
        """
        flagged = []
        for voter_id in self.suspicious_voters:
            behavior = self.voter_behavior[voter_id]
            voter_events = [e for e in self.vote_log if e['voter_id'] == voter_id]
            
            # Get max anomaly score and all flags
            max_score = max(e['anomaly_score'] for e in voter_events)
            all_flags = []
            for e in voter_events:
                all_flags.extend(e['flags'])
            unique_flags = list(set(all_flags))
            
            flagged.append({
                'voter_id': voter_id,
                'anomaly_score': max_score,
                'vote_count': behavior['vote_count'],
                'ip_count': len(behavior['ip_addresses']),
                'device_count': len(behavior['devices']),
                'flags': unique_flags,
                'risk_level': self._get_risk_level(max_score),
                'first_seen': min(behavior['timestamps']).isoformat() if behavior['timestamps'] else None,
                'last_seen': max(behavior['timestamps']).isoformat() if behavior['timestamps'] else None
            })
            
        # Sort by anomaly score (highest first)
        flagged.sort(key=lambda x: x['anomaly_score'], reverse=True)
        return flagged
        
    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from anomaly score"""
        if score >= 0.7:
            return 'CRITICAL'
        elif score >= 0.5:
            return 'HIGH'
        elif score >= 0.3:
            return 'MEDIUM'
        else:
            return 'LOW'
            
    def get_recent_anomalies(self, hours: int = 24) -> List[Dict[str, Any]]:
        """
        Get recent anomalous voting events
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        recent = [
            {
                'voter_id': e['voter_id'],
                'candidate_id': e['candidate_id'],
                'timestamp': e['timestamp'].isoformat(),
                'anomaly_score': e['anomaly_score'],
                'flags': e['flags'],
                'ip_address': e['ip_address'],
                'device_info': e['device_info']
            }
            for e in self.vote_log 
            if e['timestamp'] > cutoff and e['flags']
        ]
        return recent[-50:]  # Last 50 anomalies
        
    def clear_data(self):
        """Clear all detection data"""
        self.vote_log.clear()
        self.voter_behavior.clear()
        self.ip_vote_count.clear()
        self.device_vote_count.clear()
        self.suspicious_voters.clear()

# Global instance
anomaly_detector = VotingAnomalyDetector()
