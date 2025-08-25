# EtherVox 🗳️

A decentralized voting application built on the Ethereum blockchain, providing secure, transparent, and tamper-proof voting mechanisms.

## 🌟 Features

- **Decentralized Voting**: Secure voting system powered by Ethereum smart contracts
- **Transparent Process**: All votes are recorded on the blockchain for transparency
- **Admin Panel**: Administrative interface for managing candidates and elections
- **User Authentication**: JWT-based authentication system
- **Real-time Results**: Live voting results and statistics
- **Candidate Management**: Add and manage voting candidates
- **Responsive Design**: Modern, mobile-friendly user interface

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, jQuery
- **Backend**: Node.js, Express.js
- **Blockchain**: Ethereum, Solidity
- **Web3**: Web3.js for blockchain interaction
- **Smart Contracts**: Truffle Framework
- **Authentication**: JSON Web Tokens (JWT)
- **Database API**: Python (Flask/FastAPI)

## 📋 Prerequisites

Before running this project, make sure you have:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Truffle Framework](https://trufflesuite.com/)
- [Ganache CLI](https://github.com/trufflesuite/ganache-cli) or [Ganache GUI](https://trufflesuite.com/ganache/)
- [MetaMask](https://metamask.io/) browser extension
- [Python](https://python.org/) (for Database API)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AbirChakraborty1703/EtherVox.git
   cd EtherVox
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   SECRET_KEY=your_jwt_secret_key_here
   PORT=3000
   ```

4. **Start Ganache**
   - Start Ganache CLI or GUI
   - Note the RPC server address (usually `http://127.0.0.1:7545`)

5. **Deploy smart contracts**
   ```bash
   truffle compile
   truffle migrate
   ```

6. **Start the application**
   ```bash
   npm start
   ```

7. **Set up Database API (Optional)**
   ```bash
   cd Database_API
   pip install -r requirements.txt
   python main.py
   ```

## 🔧 Configuration

### Truffle Configuration
The project uses Truffle for smart contract deployment. Configuration is in `truffle-config.js`:

```javascript
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    }
  }
}
```

### MetaMask Setup
1. Install MetaMask extension
2. Connect to your local Ganache network
3. Import accounts using private keys from Ganache

## 📁 Project Structure

```
EtherVox/
├── contracts/              # Solidity smart contracts
│   ├── Voting.sol          # Main voting contract
│   └── Migrations.sol      # Migration contract
├── migrations/             # Deployment scripts
├── src/                    # Frontend assets
│   ├── html/              # HTML templates
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── assets/            # Images and static files
├── Database_API/          # Python API backend
├── build/                 # Compiled contracts (auto-generated)
├── public/               # Public assets
├── index.js              # Express server
├── package.json          # Project dependencies
└── truffle-config.js     # Truffle configuration
```

## 🎯 Usage

1. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`
   - You'll be redirected to the login page

2. **Login Process**
   - Connect your MetaMask wallet
   - Ensure you're connected to the correct network

3. **Voting Process**
   - View available candidates
   - Cast your vote securely on the blockchain
   - View real-time results

4. **Admin Features**
   - Access admin panel with proper authentication
   - Add new candidates
   - Manage election settings
   - View detailed analytics

## 🔐 Smart Contracts

### Voting.sol
The main voting contract handles:
- Candidate registration
- Vote casting
- Vote counting
- Election management

### Key Functions:
- `addCandidate(string name, string party)`: Add a new candidate
- `vote(uint candidateId)`: Cast a vote for a candidate
- `getCountCandidates()`: Get total number of candidates
- `getCandidateInfo(uint id)`: Get candidate details

## 🛡️ Security Features

- **Smart Contract Security**: Solidity best practices implemented
- **Authentication**: JWT-based secure authentication
- **Input Validation**: Comprehensive input validation on both frontend and backend
- **Access Control**: Role-based access control for admin functions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abir Chakraborty**
- GitHub: [@AbirChakraborty1703](https://github.com/AbirChakraborty1703)

## 🙏 Acknowledgments

- Ethereum Foundation for blockchain technology
- Truffle Suite for development framework
- Web3.js for blockchain interaction
- Express.js community for the web framework

## 📞 Support

If you have any questions or need help with setup, please:
1. Check the [Issues](https://github.com/AbirChakraborty1703/EtherVox/issues) page
2. Create a new issue if needed
3. Contact the maintainer

---

**⭐ If you found this project helpful, please give it a star!**
