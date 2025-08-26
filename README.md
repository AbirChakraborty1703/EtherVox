# 🗳️ EtherVox - The Magic Voting Box 

## 🤔 What is EtherVox?

Hello! 👋 Let me tell you about EtherVox in very simple words.

Imagine you and your friends want to choose which game to play. Instead of fighting or arguing, you can use a **magic voting box** where everyone puts their choice, and the box counts all votes fairly. No one can cheat, and everyone can see the results!

EtherVox is like that magic voting box, but it lives on your computer and uses something super cool called **blockchain** (think of it like a super secure diary that no one can change once something is written).

### 🎮 Real Life Example:
- **Old Way**: Teacher asks "Who wants pizza for lunch?" Kids raise hands, teacher counts (but maybe miscounts)
- **EtherVox Way**: Everyone clicks on computer, magic box counts perfectly, shows results to everyone!

---

## ✨ What Can This Magic Box Do?

### For People Who Vote (Voters):
- 👀 **See Choices**: Look at all the people/options you can pick from
- ✋ **Vote Once**: Click to choose your favorite (you can only vote once!)
- 📊 **See Results**: Watch how many votes each choice gets
- 🔒 **Stay Secret**: Your vote is private - no one knows what you picked
- ✅ **Trust the Count**: The magic box never makes counting mistakes

### For People Who Run the Voting (Admins):
- ➕ **Add Choices**: Put new people/options for others to vote on
- ⏰ **Start/Stop**: Begin voting and end it when time is up
- 📈 **See Everything**: Watch all votes come in real-time
- 🛡️ **Keep it Fair**: Make sure no one cheats or votes twice

---

## 🏗️ What's Inside This Project? (Like Looking Inside a Toy)

Think of this project like a big toy house with different rooms. Each room does something special:

```
🏠 EtherVox House
│
├── 🚪 index.js (Front Door)
│   └── "Hi! Welcome to voting! Come in!"
│
├── 📋 package.json (House Rules)
│   └── "Here's what we need to make everything work"
│
├── 🏠 truffle-config.js (Building Instructions)
│   └── "How to build the magic blockchain part"
│
├── 📂 contracts/ (The Smart Contract Room)
│   ├── 📜 Voting.sol → "These are the voting rules that no one can break"
│   └── 📜 Migrations.sol → "Instructions for setting up"
│
├── 📂 migrations/ (Setup Room)
│   ├── 1_initial_migration.js → "Step 1: Get ready"
│   └── 2_deploy_contracts.js → "Step 2: Put voting rules on blockchain"
│
├── 📂 src/ (The Pretty Rooms Where You Click Stuff)
│   ├── 📂 html/ (The Pages You See)
│   │   ├── index.html → "Main voting page - where magic happens!"
│   │   ├── admin.html → "Boss page - only for admins"
│   │   └── login.html → "Password page - like a secret clubhouse"
│   │
│   ├── 📂 css/ (Making Things Pretty)
│   │   ├── index.css → "Colors and decorations for voting page"
│   │   ├── admin.css → "Making admin page look nice"
│   │   └── login.css → "Pretty login page"
│   │
│   ├── 📂 js/ (The Brain That Makes Buttons Work)
│   │   ├── app.js → "Main brain - talks to blockchain"
│   │   └── login.js → "Login brain - checks passwords"
│   │
│   └── 📂 assets/ (Pictures and Cool Stuff)
│       └── eth5.jpg → "Cool blockchain picture"
│
├── 📂 Database_API/ (Python Helper Robot)
│   ├── main.py → "Smart robot that helps with passwords and data"
│   ├── requirements.txt → "List of tools the robot needs"
│   └── .env → "Secret passwords for the robot"
│
├── 📂 public/ (Ready-to-Use Stuff)
│   ├── app.bundle.js → "All the brain code put together"
│   └── favicon.ico → "Tiny icon for the website"
│
├── 📂 build/ (Factory Output)
│   └── contracts/ → "Finished blockchain contracts ready to use"
│
├── 📄 README.md (This Instruction Book!)
├── 📄 LICENSE (Permission Paper)
├── 🔒 .env (Secret Password File)
└── 🚫 .gitignore (Things We Don't Share)
```

---

## 🛠️ What Do You Need Before Starting? 

Before we can play with our magic voting box, we need to download some helper programs:

### 1. 📦 Node.js (The JavaScript Helper)
**What it is:** A program that helps run JavaScript on your computer  
**Why we need it:** Our voting box is built with JavaScript  
**Where to get:** Go to [nodejs.org](https://nodejs.org/) and download the green button (LTS version)  
**How to check:** Open Command Prompt and type `node --version` (should show something like v18.17.0)

### 2. 🐍 Python (The Snake Helper) 
**What it is:** Another programming language (like a different type of toy blocks)  
**Why we need it:** Our password helper robot speaks Python  
**Where to get:** Go to [python.org](https://python.org/) and download version 3.8 or newer  
**How to check:** Open Command Prompt and type `python --version`

### 3. 🔧 Truffle (The Blockchain Toolbox)
**What it is:** Special tools for building blockchain stuff  
**How to get:** After installing Node.js, open Command Prompt and type:
```bash
npm install -g truffle
```

### 4. 🍫 Ganache (The Practice Blockchain)
**What it is:** A pretend blockchain that runs on your computer (like a toy version)  
**Why we need it:** To test our voting without using real money  
**Where to get:** Go to [trufflesuite.com/ganache](https://trufflesuite.com/ganache/) and download

### 5. 🦊 MetaMask (The Digital Wallet)
**What it is:** A browser extension that's like a digital wallet  
**Why we need it:** To connect your browser to the blockchain  
**Where to get:** Go to [metamask.io](https://metamask.io/) and add to your browser

---

## 🚀 How to Start the Magic Voting Box (Step by Step)

Follow these steps exactly like following a recipe to bake cookies:

### Step 1: Download the Project 📥
```bash
# Method 1: Download from GitHub
git clone https://github.com/AbirChakraborty1703/EtherVox.git

# Method 2: Download ZIP file from GitHub and extract it
```

### Step 2: Go Into the Project Folder 📁
```bash
cd EtherVox
```

### Step 3: Install the Helper Programs 📦
```bash
# Install JavaScript helpers
npm install

# Go to Python helper folder and install Python helpers
cd Database_API
pip install -r requirements.txt
cd ..
```

### Step 4: Start the Practice Blockchain 🍫

1. **Open Ganache** (the program you downloaded)
2. Click **"New Workspace"** or **"Quickstart"**
3. Make sure it shows:
   - **RPC Server**: HTTP://127.0.0.1:7545
   - **Network ID**: 5777 or 1337
4. You should see 10 fake accounts with fake money (ETH)

### Step 5: Connect MetaMask to Your Practice Blockchain 🦊

1. **Open MetaMask** in your browser
2. Click the **network dropdown** (usually shows "Ethereum Mainnet")
3. Click **"Add Network"** → **"Add a network manually"**
4. Fill in these details:
   - **Network Name**: Local Ganache
   - **New RPC URL**: http://127.0.0.1:7545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH
5. Click **"Save"**

### Step 6: Import a Fake Account 💰

1. In **Ganache**, click the **key icon** next to any account
2. **Copy the Private Key**
3. In **MetaMask**, click your account icon → **"Import Account"**
4. **Paste the Private Key** and click **"Import"**
5. You should now see fake ETH in your MetaMask!

### Step 7: Build the Smart Contract (Voting Rules) 🏗️
```bash
# Compile the voting rules
truffle compile

# Put the voting rules on the blockchain
truffle migrate --reset
```

### Step 8: Start the Servers 🚀

**Open 2 Command Prompt windows:**

**Window 1 - Main Server:**
```bash
cd EtherVox
node index.js
```
You should see: `Server listening on http://localhost:8080`

**Window 2 - Helper Robot:**
```bash
cd EtherVox/Database_API
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
You should see: `Uvicorn running on http://127.0.0.1:8000`

### Step 9: Open the Magic Voting Box! 🎉

1. Open your browser
2. Go to: **http://localhost:8080**
3. You should see the voting page!

---

## 🎮 How to Use the Voting Box

### For Regular Voters:

1. **Connect Your Wallet**: Click "Connect" and approve MetaMask
2. **See the Candidates**: Look at all the people you can vote for
3. **Pick Your Favorite**: Click the radio button next to their name
4. **Vote**: Click the "Vote" button
5. **Confirm in MetaMask**: Approve the transaction (costs fake money)
6. **See Results**: Watch the vote count update!

### For Admins (The Boss):

1. **Go to Admin Page**: Visit **http://localhost:8080/src/html/admin.html**
2. **Login**: Use your admin password
3. **Add Candidates**: 
   - Type candidate name
   - Type their party
   - Click "Add Candidate"
4. **Set Voting Dates**:
   - Pick start date and time
   - Pick end date and time
   - Click "Set Dates"
5. **Watch the Magic**: See votes come in real-time!

---

## 🔧 Technical Details (For Smart Kids)

### What Technologies We Use:
- **Frontend**: HTML, CSS, JavaScript (the pretty part you see)
- **Backend**: Node.js + Express (the server that serves pages)
- **Database API**: Python + FastAPI (the robot that handles passwords)
- **Blockchain**: Ethereum + Solidity (the secure voting rules)
- **Tools**: Truffle (builds blockchain stuff), Web3.js (talks to blockchain)

### How the Magic Works:
1. **Smart Contract**: Written in Solidity, stored on blockchain forever
2. **Web3**: JavaScript talks to MetaMask talks to blockchain
3. **JWT Tokens**: Secure passwords for admins
4. **Real-time Updates**: Browser automatically updates when new votes come in

---

## 🐛 What If Something Goes Wrong?

### Problem: "MetaMask not connecting"
**Solution:** Make sure MetaMask is set to the right network (Local Ganache on port 7545)

### Problem: "Server won't start"
**Solution:** 
- Make sure ports 8080 and 8000 aren't being used by other programs
- Try `npm install` again

### Problem: "Can't vote / Transaction fails"
**Solution:**
- Make sure you have fake ETH in MetaMask
- Make sure Ganache is running
- Try refreshing the page

### Problem: "Admin can't login"
**Solution:**
- Check if Python server is running on port 8000
- Make sure `.env` file exists in Database_API folder

### Problem: "Votes not showing up"
**Solution:**
- Make sure smart contract is deployed (`truffle migrate --reset`)
- Check that MetaMask is connected to the right account

---

## 🎓 What You'll Learn

By playing with this project, you'll learn about:
- **Blockchain**: How secure, unchangeable records work
- **Smart Contracts**: Computer programs that run themselves
- **Web Development**: How websites work
- **Databases**: How computers store information
- **Security**: How to keep things safe online
- **Voting Systems**: How fair elections can work

---

## 🌟 Cool Features

- **🔒 Super Secure**: Once you vote, no one can change or delete it
- **👀 Transparent**: Everyone can see the results, but votes stay secret
- **⚡ Real-time**: See votes update as they happen
- **🌐 Decentralized**: No single person controls the voting
- **💰 No Real Money**: Uses fake blockchain money for testing
- **📱 Modern UI**: Pretty, easy-to-use design

---

## 📚 Want to Learn More?

### For Beginners:
- [What is Blockchain?](https://www.youtube.com/watch?v=SSo_EIwHSd4) (Simple YouTube video)
- [How Bitcoin Works](https://www.youtube.com/watch?v=bBC-nXj3Ng4) (Animated explanation)

### For Advanced Learners:
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Web3.js Guide](https://web3js.readthedocs.io/)
- [Truffle Tutorial](https://trufflesuite.com/tutorial/)

---

## 🤝 Need Help?

If you get stuck or confused:
1. **Read the error message carefully** (computers usually tell you what's wrong)
2. **Try Google** - someone probably had the same problem before
3. **Ask for help** - show someone the error message
4. **Check our Troubleshooting section** above

---

## 📄 Legal Stuff

This project is open source (free to use) under the MIT License. That means:
- ✅ You can use it for anything
- ✅ You can copy it and change it
- ✅ You can share it with friends
- ✅ You can use it for school projects
- ❌ If something breaks, it's not our fault (but we'll try to help!)

---

## 🎉 Congratulations!

If you made it this far, you're amazing! 🌟 You now know how to run a blockchain voting system. That's pretty cool - not many people can say that!

**Remember**: This is just for learning and fun. Real elections need lots more security and testing!

---

## 📞 Contact

**Project by**: Abir Chakraborty  
**GitHub**: [@AbirChakraborty1703](https://github.com/AbirChakraborty1703)  
**Project**: [EtherVox on GitHub](https://github.com/AbirChakraborty1703/EtherVox)

**Happy Voting!** 🗳️✨
