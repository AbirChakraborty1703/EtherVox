/**
 * EtherVox Permanent MetaMask Connection Setup
 * Author: Abir Chakraborty
 * Description: Auto-connecting MetaMask configuration for permanent demo setup
 */

// Permanent MetaMask Connection Configuration
const PERMANENT_METAMASK_CONFIG = {
  // Ganache Local Network Configuration
  network: {
    chainId: '0x539', // 1337 in hex
    chainName: 'EtherVox Local Network',
    rpcUrls: ['http://localhost:7545'],
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  
  // Demo Account (Permanent - never changes)
  demoAccount: {
    privateKey: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
    address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    balance: '100 ETH'
  },
  
  // Auto-reconnection settings
  reconnection: {
    enabled: true,
    maxRetries: 10,
    retryInterval: 3000, // 3 seconds
  }
};

// Enhanced MetaMask Connection Manager
class PermanentMetaMaskConnection {
  constructor() {
    this.isConnected = false;
    this.account = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = PERMANENT_METAMASK_CONFIG.reconnection.maxRetries;
    
    // Auto-start connection
    this.init();
  }
  
  async init() {
    console.log('🦊 Initializing Permanent MetaMask Connection...');
    
    // Check if MetaMask is installed
    if (!window.ethereum) {
      this.showInstallPrompt();
      return;
    }
    
    // Set up event listeners for permanent connection
    this.setupEventListeners();
    
    // Attempt initial connection
    await this.connect();
    
    // Set up auto-reconnection
    this.setupAutoReconnect();
  }
  
  async connect() {
    try {
      console.log('🔗 Attempting MetaMask connection...');
      
      // Update UI to show connecting state
      this.updateUIConnecting();
      
      // Add/switch to Ganache network automatically
      await this.ensureCorrectNetwork();
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts.length > 0) {
        this.account = accounts[0];
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        console.log('✅ MetaMask connected permanently!');
        console.log('🏦 Account:', this.account);
        
        // Update UI to show connected state
        this.updateUI();
        return true;
      }
      
    } catch (error) {
      console.error('❌ MetaMask connection failed:', error);
      this.handleConnectionError(error);
      return false;
    }
  }
  
  async ensureCorrectNetwork() {
    try {
      // Try to switch to the correct network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: PERMANENT_METAMASK_CONFIG.network.chainId }],
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [PERMANENT_METAMASK_CONFIG.network],
          });
        } catch (addError) {
          console.error('❌ Failed to add network:', addError);
        }
      }
    }
  }
  
  setupEventListeners() {
    // Account change listener
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('📱 Account changed:', accounts);
      if (accounts.length === 0) {
        this.isConnected = false;
        this.account = null;
        this.updateUI(); // Update UI to show disconnected
        console.log('🔄 Account disconnected, attempting reconnect...');
        setTimeout(() => this.connect(), 1000);
      } else {
        this.account = accounts[0];
        this.isConnected = true;
        this.updateUI(); // Update UI to show new account
      }
    });
    
    // Network change listener
    window.ethereum.on('chainChanged', (chainId) => {
      console.log('🌐 Network changed to:', chainId);
      // Auto-switch back to Ganache if user changes network
      if (chainId !== PERMANENT_METAMASK_CONFIG.network.chainId) {
        console.log('🔄 Switching back to Ganache network...');
        setTimeout(() => this.ensureCorrectNetwork(), 2000);
      }
    });
    
    // Connection listener
    window.ethereum.on('connect', (connectInfo) => {
      console.log('🔗 MetaMask connected:', connectInfo);
      this.isConnected = true;
      this.updateUI(); // Update UI when connected
    });
    
    // Disconnect listener
    window.ethereum.on('disconnect', (error) => {
      console.log('🔌 MetaMask disconnected:', error);
      this.isConnected = false;
      this.updateUI(); // Update UI when disconnected
      // Auto-reconnect after disconnect
      setTimeout(() => this.connect(), 3000);
    });
  }
  
  setupAutoReconnect() {
    // Check connection status every 10 seconds
    setInterval(async () => {
      if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Auto-reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts++;
        await this.connect();
      }
    }, 10000);
    
    // Reset reconnect attempts when successfully connected
    setInterval(() => {
      if (this.isConnected) {
        this.reconnectAttempts = 0;
      }
    }, 30000);
  }
  
  updateUIConnecting() {
    // Update connection status to show connecting
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="connection-status connecting">
          🟡 Connecting to MetaMask...
        </div>
      `;
    }
  }

  updateUI() {
    // Update connection status in UI
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
      if (this.isConnected && this.account) {
        statusElement.innerHTML = `
          <div class="connection-status connected">
            🟢 MetaMask Connected (Permanent)
            <br>
            <small>Account: ${this.account?.slice(0, 6)}...${this.account?.slice(-4)}</small>
          </div>
        `;
      } else {
        statusElement.innerHTML = `
          <div class="connection-status disconnected">
            🔴 MetaMask Disconnected
          </div>
        `;
      }
    }
    
    // Update account display
    const accountElement = document.getElementById('accountAddress');
    if (accountElement) {
      accountElement.innerHTML = `Your Account: ${this.account}`;
    }
  }
  
  handleConnectionError(error) {
    if (error.code === 4001) {
      console.log('🚫 User rejected connection');
      // Show friendly message and retry
      setTimeout(() => {
        console.log('🔄 Retrying connection in 5 seconds...');
        this.connect();
      }, 5000);
    } else {
      console.error('❌ Connection error:', error);
    }
  }
  
  showInstallPrompt() {
    const installHTML = `
      <div class="metamask-install-prompt">
        <h3>🦊 MetaMask Required</h3>
        <p>Please install MetaMask to use EtherVox:</p>
        <a href="https://metamask.io/download/" target="_blank" class="install-button">
          Install MetaMask
        </a>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', installHTML);
  }
  
  // Force reconnection method
  async forceReconnect() {
    console.log('🔄 Forcing MetaMask reconnection...');
    this.isConnected = false;
    this.reconnectAttempts = 0;
    await this.connect();
  }
  
  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      account: this.account,
      network: PERMANENT_METAMASK_CONFIG.network.chainName,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Global connection manager instance
window.permanentMetaMask = new PermanentMetaMaskConnection();

// Expose useful methods globally
window.forceReconnectMetaMask = () => window.permanentMetaMask.forceReconnect();
window.getMetaMaskStatus = () => window.permanentMetaMask.getStatus();

// Auto-start on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 EtherVox Permanent MetaMask Connection Ready!');
  
  // Add connection status indicator to page
  const statusHTML = `
    <div id="connectionStatus" class="permanent-connection-status">
      <div class="connection-status connecting">
        🟡 Connecting to MetaMask...
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', statusHTML);
});

// CSS for connection status (auto-inject)
const permanentConnectionCSS = `
<style>
.permanent-connection-status {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.connection-status {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.3s ease;
}

.connection-status.connecting {
  background: linear-gradient(135deg, #ffeaa7, #fdcb6e);
  color: #2d3436;
  border: 2px solid #e17055;
}

.connection-status.connected {
  background: linear-gradient(135deg, #00b894, #00cec9);
  color: white;
  border: 2px solid #00a085;
}

.connection-status.disconnected {
  background: linear-gradient(135deg, #ff7675, #fd79a8);
  color: white;
  border: 2px solid #e84393;
}

.metamask-install-prompt {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  text-align: center;
  z-index: 10001;
}

.install-button {
  display: inline-block;
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 15px;
  transition: transform 0.2s ease;
}

.install-button:hover {
  transform: scale(1.05);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', permanentConnectionCSS);

console.log('🦊 Permanent MetaMask Connection Script Loaded!');
