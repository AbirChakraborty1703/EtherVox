"""
Integration Example: Adding Liveness Detection to Voting Flow
==============================================================

This script demonstrates how to integrate liveness detection
into your existing voting workflow.
"""

# ==============================================================================
# STEP 1: Add Liveness Check Before Voting (Frontend)
# ==============================================================================

# File: public/voting.html or your main voting page

# Add this JavaScript code at the beginning of your voting function:

"""
async function castVote(candidateId) {
    // Check if liveness verification is required
    const livenessRequired = true; // Set to false to disable
    
    if (livenessRequired) {
        // Check if liveness was already verified
        const livenessVerified = sessionStorage.getItem('liveness_verified');
        const sessionId = sessionStorage.getItem('liveness_session_id');
        
        if (!livenessVerified) {
            // Redirect to liveness check page
            alert('Please complete liveness verification first');
            window.location.href = '/liveness-check.html';
            return;
        }
        
        // Verify the liveness session is still valid
        try {
            const response = await fetch('http://127.0.0.1:8001/liveness/verify-liveness', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    voter_id: localStorage.getItem('voter_id')
                })
            });
            
            const result = await response.json();
            
            if (!result.verified || !result.can_vote) {
                alert('Liveness verification expired. Please verify again.');
                sessionStorage.removeItem('liveness_verified');
                window.location.href = '/liveness-check.html';
                return;
            }
        } catch (error) {
            alert('Failed to verify liveness. Please try again.');
            return;
        }
    }
    
    // Proceed with normal voting flow
    console.log('Liveness verified. Proceeding with vote...');
    
    // Your existing voting code here
    // ...
}
"""

# ==============================================================================
# STEP 2: Update Login Flow to Include Liveness
# ==============================================================================

# File: public/login.html or authentication page

"""
async function login(voterId, password) {
    // Step 1: Authenticate credentials
    const authResponse = await fetch('http://127.0.0.1:8001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId, password: password })
    });
    
    if (!authResponse.ok) {
        alert('Login failed');
        return;
    }
    
    const authData = await authResponse.json();
    
    // Step 2: Perform face authentication (if enabled)
    if (authData.face_auth_required) {
        const faceVerified = await performFaceAuth(voterId);
        if (!faceVerified) {
            alert('Face authentication failed');
            return;
        }
    }
    
    // Step 3: Store credentials and redirect to liveness check
    localStorage.setItem('voter_id', voterId);
    localStorage.setItem('token', authData.token);
    
    // Redirect to liveness detection
    window.location.href = '/liveness-check.html';
}
"""

# ==============================================================================
# STEP 3: Backend Integration in Smart Contract Interaction
# ==============================================================================

# File: src/js/app.js or your blockchain interaction file

"""
// Before submitting vote to blockchain, verify liveness
async function submitVoteToBlockchain(candidateId) {
    const voterId = localStorage.getItem('voter_id');
    const sessionId = sessionStorage.getItem('liveness_session_id');
    
    // Final liveness verification
    const livenessVerified = await verifyLiveness(sessionId, voterId);
    
    if (!livenessVerified) {
        alert('Liveness verification failed. Please complete liveness check.');
        window.location.href = '/liveness-check.html';
        return;
    }
    
    // Log the liveness check to blockchain (optional)
    await logLivenessToBlockchain(voterId, sessionId);
    
    // Proceed with blockchain transaction
    const accounts = await web3.eth.getAccounts();
    await votingContract.methods.vote(candidateId)
        .send({ from: accounts[0] });
        
    alert('Vote submitted successfully!');
}

async function verifyLiveness(sessionId, voterId) {
    try {
        const response = await fetch('http://127.0.0.1:8001/liveness/verify-liveness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, voter_id: voterId })
        });
        
        const result = await response.json();
        return result.verified && result.can_vote;
    } catch (error) {
        console.error('Liveness verification error:', error);
        return false;
    }
}
"""

# ==============================================================================
# STEP 4: Backend Logging and Audit Trail
# ==============================================================================

# File: Database_API/main.py - Add new endpoint

"""
@app.post("/log-vote-with-liveness")
async def log_vote_with_liveness(request: Request):
    '''
    Log vote submission with liveness verification data
    '''
    data = await request.json()
    voter_id = data.get('voter_id')
    candidate_id = data.get('candidate_id')
    session_id = data.get('liveness_session_id')
    
    # Verify liveness one final time
    liveness_log = liveness_logs_collection.find_one({
        'session_id': session_id,
        'voter_id': voter_id,
        'result': 'SUCCESS'
    })
    
    if not liveness_log:
        raise HTTPException(
            status_code=403, 
            detail='No valid liveness verification found'
        )
    
    # Log the vote with liveness data
    vote_log = {
        'voter_id': voter_id,
        'candidate_id': candidate_id,
        'timestamp': datetime.now(),
        'liveness_verified': True,
        'liveness_session_id': session_id,
        'liveness_confidence': liveness_log.get('confidence'),
        'ip_address': request.client.host
    }
    
    votes_collection.insert_one(vote_log)
    
    return {
        'success': True,
        'message': 'Vote logged with liveness verification'
    }
"""

# ==============================================================================
# STEP 5: Environment Configuration
# ==============================================================================

# File: .env or config.js

"""
# Enable/disable liveness detection
LIVENESS_DETECTION_ENABLED=true

# Liveness detection settings
LIVENESS_MIN_BLINKS=2
LIVENESS_REQUIRE_HEAD_MOVEMENT=true
LIVENESS_TIMEOUT_SECONDS=15
LIVENESS_CONFIDENCE_THRESHOLD=80

# API endpoints
LIVENESS_API_URL=http://127.0.0.1:8001/liveness
"""

# ==============================================================================
# STEP 6: Complete Voting Flow with All Security Layers
# ==============================================================================

"""
COMPLETE VOTING FLOW:
=====================

1. USER LOGIN
   ├── Enter Voter ID + Password
   ├── Verify credentials (Database)
   └── Generate JWT token

2. FACE AUTHENTICATION
   ├── Capture face image
   ├── Extract face descriptor
   ├── Match against database
   └── Verify identity

3. LIVENESS DETECTION (NEW!)
   ├── Start liveness session
   ├── Capture video frames
   ├── Detect eye blinks (2+)
   ├── Detect head movement (L/R)
   ├── Calculate confidence score
   └── Verify liveness

4. FRAUD DETECTION
   ├── Check anomaly detection model
   ├── Analyze voting patterns
   ├── Check for suspicious behavior
   └── Flag if anomalies detected

5. BLOCKCHAIN TRANSACTION
   ├── Connect to MetaMask
   ├── Submit vote to smart contract
   ├── Wait for confirmation
   └── Log to MongoDB

6. POST-VOTE LOGGING
   ├── Log vote with all verification data
   ├── Store liveness session ID
   ├── Record timestamp and IP
   └── Update audit trail
"""

# ==============================================================================
# STEP 7: Error Handling and Fallbacks
# ==============================================================================

"""
// Comprehensive error handling for liveness detection

async function safeLivenessCheck(voterId) {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            // Start session
            const startResponse = await fetch(
                'http://127.0.0.1:8001/liveness/start-liveness',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ voter_id: voterId, session_type: 'voting' })
                }
            );
            
            if (!startResponse.ok) {
                throw new Error('Failed to start liveness session');
            }
            
            const sessionData = await startResponse.json();
            return sessionData.session_id;
            
        } catch (error) {
            retries++;
            console.error(`Liveness check attempt ${retries} failed:`, error);
            
            if (retries >= maxRetries) {
                // Fallback: log error and allow manual review
                await logLivenessFailure(voterId, error.message);
                
                // Option 1: Block voting
                throw new Error('Liveness detection failed. Please contact support.');
                
                // Option 2: Allow with manual review flag
                // return 'manual_review_required';
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

async function logLivenessFailure(voterId, errorMessage) {
    await fetch('http://127.0.0.1:8001/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            voter_id: voterId,
            error_type: 'liveness_failure',
            error_message: errorMessage,
            timestamp: new Date().toISOString()
        })
    });
}
"""

# ==============================================================================
# STEP 8: Admin Dashboard Integration
# ==============================================================================

"""
// Admin dashboard to monitor liveness detection

async function fetchLivenessStatistics() {
    const response = await fetch('http://127.0.0.1:8001/liveness/statistics', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const stats = await response.json();
    
    // Display statistics
    document.getElementById('total-liveness-checks').textContent = stats.total;
    document.getElementById('successful-checks').textContent = stats.successful;
    document.getElementById('failed-checks').textContent = stats.failed;
    document.getElementById('avg-confidence').textContent = stats.avg_confidence + '%';
}

// Real-time monitoring
async function monitorLivenessChecks() {
    const eventSource = new EventSource('http://127.0.0.1:8001/liveness/stream');
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateDashboard(data);
    };
}
"""

# ==============================================================================
# TESTING THE INTEGRATION
# ==============================================================================

if __name__ == '__main__':
    print("""
    🧪 INTEGRATION TESTING CHECKLIST
    =================================
    
    □ Backend API is running (python Database_API/main.py)
    □ MongoDB is running (port 27017)
    □ Frontend is accessible (http://127.0.0.1:8001)
    
    Test Flow:
    ---------
    1. Access liveness check page: http://127.0.0.1:8001/liveness-check.html
    2. Allow camera access
    3. Follow instructions (blink, turn head)
    4. Verify success message
    5. Check MongoDB for log entry:
       > use voter_db
       > db.liveness_logs.find().pretty()
    
    Integration Points:
    ------------------
    □ Login flow redirects to liveness check
    □ Voting page checks liveness verification
    □ Blockchain transaction includes liveness data
    □ Admin dashboard shows liveness stats
    □ Error handling works correctly
    □ Session timeout is enforced (15 min)
    □ Cleanup removes expired sessions
    
    Security Validations:
    --------------------
    □ Static photos are rejected
    □ Pre-recorded videos are rejected
    □ Face must be visible and well-lit
    □ All steps must be completed
    □ Session cannot be reused
    □ Confidence threshold is enforced
    
    🚀 Ready to deploy!
    """)
