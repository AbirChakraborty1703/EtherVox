# 🚀 EtherVox Quick Start Guide - Admin System

## ⚡ Quick Start (5 Minutes)

### Step 1: Start Services

```bash
# Terminal 1 - Start MongoDB (if using separate MongoDB)
mongod --dbpath=./Database_API/mongodb_data

# Terminal 2 - Start Database API
cd Database_API
python main.py

# Terminal 3 - Start Ganache
# Open Ganache GUI or run: ganache-cli -p 7545

# Terminal 4 - Deploy Contracts (if needed)
truffle migrate --reset

# Terminal 5 - Build & Start Express Server
npm run build
node index.js
```

### Step 2: Access Application

1. **Open Browser:** `http://localhost:8081/`
2. **Admin Login:**
   - Admin ID: `A001` (or your admin ID)
   - Password: Your admin password
3. **You'll land on:** AdminDashboard.html

### Step 3: Test Features

#### ✅ Add a Candidate
1. Click "Add New Candidate" card
2. Fill the form with candidate details
3. Click "Add Candidate"
4. Watch for success message
5. Return to dashboard

#### ✅ Set Voting Dates
1. Click "Configure Voting" card
2. Select start date & time
3. Select end date & time
4. Or use Quick Preset buttons
5. Click "Save Voting Dates"
6. Approve MetaMask transaction
7. Wait for blockchain confirmation

---

## 📁 New File Structure

```
✅ Created Files:
├── src/html/
│   ├── AdminDashboard.html    ← Admin landing page
│   ├── AddCandidate.html      ← Candidate registration
│   └── SetVote.html           ← Voting schedule config
├── src/css/
│   ├── admin-dashboard.css    ← Dashboard styles
│   ├── add-candidate.css      ← Candidate form styles
│   └── set-vote.css          ← Voting config styles
└── src/js/
    ├── admin-dashboard.js     ← Dashboard logic
    ├── add-candidate.js       ← Candidate form logic
    └── set-vote.js           ← Voting config logic

❌ Deleted Files:
└── src/html/admin.html        ← Old admin page (removed)

✏️ Modified Files:
├── src/js/login.js            ← Updated redirect
└── index.js                   ← Added new routes
```

---

## 🔄 Admin Flow Diagram

```
┌─────────────────┐
│   Login Page    │
│  (login.html)   │
└────────┬────────┘
         │ Admin Login
         ▼
┌─────────────────────┐
│  Admin Dashboard    │
│(AdminDashboard.html)│
└──────┬──────┬───────┘
       │      │
   ┌───┘      └───┐
   ▼              ▼
┌──────────┐  ┌──────────┐
│   Add    │  │   Set    │
│Candidate │  │  Voting  │
│  Page    │  │   Info   │
└──────────┘  └──────────┘
```

---

## 🎯 Key URLs

| Page | URL | Purpose |
|------|-----|---------|
| Login | `http://localhost:8081/` | Entry point |
| Admin Dashboard | `http://localhost:8081/AdminDashboard.html` | Admin landing |
| Add Candidate | `http://localhost:8081/AddCandidate.html` | Register candidates |
| Set Voting | `http://localhost:8081/SetVote.html` | Configure election |
| Voter Portal | `http://localhost:8081/index.html` | Voting interface |

---

## 🔐 Default Credentials

**Admin:**
- ID: Starts with 'A' (e.g., A001, Admin123)
- Password: Your configured admin password

**Voter:**
- ID: Regular voter ID (e.g., V001, Voter123)
- Password: Your configured voter password

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Can access login page at `http://localhost:8081/`
- [ ] Admin login redirects to AdminDashboard
- [ ] Dashboard shows two cards: "Add Candidate" and "Set Voting"
- [ ] Clicking "Add Candidate" opens AddCandidate.html
- [ ] Clicking "Set Voting" opens SetVote.html
- [ ] Can submit candidate form successfully
- [ ] Can set voting dates on blockchain
- [ ] Back to Dashboard button works
- [ ] Logout button works on all pages

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot GET /AdminDashboard.html"
**Solution:** Restart the server
```bash
node index.js
```

### Issue: Candidate form doesn't submit
**Solution:** Check Database API is running
```bash
cd Database_API
python main.py
```

### Issue: Voting dates won't save
**Solution:** 
1. Check Ganache is running
2. Check MetaMask is connected
3. Ensure you're the contract owner

### Issue: 404 on CSS/JS files
**Solution:** Rebuild webpack
```bash
npm run build
```

---

## 📊 Database Schema

### MongoDB - Candidates Collection
```json
{
  "name": "John Doe",
  "age": 35,
  "dateOfBirth": "1988-05-15",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "candidateAddress": "123 Main St",
  "party": "Independent",
  "electionCenter": "City Hall",
  "electionStartDate": "2025-01-15T09:00:00Z",
  "electionEndDate": "2025-01-15T17:00:00Z",
  "candidateId": "CID-2025-001",
  "candidatePassword": "hashed_password",
  "isActive": true,
  "createdAt": "2025-12-31T10:00:00Z"
}
```

### Blockchain - Voting Dates
```solidity
// Smart contract storage
uint256 public startDate;  // Unix timestamp
uint256 public endDate;    // Unix timestamp
```

---

## 🎨 Design Highlights

- **Color Scheme:** Purple gradient (`#667eea` → `#764ba2`)
- **Accent Color:** Gold (`#ffd700`)
- **Success:** Green (`#4CAF50`)
- **Error:** Red (`#ff6b6b`)
- **Info:** Blue (`#2196F3`)

- **Effects:**
  - Glassmorphism (backdrop blur)
  - Floating animated shapes
  - Smooth transitions
  - Hover effects
  - Loading spinners

---

## 📱 Responsive Breakpoints

- **Mobile:** < 480px (1 column layout)
- **Tablet:** 481px - 768px (adjusted spacing)
- **Desktop:** > 768px (full layout)

---

## 🔄 API Endpoints Used

### Database API (Port 8001)
- `POST /candidates` - Create candidate
- `GET /candidates` - List all candidates
- `GET /login` - Authenticate user

### Blockchain
- `getDates()` - Get voting schedule
- `setDates(start, end)` - Set voting schedule
- `owner()` - Get contract owner

---

## 🎉 Success!

Your EtherVox admin system is now restructured and ready to use!

**Next Steps:**
1. Test the admin login flow
2. Add a test candidate
3. Set voting dates
4. Monitor the blockchain transactions

**Need Help?** Check the full documentation in:
- `ADMIN-RESTRUCTURE-GUIDE.md` - Complete guide
- Console logs in browser DevTools
- Server logs in terminal

---

**Happy Voting! 🗳️✨**
