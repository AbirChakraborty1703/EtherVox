<div align="center">

# 🗳️ EtherVox - Decentralized Voting Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)
[![Web3.js](https://img.shields.io/badge/Web3.js-4.x-orange)](https://web3js.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)

**A professional, secure, and transparent blockchain-based voting system**

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [Usage Guide](#-usage-guide)
- [API Documentation](#-api-documentation)
- [Smart Contract](#-smart-contract)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**EtherVox** is a cutting-edge decentralized voting platform that leverages Ethereum blockchain technology to provide transparent, secure, and tamper-proof elections. By combining smart contracts with modern web technologies and dual database architecture, EtherVox ensures vote integrity while maintaining user privacy and system performance.

### 🎯 Key Highlights

- **🔐 Blockchain Security**: Votes are permanently recorded on Ethereum blockchain
- **🎨 Modern UI/UX**: Beautiful glass-morphism design with responsive layouts
- **👥 Role-Based Access**: Separate interfaces for administrators and voters
- **💾 Hybrid Database**: MySQL for structured data + MongoDB for flexible schemas
- **🔒 JWT Authentication**: Secure token-based user authentication
- **📊 Real-Time Updates**: Live vote counting and candidate information
- **🦊 MetaMask Integration**: Seamless wallet connectivity
- **⚡ High Performance**: Optimized webpack bundling and caching

---

## ✨ Features

### For Voters
- ✅ **Secure Authentication** - Login with voter ID and password
- ✅ **Easy Voting Interface** - Intuitive candidate selection
- ✅ **One Vote Per Person** - Blockchain-enforced voting rules
- ✅ **Real-Time Results** - Watch vote counts update live
- ✅ **Vote Verification** - Check your vote was recorded
- ✅ **Mobile Responsive** - Vote from any device

### For Administrators
- ✅ **Candidate Management** - Add/edit/remove candidates
- ✅ **Election Scheduling** - Set voting start and end dates
- ✅ **Voter Management** - Oversee registered voters
- ✅ **Live Dashboard** - Monitor election progress
- ✅ **Blockchain Control** - Deploy and manage smart contracts
- ✅ **Security Oversight** - Role-based access control

### Technical Features
- ✅ **Smart Contract Voting** - Immutable vote recording
- ✅ **Gas Optimization** - Efficient transaction costs
- ✅ **Error Handling** - Comprehensive validation and feedback
- ✅ **CSP Security** - Content Security Policy implementation
- ✅ **CORS Protection** - Secure cross-origin requests
- ✅ **Data Persistence** - MongoDB + MySQL hybrid storage

---

## 🏗️ Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        EtherVox Platform                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Login Page  │  │  Admin Panel │  │ Voting Page  │          │
│  │  (Auth UI)   │  │ (Management) │  │  (Casting)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    Web3.js Integration                           │
└─────────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LAYER                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Express.js Server (Port 8081)                          │   │
│  │  • Routing & Static File Serving                        │   │
│  │  • Session Management                                   │   │
│  │  • API Proxying                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FastAPI Server (Port 8001)                             │   │
│  │  • JWT Authentication                                   │   │
│  │  • Database Operations                                  │   │
│  │  • RESTful API Endpoints                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
│                                                                  │
│  ┌──────────────────────┐       ┌──────────────────────┐       │
│  │   MySQL Database     │       │  MongoDB Database    │       │
│  │                      │       │                      │       │
│  │  • Voters Table      │       │  • Candidates Coll.  │       │
│  │  • Authentication    │       │  • Flexible Schemas  │       │
│  │  • Structured Data   │       │  • Document Store    │       │
│  └──────────────────────┘       └──────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Ganache / Ethereum Network                             │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────┐    │   │
│  │  │  Voting Smart Contract (Solidity 0.8.19)      │    │   │
│  │  │                                                 │    │   │
│  │  │  • addCandidate()                              │    │   │
│  │  │  • vote(candidateId)                           │    │   │
│  │  │  • setDates(start, end)                        │    │   │
│  │  │  • getVotingStatus()                           │    │   │
│  │  │  • checkVote()                                 │    │   │
│  │  │  • getCandidate(id)                            │    │   │
│  │  └────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  Connected via MetaMask & Web3.js                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication**: Login → FastAPI validates credentials → JWT token issued
2. **Voting Process**: Select candidate → Web3.js → Smart contract → Blockchain
3. **Candidate Management**: Admin adds candidate → MongoDB (details) + Blockchain (vote tracking)
4. **Vote Retrieval**: Frontend queries → Smart contract → Real-time vote counts displayed

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Web3.js** | 4.x | Blockchain interaction |
| **jQuery** | 3.7.1 | DOM manipulation |
| **Webpack** | 5.x | Module bundling |
| **HTML5/CSS3** | - | Modern responsive UI |
| **Font Awesome** | 6.0 | Icons |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20.x | JavaScript runtime |
| **Express.js** | 4.18.x | Web framework |
| **FastAPI** | Latest | Python API framework |
| **JWT** | Latest | Authentication |
| **CORS** | Latest | Cross-origin security |

### Blockchain
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Solidity** | 0.8.19 | Smart contract language |
| **Truffle** | 5.x | Development framework |
| **Ganache** | 7.x | Local blockchain |
| **MetaMask** | Latest | Wallet integration |

### Databases
| Technology | Version | Purpose |
|-----------|---------|---------|
| **MySQL** | 8.0+ | Voter authentication |
| **MongoDB** | 8.0+ | Candidate storage |
| **Motor** | Latest | Async MongoDB driver |

---

## 📦 Prerequisites

Before installing EtherVox, ensure you have the following installed:

### Required Software

1. **Node.js** (v20.x or higher)
   ```bash
   node --version  # Should be v20.x+
   ```

2. **Python** (3.8 or higher)
   ```bash
   python --version  # Should be 3.8+
   ```

3. **MySQL** (8.0 or higher)
   - Download from: https://dev.mysql.com/downloads/mysql/
   - Default port: 3306

4. **MongoDB** (8.0 or higher)
   - Download from: https://www.mongodb.com/try/download/community
   - Default port: 27017

5. **MetaMask Browser Extension**
   - Chrome: https://chrome.google.com/webstore
   - Firefox: https://addons.mozilla.org/firefox

### Recommended Tools

- **Git** - Version control
- **Visual Studio Code** - Code editor
- **MongoDB Compass** - Database GUI (optional)
- **MySQL Workbench** - Database GUI (optional)

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/AbirChakraborty1703/EtherVox.git
cd EtherVox
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This will install all required packages including:
- Express.js, Web3.js, Truffle, Webpack, and other dependencies

### Step 3: Install Python Dependencies

```bash
cd Database_API
pip install -r requirements.txt
cd ..
```

This installs:
- FastAPI, Motor (MongoDB), MySQL Connector, JWT, Uvicorn, and other Python packages

### Step 4: Set Up MySQL Database

1. **Start MySQL Server**

2. **Create Database**
   ```sql
   CREATE DATABASE ethervox_voting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE ethervox_voting;
   
   CREATE TABLE voters (
       id INT AUTO_INCREMENT PRIMARY KEY,
       voter_id VARCHAR(50) UNIQUE NOT NULL,
       password VARCHAR(255) NOT NULL,
       role ENUM('admin', 'user') DEFAULT 'user',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       INDEX idx_voter_id (voter_id),
       INDEX idx_role (role)
   ) ENGINE=InnoDB;
   
   -- Insert test admin and user
   INSERT INTO voters (voter_id, password, role) VALUES
   ('A001', 'admin123', 'admin'),
   ('U001', 'user123', 'user');
   ```

### Step 5: Set Up MongoDB

1. **Create MongoDB Data Directory**
   ```bash
   mkdir -p Database_API/mongodb_data
   ```

2. **Start MongoDB**
   ```bash
   mongod --dbpath Database_API/mongodb_data
   ```

   MongoDB will create the `ethervox_candidates` database automatically when the application starts.

### Step 6: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DB=ethervox_voting

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=ethervox_candidates
MONGODB_COLLECTION=candidates

# JWT Configuration
SECRET_KEY=your_super_secret_key_change_this_in_production

# Server Ports
EXPRESS_PORT=8081
FASTAPI_PORT=8001

# Blockchain Configuration
GANACHE_PORT=7545
NETWORK_ID=5777
```

**⚠️ Important**: Replace `your_mysql_password` and `your_super_secret_key_change_this_in_production` with secure values!

### Step 7: Compile Smart Contracts

```bash
npx truffle compile
```

This compiles the Solidity contracts and generates ABI files in the `build/` directory.

---

## ⚙️ Configuration

### MetaMask Setup

1. **Install MetaMask** browser extension
2. **Create or Import Wallet**
3. **Add Ganache Network**:
   - Network Name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:7545`
   - Chain ID: `1337` or `5777`
   - Currency Symbol: `ETH`

4. **Import Ganache Account**:
   - Copy private key from Ganache
   - Import into MetaMask

### Truffle Configuration

The `truffle-config.js` is pre-configured for Ganache:

```javascript
networks: {
  development: {
    host: "127.0.0.1",
    port: 7545,
    network_id: "5777"
  }
}
```

---

## ▶️ Running the Application

### Option 1: Automated Start (Windows)

Run the all-in-one startup script:

```bash
start-ethervox.bat
```

This automatically starts:
1. MongoDB Server
2. Ganache Blockchain
3. Smart Contract Deployment
4. FastAPI Backend
5. Express Frontend

### Option 2: Manual Start (Step-by-Step)

#### Terminal 1: Start MongoDB
```bash
mongod --dbpath Database_API/mongodb_data
```

#### Terminal 2: Start Ganache Blockchain
```bash
ganache --port 7545 --networkId 5777 --accounts 10 --defaultBalanceEther 100
```

#### Terminal 3: Deploy Smart Contracts
```bash
npx truffle migrate --reset --network development
```

Expected output:
```
Compiling your contracts...
===========================
✔ Fetching solc version list from solc-bin.
✔ Downloading compiler.

Deploying 'Voting'
------------------
> transaction hash:    0x...
> contract address:    0x4E0f90DABbb0Fc035DE28F09cd4deA03A8708ee4
> gas used:            2847392

✔ Contract deployed successfully!
```

#### Terminal 4: Start FastAPI Backend
```bash
cd Database_API
python main.py
```

Expected output:
```
[OK] MySQL Database connection established successfully!
[OK] MongoDB Database connection established successfully!
INFO:     Uvicorn running on http://127.0.0.1:8001
```

#### Terminal 5: Build Frontend Assets
```bash
npm run build
```

#### Terminal 6: Start Express Server
```bash
npm start
```

Expected output:
```
🚀 EtherVox Express Server Started!
📡 Server: http://localhost:8081
🔐 Login: http://localhost:8081/
```

### Option 3: Using NPM Scripts

```bash
# Start all services (requires multiple terminals)
npm run start:mongo    # Terminal 1
npm run start:api      # Terminal 2
npm start              # Terminal 3
```

---

## 📂 Project Structure

```
EtherVox/
│
├── 📁 contracts/              # Solidity Smart Contracts
│   ├── Voting.sol            # Main voting contract
│   └── Migrations.sol        # Truffle migrations
│
├── 📁 migrations/             # Truffle deployment scripts
│   ├── 1_initial_migration.js
│   └── 2_deploy_contracts.js
│
├── 📁 src/                    # Source files
│   ├── 📁 html/              # HTML pages
│   │   ├── login.html        # Login interface
│   │   ├── admin.html        # Admin dashboard
│   │   └── index.html        # Voting page
│   ├── 📁 css/               # Stylesheets
│   │   ├── login.css
│   │   ├── admin.css
│   │   └── index.css
│   └── 📁 js/                # JavaScript source
│       ├── app.js            # Main application logic
│       └── login.js          # Authentication logic
│
├── 📁 public/                 # Built/Static files
│   ├── app.bundle.js         # Webpack bundled JS
│   └── 📁 js/                # Public scripts
│       ├── bulletproof-setup.js
│       └── permanent-metamask.js
│
├── 📁 Database_API/           # Python FastAPI Backend
│   ├── main.py               # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   └── 📁 mongodb_data/      # MongoDB data directory
│
├── 📁 build/                  # Compiled contracts
│   └── 📁 contracts/
│       ├── Voting.json       # Contract ABI & bytecode
│       └── Migrations.json
│
├── 📁 test/                   # Smart contract tests
│   └── VotingContract.test.js
│
├── 📄 index.js                # Express server
├── 📄 truffle-config.js       # Truffle configuration
├── 📄 webpack.config.js       # Webpack bundler config
├── 📄 package.json            # Node dependencies
├── 📄 .env                    # Environment variables
│
├── 📄 check-status.js         # System status checker
├── 📄 set-voting-dates.js     # Voting period setter
├── 📄 sync-dates-from-mongodb.js  # Date sync utility
│
├── 📄 start-ethervox.bat      # Windows startup script
├── 📄 start-system.bat        # Alternative launcher
│
└── 📄 README.md               # This file
```

---

## 📖 Usage Guide

### For Voters

#### 1. Access the Application
Navigate to `http://localhost:8081` in your browser

#### 2. Login as Voter
- Click **"User Login"** tab
- Enter Voter ID: `U001`
- Enter Password: `user123`
- Click **"Access Voting"**

#### 3. Connect MetaMask
- MetaMask popup will appear
- Click **"Connect"**
- Select your Ganache account

#### 4. Cast Your Vote
- Review candidate information
- Select your preferred candidate (radio button)
- Click **"Vote"** button
- Confirm transaction in MetaMask
- Wait for confirmation message

#### 5. View Results
- Vote counts update in real-time
- Your vote is permanently recorded on blockchain

### For Administrators

#### 1. Login as Admin
- Click **"Admin Login"** tab
- Enter Admin ID: `A001`
- Enter Password: `admin123`
- Click **"Access Admin Panel"**

#### 2. Add Candidates

Fill out the candidate form:
- **Basic Info**: Name, Age, Date of Birth
- **Contact**: Email, Phone, Address
- **Election Details**: Party, Election Center
- **Dates**: Election Start & End (YYYY-MM-DD HH:MM format)
- **Credentials**: Unique Candidate ID, Password

Click **"Add Candidate"** and confirm MetaMask transaction.

**Important**: The first candidate added automatically sets the blockchain voting period!

#### 3. Set Voting Dates

If you need to manually set voting dates:

```bash
npm run set-dates
```

Follow the prompts to enter start and end dates.

#### 4. Monitor Election

- View live vote counts
- Check voting status
- Verify blockchain transactions

---

## 🔌 API Documentation

### FastAPI Endpoints

Base URL: `http://localhost:8001`

#### Authentication

**POST** `/login`
```http
GET /login?voter_id=U001&password=user123

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "user",
  "user": {
    "voter_id": "U001"
  }
}
```

#### Candidates Management

**GET** `/candidates` - Get all active candidates
```http
GET /candidates

Response:
{
  "message": "Candidates retrieved successfully",
  "count": 2,
  "candidates": [...]
}
```

**POST** `/candidates` - Create new candidate (Admin only)
```http
POST /candidates
Content-Type: application/json

{
  "name": "John Doe",
  "age": 35,
  "party": "Independent",
  ...
}
```

**GET** `/candidates/{id}` - Get specific candidate
```http
GET /candidates/507f1f77bcf86cd799439011
```

**PUT** `/candidates/{id}` - Update candidate
**DELETE** `/candidates/{id}` - Delete (soft delete) candidate

#### Health Check

**GET** `/` - API status
```http
GET /

Response:
{
  "message": "EtherVox Database API is running!",
  "status": "healthy",
  "database": "connected"
}
```

### Smart Contract Functions

#### Public Functions (Anyone can call)

```solidity
// Get total candidate count
function getCountCandidates() public view returns (uint256)

// Get candidate details
function getCandidate(uint256 candidateID) public view returns (...)

// Cast a vote
function vote(uint256 candidateID) public duringVotingPeriod

// Check if you have voted
function checkVote() public view returns (bool)

// Get voting status
function getVotingStatus() public view returns (string memory)

// Get voting dates
function getDates() public view returns (uint256, uint256)
```

#### Owner-Only Functions (Admin)

```solidity
// Add a new candidate
function addCandidate(...) public onlyOwner

// Set voting period
function setDates(uint256 _startDate, uint256 _endDate) public onlyOwner

// Emergency stop
function emergencyStop() public onlyOwner
```

---

## 🔐 Smart Contract

### Voting.sol Overview

The Voting smart contract is the core of the blockchain layer, implementing:

**Key Features:**
- ✅ Owner-based access control
- ✅ Time-restricted voting periods
- ✅ One vote per address enforcement
- ✅ Comprehensive input validation
- ✅ Event logging for transparency
- ✅ Gas-optimized operations

**Security Measures:**
- Custom errors for gas efficiency
- Modifiers for access control (`onlyOwner`, `duringVotingPeriod`)
- Validation on all inputs
- Reentrancy protection
- Immutable vote recording

**Contract Address** (after deployment):
Check the console output or run:
```bash
npm run status
```

---

## 🛡️ Security

### Implemented Security Features

1. **Content Security Policy (CSP)**
   - Restricts resource loading
   - Prevents XSS attacks
   - Whitelisted domains only

2. **JWT Authentication**
   - Secure token-based auth
   - 24-hour token expiration
   - Role-based access control

3. **CORS Protection**
   - Whitelist-based origin checking
   - Credential support
   - Method restrictions

4. **Blockchain Security**
   - Owner-only functions
   - Time-locked voting
   - Vote immutability
   - Gas estimation before transactions

5. **Database Security**
   - Parameterized queries (SQL injection prevention)
   - Password hashing
   - Connection encryption

6. **Input Validation**
   - Frontend validation
   - Backend validation
   - Smart contract validation

### Best Practices

⚠️ **For Production Deployment:**

1. Change default credentials
2. Use strong JWT secret keys
3. Enable HTTPS/SSL
4. Use environment variables for secrets
5. Deploy to mainnet/testnet (not Ganache)
6. Conduct security audit
7. Implement rate limiting
8. Add database backups
9. Monitor transactions
10. Set up error logging

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. "Internal JSON-RPC error" when voting

**Cause**: Voting dates not set on blockchain

**Solution**:
```bash
npm run sync-dates
# OR
npm run set-dates
```

#### 2. "Contract not deployed" error

**Cause**: Smart contracts not deployed or wrong network

**Solution**:
```bash
# Redeploy contracts
npx truffle migrate --reset --network development

# Check contract address
npm run status
```

#### 3. MongoDB connection failed

**Cause**: MongoDB not running

**Solution**:
```bash
# Start MongoDB
mongod --dbpath Database_API/mongodb_data
```

#### 4. MySQL authentication error

**Cause**: Wrong credentials in .env

**Solution**:
- Verify MySQL username/password
- Check .env file configuration
- Test MySQL connection manually

#### 5. MetaMask not connecting

**Cause**: Wrong network or locked

**Solution**:
- Unlock MetaMask
- Switch to Ganache network (Chain ID: 5777)
- Refresh page

#### 6. "Dates showing 1970"

**Cause**: Blockchain voting dates not synced

**Solution**:
```bash
npm run sync-dates
```
Then refresh browser (Ctrl+F5)

#### 7. Port already in use

**Cause**: Previous instance still running

**Solution**:
```bash
# Windows
taskkill /F /IM node.exe
taskkill /F /IM python.exe
taskkill /F /IM mongod.exe

# Then restart services
```

### Diagnostic Commands

```bash
# Check system status
npm run status

# Check voting period
npm run voting:status

# Verify blockchain connection
npx truffle console
> web3.eth.getAccounts()

# Test database connections
cd Database_API
python -c "import mysql.connector; print('MySQL OK')"
python -c "from pymongo import MongoClient; print('MongoDB OK')"
```

### Getting Help

If you encounter issues:

1. Check console logs for detailed errors
2. Run `npm run status` for system diagnostics
3. Review [Troubleshooting](#-troubleshooting) section
4. Check [Issues](https://github.com/AbirChakraborty1703/EtherVox/issues) on GitHub
5. Create a new issue with:
   - Error message
   - Steps to reproduce
   - System information
   - Console logs

---

## 🧪 Testing

### Run Smart Contract Tests

```bash
npm test
```

Expected output:
```
Contract: Voting
  Contract Deployment
    ✓ should deploy successfully
    ✓ should set the correct owner
  Basic Contract Functions
    ✓ should have zero candidates initially
    ✓ should allow owner to add a candidate
```

### Manual Testing Checklist

- [ ] Admin login works
- [ ] User login works
- [ ] MetaMask connects
- [ ] Add candidate successful
- [ ] Voting dates set
- [ ] User can vote
- [ ] One vote per address enforced
- [ ] Vote counts update
- [ ] Blockchain transactions confirmed

---

## 📊 Monitoring & Maintenance

### Check System Status

```bash
npm run status
```

Output shows:
- Network ID
- Contract owner
- Voting status
- Candidate count
- Total votes cast
- Your account balance

### Database Maintenance

**Backup MongoDB:**
```bash
mongodump --db ethervox_candidates --out ./backups/
```

**Backup MySQL:**
```bash
mysqldump -u root -p ethervox_voting > backup.sql
```

### Blockchain Monitoring

- View transactions in Ganache UI
- Check contract events in console
- Monitor gas usage

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Update README for new features
- Test thoroughly before committing
- Write meaningful commit messages

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Abir Chakraborty

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 👨‍💻 Author

**Abir Chakraborty**

- GitHub: [@AbirChakraborty1703](https://github.com/AbirChakraborty1703)
- Repository: [EtherVox](https://github.com/AbirChakraborty1703/EtherVox)

---

## 🙏 Acknowledgments

- **Ethereum** - Blockchain platform
- **Truffle Suite** - Development framework
- **Web3.js** - Ethereum JavaScript API
- **FastAPI** - Modern Python web framework
- **Express.js** - Node.js web framework
- **MongoDB** - NoSQL database
- **MySQL** - Relational database

---

## 📞 Support

For support and questions:

- 📧 Create an issue on GitHub
- 📖 Check the [Troubleshooting](#-troubleshooting) section
- 💬 Review closed issues for solutions

---

<div align="center">

**Made with ❤️ for transparent and secure voting**

⭐ Star this repository if you find it helpful!

[Back to Top](#-ethervox---decentralized-voting-platform)

</div>---

## 🛠️ Prerequisites & Setup

### Required Software:
1. **Node.js** (v16+) - [Download here](https://nodejs.org/)
2. **Python** (v3.8+) - [Download here](https://python.org/)
3. **MySQL Server** - [Download here](https://dev.mysql.com/downloads/mysql/)
4. **MySQL Workbench** - [Download here](https://dev.mysql.com/downloads/workbench/)
5. **Truffle Suite** - `npm install -g truffle`
6. **Ganache** - [Download here](https://trufflesuite.com/ganache/)
7. **MetaMask** - [Browser Extension](https://metamask.io/)

---

## 🚀 **Installation Process** (Simplified!)

### Quick Start - All-in-One Launcher 🎯
**Easiest way to run the entire system with one command:**

1. **Clone & Install**:
   ```bash
   git clone https://github.com/AbirChakraborty1703/EtherVox.git
   cd EtherVox
   npm install
   ```

2. **Install Python Dependencies**:
   ```bash
   cd Database_API
   pip install -r requirements.txt
   cd ..
   ```

3. **Configure Environment**:
   Create/Update `.env` file in root and `Database_API/.env`:
   ```env
   SECRET_KEY="your-secret-key-here"
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_mysql_password
   MYSQL_DB=voter_db
   MONGO_URI=mongodb://localhost:27017
   MONGO_DB=ethervox_candidates
   ```

4. **Launch Everything** 🚀:
   ```bash
   start-ethervox.bat
   ```
   
   **This single command will**:
   - ✅ Start MongoDB server
   - ✅ Setup MySQL database with test users
   - ✅ Launch Ganache blockchain
   - ✅ Deploy smart contracts
   - ✅ Start FastAPI backend (port 8001)
   - ✅ Start Express frontend (port 8081)
   - ✅ Open browser automatically

---

### Manual Setup (Alternative Method) 🛠️

If you prefer to run services manually:

#### Step 1: Clone & Install 📥
```bash
git clone https://github.com/AbirChakraborty1703/EtherVox.git
cd EtherVox
npm install
```

#### Step 2: Database Setup 🗄️
**MySQL Integration:**

1. **Install & Start MySQL Server**
2. **Create voter_db database**
3. **Configure Environment** (same as above)
4. **Populate Test Users**:
   ```bash
   cd Database_API
   python insert_test_users.py
   cd ..
   ```

**MongoDB Setup:**
- MongoDB will start automatically with `start-ethervox.bat`
- Or manually: `mongod --dbpath=Database_API/mongodb_data`

#### Step 3: Install Python Dependencies 🐍
```bash
cd Database_API
pip install -r requirements.txt
cd ..
```

#### Step 4: Blockchain Setup ⛓️
```bash
# Start Ganache first, then:
truffle compile
truffle migrate --reset
```

#### Step 5: Launch Services Manually 🚀
**Start services in separate terminals:**

**Terminal 1 - MongoDB:**
```bash
mongod --dbpath=Database_API/mongodb_data
```

**Terminal 2 - Database API:**
```bash
cd Database_API
python main.py
```

**Terminal 3 - Web Server:**
```bash
node index.js
```

---

## 🌐 Access Your Platform

After running `start-ethervox.bat` or starting services manually:

- **🌐 Login Portal**: http://localhost:8081
- **📊 API Documentation**: http://127.0.0.1:8001/docs
- **🔗 Backend Health**: http://127.0.0.1:8001
- **⛓️ Ganache**: http://127.0.0.1:7545

---

## 🔐 **Authentication System**

### 👥 Test Login Credentials:
**🔑 Admin Access:**
- Voter ID: `A001`
- Password: `adminPass001`

**🔑 User Access:**
- Voter ID: `U001` to `U005`
- Password: `userPass001` to `userPass005`
  - Example: U001/userPass001, U002/userPass002, etc.

### 🎯 Login Process:
1. **Beautiful Interface**: Modern tabbed login with animations
2. **Role Selection**: Choose Admin or User tab
3. **Secure Authentication**: JWT token generation
4. **Auto-Redirect**: Seamless navigation to appropriate dashboard

> **Note**: Test users are automatically created when running `start-ethervox.bat` or manually via `Database_API/insert_test_users.py`

---

## 🎨 **New UI Features**

### ✨ **Modern Login Page:**
- 🌈 **Animated Gradients**: Dynamic background with floating shapes
- 🔮 **Glass Morphism**: Translucent design elements
- 🎭 **Smooth Transitions**: Professional animations throughout
- 📱 **Responsive Design**: Perfect on all devices
- 👁️ **Password Visibility**: Toggle password display
- ⚡ **Real-time Validation**: Instant feedback on form inputs

### 🎛️ **Enhanced Admin Dashboard:**
- 📊 **Live Statistics**: Real-time voting analytics
- 🎨 **Professional Styling**: Clean, modern interface
- 🔧 **Advanced Controls**: Comprehensive election management
- 📈 **Visual Charts**: Graphical vote representation

### 🗳️ **Improved Voting Interface:**
- 🎯 **Intuitive Design**: Easy candidate selection
- ⚡ **Real-time Updates**: Live vote counting
- 🔒 **Secure Submission**: Blockchain verification
- 📱 **Mobile Optimized**: Touch-friendly interface

---

## 🛡️ **Enhanced Security Features**

### 🔐 **Authentication & Authorization:**
- 🎫 **JWT Tokens**: Secure session management with 24-hour expiration
- 👥 **Role-Based Access**: Separate admin and user permissions
- 🔒 **Password Protection**: Secure credential storage
- 🚫 **Session Validation**: Automatic token verification

### 🛡️ **Content Security Policy:**
- 🚨 **XSS Protection**: Prevents cross-site scripting
- 🔗 **Resource Control**: Secure external resource loading
- 🛡️ **Injection Prevention**: SQL and code injection protection
- 🌐 **CORS Configuration**: Controlled cross-origin requests

### ⛓️ **Blockchain Security:**
- 🔒 **Immutable Records**: Votes cannot be changed or deleted
- 🌐 **Decentralized**: No single point of failure
- 🔍 **Transparent**: All transactions are publicly verifiable
- 💰 **Test Environment**: Safe testing with fake cryptocurrency

---

## 📊 **New Database Features**

### 🗄️ **MySQL Integration:**
- 👥 **User Management**: Secure voter registration and authentication
- 🔑 **Role System**: Admin and user role differentiation
- 📈 **Scalable Design**: Prepared for large-scale elections
- 🔄 **Connection Pooling**: Optimized database performance

### 📋 **Database Schema:**
```sql
voters (
  voter_id VARCHAR(50) PRIMARY KEY,
  password VARCHAR(255),
  role ENUM('admin', 'user'),
  created_at TIMESTAMP,
  last_login TIMESTAMP
)
```

---

## 🔧 **Technical Improvements**

### 🚀 **Performance Enhancements:**
- ⚡ **Optimized Loading**: Faster page load times
- 🔄 **Efficient Caching**: Reduced server requests
- 📦 **Bundled Assets**: Minimized file sizes
- � **One-Command Launch**: All services start with `start-ethervox.bat`
- 🔄 **Auto Setup**: Database and blockchain configured automatically
- 📝 **Enhanced Logging**: Detailed error tracking
- 🧪 **Test Data**: Pre-configured test users (A001, U001-U005)
- 📊 **API Documentation**: Auto-generated FastAPI docs at `/docs`

### 🏗️ **Architecture Improvements:**
- 🎯 **Separation of Concerns**: Clear layer separation
- 🔗 **RESTful APIs**: Standard HTTP methods and status codes
- 🔄 **Error Handling**: Comprehensive error management
- 🧹 **Clean Code**: Organized, maintainable codebase
- 📦 **Automated Launcher**: Integrated startup script for all serviceson
- 🔗 **RESTful APIs**: Standard HTTP methods and status codes
- 🔄 **Error Handling**: Comprehensive error management
- 🧹 **Clean Code**: Organized, maintainable codebase

---

## 🐛 **Updated Troubleshooting**

### 🔧 **Common Issues & Solutions:**

**❌ "Database Connection Failed"**
```bash
✅ Solution:
1. Run: python Database_API/insert_test_users.py
```

**❌ "Login Authentication Error"**
```bash
✅ Solution:
1. Check if Database API is running on port 8001
2. Verify test users exist: Run insert_test_users.py
3. Try default credentials: A001/adminPass001 or U001/userPass001
```

**❌ "start-ethervox.bat Errors"**
```bash
✅ Solution:
1. Ensure all prerequisites are installed (Node.js, Python, MySQL, MongoDB, Ganache)
2. Check that .env files are configured in root and Database_API folders
3. Verify ports 8001, 8081, 7545, 27017, 3306 are available
4. Run services manually to identify specific errors000
2. Verify test users exist in database
3. Try default credentials: A001/adminPass001
```

**❌ "Beautiful UI Not Loading"**
```bash
✅ Solution:
1. Check Content Security Policy in browser console
2. Ensure Font Awesome CDN is accessible
3. Verify all CSS files are loading properly
```

**❌ "JWT Token Invalid"**
```bash
✅ Solution:
1. Check SECRET_KEY consistency in .env files
2. Clear browser localStorage
3. Restart both servers
```

---

## 📚 **Updated Learning Resources**

### 🎓 **What You'll Master:**
- 🎨 **Modern Web Design**: CSS animations, responsive layouts
- 🔐 **Authentication Systems**: JWT tokens, role-based access
- 💾 **Database Integration**: MySQL, FastAPI, Python
- ⛓️ **Blockchain Development**: Solidity, Web3.js, Ethereum
- 🛡️ **Security Best Practices**: CSP, CORS, secure coding
- 🚀 **Full-Stack Development**: Frontend + Backend + Database

### 📖 **Recommended Learning Path:**
1. **Frontend**: HTML5, CSS3, Modern JavaScript
2. **Backend**: Node.js, Express.js, Python FastAPI
3. **Database**: MySQL, Database design
4. **Blockchain**: Ethereum, Solidity, Web3
5. **Security**: Authentication, Authorization, Best practices

---

## 🌟 **New Feature Highlights**

### 💎 **Production-Ready Features:**
- 🎨 **Professional UI/UX**: Enterprise-grade design
- 🔒 **Bank-Level Security**: Multiple security layers
- 📊 **Real-time Analytics**: Live voting statistics
- 📱 **Cross-Platform**: Desktop, tablet, mobile support
- ⚡ **High Performance**: Optimized for speed
- 🌐 **Scalable Architecture**: Ready for large elections

### 🚀 **Developer Experience:**
- 🛠️ **Easy Setup**: Streamlined installation process
- 📝 **Comprehensive Documentation**: Detailed guides
- 🧪 **Testing Framework**: Built-in testing support
- 🔄 **Development Tools**: Hot reload, debugging
- 📊 **API Documentation**: Auto-generated docs

---

## 🤝 **Contributing & Support**

### 💡 **How to Contribute:**
1. 🍴 Fork the repository
2. 🌟 Create a feature branch
3. ✨ Make your improvements
4. 🧪 Test thoroughly
5. 📤 Submit a pull request

### 🆘 **Getting Help:**
- 📖 **Documentation**: Check this README first
- 🐛 **Issues**: Report bugs on GitHub
- 💬 **Discussions**: Join project discussions
- 📧 **Contact**: Reach out to maintainers

---

## 📈 **Future Roadmap**

### 🔮 **Planned Features:**
- 🌍 **Multi-language Support**: International accessibility
- 📱 **Mobile App**: Native iOS/Android applications
- 🔔 **Real-time Notifications**: Push notifications for events
- 📊 **Advanced Analytics**: Detailed voting insights
- 🔒 **Advanced Security**: Biometric authentication
- ☁️ **Cloud Deployment**: AWS/Azure deployment guides

---

## 📞 **Contact & Links**

**👨‍💻 Developer**: Abir Chakraborty  
**🐙 GitHub**: [@AbirChakraborty1703](https://github.com/AbirChakraborty1703)  
**🔗 Repository**: [EtherVox on GitHub](https://github.com/AbirChakraborty1703/EtherVox)  
**🌟 Live Demo**: Coming Soon!

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎉 **Acknowledgments**

Special thanks to:
- 🚀 **Modern Web Technologies**: For enabling beautiful UIs
- 🔗 **Ethereum Community**: For blockchain innovation
- 🐍 **Python Community**: For excellent backend tools
- 🎨 **Design Inspiration**: For UI/UX best practices

---

## 🏆 **Final Notes**

## 🎬 Quick Start Summary

1. **Install Prerequisites**: Node.js, Python, MySQL, MongoDB, Ganache
2. **Clone & Setup**: `git clone` → `npm install` → `pip install -r requirements.txt`
3. **Configure**: Create `.env` files with database credentials
4. **Launch**: Run `start-ethervox.bat` (Windows) 
5. **Login**: Open http://localhost:8081 → Use A001/adminPass001

That's it! The entire blockchain voting platform is now running locally! 🎉

---

*Last Updated: December 21, 2024 - All-in-One Launcher & Simplified Setup** combining:
- ✨ Beautiful, professional user interface
- 🔒 Enterprise-grade security
- 💾 Robust database integration
- ⛓️ Secure blockchain technology
- 🚀 Production-ready architecture

**Ready to revolutionize voting? Let's make democracy beautiful! 🗳️✨**

---

*Last Updated: August 26, 2025 - Major UI & Database Integration Update*
