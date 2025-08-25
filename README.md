# EtherVox - Simple Voting on Blockchain 🗳️

**What is EtherVox?**
EtherVox is like a digital voting box, but instead of using paper ballots, it uses computer magic called "blockchain" to make sure nobody can cheat when voting!

Think of it like this:
- 📝 Instead of writing on paper → You click on a computer
- 🗳️ Instead of putting paper in a box → Your vote goes to a special computer network
- 🔒 Instead of trusting one person to count → Thousands of computers check together
- ✅ Nobody can change your vote once it's made!

---

## 🤔 What Can This App Do?

**For Voters (People who vote):**
- ✅ See all the people you can vote for
- ✅ Click to vote for your favorite person
- ✅ See how many votes each person got
- ✅ Your vote is secret and safe

**For Admins (People who organize the voting):**
- ✅ Add new people to vote for
- ✅ Start and stop voting
- ✅ See all the results
- ✅ Make sure everything is fair

---

## 🏗️ What's Inside This Project? (Project Structure)

Think of this project like a house with different rooms:

```
EtherVox House 🏠
│
├── 🚪 Front Door (index.js)          → Main entrance to the app
├── 📋 House Rules (package.json)      → List of what the house needs
├── 🏠 Building Plans (truffle-config.js) → How to build the blockchain part
│
├── 📄 Smart Papers Room (contracts/)
│   ├── 📜 Voting Rules (Voting.sol)    → Rules for how voting works
│   └── 📜 Setup Rules (Migrations.sol) → Rules for setting up
│
├── 🛠️ Construction Room (migrations/)
│   └── 📋 Building Instructions        → How to put everything together
│
├── 🎨 Pretty Rooms (src/)
│   ├── 🖼️ Web Pages (html/)           → What you see on screen
│   ├── 🎨 Decorations (css/)          → Colors and pretty designs
│   ├── ⚡ Action Scripts (js/)         → Buttons and interactive stuff
│   └── 📸 Pictures (assets/)          → Images and photos
│
├── 🐍 Python Helper Room (Database_API/)
│   ├── 🤖 Helper Robot (main.py)      → Extra helper for data
│   └── 📋 Robot Needs (requirements.txt) → What the robot needs to work
│
├── 🏭 Factory Room (build/)           → Where finished blockchain parts go
├── 📚 Information Desk (README.md)    → Instructions (this file!)
└── 📜 Legal Papers (LICENSE)          → Permission to use this project
```

---

## 🛠️ What Do You Need Before Starting? (Prerequisites)

Before you can play with this app, you need to install some programs on your computer:

### 1. **Node.js** 📦
- **What it is:** A program that helps run JavaScript on your computer
- **Where to get:** [Download Node.js](https://nodejs.org/)
- **Which version:** Get version 14 or newer
- **How to check if you have it:** Open terminal and type `node --version`

### 2. **Truffle** 🔧
- **What it is:** A special toolbox for building blockchain apps
- **How to get:** After installing Node.js, type `npm install -g truffle`

### 3. **Ganache** 🍫
- **What it is:** A fake blockchain that runs on your computer (like a practice blockchain)
- **Where to get:** [Download Ganache](https://trufflesuite.com/ganache/)
- **Why you need it:** To test your app without using real money

### 4. **MetaMask** 🦊
- **What it is:** A digital wallet that lives in your web browser
- **Where to get:** [MetaMask Website](https://metamask.io/)
- **Why you need it:** To connect your browser to the blockchain

### 5. **Python** 🐍 (Optional)
- **What it is:** Another programming language for the helper parts
- **Where to get:** [Download Python](https://python.org/)

---

## 🚀 How to Start the App (Step by Step Guide)

Follow these steps exactly like following a recipe:

### Step 1: Get the Project 📥
```bash
# 1. Copy the project to your computer
git clone https://github.com/AbirChakraborty1703/EtherVox.git

# 2. Go into the project folder
cd EtherVox
```

### Step 2: Install All the Pieces 🔧
```bash
# This downloads all the code pieces the app needs
npm install
```

### Step 3: Create Your Secret File 🔐
1. Copy the example secret file:
   - Find the file called `.env.example`
   - Make a copy and rename it to `.env`
   
2. Open the `.env` file and change these:
```
SECRET_KEY=your_super_secret_password_here
PORT=3000
```

### Step 4: Start Your Practice Blockchain 🍫
1. Open Ganache (the program you downloaded)
2. Click "Quickstart" or "New Workspace"
3. Make sure it shows:
   - Port: 7545
   - Network ID: 5777 (or any number)
4. Keep this running (don't close it!)

### Step 5: Put Your Smart Contract on the Blockchain 📜
```bash
# 1. Build the smart contract
truffle compile

# 2. Put it on the blockchain
truffle migrate
```

### Step 6: Connect MetaMask 🦊
1. Open your web browser
2. Click the MetaMask fox icon
3. Click "Add Network" or "Custom Network"
4. Fill in these details:
   - Network Name: Ganache Local
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Currency Symbol: ETH

### Step 7: Start the App! 🎉
```bash
npm start
```

### Step 8: Open in Browser 🌐
1. Open your web browser
2. Go to: `http://localhost:3000`
3. You should see the login page!

---

## 🚀 SUPER DETAILED SETUP (For Advanced Users) 

**Want to run everything step by step like a pro?** Here's how to start all the different parts of the app using multiple terminals (command windows). Think of it like starting different machines in a factory! 🏭

### 🔥 Before You Start:
1. **Open Ganache** and create a development workspace
2. Make sure it's running on port **7545**
3. Keep Ganache open the whole time!

### 📟 TERMINAL 1: Smart Contract Console 🤖

**What this does:** Opens a special command window to talk directly to your smart contracts

```bash
# 1. Open terminal in your project folder
# 2. Start the truffle console (smart contract controller)
truffle console

# 3. Inside the console, compile your smart contracts
compile

# 4. Exit the console when done
exit
```

### 📟 TERMINAL 2: Bundle JavaScript Files 📦

**What this does:** Packages all your JavaScript files into one big file for the browser

```bash
# Bundle app.js with browserify (combines all JS files)
browserify ./src/js/app.js -o ./src/dist/app.bundle.js
```

### 📟 TERMINAL 3: Start Main Server 🖥️

**What this does:** Starts the main website server that shows your web pages

```bash
# Start the node server
node index.js
```

**You should see:** "Server running on port 3000" or similar message

### 📟 TERMINAL 4: Start Database Helper 🐍

**What this does:** Starts the Python helper that manages extra data

```bash
# 1. Go to the Database_API folder
cd Database_API

# 2. Start the database server
uvicorn main:app --reload --host 127.0.0.1
```

**You should see:** "Application startup complete" message

### 📟 TERMINAL 5: Deploy Smart Contracts 🚀

**What this does:** Puts your voting rules (smart contracts) onto the blockchain

```bash
# Deploy contracts to the blockchain
truffle migrate
```

**You should see:** Messages about deploying contracts and gas costs

### 🎉 ALL DONE! Check Your App

**Your app is now running at:** `http://localhost:8080/`

**What should be running:**
- ✅ Ganache (fake blockchain)
- ✅ Terminal 3: Main server (website)
- ✅ Terminal 4: Database helper (data management)
- ✅ Smart contracts deployed on blockchain

**If something doesn't work:**
1. Make sure all 5 terminals are still running
2. Check that Ganache is still open
3. Look for error messages in any terminal
4. Try refreshing your browser

---

## 🎮 How to Use the App

### For Regular Users (Voters):

1. **Open the App**
   - Go to `http://localhost:3000` in your browser
   - You'll see a login page

2. **Connect Your Wallet**
   - Click "Connect Wallet" or similar button
   - MetaMask will pop up
   - Click "Connect"

3. **Vote for Someone**
   - You'll see a list of people to vote for
   - Click on your favorite person
   - Confirm in MetaMask (this costs fake money, but it's free!)
   - Wait a few seconds for your vote to be recorded

4. **See Results**
   - Look at the numbers next to each person's name
   - That's how many votes they got!

### For Admins (People Running the Election):

1. **Login as Admin**
   - Use the special admin login
   - You'll see extra buttons and options

2. **Add New Candidates**
   - Click "Add Candidate" button
   - Type the person's name and party
   - Click "Save"

3. **Manage the Election**
   - Start/stop voting periods
   - See detailed results
   - Make sure everything is fair

---

## 🔍 Understanding the Smart Contract (The Blockchain Part)

The smart contract is like a robot that lives on the blockchain. Here's what it can do:

### Main Functions (Robot Commands):
- **`addCandidate(name, party)`** - Add a new person to vote for
- **`vote(candidateId)`** - Cast a vote for someone
- **`getCountCandidates()`** - Count how many people you can vote for
- **`getCandidateInfo(id)`** - Get details about a candidate

### Why Smart Contracts are Cool:
- 🤖 They work automatically
- 🔒 Nobody can change them once they're made
- 👁️ Everyone can see what they do
- ⚡ They work 24/7 without getting tired

---

## 🛡️ Security (How We Keep Everything Safe)

### What Makes This App Safe:
1. **Blockchain Magic** ✨ - Once a vote is made, nobody can change it
2. **Secret Passwords** 🔐 - Your login information is protected
3. **Input Checking** ✅ - The app checks that you're putting in correct information
4. **Permission System** 👮‍♂️ - Only admins can add candidates

### Important Safety Rules:
- ⚠️ Never share your MetaMask password
- ⚠️ Never share your `.env` file
- ⚠️ Only connect to trusted networks
- ⚠️ Always double-check before voting

---

## 🐛 Common Problems and How to Fix Them

### Problem 1: "MetaMask not found"
**Solution:** Install MetaMask browser extension and refresh the page

### Problem 2: "Contract not deployed"
**Solution:** Run `truffle migrate` again

### Problem 3: "Can't connect to blockchain"
**Solution:** Make sure Ganache is running and check the network settings

### Problem 4: "Transaction failed"
**Solution:** Make sure you have enough fake ETH in your MetaMask wallet

### Problem 5: "App won't start"
**Solution:** Check if Node.js is installed by typing `node --version`

---

## 🎯 What Files Do What?

### Important Files You Might Want to Look At:

- **`index.js`** - The main server that runs the app
- **`package.json`** - List of all the code packages needed
- **`contracts/Voting.sol`** - The smart contract (blockchain rules)
- **`src/html/index.html`** - The main webpage
- **`src/js/app.js`** - JavaScript that makes buttons work
- **`truffle-config.js`** - Settings for the blockchain connection

### Files You Don't Need to Touch:
- **`build/`** folder - Computer-generated files
- **`node_modules/`** folder - Downloaded code packages
- **`.git/`** folder - Version control stuff

---

## 🤝 Want to Help Make This Better?

If you want to add new features or fix bugs:

1. **Fork the project** (make your own copy)
2. **Make your changes** in your copy
3. **Test everything** to make sure it works
4. **Submit a pull request** (ask to merge your changes)

### Ideas for New Features:
- 🌈 Different color themes
- 📊 Better charts for results
- 📱 Mobile app version
- 🌍 Multiple language support
- 🔔 Email notifications

---

## 📞 Need Help?

If you get stuck or have questions:

1. **Check the Issues page** on GitHub
2. **Create a new issue** if your problem isn't listed
3. **Contact the creator**: Abir Chakraborty
   - GitHub: [@AbirChakraborty1703](https://github.com/AbirChakraborty1703)

---

## 🏆 Credits and Thanks

This project uses these awesome tools:
- **Ethereum** - The blockchain technology
- **Truffle** - Blockchain development framework
- **Web3.js** - Connects websites to blockchain
- **Express.js** - Web server framework
- **MetaMask** - Blockchain wallet

---

## 📜 Legal Stuff

This project is free to use under the MIT License. That means:
- ✅ You can use it for anything
- ✅ You can modify it
- ✅ You can share it
- ✅ You can use it for business
- ❗ But if something breaks, it's not our fault!

---

## 🌟 Final Words

**Congratulations!** 🎉 

If you followed all these steps, you now have your own working blockchain voting app! You're now part of the exciting world of decentralized applications (DApps).

Remember:
- 🧠 Blockchain is just a special way of storing information that's very hard to fake
- 🗳️ This voting app shows how technology can make elections more transparent
- 🚀 You've just learned about the future of digital democracy!

**Keep exploring and have fun!** 🌈

---

*Made with ❤️ by Abir Chakraborty*

*If this helped you, please give it a ⭐ star on GitHub!*
