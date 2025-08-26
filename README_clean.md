# EtherVox - Decentralized Voting DApp

A secure blockchain-based voting application built on Ethereum with smart contracts, Web3 integration, and JWT authentication.

## Features

- **Secure Voting**: Blockchain-based tamper-proof voting system
- **Smart Contracts**: Solidity contracts for transparent vote management  
- **Web3 Integration**: Modern MetaMask connectivity with enhanced error handling
- **JWT Authentication**: Secure admin and voter authentication
- **Real-time Updates**: Live vote counting and candidate management
- **Admin Panel**: Complete election management interface

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript, Web3.js
- **Backend**: Node.js, Express.js, FastAPI (Python)
- **Blockchain**: Ethereum, Solidity ^0.5.16
- **Tools**: Truffle Framework, Ganache
- **Authentication**: JWT tokens, MetaMask wallet integration

## Project Structure

```
EtherVox/
├── contracts/              # Smart contracts (Solidity)
├── migrations/             # Deployment scripts
├── src/                    # Frontend source code
│   ├── html/              # HTML pages
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript logic
│   └── assets/            # Images and static files
├── Database_API/           # Python FastAPI backend
├── public/                # Built frontend assets
├── build/                 # Compiled contracts
├── index.js               # Express server
├── package.json           # Node.js dependencies
└── truffle-config.js      # Truffle configuration
```

## Prerequisites

- Node.js (v14+)
- Python 3.8+
- Truffle Framework
- Ganache CLI or GUI
- MetaMask browser extension

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   pip install -r Database_API/requirements.txt
   ```

2. **Start Ganache**
   - Launch Ganache on `127.0.0.1:7545`
   - Import accounts into MetaMask

3. **Deploy Contracts**
   ```bash
   truffle compile
   truffle migrate --reset
   ```

4. **Start Servers**
   ```bash
   # Node.js server (port 8080)
   node index.js
   
   # Python API (port 8000)
   cd Database_API && uvicorn main:app --host 127.0.0.1 --port 8000
   ```

5. **Access Application**
   - Open: http://localhost:8080
   - Connect MetaMask to Ganache network
   - Start voting!

## Configuration

### MetaMask Setup
- Network: Custom RPC
- URL: `http://127.0.0.1:7545`
- Chain ID: `1337` or `5777`
- Currency: `ETH`

### Environment Variables
Create `.env` file with:
```
SECRET_KEY=your_jwt_secret_key
PORT=3000
```

## License

MIT License - see LICENSE file for details.

## Author

Abir Chakraborty (@AbirChakraborty1703)
