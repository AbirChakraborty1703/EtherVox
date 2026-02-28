"""
EtherVox AI Chatbot Engine
Ultra-fast local NLP chatbot trained on EtherVox voting system knowledge.
Uses TF-IDF vectorization + cosine similarity for instant responses.
No external API calls — runs 100% locally.

Author: EtherVox Development Team
"""

import re
from typing import List, Optional

# ============================================================
# SECURITY BLACKLIST — Never reveal this information
# ============================================================
SECURITY_BLOCKED_PATTERNS = [
    r'password',
    r'secret.?key',
    r'private.?key',
    r'admin.*credential',
    r'login.*credential',
    r'jwt.*secret',
    r'\.env',
    r'env.*variable.*secret',
    r'what.*password',
    r'tell.*password',
    r'give.*password',
    r'show.*password',
    r'reveal.*password',
    r'what.*secret',
    r'give.*secret',
    r'hack',
    r'exploit',
    r'bypass.*auth',
    r'bypass.*login',
    r'sql.*inject',
    r'inject',
    r'vulnerability',
    r'admin.*pass',
    r'user.*pass',
    r'candidate.*pass',
    r'default.*pass',
    r'test.*pass',
    r'brute.?force',
    r'crack',
    r'decrypt',
    r'token.*steal',
    r'steal.*token',
]

SECURITY_RESPONSE = (
    "🔒 **Security Notice**: I'm unable to share passwords, secret keys, "
    "login credentials, or any sensitive security information. "
    "EtherVox takes security very seriously — all credentials are encrypted "
    "and protected. If you need access, please contact your system administrator."
)


# ============================================================
# KNOWLEDGE BASE — All EtherVox system knowledge
# ============================================================
KNOWLEDGE_BASE = [
    # --- System Overview ---
    {
        "keywords": ["what is ethervox", "about ethervox", "tell me about ethervox", "what is this", "overview", "describe ethervox", "introduction", "explain ethervox"],
        "answer": (
            "🗳️ **EtherVox** is a cutting-edge decentralized voting platform built on "
            "the Ethereum blockchain. It provides transparent, secure, and tamper-proof "
            "elections by combining Solidity smart contracts with modern web technologies "
            "and a dual-database architecture (MySQL + MongoDB).\n\n"
            "**Key Features:**\n"
            "• 🔐 Blockchain-secured votes (immutable & transparent)\n"
            "• 🦊 MetaMask wallet integration\n"
            "• 👥 Role-based access (Admin, Voter, Candidate)\n"
            "• 🤖 AI-powered anomaly detection\n"
            "• 📸 Face ID authentication with liveness detection\n"
            "• 📊 Real-time vote counting & results"
        )
    },
    {
        "keywords": ["who created", "who made", "who built", "creator", "author", "developer", "team", "who developed"],
        "answer": (
            "👨‍💻 **EtherVox** was created by **Abir Chakraborty** (Lead Developer) "
            "and the EtherVox Development Team.\n\n"
            "**Team Members:**\n"
            "• **Abir Chakraborty** — Lead Developer & Architect\n"
            "• **Atin Singha** — Developer\n"
            "• **Abhinava Ghosh** — Developer\n"
            "• **Arpan Sarkhel** — Developer\n"
            "• **Anomit Pal** — Developer\n\n"
            "The project is open-source under the MIT License on GitHub."
        )
    },
    {
        "keywords": ["technology", "tech stack", "built with", "technologies used", "framework", "programming language", "what language", "stack", "tools"],
        "answer": (
            "⚙️ **EtherVox Technology Stack:**\n\n"
            "**Frontend:**\n"
            "• HTML5, CSS3 (glass-morphism design), JavaScript\n"
            "• Web3.js 4.x, jQuery 3.7.1, Webpack 5\n"
            "• Font Awesome 6.0, Poppins font, face-api.js\n\n"
            "**Backend:**\n"
            "• Node.js 20.x + Express.js 4.18 (port 8081)\n"
            "• Python FastAPI (port 8001)\n"
            "• JWT authentication (HS256)\n\n"
            "**Blockchain:**\n"
            "• Solidity 0.8.19 smart contracts\n"
            "• Truffle 5.x framework, Ganache 7.x local chain\n"
            "• MetaMask browser wallet\n\n"
            "**Databases:**\n"
            "• MySQL 8.0 (voter authentication)\n"
            "• MongoDB 8.0 (candidates & voting dates)\n\n"
            "**AI/ML:**\n"
            "• Anomaly detection (scikit-learn, numpy)\n"
            "• Face recognition (face-api.js, MediaPipe)\n"
            "• Liveness detection (OpenCV)"
        )
    },
    # --- Architecture ---
    {
        "keywords": ["architecture", "how does it work", "system design", "structure", "how it works", "workflow", "flow"],
        "answer": (
            "🏗️ **EtherVox Architecture:**\n\n"
            "EtherVox uses a three-tier architecture:\n\n"
            "**1. Frontend Layer** — HTML/CSS/JS served by Express.js\n"
            "**2. Backend Layer** — Express.js (Node.js) + FastAPI (Python)\n"
            "**3. Blockchain Layer** — Ganache local Ethereum + Solidity smart contract\n\n"
            "**Data Flow:**\n"
            "1️⃣ User logs in → FastAPI validates credentials in MySQL → JWT token issued\n"
            "2️⃣ Voter selects candidate → Web3.js sends transaction to smart contract\n"
            "3️⃣ MetaMask confirms → Vote recorded permanently on blockchain\n"
            "4️⃣ Results fetched directly from blockchain in real-time\n\n"
            "**Ports:**\n"
            "• Express.js: `8081` | FastAPI: `8001` | Ganache: `7545`\n"
            "• MySQL: `3306` | MongoDB: `27017`"
        )
    },
    # --- Roles ---
    {
        "keywords": ["roles", "user types", "who can use", "admin", "voter", "access"],
        "answer": (
            "👥 **EtherVox User Roles:**\n\n"
            "**🔑 Admin** (Voter ID starts with 'A'):\n"
            "• Access Admin Dashboard for election monitoring\n"
            "• Add candidates with full details\n"
            "• Set voting start/end dates on blockchain\n"
            "• View live vote counts and statistics\n"
            "• Emergency stop and reset capabilities\n\n"
            "**🗳️ Voter/User** (Voter ID starts with 'U'):\n"
            "• Login and connect MetaMask wallet\n"
            "• View all candidates and their information\n"
            "• Cast exactly ONE vote (blockchain-enforced)\n"
            "• View real-time election results\n"
            "• Optional Face ID login\n\n"
            "**🏛️ Candidate:**\n"
            "• Login with Candidate ID + password\n"
            "• View own profile and election details\n"
            "• Reset their password"
        )
    },
    # --- Login ---
    {
        "keywords": ["how to login", "login", "sign in", "log in", "authentication", "login page", "how to access"],
        "answer": (
            "🔐 **Login Guide:**\n\n"
            "Visit `http://localhost:8081` to access the login page.\n\n"
            "There are **3 login tabs:**\n\n"
            "**1️⃣ Admin Login:**\n"
            "• Enter Admin Voter ID (starts with 'A') + Password\n"
            "• Redirects to Admin Dashboard\n\n"
            "**2️⃣ User Login:**\n"
            "• Enter User Voter ID (starts with 'U') + Password\n"
            "• Redirects to Voting Page\n\n"
            "**3️⃣ Candidate Login:**\n"
            "• Enter Candidate ID + Password\n"
            "• Redirects to Candidate Profile\n\n"
            "**📸 Face ID Login** is also available for registered voters.\n\n"
            "After login, a secure JWT token is issued for session management."
        )
    },
    {
        "keywords": ["credential format", "voter id format", "id format", "login format"],
        "answer": (
            "📋 **Credential Formats:**\n\n"
            "**Admin Voter ID:** Alphanumeric, starts with 'A' (e.g., A001, A002)\n"
            "**User Voter ID:** Alphanumeric, starts with 'U' (e.g., U001, U002)\n"
            "**Candidate ID:** Custom string, minimum 3 characters\n\n"
            "**Password Requirements:**\n"
            "• Login: Any valid string\n"
            "• Candidate password setting: Minimum 8 characters\n\n"
            "Note: I cannot share actual passwords for security reasons."
        )
    },
    # --- Voting ---
    {
        "keywords": ["how to vote", "cast vote", "voting process", "vote process", "voting steps", "how voting works", "vote", "voting"],
        "answer": (
            "🗳️ **How to Vote in EtherVox:**\n\n"
            "1️⃣ **Login** at `http://localhost:8081` with your User credentials\n"
            "2️⃣ **Connect MetaMask** — your browser wallet connects to the blockchain\n"
            "3️⃣ **View Candidates** — all registered candidates are displayed\n"
            "4️⃣ **Select your candidate** using the radio button\n"
            "5️⃣ **Click 'Vote'** — a MetaMask popup appears to confirm the transaction\n"
            "6️⃣ **Confirm in MetaMask** — pay the small gas fee\n"
            "7️⃣ **Done!** Your vote is permanently recorded on the Ethereum blockchain\n\n"
            "⚠️ **Important:**\n"
            "• You can only vote **once** per Ethereum address\n"
            "• Voting is only allowed during the active voting period\n"
            "• Votes cannot be changed or deleted after submission"
        )
    },
    # --- Results ---
    {
        "keywords": ["result", "results", "voting result", "who won", "winner", "vote count", "election result", "see results"],
        "answer": (
            "📊 **Election Results:**\n\n"
            "Results are available at `/result.html` — this page is **publicly accessible** "
            "(no login required).\n\n"
            "**What you can see:**\n"
            "• Each candidate's name and party\n"
            "• Total vote count per candidate\n"
            "• Real-time updates from the blockchain\n"
            "• Visual representation of vote distribution\n\n"
            "Results are fetched **directly from the smart contract** on the blockchain, "
            "ensuring they cannot be tampered with.\n\n"
            "To see current results, navigate to the Results page or say 'Go to results'."
        )
    },
    # --- Blockchain ---
    {
        "keywords": ["blockchain", "ethereum", "smart contract", "solidity", "on chain", "decentralized", "immutable", "chain", "web3"],
        "answer": (
            "⛓️ **Blockchain in EtherVox:**\n\n"
            "EtherVox uses the **Ethereum blockchain** (via Ganache local network) "
            "to ensure vote integrity.\n\n"
            "**Smart Contract (Voting.sol):**\n"
            "• Written in Solidity 0.8.19\n"
            "• Stores all candidate information on-chain\n"
            "• Records every vote permanently and immutably\n"
            "• Enforces one-vote-per-address rule\n"
            "• Time-locks voting to the configured period\n"
            "• Emits events: CandidateAdded, VoteCast, VotingPeriodSet\n\n"
            "**Key Functions:**\n"
            "• `vote()` — Cast your vote\n"
            "• `checkVote()` — Verify if you've voted\n"
            "• `getMyVote()` — See who you voted for\n"
            "• `getVotingStatus()` — Check election status\n"
            "• `getAllCandidates()` — View all candidates\n"
            "• `getTotalVotes()` — Total votes cast"
        )
    },
    # --- MetaMask ---
    {
        "keywords": ["metamask", "wallet", "connect wallet", "browser wallet", "ethereum wallet"],
        "answer": (
            "🦊 **MetaMask Integration:**\n\n"
            "MetaMask is your Ethereum wallet that connects the browser to the blockchain.\n\n"
            "**How it works in EtherVox:**\n"
            "1. Install MetaMask browser extension\n"
            "2. Connect to the EtherVox local network (Ganache on port 7545)\n"
            "3. MetaMask auto-connects when you visit the voting page\n"
            "4. When you vote, MetaMask shows a confirmation popup\n"
            "5. Confirm the transaction to record your vote on-chain\n\n"
            "**Network Settings:**\n"
            "• Chain ID: 1337 (0x539)\n"
            "• RPC URL: `http://localhost:7545`\n"
            "• Network Name: EtherVox Local Network\n"
            "• Currency: ETH"
        )
    },
    # --- Candidates ---
    {
        "keywords": ["candidate", "add candidate", "candidate info", "candidate details", "register candidate", "who are candidates"],
        "answer": (
            "🏛️ **Candidate Management:**\n\n"
            "**Adding Candidates** (Admin only):\n"
            "Navigate to the Add Candidate page and fill in:\n"
            "• Name, Age, Date of Birth\n"
            "• PAN Number (format: ABCDE1234F)\n"
            "• Aadhar Number (12 digits)\n"
            "• Voter EPIC Number (format: ABC1234567)\n"
            "• Election Center/Constituency\n"
            "• Political Party\n"
            "• Address, Email, Phone Number\n"
            "• Candidate ID and Password\n"
            "• Election Start and End Dates\n\n"
            "Candidates are saved to MongoDB and **automatically synced to the blockchain**.\n\n"
            "**Validation Rules:**\n"
            "• Age must be 18 or above\n"
            "• All fields are required\n"
            "• PAN, Aadhar, and EPIC must match specified formats"
        )
    },
    # --- Voting Dates ---
    {
        "keywords": ["voting date", "election date", "set date", "voting period", "when is election", "start date", "end date", "set vote"],
        "answer": (
            "📅 **Voting Dates / Election Period:**\n\n"
            "Admins configure voting dates through the **Set Vote** page.\n\n"
            "**How it works:**\n"
            "1. Admin sets Start Date/Time and End Date/Time\n"
            "2. Dates are saved to MongoDB and recorded on the blockchain\n"
            "3. Smart contract enforces the voting period\n\n"
            "**Rules:**\n"
            "• Minimum voting period: 30 minutes\n"
            "• Start date must be in the future\n"
            "• End date must be after start date\n"
            "• Once set, dates can be updated before voting begins\n\n"
            "**Voting Status Values:**\n"
            "• 'Not Initialized' — No dates set yet\n"
            "• 'Not Started' — Dates set, waiting for start time\n"
            "• 'Active' — Voting is currently open!\n"
            "• 'Ended' — Voting period has concluded"
        )
    },
    # --- Database ---
    {
        "keywords": ["database", "mysql", "mongodb", "data storage", "where is data", "stored", "storage"],
        "answer": (
            "💾 **Dual Database Architecture:**\n\n"
            "**MySQL** (Port 3306):\n"
            "• Database: `ethervox_voting`\n"
            "• Stores voter/admin credentials and authentication data\n"
            "• Table: `voters` — voter_id, password (bcrypt hashed), role\n"
            "• Used for login authentication\n\n"
            "**MongoDB** (Port 27017):\n"
            "• Database: `ethervox_candidates`\n"
            "• Stores candidate profiles with full details\n"
            "• Stores voting date configurations\n"
            "• Passwords are SHA-256 hashed\n\n"
            "**Blockchain** (Ganache Port 7545):\n"
            "• All vote records are stored immutably on-chain\n"
            "• Candidate data is synced from MongoDB to the smart contract\n"
            "• Vote counts are maintained on-chain"
        )
    },
    # --- Security ---
    {
        "keywords": ["security", "secure", "safe", "protection", "how safe", "is it secure", "encryption", "privacy", "trust", "tamper"],
        "answer": (
            "🔒 **EtherVox Security Features:**\n\n"
            "1. **JWT Authentication** — Secure token-based sessions (24-hour expiry)\n"
            "2. **Blockchain Immutability** — Votes cannot be altered once recorded\n"
            "3. **One Vote Per Address** — Smart contract enforced, no double voting\n"
            "4. **Password Hashing** — bcrypt (MySQL) + SHA-256 (MongoDB)\n"
            "5. **Time-Locked Voting** — Smart contract enforces voting period\n"
            "6. **Content Security Policy** — Restricts script/resource origins\n"
            "7. **CORS Protection** — Whitelisted origins only\n"
            "8. **SQL Injection Prevention** — Parameterized queries\n"
            "9. **Face ID + Liveness Detection** — Prevents photo-based spoofing\n"
            "10. **Emergency Stop** — Admin can halt voting immediately\n"
            "11. **Owner-Only Admin Functions** — Reset/stop restricted to contract owner\n\n"
            "Your vote is **anonymous** — the blockchain records that an address voted, "
            "but doesn't link it to your personal identity."
        )
    },
    # --- Pages ---
    {
        "keywords": ["pages", "available pages", "what pages", "navigation", "where can i go", "list pages", "show pages"],
        "answer": (
            "📄 **Available Pages:**\n\n"
            "1️⃣ **Login** (`/`) — Authentication portal (Admin/User/Candidate tabs)\n"
            "2️⃣ **Voting Page** (`/index.html`) — Cast your vote (User access)\n"
            "3️⃣ **Admin Dashboard** (`/AdminDashboard.html`) — Election monitoring\n"
            "4️⃣ **Add Candidate** (`/AddCandidate.html`) — Register candidates (Admin)\n"
            "5️⃣ **Set Vote** (`/SetVote.html`) — Configure voting dates (Admin)\n"
            "6️⃣ **Candidate Profile** (`/Candidate.html`) — View/manage profile\n"
            "7️⃣ **Results** (`/result.html`) — Public real-time election results\n"
            "8️⃣ **Face Register** (`/face-register.html`) — Register face for Face ID\n"
            "9️⃣ **Liveness Check** (`/liveness-check.html`) — Camera verification\n\n"
            "Say **'Go to [page name]'** to navigate!"
        )
    },
    # --- Election Flow ---
    {
        "keywords": ["election flow", "election process", "setup", "how to start election", "election lifecycle", "full process"],
        "answer": (
            "🏛️ **Complete Election Flow:**\n\n"
            "**Setup Phase:**\n"
            "1. Start MongoDB, Ganache, deploy smart contracts\n"
            "2. Start FastAPI and Express.js servers\n"
            "3. (Or use `start-ethervox.bat` for one-click startup)\n\n"
            "**Configuration Phase:**\n"
            "4. Admin logs in with admin credentials\n"
            "5. Admin adds candidates via Add Candidate page\n"
            "6. Admin sets voting dates on Set Vote page\n\n"
            "**Voting Phase:**\n"
            "7. Voters log in and connect MetaMask\n"
            "8. Voters cast their ballots during the voting period\n"
            "9. Each vote is confirmed via MetaMask and recorded on-chain\n\n"
            "**Results Phase:**\n"
            "10. Results visible in real-time at `/result.html`\n"
            "11. After voting ends, final results are permanent on blockchain\n"
            "12. Admin can reset for new election cycle if needed"
        )
    },
    # --- Face ID ---
    {
        "keywords": ["face id", "face recognition", "face login", "biometric", "face register", "face authentication", "liveness"],
        "answer": (
            "📸 **Face ID Authentication:**\n\n"
            "EtherVox supports biometric login using face recognition.\n\n"
            "**Face Registration:**\n"
            "1. Go to the Face Register page\n"
            "2. Allow camera access\n"
            "3. Follow on-screen instructions to capture your face\n"
            "4. Your face profile is securely stored\n\n"
            "**Face Login:**\n"
            "1. Click 'Face ID Login' on the login page\n"
            "2. Camera captures your face in real-time\n"
            "3. Liveness detection prevents photo spoofing\n"
            "4. Face matched against registered profile\n"
            "5. If verified, you're logged in automatically\n\n"
            "**Powered by:** face-api.js + MediaPipe + OpenCV"
        )
    },
    # --- Anomaly Detection ---
    {
        "keywords": ["anomaly", "fraud", "detection", "suspicious", "anomaly detection", "fraud detection"],
        "answer": (
            "🔍 **Anomaly Detection System:**\n\n"
            "EtherVox includes AI-powered anomaly detection to identify "
            "suspicious voting patterns.\n\n"
            "**What it monitors:**\n"
            "• Unusual voting times or patterns\n"
            "• Rapid sequential votes from similar addresses\n"
            "• Statistical outliers in vote distribution\n\n"
            "**Technology:**\n"
            "• scikit-learn machine learning algorithms\n"
            "• numpy/pandas for data analysis\n"
            "• Real-time monitoring via Admin Dashboard\n\n"
            "Admins can view anomaly reports in the Admin Dashboard."
        )
    },
    # --- API ---
    {
        "keywords": ["api", "endpoints", "rest api", "fastapi", "backend api", "api documentation"],
        "answer": (
            "🌐 **EtherVox API (FastAPI on port 8001):**\n\n"
            "**Authentication:**\n"
            "• `GET /login?voter_id=X&password=Y` — Login\n\n"
            "**Candidates:**\n"
            "• `POST /candidates` — Create candidate\n"
            "• `GET /candidates` — List all candidates\n"
            "• `GET /candidates/{id}` — Get by ID\n"
            "• `PUT /candidates/{id}` — Update candidate\n"
            "• `DELETE /candidates/{id}` — Remove candidate\n"
            "• `POST /candidates/sync-all` — Sync to blockchain\n\n"
            "**Voting Dates:**\n"
            "• `POST /voting-dates` — Set dates\n"
            "• `GET /voting-dates` — Get active dates\n\n"
            "**Candidate Portal:**\n"
            "• `POST /api/candidate/login` — Candidate login\n"
            "• `GET /api/candidate/profile` — View profile\n"
            "• `PUT /api/candidate/reset-password` — Reset password\n\n"
            "📖 Full docs at: `http://127.0.0.1:8001/docs`"
        )
    },
    # --- Startup ---
    {
        "keywords": ["how to start", "startup", "run", "launch", "install", "start ethervox", "npm start", "setup"],
        "answer": (
            "🚀 **Starting EtherVox:**\n\n"
            "**Quick Start (Windows):**\n"
            "Double-click `start-ethervox.bat` — starts everything automatically!\n\n"
            "**Manual Start:**\n"
            "1. Start MongoDB: `mongod --dbpath ./Database_API/mongodb_data`\n"
            "2. Start Ganache: `ganache --port 7545 --db ./ganache_db`\n"
            "3. Deploy contracts: `truffle migrate --reset`\n"
            "4. Start FastAPI: `cd Database_API && python main.py`\n"
            "5. Build frontend: `npm run build`\n"
            "6. Start Express: `npm start`\n\n"
            "**NPM Commands:**\n"
            "• `npm start` — Start server\n"
            "• `npm run build` — Build frontend\n"
            "• `npm test` — Run tests\n"
            "• `npm run set-dates` — Set voting dates"
        )
    },
    # --- Help ---
    {
        "keywords": ["help", "what can you do", "commands", "features", "how to use", "assist"],
        "answer": (
            "🤖 **I'm the EtherVox AI Assistant! Here's what I can help with:**\n\n"
            "📚 **Knowledge:**\n"
            "• What is EtherVox and how it works\n"
            "• Voting process and election flow\n"
            "• System architecture and technology\n"
            "• Security features and protections\n"
            "• User roles and capabilities\n"
            "• API documentation\n\n"
            "🧭 **Navigation:**\n"
            "• 'Go to login' — Navigate to login page\n"
            "• 'Go to voting' — Navigate to voting page\n"
            "• 'Go to results' — View election results\n"
            "• 'Go to dashboard' — Admin dashboard\n\n"
            "🎤 **Voice Input:** Click the microphone button to speak!\n\n"
            "Try asking: 'How do I vote?' or 'Who created EtherVox?'"
        )
    },
    # --- Greetings ---
    {
        "keywords": ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings", "yo", "sup"],
        "answer": (
            "👋 **Hello!** Welcome to the EtherVox AI Assistant!\n\n"
            "I'm here to help you with anything related to the EtherVox voting system. "
            "You can ask me about:\n"
            "• How voting works\n"
            "• Election results\n"
            "• System features\n"
            "• Navigation help\n\n"
            "What would you like to know? 😊"
        )
    },
    {
        "keywords": ["thank", "thanks", "thank you", "appreciate", "great", "awesome", "good job"],
        "answer": "😊 You're welcome! I'm happy to help. Feel free to ask anything else about EtherVox!"
    },
    {
        "keywords": ["bye", "goodbye", "see you", "exit", "quit", "close"],
        "answer": "👋 Goodbye! Thanks for using EtherVox Assistant. Have a great day! 🗳️"
    },
    # --- Troubleshooting ---
    {
        "keywords": ["error", "not working", "problem", "issue", "bug", "fix", "troubleshoot", "help me", "broken"],
        "answer": (
            "🔧 **Troubleshooting Common Issues:**\n\n"
            "**Can't login?**\n"
            "• Check your Voter ID format (A### for admin, U### for user)\n"
            "• Ensure FastAPI is running on port 8001\n"
            "• Clear browser cache and try again\n\n"
            "**MetaMask not connecting?**\n"
            "• Check MetaMask is installed and unlocked\n"
            "• Verify Ganache is running on port 7545\n"
            "• Switch to 'EtherVox Local Network' in MetaMask\n\n"
            "**Can't vote?**\n"
            "• Check voting period status (may not have started or already ended)\n"
            "• Ensure you haven't already voted (one vote per address)\n"
            "• Confirm MetaMask is connected\n\n"
            "**Pages not loading?**\n"
            "• Run `npm run build` to rebuild frontend\n"
            "• Ensure Express server is running on port 8081\n\n"
            "If issues persist, check the browser console (F12) for error details."
        )
    },
    # --- Smart Contract Details ---
    {
        "keywords": ["contract", "solidity", "voting.sol", "smart contract functions", "contract address"],
        "answer": (
            "📜 **Voting.sol Smart Contract:**\n\n"
            "**Solidity Version:** 0.8.19\n"
            "**Network:** Ganache (Chain ID: 1337)\n\n"
            "**Voter Functions:**\n"
            "• `vote(candidateID)` — Cast your vote\n"
            "• `checkVote()` — Have you voted?\n"
            "• `getMyVote()` — Who did you vote for?\n"
            "• `getVotingStatus()` — Election status\n"
            "• `getTotalVotes()` — Total votes cast\n"
            "• `getAllCandidates()` — List all candidates\n\n"
            "**Admin Functions (Owner only):**\n"
            "• `addCandidate()` — Register new candidate\n"
            "• `setDates()` / `updateDates()` — Configure voting period\n"
            "• `emergencyStop()` — Halt voting immediately\n"
            "• `resetVotes()` — Reset vote counts\n"
            "• `resetElection()` — Full reset for new election\n\n"
            "**Security:** One vote per address, time-locked voting period, "
            "minimum 30-minute election duration."
        )
    },
    # --- Admin Dashboard ---
    {
        "keywords": ["admin dashboard", "dashboard", "admin panel", "monitoring", "admin page"],
        "answer": (
            "📊 **Admin Dashboard:**\n\n"
            "The Admin Dashboard (`/AdminDashboard.html`) provides:\n\n"
            "• **Live Election Stats** — Total votes, active voters\n"
            "• **Candidate Overview** — All candidates with vote counts\n"
            "• **Voting Period Status** — Active/Not Started/Ended\n"
            "• **Anomaly Detection** — AI-powered fraud monitoring\n"
            "• **Database API Status** — Connection health check\n\n"
            "Only accessible with Admin credentials (Voter ID starting with 'A').\n\n"
            "Navigate there by saying 'Go to admin dashboard'."
        )
    },
    # --- What can't you do ---
    {
        "keywords": ["what can't you do", "limitations", "what don't you know", "can you vote for me"],
        "answer": (
            "⚠️ **My Limitations:**\n\n"
            "• I **cannot** cast votes for you — you must use MetaMask\n"
            "• I **cannot** reveal passwords or security credentials\n"
            "• I **cannot** modify the blockchain or database directly\n"
            "• I **cannot** access external websites or APIs\n"
            "• I **cannot** predict election outcomes\n\n"
            "I'm designed to **inform and navigate** — "
            "helping you understand and use the EtherVox system effectively!"
        )
    },
    # --- Ganache ---
    {
        "keywords": ["ganache", "local blockchain", "test network", "ethereum network", "rpc", "chain id"],
        "answer": (
            "⛓️ **Ganache Local Blockchain:**\n\n"
            "Ganache provides a personal Ethereum blockchain for development.\n\n"
            "**Configuration:**\n"
            "• Port: 7545\n"
            "• Chain ID: 1337 (hex: 0x539)\n"
            "• RPC URL: `http://localhost:7545`\n"
            "• Network ID: 5777\n"
            "• Database: `./ganache_db`\n\n"
            "Ganache comes pre-loaded with test accounts, each with 100 ETH. "
            "All transactions (votes, candidate additions) are recorded on this local chain."
        )
    },
]


# ============================================================
# NLP Matching Engine (zero dependencies)
# ============================================================

# Common word stems for fuzzy matching (word -> root)
_STEM_MAP = {
    "voting": "vote", "voted": "vote", "votes": "vote", "voter": "vote",
    "voters": "vote",
    "security": "secure", "secured": "secure", "securing": "secure",
    "encryption": "encrypt", "encrypted": "encrypt",
    "technologies": "technology", "technological": "technology",
    "blockchain": "blockchain", "blockchains": "blockchain",
    "candidates": "candidate", "candidacy": "candidate",
    "authentication": "authenticate", "authenticated": "authenticate",
    "results": "result", "resulting": "result",
    "elections": "election", "electoral": "election",
    "detecting": "detect", "detection": "detect", "detected": "detect",
    "creating": "create", "created": "create", "creation": "create",
    "starting": "start", "started": "start", "starts": "start",
    "pages": "page", "navigating": "navigate", "navigation": "navigate",
    "logging": "login", "logged": "login", "logs": "log",
    "databases": "database", "deploying": "deploy", "deployed": "deploy",
    "monitoring": "monitor", "monitored": "monitor",
    "running": "run", "working": "work", "works": "work",
    "contracts": "contract", "connecting": "connect", "connected": "connect",
}


def _stem(word: str) -> str:
    """Simple dictionary-based stemming."""
    return _STEM_MAP.get(word, word)


def _tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase words, removing punctuation."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return [w for w in text.split() if len(w) > 1]


def _compute_similarity(query_tokens: List[str], keyword_list: List[str]) -> float:
    """
    Compute similarity using BEST-MATCH strategy.
    Each keyword is an alternative way to ask about the same topic,
    so we take the highest-scoring keyword (not average).
    """
    if not query_tokens or not keyword_list:
        return 0.0

    query_text = ' '.join(query_tokens)
    query_set = set(query_tokens)
    query_stems = {_stem(t) for t in query_tokens}

    best = 0.0
    for kw in keyword_list:
        score = _score_keyword(kw, query_text, query_set, query_stems, query_tokens)
        if score > best:
            best = score
    return best


def _score_keyword(
    kw: str, query_text: str, query_set: set,
    query_stems: set, query_tokens: List[str]
) -> float:
    """Score a single keyword against the query. Returns 0.0 - 1.0."""
    kw_words = kw.split()

    if len(kw_words) > 1:
        # --- Multi-word keyword ---
        # Exact phrase match
        if kw in query_text:
            return 1.0
        # Partial token overlap (fuzzy phrase match)
        kw_set = set(kw_words)
        kw_stems = {_stem(w) for w in kw_words}
        exact_overlap = len(kw_set & query_set)
        stem_overlap = len(kw_stems & query_stems)
        overlap = max(exact_overlap, stem_overlap)
        if overlap > 0:
            return 0.65 * (overlap / len(kw_words))
        return 0.0

    # --- Single-word keyword ---
    kw_stem = _stem(kw)
    # Exact match
    if kw in query_set:
        return 0.85
    # Stem match (e.g. "voting" matches keyword "vote")
    if kw_stem in query_stems:
        return 0.75
    # Substring match (e.g. "secure" in "security")
    for qt in query_tokens:
        if len(kw) >= 3 and (kw in qt or qt in kw):
            return 0.5
    return 0.0


class EtherVoxChatbotEngine:
    """
    Local AI chatbot engine for EtherVox.
    Uses keyword matching with TF-IDF-like scoring.
    Zero external dependencies — runs instantly.
    """
    
    def __init__(self):
        # Pre-tokenize all keywords for fast matching
        self.entries = []
        for item in KNOWLEDGE_BASE:
            tokenized_keywords = []
            for kw in item["keywords"]:
                tokenized_keywords.append(kw.lower().strip())
            self.entries.append({
                "keywords": tokenized_keywords,
                "answer": item["answer"]
            })
    
    def is_security_query(self, message: str) -> bool:
        """Check if the query is asking for sensitive/security information."""
        lower = message.lower()
        for pattern in SECURITY_BLOCKED_PATTERNS:
            if re.search(pattern, lower):
                return True
        return False
    
    def get_response(self, message: str) -> dict:
        """
        Get the best response for a user message.
        Returns dict with 'answer', 'confidence', 'matched_topic'.
        """
        # Security check first
        if self.is_security_query(message):
            return {
                "answer": SECURITY_RESPONSE,
                "confidence": 1.0,
                "matched_topic": "security_blocked",
                "is_blocked": True
            }
        
        query_tokens = _tokenize(message)
        
        if not query_tokens:
            return {
                "answer": "I didn't catch that. Could you rephrase your question about EtherVox?",
                "confidence": 0.0,
                "matched_topic": "empty",
                "is_blocked": False
            }
        
        best_score = 0.0
        best_answer = None
        best_topic = None
        
        for entry in self.entries:
            score = _compute_similarity(query_tokens, entry["keywords"])
            if score > best_score:
                best_score = score
                best_answer = entry["answer"]
                best_topic = entry["keywords"][0] if entry["keywords"] else "unknown"
        
        # Confidence threshold (best-match scoring: 0.0 - 1.0)
        if best_score < 0.3:
            return {
                "answer": (
                    "🤔 I'm not sure about that, but I can help you with:\n\n"
                    "• **How EtherVox works** — 'What is EtherVox?'\n"
                    "• **Voting process** — 'How do I vote?'\n"
                    "• **Election results** — 'Show results'\n"
                    "• **Login help** — 'How to login?'\n"
                    "• **System info** — 'Technology stack'\n"
                    "• **Navigation** — 'Go to [page name]'\n\n"
                    "Try rephrasing your question! 💡"
                ),
                "confidence": best_score,
                "matched_topic": "no_match",
                "is_blocked": False
            }
        
        return {
            "answer": best_answer,
            "confidence": min(best_score, 1.0),
            "matched_topic": best_topic,
            "is_blocked": False
        }


# Singleton instance
_engine = EtherVoxChatbotEngine()


def get_chatbot_response(message: str) -> dict:
    """Public API function to get chatbot response."""
    return _engine.get_response(message)