/**
 * EtherVox - AI-Powered Face Authentication System
 * Uses face-api.js for face detection and recognition
 */

import * as faceapi from 'face-api.js';

class FaceAuthSystem {
    constructor() {
        this.modelsLoaded = false;
        this.video = null;
        this.canvas = null;
        this.isInitialized = false;
    }

    /**
     * Load face-api.js models
     */
    async loadModels() {
        if (this.modelsLoaded) return;
        
        try {
            console.log('📦 Loading face recognition models...');
            
            const MODEL_URL = '/models'; // We'll need to add model files
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.modelsLoaded = true;
            console.log('✅ Face recognition models loaded successfully!');
        } catch (error) {
            console.error('❌ Error loading models:', error);
            throw error;
        }
    }

    /**
     * Initialize camera and video stream
     */
    async initializeCamera(videoElement) {
        try {
            this.video = videoElement;
            
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });
            
            this.video.srcObject = stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    console.log('📹 Camera initialized');
                    resolve();
                };
            });
        } catch (error) {
            console.error('❌ Camera access denied:', error);
            alert('Camera access is required for face authentication');
            throw error;
        }
    }

    /**
     * Capture and process face from video stream
     */
    async captureFace() {
        if (!this.video) {
            throw new Error('Camera not initialized');
        }

        // Detect face with landmarks and descriptor
        const detection = await faceapi
            .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) {
            throw new Error('No face detected. Please ensure your face is clearly visible.');
        }

        return detection.descriptor; // 128-dimensional face descriptor
    }

    /**
     * Register new face for a voter
     */
    async registerFace(voterId) {
        try {
            console.log('📸 Capturing face for registration...');
            
            // Capture multiple samples for better accuracy
            const descriptors = [];
            for (let i = 0; i < 3; i++) {
                const descriptor = await this.captureFace();
                descriptors.push(Array.from(descriptor));
                
                // Wait between captures
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Send to backend to store
            const response = await fetch('http://127.0.0.1:8001/register-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    voter_id: voterId,
                    face_descriptors: descriptors
                })
            });

            if (!response.ok) {
                throw new Error('Failed to register face');
            }

            console.log('✅ Face registered successfully!');
            return true;
        } catch (error) {
            console.error('❌ Face registration failed:', error);
            throw error;
        }
    }

    /**
     * Authenticate user by face
     */
    async authenticateByFace() {
        try {
            console.log('🔍 Attempting face authentication...');
            
            const descriptor = await this.captureFace();
            
            // Send to backend for matching
            const response = await fetch('http://127.0.0.1:8001/login-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    face_descriptor: Array.from(descriptor)
                })
            });

            if (!response.ok) {
                throw new Error('Face authentication failed');
            }

            const data = await response.json();
            console.log('✅ Face authenticated successfully!');
            
            return {
                success: true,
                voter_id: data.voter_id,
                token: data.token
            };
        } catch (error) {
            console.error('❌ Face authentication failed:', error);
            throw error;
        }
    }

    /**
     * Calculate euclidean distance between two face descriptors
     */
    euclideanDistance(descriptor1, descriptor2) {
        return faceapi.euclideanDistance(descriptor1, descriptor2);
    }

    /**
     * Stop camera and clean up
     */
    stopCamera() {
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            console.log('📹 Camera stopped');
        }
    }
}

// Export singleton instance
export const faceAuth = new FaceAuthSystem();
