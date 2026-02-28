/**
 * EtherVox - AI-Powered Face Authentication System
 * Uses face-api.js for face detection and recognition
 * face-api.js is loaded globally via script tag in HTML
 */

// face-api.js is available as window.faceapi from the CDN script tag

class FaceAuthSystem {
    constructor() {
        this.modelsLoaded = false;
        this.video = null;
        this.canvas = null;
        this.isInitialized = false;
        this._detectLoop = null; // animation frame ID for live detection
        this.faceDetected = false; // tracks if a face is currently visible
    }

    /**
     * Load face-api.js models
     */
    async loadModels() {
        if (this.modelsLoaded) return;
        
        try {
            console.log('📦 Loading face recognition models...');
            
            const MODEL_URL = '/models';
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
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
     * @param {HTMLVideoElement} videoElement - the video element to stream into
     * @param {HTMLCanvasElement} [canvasElement] - optional canvas overlaid on the video for drawing detections
     */
    async initializeCamera(videoElement, canvasElement) {
        try {
            this.video = videoElement;
            this.canvas = canvasElement || null;
            
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
                    // Match canvas size to actual video dimensions
                    if (this.canvas) {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                    }
                    console.log('📹 Camera initialized');
                    // Start the live face-detection drawing loop
                    this._startDetectionLoop();
                    resolve();
                };
            });
        } catch (error) {
            console.error('❌ Camera access denied:', error);
            alert('Camera access is required for face authentication');
            throw error;
        }
    }

    /* ── Live face-detection overlay loop ────────────────────── */

    /**
     * Continuously detect faces and draw landmarks + bounding box on the canvas.
     * Runs via requestAnimationFrame so it stays in sync with the display.
     */
    _startDetectionLoop() {
        if (!this.video || !this.canvas) return;
        const ctx = this.canvas.getContext('2d');

        const loop = async () => {
            if (!this.video || this.video.paused || !this.modelsLoaded) {
                this._detectLoop = requestAnimationFrame(loop);
                return;
            }

            // Run face detection with landmarks
            const detection = await faceapi
                .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({
                    inputSize: 320,
                    scoreThreshold: 0.45
                }))
                .withFaceLandmarks();

            // Clear previous drawings
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (detection) {
                this.faceDetected = true;
                const dims = { width: this.video.videoWidth, height: this.video.videoHeight };
                const resized = faceapi.resizeResults(detection, dims);

                // Draw bounding box
                faceapi.draw.drawDetections(this.canvas, resized);
                // Draw the 68 face landmark dots
                faceapi.draw.drawFaceLandmarks(this.canvas, resized);

                // Draw a custom "Face Detected" label
                ctx.fillStyle = '#00ff88';
                ctx.font = 'bold 14px Poppins, sans-serif';
                ctx.fillText('✓ Face Detected', 10, 22);
            } else {
                this.faceDetected = false;
                // Show guidance when no face is found
                ctx.fillStyle = '#ff4444';
                ctx.font = 'bold 14px Poppins, sans-serif';
                ctx.fillText('⚠ No Face – look at the camera', 10, 22);
            }

            this._detectLoop = requestAnimationFrame(loop);
        };

        this._detectLoop = requestAnimationFrame(loop);
    }

    _stopDetectionLoop() {
        if (this._detectLoop) {
            cancelAnimationFrame(this._detectLoop);
            this._detectLoop = null;
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
            .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.45
            }))
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
            const response = await fetch('http://127.0.0.1:8001/face-auth/register-face', {
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
            const response = await fetch('http://127.0.0.1:8001/face-auth/login-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    face_descriptor: Array.from(descriptor)
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || 'Face authentication failed');
            }

            const data = await response.json();
            console.log('✅ Face authenticated successfully!');
            
            return {
                success: true,
                voter_id: data.voter_id,
                role: data.role,
                token: data.token,
                confidence: data.confidence
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
        this._stopDetectionLoop();
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            console.log('📹 Camera stopped');
        }
        this.canvas = null;
        this.faceDetected = false;
    }
}

// Make available globally instead of ES module export
window.faceAuth = new FaceAuthSystem();
