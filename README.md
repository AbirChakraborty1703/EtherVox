# EtherVox - Decentralized Voting System ️

[![EtherVox CI/CD Pipeline](https://github.com/AbirChakraborty1703/EtherVox/actions/workflows/ci.yml/badge.svg)](https://github.com/AbirChakraborty1703/EtherVox/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)](https://soliditylang.org/)

A modern, secure, and scalable decentralized voting application built on Ethereum blockchain with multi-database architecture.

## 🚀 New Features - Multi-Database Integration

### Enhanced Admin Interface
- ✨ **Beautiful Modern Login System** with glass morphism effects  
- 🔐 **Dual Authentication** (Admin/User) with role-based access
- 🛡️ **Enhanced Security** with JWT tokens and proper validation
- 💾 **Multi-Database Integration** with MySQL + MongoDB
- 🎨 **Professional Responsive Design** with animations
- 🔒 **Content Security Policy (CSP)** implementation

## 🏗️ Architecture Overview

### Multi-Database System
- **MySQL Database**: User authentication, admin data, structured voting records
- **MongoDB Database**: Candidate profiles, unstructured data, flexible schemas  
- **Ethereum Blockchain**: Smart contracts, vote immutability, transparency

### Technology Stack  
- **Frontend**: Web3.js, jQuery, Responsive CSS Grid
- **Backend**: Express.js (Frontend) + FastAPI (Database API)
- **Smart Contracts**: Solidity 0.8.19 with Truffle framework
- **Build System**: Webpack 5 with modern JavaScript support
- **Databases**: MySQL 8.0, MongoDB 8.0
- **Development**: ESLint, Nodemon, Hot reload

### 🎮 Real Life Example:
- **Old Way**: Paper ballots, manual counting, potential for human error
- **EtherVox Way**: Digital voting with blockchain security, real-time results, and a beautiful interface that anyone can use!

---

## ✨ What Can This Modern Platform Do?

### 🎨 **Beautiful User Experience:**
- 💫 **Stunning Login Interface**: Glass morphism effects with animated backgrounds
- 📱 **Fully Responsive**: Works perfectly on desktop, tablet, and mobile
- 🎭 **Smooth Animations**: Professional transitions and hover effects
- 🌈 **Modern Color Schemes**: Charming gradient backgrounds
- 🔍 **Font Awesome Icons**: Professional iconography throughout

### 👥 **For Voters:**
- 🎯 **Intuitive Interface**: Easy-to-use voting dashboard
- 🔐 **Secure Login**: Personal voter ID and password authentication
- 👀 **Real-time Results**: Watch vote counts update instantly
- 🔒 **Privacy Protected**: Your individual vote remains secret
- ✅ **Blockchain Verified**: Votes are permanently recorded and tamper-proof

### 👑 **For Administrators:**
- 🎛️ **Admin Dashboard**: Comprehensive control panel
- ➕ **Candidate Management**: Add, edit, and manage candidates
- ⏰ **Election Scheduling**: Set start and end times for voting
- 📊 **Live Analytics**: Real-time voting statistics and trends
- 🛡️ **Security Oversight**: Monitor system integrity and user activity

---

## 🏗️ Modern Architecture Overview

Our updated architecture combines cutting-edge technologies for optimal performance:

```
🏢 EtherVox Modern Platform
│
├── 🎨 Frontend Layer (Beautiful UI)
│   ├── 🌟 login.html → "Stunning login with glass morphism"
│   ├── 👑 admin.html → "Professional admin dashboard"
│   ├── 🗳️ index.html → "Modern voting interface"
│   └── 💅 Enhanced CSS → "Professional styling with animations"
│
├── 🔧 Backend Services
│   ├── 🚀 Express Server (index.js) → "Enhanced routing & authentication"
│   ├── 🐍 FastAPI (Database_API/main.py) → "Modern Python backend"
│   └── 🔐 JWT Authentication → "Secure token-based auth"
│
├── 💾 Database Layer
│   ├── 🗄️ MySQL Database → "Reliable voter management"
│   ├── 📊 User Authentication → "Secure credential storage"
│   └── 👥 Role Management → "Admin/User access control"
│
├── ⛓️ Blockchain Layer
│   ├── 📜 Smart Contracts (Solidity) → "Immutable voting logic"
│   ├── 🌐 Web3 Integration → "Seamless blockchain interaction"
│   └── 🦊 MetaMask Support → "Easy wallet connection"
│
└── 🛡️ Security Features
    ├── 🔒 Content Security Policy → "XSS protection"
    ├── 🎫 JWT Token Validation → "Secure session management"
    ├── 🚫 CORS Protection → "Cross-origin security"
    └── 🔐 Role-based Access → "Proper authorization"
```

---

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
