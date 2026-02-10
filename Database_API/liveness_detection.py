"""
AI-based Liveness Detection Module
===================================

This module implements active liveness detection to prevent spoofing attacks:
- Eye blinking detection
- Head movement detection (left/right)
- Real-time computer vision analysis

Technologies:
- OpenCV for image processing
- MediaPipe for face landmark detection
- NumPy for mathematical operations

Author: EtherVox Development Team
Version: 1.0.0
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, Tuple, Optional
import time
from collections import deque
import base64


class LivenessDetector:
    """
    Advanced liveness detection system using computer vision.
    
    Detects:
    1. Eye blinking patterns
    2. Head rotation (left/right movement)
    3. Face presence and quality
    """
    
    # Eye Aspect Ratio (EAR) threshold for blink detection
    EYE_AR_THRESH = 0.25
    EYE_AR_CONSEC_FRAMES = 2
    
    # Head rotation thresholds (in degrees)
    HEAD_ROTATION_THRESHOLD = 15
    
    # Face mesh landmark indices for eyes
    LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
    
    def __init__(self):
        """Initialize MediaPipe Face Mesh and detection parameters."""
        # Initialize MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Detection state variables
        self.blink_counter = 0
        self.frame_counter = 0
        self.ear_history = deque(maxlen=20)
        
        # Head movement tracking
        self.head_positions = deque(maxlen=30)
        self.detected_left_turn = False
        self.detected_right_turn = False
        
        # Timing
        self.start_time = None
        self.max_duration = 15  # Maximum time for liveness check (seconds)
        
    def calculate_eye_aspect_ratio(self, eye_landmarks: np.ndarray) -> float:
        """
        Calculate Eye Aspect Ratio (EAR) for blink detection.
        
        EAR formula:
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
        
        Where p1-p6 are the 6 eye landmark points.
        
        Args:
            eye_landmarks: Array of 6 (x,y) coordinates for eye landmarks
            
        Returns:
            float: Eye Aspect Ratio value
        """
        # Compute the euclidean distances between the vertical eye landmarks
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        
        # Compute the euclidean distance between the horizontal eye landmarks
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        # Compute the eye aspect ratio
        ear = (A + B) / (2.0 * C)
        return ear
    
    def extract_eye_landmarks(self, face_landmarks, indices: list, 
                            image_width: int, image_height: int) -> np.ndarray:
        """
        Extract eye landmark coordinates from face mesh.
        
        Args:
            face_landmarks: MediaPipe face landmarks
            indices: List of landmark indices for the eye
            image_width: Image width in pixels
            image_height: Image height in pixels
            
        Returns:
            np.ndarray: Array of (x,y) coordinates for eye landmarks
        """
        landmarks = []
        for idx in indices:
            landmark = face_landmarks.landmark[idx]
            x = int(landmark.x * image_width)
            y = int(landmark.y * image_height)
            landmarks.append([x, y])
        return np.array(landmarks)
    
    def calculate_head_rotation(self, face_landmarks, image_width: int, 
                                image_height: int) -> Tuple[float, float, float]:
        """
        Calculate head rotation angles (yaw, pitch, roll) using 3D face landmarks.
        
        Args:
            face_landmarks: MediaPipe face landmarks
            image_width: Image width
            image_height: Image height
            
        Returns:
            Tuple of (yaw, pitch, roll) in degrees
        """
        # Key facial landmarks for pose estimation
        # Nose tip, chin, left eye corner, right eye corner, left mouth, right mouth
        landmark_indices = [1, 152, 33, 263, 61, 291]
        
        # Extract 2D coordinates
        image_points = []
        for idx in landmark_indices:
            landmark = face_landmarks.landmark[idx]
            x = landmark.x * image_width
            y = landmark.y * image_height
            image_points.append([x, y])
        image_points = np.array(image_points, dtype=np.float32)
        
        # 3D model points (generic face model)
        model_points = np.array([
            (0.0, 0.0, 0.0),             # Nose tip
            (0.0, -330.0, -65.0),        # Chin
            (-225.0, 170.0, -135.0),     # Left eye corner
            (225.0, 170.0, -135.0),      # Right eye corner
            (-150.0, -150.0, -125.0),    # Left mouth corner
            (150.0, -150.0, -125.0)      # Right mouth corner
        ], dtype=np.float32)
        
        # Camera internals
        focal_length = image_width
        center = (image_width / 2, image_height / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float32)
        
        # Assuming no lens distortion
        dist_coeffs = np.zeros((4, 1))
        
        # Solve PnP
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points, 
            image_points, 
            camera_matrix, 
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )
        
        # Convert rotation vector to rotation matrix
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        
        # Calculate Euler angles
        # Yaw (left-right rotation)
        yaw = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
        # Pitch (up-down rotation)
        pitch = np.arctan2(-rotation_matrix[2, 0], 
                          np.sqrt(rotation_matrix[2, 1]**2 + rotation_matrix[2, 2]**2))
        # Roll (tilt)
        roll = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
        
        # Convert to degrees
        yaw = np.degrees(yaw)
        pitch = np.degrees(pitch)
        roll = np.degrees(roll)
        
        return yaw, pitch, roll
    
    def process_frame(self, frame: np.ndarray) -> Dict[str, any]:
        """
        Process a single frame for liveness detection.
        
        Args:
            frame: Input image frame (BGR format from OpenCV)
            
        Returns:
            Dict containing:
                - is_live: Boolean indicating if liveness detected
                - blink_count: Number of blinks detected
                - head_movement_detected: Boolean for head movement
                - status: Current status message
                - confidence: Confidence score
                - visualization_frame: Annotated frame for display
        """
        if self.start_time is None:
            self.start_time = time.time()
        
        # Check timeout
        elapsed_time = time.time() - self.start_time
        if elapsed_time > self.max_duration:
            return {
                "is_live": False,
                "blink_count": self.blink_counter,
                "head_movement_detected": False,
                "status": "Timeout: Liveness check failed",
                "confidence": 0.0,
                "visualization_frame": frame,
                "timeout": True
            }
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        status = "No face detected"
        blink_detected = False
        head_movement = False
        confidence = 0.0
        
        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]
            h, w, _ = frame.shape
            
            # ===== EYE BLINK DETECTION =====
            # Extract eye landmarks
            left_eye = self.extract_eye_landmarks(face_landmarks, self.LEFT_EYE_INDICES, w, h)
            right_eye = self.extract_eye_landmarks(face_landmarks, self.RIGHT_EYE_INDICES, w, h)
            
            # Calculate EAR for both eyes
            left_ear = self.calculate_eye_aspect_ratio(left_eye)
            right_ear = self.calculate_eye_aspect_ratio(right_eye)
            avg_ear = (left_ear + right_ear) / 2.0
            self.ear_history.append(avg_ear)
            
            # Check for blink
            if avg_ear < self.EYE_AR_THRESH:
                self.frame_counter += 1
            else:
                if self.frame_counter >= self.EYE_AR_CONSEC_FRAMES:
                    self.blink_counter += 1
                    blink_detected = True
                self.frame_counter = 0
            
            # ===== HEAD MOVEMENT DETECTION =====
            yaw, pitch, roll = self.calculate_head_rotation(face_landmarks, w, h)
            self.head_positions.append(yaw)
            
            # Check for left and right head turns
            if yaw < -self.HEAD_ROTATION_THRESHOLD:
                self.detected_left_turn = True
                head_movement = True
            elif yaw > self.HEAD_ROTATION_THRESHOLD:
                self.detected_right_turn = True
                head_movement = True
            
            # ===== STATUS DETERMINATION =====
            status_parts = []
            
            if self.blink_counter >= 2:
                status_parts.append(f"✓ Blinks: {self.blink_counter}")
            else:
                status_parts.append(f"Blink {self.blink_counter}/2")
            
            if self.detected_left_turn and self.detected_right_turn:
                status_parts.append("✓ Head Movement")
            elif self.detected_left_turn:
                status_parts.append("Turn RIGHT")
            elif self.detected_right_turn:
                status_parts.append("Turn LEFT")
            else:
                status_parts.append("Turn head L/R")
            
            status = " | ".join(status_parts)
            
            # Calculate confidence
            blink_confidence = min(self.blink_counter / 2.0, 1.0)
            head_confidence = 0.5 if self.detected_left_turn else 0.0
            head_confidence += 0.5 if self.detected_right_turn else 0.0
            confidence = (blink_confidence * 0.6 + head_confidence * 0.4) * 100
            
            # ===== VISUALIZATION =====
            # Draw eye landmarks
            for eye in [left_eye, right_eye]:
                for point in eye:
                    cv2.circle(frame, tuple(point), 2, (0, 255, 0), -1)
            
            # Draw head rotation indicator
            nose_tip = face_landmarks.landmark[1]
            nose_x = int(nose_tip.x * w)
            nose_y = int(nose_tip.y * h)
            
            # Draw direction arrow
            arrow_length = 50
            arrow_x = int(nose_x + arrow_length * np.sin(np.radians(yaw)))
            arrow_y = nose_y
            cv2.arrowedLine(frame, (nose_x, nose_y), (arrow_x, arrow_y), 
                          (255, 0, 0), 3, tipLength=0.3)
            
            # Display EAR value
            cv2.putText(frame, f"EAR: {avg_ear:.2f}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            # Display rotation angles
            cv2.putText(frame, f"Yaw: {yaw:.1f}°", (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
        
        # Display status and confidence
        cv2.putText(frame, status, (10, h - 40),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"Confidence: {confidence:.1f}%", (10, h - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        # Display timer
        remaining_time = self.max_duration - elapsed_time
        cv2.putText(frame, f"Time: {remaining_time:.1f}s", (w - 150, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        # Check if liveness is confirmed
        is_live = (self.blink_counter >= 2 and 
                  self.detected_left_turn and 
                  self.detected_right_turn)
        
        return {
            "is_live": is_live,
            "blink_count": self.blink_counter,
            "head_movement_detected": head_movement,
            "left_turn": self.detected_left_turn,
            "right_turn": self.detected_right_turn,
            "status": status,
            "confidence": round(confidence, 2),
            "visualization_frame": frame,
            "ear": round(avg_ear, 3) if results.multi_face_landmarks else 0,
            "yaw": round(yaw, 2) if results.multi_face_landmarks else 0,
            "timeout": False
        }
    
    def reset(self):
        """Reset detector state for a new liveness check."""
        self.blink_counter = 0
        self.frame_counter = 0
        self.ear_history.clear()
        self.head_positions.clear()
        self.detected_left_turn = False
        self.detected_right_turn = False
        self.start_time = None
    
    def process_base64_frame(self, base64_image: str) -> Dict[str, any]:
        """
        Process a base64 encoded image for liveness detection.
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Dict with liveness detection results
        """
        try:
            # Decode base64 image
            img_data = base64.b64decode(base64_image.split(',')[1] if ',' in base64_image else base64_image)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return {
                    "is_live": False,
                    "status": "Invalid image data",
                    "confidence": 0.0,
                    "error": "Failed to decode image"
                }
            
            # Process the frame
            result = self.process_frame(frame)
            
            # Encode visualization frame back to base64
            _, buffer = cv2.imencode('.jpg', result['visualization_frame'])
            result['visualization_frame'] = base64.b64encode(buffer).decode('utf-8')
            
            return result
            
        except Exception as e:
            return {
                "is_live": False,
                "status": f"Error: {str(e)}",
                "confidence": 0.0,
                "error": str(e)
            }
    
    def __del__(self):
        """Cleanup resources."""
        if hasattr(self, 'face_mesh'):
            self.face_mesh.close()


# Singleton instance for reuse across API calls
_liveness_detector_instance = None

def get_liveness_detector() -> LivenessDetector:
    """Get or create singleton liveness detector instance."""
    global _liveness_detector_instance
    if _liveness_detector_instance is None:
        _liveness_detector_instance = LivenessDetector()
    return _liveness_detector_instance
