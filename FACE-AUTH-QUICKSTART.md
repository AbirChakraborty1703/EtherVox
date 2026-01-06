# 🚀 EtherVox Face Authentication - Quick Start Guide

## ✅ Pre-Flight Checklist

### All Files Verified
- ✅ Backend: `Database_API/face_auth_routes.py` (Face authentication API)
- ✅ Frontend: `src/html/face-register.html` (Face registration UI)
- ✅ Frontend: `src/html/login.html` (Updated with face login button)
- ✅ Frontend: `src/js/login.js` (Face authentication logic)
- ✅ Frontend: `src/css/login.css` (Face modal styling)
- ✅ Frontend: `src/css/admin.css` (Face register button styling)
- ✅ Models: `public/models/` (7 model files downloaded)
- ✅ Bundle: `public/app.bundle.js` (Webpack build completed)

### Services Status
- MongoDB: Required (stores face descriptors)
- MySQL: Required (voter data)
- Ganache: Required (blockchain)
- FastAPI: Required (port 8001)
- Express: Required (port 8081)

## 🎬 How to Start Testing

### Step 1: Start All Services
```powershell
# If Ganache UI is already running:
cd "d:\Final Year project"
.\start-services-only.bat

# If Ganache UI is NOT running:
cd "d:\Final Year project"
.\start-ethervox.bat
```

### Step 2: Test Face Registration
1. Open browser: `http://localhost:8081/login.html`
2. Login as admin: `A001` / `adminPass001`
3. Click **"Register Face"** button (top-right)
4. Enter a voter ID (e.g., `V001`)
5. Click **"Start Registration"**
6. Allow camera permissions
7. Wait for 3 automatic face captures
8. Verify "Registration successful!" message

**Alternative Direct Access**:
```
http://localhost:8081/face-register.html
```

### Step 3: Test Face Login
1. Logout from admin panel
2. Go to login page: `http://localhost:8081/login.html`
3. Click **"User Login"** tab
4. Click **"Login with Face Recognition"** button
5. Allow camera permissions
6. Position your face in the frame
7. Click **"Capture & Authenticate"**
8. Verify successful login and redirect

### Step 4: Verify Authentication
After successful face login, check:
- Browser localStorage has JWT token
- User is redirected to voting portal
- All voting features work normally

## 🔍 Testing Scenarios

### Scenario 1: New Voter Registration
```
1. Register voter in system (if not exists)
2. Register face for voter V001
3. Logout
4. Login using face as V001
5. Cast vote
```

### Scenario 2: Multiple Voters
```
1. Register face for V001
2. Register face for V002
3. Test login with V001 face
4. Test login with V002 face
5. Verify correct voter authenticated each time
```

### Scenario 3: Admin Face Login
```
1. Register face for admin A001
2. Logout
3. Login using face
4. Verify redirect to admin panel
```

### Scenario 4: Error Handling
```
1. Try to register with invalid voter ID
2. Try to login with unregistered face
3. Try to login with poor lighting
4. Try to login with no face in frame
5. Verify appropriate error messages
```

## 📊 Expected Results

### Successful Face Registration
```
✅ Camera initializes
✅ Face detection overlay appears (green box around face)
✅ 3 samples captured automatically (count: 1, 2, 3)
✅ Status shows "Registering face data..."
✅ Success message: "✅ Face registered successfully!"
✅ Descriptors saved to MongoDB
```

### Successful Face Login
```
✅ Modal opens with camera preview
✅ Real-time face detection (green box around face)
✅ Click "Capture & Authenticate"
✅ Status shows "Authenticating..."
✅ Success message: "✅ Welcome, V001!"
✅ JWT token stored in localStorage
✅ Redirect to appropriate page (admin/voter)
```

### Expected Errors (Testing Edge Cases)
```
⚠️ "No face detected" - Move closer to camera
⚠️ "Voter ID not found" - Check database
⚠️ "Face not recognized" - Re-register with better lighting
⚠️ "Could not access camera" - Check browser permissions
```

## 🎯 Key URLs

### Production URLs
- **Login Page**: http://localhost:8081/login.html
- **Face Registration**: http://localhost:8081/face-register.html
- **Admin Panel**: http://localhost:8081/admin.html
- **Voting Portal**: http://localhost:8081/index.html

### API Endpoints
- **Register Face**: http://localhost:8001/register-face
- **Login with Face**: http://localhost:8001/login-face
- **Test API**: http://localhost:8001/docs (FastAPI docs)

## 🔧 Quick Troubleshooting

### Camera Not Working
```powershell
# Check if camera is being used by another app
Get-Process | Where-Object {$_.ProcessName -match "camera|skype|teams"}

# Solution: Close other apps using camera, refresh browser
```

### Models Not Loading (404 errors)
```powershell
# Verify models exist
ls "d:\Final Year project\public\models"

# Should show 7 files:
# - tiny_face_detector_model-*
# - face_landmark_68_model-*
# - face_recognition_model-*
```

### FastAPI Not Running
```powershell
# Check if port 8001 is open
netstat -ano | findstr :8001

# If nothing shows, restart services
```

### Face Not Recognized (Authentication Fails)
```python
# Adjust threshold in face_auth_routes.py
# Line 42: threshold=0.6  →  threshold=0.7 (easier matching)
# Then restart FastAPI
```

## 📸 Demo Data (For Testing)

### Test Voters (If not in database)
```json
{
  "voter_id": "V001",
  "name": "Test Voter 1",
  "password": "test123"
}
```

### Admin Account
```
Username: A001
Password: adminPass001
```

## 🎨 UI Elements Guide

### Login Page
- **Admin Tab**: Traditional admin login
- **User Tab**: Password login + Face login button
- **Face Login Button**: Opens modal with camera

### Face Registration Page
- **Header**: EtherVox branding
- **Voter ID Input**: Enter voter to register
- **Start Button**: Begins registration process
- **Camera Preview**: Live video with detection overlay
- **Status Messages**: Real-time feedback
- **Capture Counter**: Shows 1/3, 2/3, 3/3

### Admin Panel
- **Register Face Button**: Top-right (purple gradient)
- **Logout Button**: Top-right (red gradient)

## 📝 Verification Commands

### Check MongoDB Face Descriptors
```javascript
// MongoDB Shell
use voter_db
db.voters.find({}, { voter_id: 1, face_descriptor: 1 })

// Should show voters with face_descriptor array [128 numbers]
```

### Check FastAPI Logs
```powershell
# Watch FastAPI terminal for:
# "POST /register-face HTTP/1.1" 200
# "POST /login-face HTTP/1.1" 200
```

### Check Browser Console
```javascript
// Should see:
// "Models loaded successfully"
// "Face detected: {descriptor: Array(128)}"
// "Authentication successful"
```

## ✅ Final Checklist Before Testing

- [ ] All services running (MongoDB, MySQL, Ganache, FastAPI, Express)
- [ ] Ganache UI shows account 0x66B4f0B1d6bFE40cc7A5bB50daE745787D66CFD1
- [ ] Contract deployed: 0x3f0eA91d0e8cade9b73094C05D5e677DaD18e158
- [ ] FastAPI running on port 8001
- [ ] Express serving on port 8081
- [ ] Models folder exists: public/models/ (7 files)
- [ ] Browser allows camera access
- [ ] At least one voter exists in database

## 🎉 Success Criteria

Your face authentication is working correctly if:
1. ✅ Can register face without errors
2. ✅ Face descriptor saved to MongoDB (128-element array)
3. ✅ Can login with registered face
4. ✅ JWT token generated and stored
5. ✅ Redirected to correct page based on role
6. ✅ Can cast vote after face login
7. ✅ Error messages clear and helpful

## 🚀 You're Ready!

Everything is implemented and ready to test. Simply:
1. Start services with `start-services-only.bat`
2. Navigate to http://localhost:8081/face-register.html
3. Register your first face
4. Test login with face authentication

**Enjoy your AI-powered biometric voting system! 🎊**

---

**Note**: For detailed API documentation, configuration options, and advanced features, see [FACE-AUTH-IMPLEMENTATION.md](FACE-AUTH-IMPLEMENTATION.md)
