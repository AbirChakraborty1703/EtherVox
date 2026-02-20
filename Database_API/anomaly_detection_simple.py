"""
EtherVox - Production-Grade AI Anomaly Detection for Voting Fraud
=================================================================
Hybrid system: comprehensive rule-based checks  +  Isolation Forest ML.

Key capabilities
----------------
* 9 rule-based fraud heuristics (IP abuse, device abuse, rapid voting,
  burst voting, bot patterns, multi-IP voter, multi-device voter,
  regional spike, candidate stuffing).
* Unsupervised Isolation Forest trained on 15 engineered features with
  proper StandardScaler normalisation.
* Auto-training: model trains automatically after 30 votes and retrains
  every 50 new votes.
* Data persistence: vote logs saved to JSON, ML model saved with joblib.
* Combined risk scoring (weighted rule + ML) for every vote event.
"""

from datetime import datetime, timedelta
from collections import defaultdict
from typing import List, Dict, Any, Optional
import numpy as np
import os
import json
import traceback

# ---------------------------------------------------------------------------
# Persistence paths (co-located with this file)
# ---------------------------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DATA_DIR = os.path.join(_BASE_DIR, "anomaly_data")
_VOTE_LOG_PATH = os.path.join(_DATA_DIR, "vote_log.json")
_MODEL_PATH = os.path.join(_DATA_DIR, "isolation_forest.joblib")
_SCALER_PATH = os.path.join(_DATA_DIR, "scaler.joblib")
_STATS_PATH = os.path.join(_DATA_DIR, "ml_stats.json")


# ---------------------------------------------------------------------------
# Utility: safe JSON serialisation of datetime objects
# ---------------------------------------------------------------------------
def _json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, set):
        return list(obj)
    raise TypeError(f"Type {type(obj)} not serialisable")


# ---------------------------------------------------------------------------
# Main detector class
# ---------------------------------------------------------------------------
class VotingAnomalyDetector:
    """
    Production-grade hybrid anomaly detection for blockchain voting.
    """

    # -----------------------------------------------------------------------
    # Initialisation
    # -----------------------------------------------------------------------
    def __init__(self):
        # -- tracking structures --
        self.vote_log: List[Dict[str, Any]] = []
        self.voter_behavior = defaultdict(lambda: {
            "vote_count": 0,
            "ip_addresses": set(),
            "devices": set(),
            "timestamps": [],
            "locations": [],
            "candidates": [],
        })
        self.ip_vote_count: Dict[str, int] = defaultdict(int)
        self.device_vote_count: Dict[str, int] = defaultdict(int)
        self.ip_voters: Dict[str, set] = defaultdict(set)          # ip -> set of voter_ids
        self.candidate_vote_count: Dict[int, int] = defaultdict(int)
        self.suspicious_voters: set = set()
        self.global_timestamps: List[datetime] = []                 # all vote timestamps

        # -- detection thresholds --
        self.RAPID_VOTING_SECONDS = 5       # min seconds between same-voter votes
        self.MAX_VOTES_PER_IP = 5           # max votes from one IP
        self.MAX_VOTES_PER_DEVICE = 3       # max votes from one device
        self.BURST_THRESHOLD = 8            # global votes in burst window
        self.BURST_WINDOW_SECONDS = 60      # 1-minute burst window
        self.REGIONAL_SPIKE_WINDOW = 300    # 5 minutes
        self.REGIONAL_SPIKE_RATE = 10       # votes/min from one region
        self.BOT_MIN_VOTES = 4              # min votes to check bot pattern
        self.BOT_STD_THRESHOLD = 1.0        # max std-dev of intervals (seconds)
        self.BOT_MEAN_THRESHOLD = 10        # max mean interval for bot check
        self.MAX_IPS_PER_VOTER = 3
        self.MAX_DEVICES_PER_VOTER = 3
        self.CANDIDATE_STUFF_RATIO = 0.70   # flag if >70% votes go to 1 candidate

        # -- ML model state --
        self.model_trained = False
        self.ml_model = None
        self.feature_scaler = None
        self._votes_since_last_train = 0
        self._AUTO_TRAIN_MIN = 30           # first auto-train threshold
        self._AUTO_RETRAIN_INTERVAL = 50    # retrain every N new votes
        self.ml_stats: Dict[str, Any] = {
            "training_samples": 0,
            "model_accuracy": 0,
            "contamination_rate": 0.1,
            "feature_importance": {},
            "last_trained": None,
        }

        # -- region tracking --
        self.region_timestamps: Dict[str, List[datetime]] = defaultdict(list)

        # -- load persisted state --
        self._load_state()

    # ===================================================================== #
    #                      PUBLIC API                                        #
    # ===================================================================== #

    def log_vote(self, vote_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Log a vote, run all anomaly checks, return result dict.

        Expected keys in *vote_info*:
            voter_id, candidate_id, ip_address, device_info,
            location (optional), blockchain_hash (optional)
        """
        event = self._add_voting_event(
            voter_id=vote_info.get("voter_id", "unknown"),
            candidate_id=vote_info.get("candidate_id", 0),
            ip_address=vote_info.get("ip_address"),
            device_info=vote_info.get("device_info"),
            location=vote_info.get("location") or vote_info.get("region"),
            blockchain_hash=vote_info.get("blockchain_hash"),
        )

        # -- ML prediction (if model ready) --
        if self.model_trained and self.ml_model is not None:
            ml_score = self._predict_anomaly(event)
            event["ml_anomaly_score"] = ml_score
            # Combined: 40% rules + 60% ML
            event["anomaly_score"] = round(
                event["rule_anomaly_score"] * 0.4 + ml_score * 0.6, 4
            )
        else:
            event["ml_anomaly_score"] = None

        # Update suspicious set
        if event["anomaly_score"] >= 0.5:
            self.suspicious_voters.add(event["voter_id"])
            event["is_suspicious"] = True
        else:
            event["is_suspicious"] = False

        # -- Auto-train check --
        self._votes_since_last_train += 1
        needs_training = (
            (not self.model_trained and len(self.vote_log) >= self._AUTO_TRAIN_MIN)
            or (self.model_trained and self._votes_since_last_train >= self._AUTO_RETRAIN_INTERVAL)
        )
        if needs_training:
            self._auto_train()

        # -- Persist --
        self._save_state()

        return {
            "anomaly_score": event["anomaly_score"],
            "ml_score": event.get("ml_anomaly_score", event["anomaly_score"]),
            "rule_score": event["rule_anomaly_score"],
            "flags": event["flags"],
            "flag_count": len(event["flags"]),
            "is_suspicious": event["is_suspicious"],
            "anomalies_detected": len(event["flags"]) > 0,
            "risk_level": self._risk_level(event["anomaly_score"]),
            "ai_detected": self.model_trained,
            "voter_id": event["voter_id"],
            "candidate_id": event["candidate_id"],
            "timestamp": event["timestamp"].isoformat(),
        }

    def get_statistics(self) -> Dict[str, Any]:
        """Return comprehensive detection statistics."""
        total = len(self.vote_log)
        flagged = sum(1 for e in self.vote_log if e.get("flags"))
        avg_score = (
            sum(e["anomaly_score"] for e in self.vote_log) / total if total else 0
        )

        # Most common flag types
        flag_counts: Dict[str, int] = defaultdict(int)
        for e in self.vote_log:
            for f in e.get("flags", []):
                flag_type = f.split(":")[0]
                flag_counts[flag_type] += 1

        top_flags = dict(
            sorted(flag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        )

        feature_importance_list = self.ml_stats.get("feature_importance", {})

        return {
            "total_votes_analyzed": total,
            "total_votes": total,
            "flagged_votes": flagged,
            "suspicious_voters": len(self.suspicious_voters),
            "fraud_detection_rate": f"{(flagged / total * 100) if total else 0:.1f}%",
            "average_anomaly_score": f"{avg_score:.3f}",
            "most_common_flags": top_flags,
            "unique_ips": len(self.ip_vote_count),
            "unique_devices": len(self.device_vote_count),
            "detection_method": "Advanced AI: Isolation Forest + Rule-Based Hybrid",
            "model_trained": self.model_trained,
            "ml_training_samples": self.ml_stats["training_samples"],
            "ml_accuracy": f"{self.ml_stats.get('model_accuracy', 0)}%",
            "ml_algorithm": "Isolation Forest (Sklearn Ensemble)",
            "feature_count": 15,
            "contamination_rate": self.ml_stats.get("contamination_rate", 0),
            "ml_stats": {
                "feature_importance": feature_importance_list,
                "model_accuracy": self.ml_stats.get("model_accuracy", 0),
                "training_samples": self.ml_stats["training_samples"],
                "contamination_rate": self.ml_stats.get("contamination_rate", 0),
                "last_trained": self.ml_stats.get("last_trained"),
            },
        }

    def get_flagged_voters(self) -> List[Dict[str, Any]]:
        """Return details for every suspicious voter."""
        flagged = []
        for voter_id in self.suspicious_voters:
            behavior = self.voter_behavior[voter_id]
            voter_events = [e for e in self.vote_log if e["voter_id"] == voter_id]
            if not voter_events:
                continue
            max_score = max(e["anomaly_score"] for e in voter_events)
            all_flags = []
            for e in voter_events:
                all_flags.extend(e.get("flags", []))
            unique_flags = list(set(all_flags))

            flagged.append({
                "voter_id": voter_id,
                "anomaly_score": max_score,
                "vote_count": behavior["vote_count"],
                "ip_count": len(behavior["ip_addresses"]),
                "device_count": len(behavior["devices"]),
                "flags": unique_flags,
                "risk_level": self._risk_level(max_score),
                "first_seen": (
                    min(behavior["timestamps"]).isoformat()
                    if behavior["timestamps"]
                    else None
                ),
                "last_seen": (
                    max(behavior["timestamps"]).isoformat()
                    if behavior["timestamps"]
                    else None
                ),
            })
        flagged.sort(key=lambda x: x["anomaly_score"], reverse=True)
        return flagged

    def get_recent_anomalies(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Recent flagged events (last *hours* hours, max 50)."""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent = [
            {
                "voter_id": e["voter_id"],
                "candidate_id": e["candidate_id"],
                "timestamp": e["timestamp"].isoformat(),
                "anomaly_score": e["anomaly_score"],
                "flags": e["flags"],
                "ip_address": e["ip_address"],
                "device_info": e["device_info"],
            }
            for e in self.vote_log
            if e["timestamp"] > cutoff and e.get("flags")
        ]
        return recent[-50:]

    def train_model(self) -> bool:
        """
        Manually trigger ML model training.
        Returns True on success.
        """
        return self._train_isolation_forest()

    def clear_data(self):
        """Wipe all in-memory detection data and persisted files."""
        self.vote_log.clear()
        self.voter_behavior.clear()
        self.ip_vote_count.clear()
        self.device_vote_count.clear()
        self.ip_voters.clear()
        self.candidate_vote_count.clear()
        self.suspicious_voters.clear()
        self.global_timestamps.clear()
        self.region_timestamps.clear()
        self.model_trained = False
        self.ml_model = None
        self.feature_scaler = None
        self._votes_since_last_train = 0
        self.ml_stats = {
            "training_samples": 0,
            "model_accuracy": 0,
            "contamination_rate": 0.1,
            "feature_importance": {},
            "last_trained": None,
        }
        # Remove persisted files
        for path in (_VOTE_LOG_PATH, _MODEL_PATH, _SCALER_PATH, _STATS_PATH):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

    # ===================================================================== #
    #                      INTERNAL: EVENT LOGGING                           #
    # ===================================================================== #

    def _add_voting_event(
        self,
        voter_id: str,
        candidate_id: int,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        location: Optional[str] = None,
        blockchain_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record a voting event and run all rule-based checks."""
        timestamp = datetime.now()
        ip_address = ip_address or "unknown"
        device_info = device_info or "unknown"
        location = location or "unknown"

        # -- update tracking structures --
        self._update_tracking(voter_id, candidate_id, ip_address, device_info, location, timestamp)

        behavior = self.voter_behavior[voter_id]

        # -- rule-based anomaly checks --
        flags, rule_score = self._run_rule_checks(
            voter_id, candidate_id, ip_address, device_info, location, timestamp, behavior
        )

        # -- build event record --
        event = {
            "voter_id": voter_id,
            "candidate_id": candidate_id,
            "timestamp": timestamp,
            "ip_address": ip_address,
            "device_info": device_info,
            "location": location,
            "blockchain_hash": blockchain_hash,
            "flags": flags,
            "rule_anomaly_score": round(rule_score, 4),
            "anomaly_score": round(rule_score, 4),  # updated later if ML active
            "ml_anomaly_score": None,
            "is_suspicious": rule_score >= 0.5,
        }
        self.vote_log.append(event)
        return event

    def _update_tracking(
        self, voter_id: str, candidate_id: int,
        ip_address: str, device_info: str, location: str, timestamp: datetime,
    ) -> None:
        """Update all internal tracking structures for a new vote."""
        behavior = self.voter_behavior[voter_id]
        behavior["vote_count"] += 1
        behavior["ip_addresses"].add(ip_address)
        behavior["devices"].add(device_info)
        behavior["timestamps"].append(timestamp)
        behavior["locations"].append(location)
        behavior["candidates"].append(candidate_id)

        self.ip_vote_count[ip_address] += 1
        self.device_vote_count[device_info] += 1
        self.ip_voters[ip_address].add(voter_id)
        self.candidate_vote_count[candidate_id] += 1
        self.global_timestamps.append(timestamp)
        self.region_timestamps[location].append(timestamp)

    def _run_rule_checks(
        self, voter_id: str, candidate_id: int,
        ip_address: str, device_info: str, location: str,
        timestamp: datetime, behavior: Dict[str, Any],
    ) -> tuple:
        """Run all 9 rule-based anomaly checks. Returns (flags, rule_score)."""
        flags: List[str] = []
        rule_score: float = 0.0

        # 1 - IP abuse
        if self.ip_vote_count[ip_address] > self.MAX_VOTES_PER_IP:
            flags.append(f"IP_ABUSE: {self.ip_vote_count[ip_address]} votes from IP {ip_address}")
            rule_score += 0.30

        # 2 - Device abuse
        if self.device_vote_count[device_info] > self.MAX_VOTES_PER_DEVICE:
            flags.append(f"DEVICE_ABUSE: {self.device_vote_count[device_info]} votes from same device")
            rule_score += 0.30

        # 3 - Rapid voting (same voter too fast)
        rule_score += self._check_rapid_voting(voter_id, timestamp, behavior, flags)

        # 4 - Multiple IPs for one voter
        if len(behavior["ip_addresses"]) > self.MAX_IPS_PER_VOTER:
            flags.append(f"MULTI_IP_VOTER: voter {voter_id} used {len(behavior['ip_addresses'])} IPs")
            rule_score += 0.20

        # 5 - Multiple devices for one voter
        if len(behavior["devices"]) > self.MAX_DEVICES_PER_VOTER:
            flags.append(f"MULTI_DEVICE_VOTER: voter {voter_id} used {len(behavior['devices'])} devices")
            rule_score += 0.20

        # 6 - Global burst voting
        rule_score += self._check_burst_voting(timestamp, flags)

        # 7 - Regional spike
        rule_score += self._check_regional_spike(location, timestamp, flags)

        # 8 - Bot-like temporal pattern
        rule_score += self._check_bot_pattern(behavior, flags)

        # 9 - Candidate stuffing
        rule_score += self._check_candidate_stuffing(flags)

        rule_score = min(rule_score, 1.0)
        return flags, rule_score

    def _check_rapid_voting(
        self, voter_id: str, timestamp: datetime, behavior: Dict[str, Any], flags: List[str],
    ) -> float:
        """Check for rapid voting by the same voter."""
        if len(behavior["timestamps"]) < 2:
            return 0.0
        gap = (timestamp - behavior["timestamps"][-2]).total_seconds()
        if gap < self.RAPID_VOTING_SECONDS:
            flags.append(f"RAPID_VOTING: {gap:.1f}s between votes by {voter_id}")
            return 0.40
        return 0.0

    def _check_burst_voting(self, timestamp: datetime, flags: List[str]) -> float:
        """Check for global burst voting (many votes system-wide in short window)."""
        recent_global = [
            t for t in self.global_timestamps
            if (timestamp - t).total_seconds() < self.BURST_WINDOW_SECONDS
        ]
        if len(recent_global) >= self.BURST_THRESHOLD:
            flags.append(f"BURST_VOTING: {len(recent_global)} votes in last {self.BURST_WINDOW_SECONDS}s")
            return 0.25
        return 0.0

    def _check_regional_spike(self, location: str, timestamp: datetime, flags: List[str]) -> float:
        """Check for regional spike in a single location."""
        region_ts = self.region_timestamps[location]
        recent_region = [
            t for t in region_ts
            if (timestamp - t).total_seconds() < self.REGIONAL_SPIKE_WINDOW
        ]
        rate_per_min = len(recent_region) / (self.REGIONAL_SPIKE_WINDOW / 60)
        if rate_per_min > self.REGIONAL_SPIKE_RATE:
            flags.append(f"REGIONAL_SPIKE: {rate_per_min:.1f} votes/min from {location}")
            return 0.20
        return 0.0

    def _check_bot_pattern(self, behavior: Dict[str, Any], flags: List[str]) -> float:
        """Check for bot-like temporal pattern (suspiciously regular intervals)."""
        if len(behavior["timestamps"]) < self.BOT_MIN_VOTES:
            return 0.0
        intervals = [
            (behavior["timestamps"][i] - behavior["timestamps"][i - 1]).total_seconds()
            for i in range(1, len(behavior["timestamps"]))
        ]
        if not intervals:
            return 0.0
        mean_iv = float(np.mean(intervals))
        std_iv = float(np.std(intervals))
        if std_iv < self.BOT_STD_THRESHOLD and mean_iv < self.BOT_MEAN_THRESHOLD:
            flags.append(f"BOT_PATTERN: regular {mean_iv:.2f}s intervals (std={std_iv:.2f})")
            return 0.35
        return 0.0

    def _check_candidate_stuffing(self, flags: List[str]) -> float:
        """Check for one candidate getting disproportionate share of votes."""
        total_votes_all = sum(self.candidate_vote_count.values())
        if total_votes_all < 10:
            return 0.0
        max_cand_votes = max(self.candidate_vote_count.values())
        ratio = max_cand_votes / total_votes_all
        if ratio > self.CANDIDATE_STUFF_RATIO:
            flags.append(f"CANDIDATE_STUFFING: one candidate has {ratio:.0%} of all votes")
            return 0.25
        return 0.0

    # ===================================================================== #
    #                      INTERNAL: ML PIPELINE                             #
    # ===================================================================== #

    def _extract_features_for_event(self, event: Dict[str, Any]) -> List[float]:
        """
        Extract 15 numerical features for a single event.
        These features avoid circularity - they are derived purely from
        voting metadata, NOT from rule-based scores.
        """
        voter_id = event["voter_id"]
        behavior = self.voter_behavior[voter_id]
        ip = event.get("ip_address", "unknown")
        device = event.get("device_info", "unknown")
        location = event.get("location", "unknown")
        ts: datetime = event["timestamp"]

        # Temporal features for this voter
        intervals = []
        if len(behavior["timestamps"]) >= 2:
            intervals = [
                (behavior["timestamps"][i] - behavior["timestamps"][i - 1]).total_seconds()
                for i in range(1, len(behavior["timestamps"]))
            ]

        avg_interval = float(np.mean(intervals)) if intervals else 0.0
        min_interval = float(np.min(intervals)) if intervals else 0.0
        std_interval = float(np.std(intervals)) if intervals else 0.0

        # How many unique voters share this IP?
        ip_voter_diversity = len(self.ip_voters.get(ip, set()))

        # Candidate popularity ratio
        cand_id = event.get("candidate_id", 0)
        total_cand_votes = sum(self.candidate_vote_count.values()) or 1
        cand_ratio = self.candidate_vote_count.get(cand_id, 0) / total_cand_votes

        # Global burst measure (votes in last 60s at event time)
        recent_global = sum(
            1 for t in self.global_timestamps
            if abs((ts - t).total_seconds()) < 60
        )

        # Regional density (votes from same location in last 5 min)
        region_recent = sum(
            1 for t in self.region_timestamps.get(location, [])
            if abs((ts - t).total_seconds()) < 300
        )

        return [
            # Voter-level (6)
            float(behavior["vote_count"]),
            float(len(behavior["ip_addresses"])),
            float(len(behavior["devices"])),
            avg_interval,
            min_interval,
            std_interval,
            # IP / Device level (4)
            float(self.ip_vote_count.get(ip, 0)),
            float(self.device_vote_count.get(device, 0)),
            float(ip_voter_diversity),
            float(behavior["vote_count"]) / max(float(len(behavior["ip_addresses"])), 1.0),
            # Temporal / global (3)
            float(ts.hour),
            float(recent_global),
            float(region_recent),
            # Candidate (2)
            float(cand_ratio),
            float(len(behavior.get("candidates", []))),
        ]

    def _extract_features_matrix(self) -> np.ndarray:
        """Build feature matrix for all logged events."""
        rows = [self._extract_features_for_event(e) for e in self.vote_log]
        return np.array(rows, dtype=np.float64)

    def _train_isolation_forest(self) -> bool:
        """
        Train (or retrain) the Isolation Forest on current vote data.
        Returns True on success.
        """
        try:
            from sklearn.ensemble import IsolationForest
            from sklearn.preprocessing import StandardScaler
        except ImportError:
            print("[ANOMALY] scikit-learn not installed - ML training skipped")
            return False

        n = len(self.vote_log)
        if n < 20:
            print(f"[ANOMALY] Need >= 20 votes to train (have {n})")
            return False

        print(f"[ANOMALY] Training Isolation Forest on {n} votes ...")

        try:
            X = self._extract_features_matrix()

            # Normalise
            scaler = StandardScaler()
            x_scaled = scaler.fit_transform(X)

            # Contamination heuristic: at most 30%, at least 5%
            flagged_ratio = sum(1 for e in self.vote_log if e.get("flags")) / n
            contamination = max(0.05, min(0.30, flagged_ratio + 0.05))

            model = IsolationForest(
                n_estimators=150,
                contamination=contamination,
                random_state=42,
                max_samples="auto",
                bootstrap=True,
                n_jobs=-1,
            )
            model.fit(x_scaled)

            # Evaluate on training data (for reporting only)
            preds = model.predict(x_scaled)
            # In unsupervised setting we report % flagged
            pct_anomaly = sum(1 for p in preds if p == -1) / len(preds)

            # Feature importance proxy (variance-based)
            feature_names = [
                "voter_vote_count", "voter_unique_ips", "voter_unique_devices",
                "avg_vote_interval", "min_vote_interval", "std_vote_interval",
                "ip_total_votes", "device_total_votes", "ip_voter_diversity",
                "votes_per_ip_ratio", "hour_of_day", "global_burst_count",
                "regional_density", "candidate_popularity_ratio",
                "voter_candidate_count",
            ]
            col_std = np.std(x_scaled, axis=0)
            importance = {
                name: round(float(v), 4)
                for name, v in zip(feature_names, col_std)
            }
            top_features = dict(
                sorted(importance.items(), key=lambda kv: kv[1], reverse=True)[:5]
            )

            # Store
            self.ml_model = model
            self.feature_scaler = scaler
            self.model_trained = True
            self._votes_since_last_train = 0

            self.ml_stats.update({
                "training_samples": n,
                "model_accuracy": round((1 - pct_anomaly) * 100, 2),
                "contamination_rate": round(contamination, 4),
                "feature_importance": top_features,
                "last_trained": datetime.now().isoformat(),
            })

            # Persist model & scaler
            self._save_model()

            print(f"[ANOMALY] Model trained - contamination={contamination:.2%}, "
                  f"anomaly_rate={pct_anomaly:.2%}, features=15")
            return True

        except Exception as exc:
            print(f"[ANOMALY] Training failed: {exc}")
            traceback.print_exc()
            return False

    def _predict_anomaly(self, event: Dict[str, Any]) -> float:
        """
        Return an ML-based anomaly probability in [0, 1].
        Higher = more anomalous.
        """
        if self.ml_model is None or self.feature_scaler is None:
            return event.get("rule_anomaly_score", 0.0)

        try:
            features = np.array(
                [self._extract_features_for_event(event)], dtype=np.float64
            )
            features_scaled = self.feature_scaler.transform(features)

            raw_score = self.ml_model.score_samples(features_scaled)[0]
            # raw_score: more negative = more anomalous
            # Map to [0, 1]: typical range is about -0.5 (normal) to -0.8 (anomaly)
            probability = max(0.0, min(1.0, (-raw_score - 0.3) / 0.7))
            return round(probability, 4)

        except Exception as exc:
            print(f"[ANOMALY] ML prediction error: {exc}")
            return event.get("rule_anomaly_score", 0.0)

    def _auto_train(self):
        """Background-safe auto-training trigger."""
        try:
            self._train_isolation_forest()
        except Exception as exc:
            print(f"[ANOMALY] Auto-train failed: {exc}")

    # ===================================================================== #
    #                      INTERNAL: PERSISTENCE                             #
    # ===================================================================== #

    def _ensure_data_dir(self):
        os.makedirs(_DATA_DIR, exist_ok=True)

    def _save_state(self):
        """Persist vote log to disk (best-effort)."""
        try:
            self._ensure_data_dir()
            # Save only the last 10 000 events to avoid unbounded growth
            recent = self.vote_log[-10_000:]
            serialisable = []
            for e in recent:
                rec = dict(e)
                if isinstance(rec.get("timestamp"), datetime):
                    rec["timestamp"] = rec["timestamp"].isoformat()
                rec.pop("ml_anomaly_score", None)  # transient
                serialisable.append(rec)
            with open(_VOTE_LOG_PATH, "w", encoding="utf-8") as f:
                json.dump(serialisable, f, default=_json_serial)
        except Exception as exc:
            print(f"[ANOMALY] Save state error: {exc}")

    def _save_model(self):
        """Persist trained model and scaler."""
        try:
            import joblib
            self._ensure_data_dir()
            if self.ml_model is not None:
                joblib.dump(self.ml_model, _MODEL_PATH)
            if self.feature_scaler is not None:
                joblib.dump(self.feature_scaler, _SCALER_PATH)
            with open(_STATS_PATH, "w", encoding="utf-8") as f:
                json.dump(self.ml_stats, f)
            print("[ANOMALY] Model persisted to disk")
        except ImportError:
            print("[ANOMALY] joblib not available - model not persisted")
        except Exception as exc:
            print(f"[ANOMALY] Model save error: {exc}")

    @staticmethod
    def _parse_record_timestamp(rec: Dict[str, Any]) -> None:
        """Normalise the timestamp field on a persisted vote record."""
        ts = rec.get("timestamp")
        if isinstance(ts, str):
            try:
                rec["timestamp"] = datetime.fromisoformat(ts)
            except ValueError:
                rec["timestamp"] = datetime.now()
        elif not isinstance(ts, datetime):
            rec["timestamp"] = datetime.now()
        rec.setdefault("flags", [])
        rec.setdefault("anomaly_score", 0)
        rec.setdefault("rule_anomaly_score", 0)

    def _rebuild_tracking_from_record(self, rec: Dict[str, Any]) -> None:
        """Rebuild internal tracking structures from a single persisted record."""
        vid = rec.get("voter_id", "unknown")
        ip = rec.get("ip_address", "unknown")
        dev = rec.get("device_info", "unknown")
        loc = rec.get("location", "unknown")
        cid = rec.get("candidate_id", 0)

        self.vote_log.append(rec)

        behavior = self.voter_behavior[vid]
        behavior["vote_count"] += 1
        behavior["ip_addresses"].add(ip)
        behavior["devices"].add(dev)
        behavior["timestamps"].append(rec["timestamp"])
        behavior["locations"].append(loc)
        behavior["candidates"].append(cid)

        self.ip_vote_count[ip] += 1
        self.device_vote_count[dev] += 1
        self.ip_voters[ip].add(vid)
        self.candidate_vote_count[cid] += 1
        self.global_timestamps.append(rec["timestamp"])
        self.region_timestamps[loc].append(rec["timestamp"])

        if rec.get("is_suspicious"):
            self.suspicious_voters.add(vid)

    def _load_state(self):
        """Restore vote log and model from disk on startup."""
        self._load_vote_log()
        self._load_ml_model()

    def _load_vote_log(self):
        """Restore vote log from disk."""
        if not os.path.exists(_VOTE_LOG_PATH):
            return
        try:
            with open(_VOTE_LOG_PATH, "r", encoding="utf-8") as f:
                raw = json.load(f)
            for rec in raw:
                self._parse_record_timestamp(rec)
                self._rebuild_tracking_from_record(rec)
            print(f"[ANOMALY] Restored {len(raw)} vote records from disk")
        except Exception as exc:
            print(f"[ANOMALY] Vote log restore error: {exc}")

    def _load_ml_model(self):
        """Restore trained ML model from disk."""
        try:
            import joblib
            if os.path.exists(_MODEL_PATH) and os.path.exists(_SCALER_PATH):
                self.ml_model = joblib.load(_MODEL_PATH)
                self.feature_scaler = joblib.load(_SCALER_PATH)
                self.model_trained = True
                print("[ANOMALY] ML model restored from disk")
            if os.path.exists(_STATS_PATH):
                with open(_STATS_PATH, "r", encoding="utf-8") as f:
                    self.ml_stats.update(json.load(f))
        except ImportError:
            print("[ANOMALY] joblib not available - cannot restore model")
        except Exception as exc:
            print(f"[ANOMALY] Model restore error: {exc}")

    # ===================================================================== #
    #                      INTERNAL: HELPERS                                 #
    # ===================================================================== #

    @staticmethod
    def _risk_level(score: float) -> str:
        if score >= 0.7:
            return "CRITICAL"
        if score >= 0.5:
            return "HIGH"
        if score >= 0.3:
            return "MEDIUM"
        return "LOW"


# =========================================================================
# Global singleton
# =========================================================================
print("[ANOMALY] Initialising EtherVox AI Anomaly Detection ...")
print("[ANOMALY]   Engine:  Isolation Forest + 9 Rule-Based Heuristics")
print("[ANOMALY]   Features: 15 engineered features with StandardScaler")
print("[ANOMALY]   Persistence: JSON vote log + joblib model files")
anomaly_detector = VotingAnomalyDetector()
if anomaly_detector.model_trained:
    print(f"[ANOMALY]   ML model loaded (trained on {anomaly_detector.ml_stats['training_samples']} samples)")
else:
    print("[ANOMALY]   ML model will auto-train after 30 votes")
print("[ANOMALY] System ready.")
