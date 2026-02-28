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
    this._domReady = false;
    this._initCalled = false;

    // Don't auto-init from constructor — let the IIFE inject the DOM first,
    // then explicitly call init() after the status div is created.
  }

  async init() {
    if (this._initCalled) return; // prevent double init
    this._initCalled = true;
    this._domReady = true;
    console.log('🦊 Initializing Permanent MetaMask Connection...');

    // Check if MetaMask is installed
    if (!window.ethereum) {
      this.showInstallPrompt();
      return;
    }

    // Set up event listeners for permanent connection
    this.setupEventListeners();

    // Passively check existing connection (no popup)
    await this.checkConnection();

    // Set up auto-reconnection polling
    this.setupAutoReconnect();
  }

  // Passive check — reads existing MetaMask state WITHOUT triggering popups
  async checkConnection() {
    try {
      console.log('🔍 Checking MetaMask connection status...');

      // eth_accounts is passive — returns connected accounts without any popup
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (accounts && accounts.length > 0) {
        this.account = accounts[0];
        this.isConnected = true;
        this.reconnectAttempts = 0;

        console.log('✅ MetaMask already connected!');
        console.log('🏦 Account:', this.account);
        this.updateUI();
        return true;
      } else {
        // Not yet authorized — try eth_requestAccounts as fallback (may prompt)
        console.log('🔗 No accounts found, requesting access...');
        return await this.requestConnection();
      }

    } catch (error) {
      console.error('❌ MetaMask check failed:', error);
      this.handleConnectionError(error);
      return false;
    }
  }

  // Active request — only called when passive check finds no accounts
  async requestConnection() {
    try {
      this.updateUIConnecting();

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        this.account = accounts[0];
        this.isConnected = true;
        this.reconnectAttempts = 0;

        console.log('✅ MetaMask connected!');
        console.log('🏦 Account:', this.account);
        this.updateUI();
        return true;
      }
    } catch (error) {
      console.error('❌ MetaMask request failed:', error);
      this.handleConnectionError(error);
      return false;
    }
  }

  // Legacy connect method — kept for forceReconnect compatibility
  async connect() {
    return await this.checkConnection();
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
    // Passively poll connection status every 10 seconds
    setInterval(async () => {
      if (!this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Auto-reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts++;
        await this.checkConnection();
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
          <img class="mm-fox-icon" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" onerror="this.style.display='none'" />
          <span class="mm-label">Connecting...</span>
        </div>
      `;
      statusElement.style.display = 'block';
      statusElement.style.opacity = '1';
      statusElement.style.transform = 'translateY(0)';
    }
  }

  updateUI() {
    // Update connection status in UI
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
      if (this.isConnected && this.account) {
        statusElement.innerHTML = `
          <div class="connection-status connected">
            <img class="mm-fox-icon" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" onerror="this.style.display='none'" />
            <div class="mm-text">
              <span class="mm-label">MetaMask Connected</span>
              <span class="mm-account">${this.account?.slice(0, 6)}...${this.account?.slice(-4)}</span>
            </div>
          </div>
        `;

        // Auto-hide notification after 3 seconds with slide-down animation
        setTimeout(() => {
          statusElement.style.opacity = '0';
          statusElement.style.transform = 'translateY(20px)';
          setTimeout(() => {
            statusElement.style.display = 'none';
          }, 400);
        }, 3000);
      } else {
        statusElement.innerHTML = `
          <div class="connection-status disconnected">
            <img class="mm-fox-icon" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" onerror="this.style.display='none'" />
            <span class="mm-label">Disconnected</span>
          </div>
        `;
        statusElement.style.display = 'block';
        statusElement.style.opacity = '1';
        statusElement.style.transform = 'translateY(0)';
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
      // Don't auto-retry on explicit user rejection
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

// Inject the connection status div into the DOM
// Use a self-executing setup to handle both "DOM loading" and "already loaded" cases
(function injectStatusDiv() {
  function createStatusDiv() {
    // Don't create if it already exists
    if (document.getElementById('connectionStatus')) return;

    const statusHTML = `
      <div id="connectionStatus" class="permanent-connection-status">
        <div class="connection-status connecting">
          <img class="mm-fox-icon" src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" onerror="this.style.display='none'" />
          <span class="mm-label">Connecting...</span>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', statusHTML);
    console.log('🚀 EtherVox MetaMask status badge injected');

    // Now that the DOM element exists, initialize the connection manager
    if (window.permanentMetaMask) {
      window.permanentMetaMask.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createStatusDiv);
  } else {
    // DOM already ready
    createStatusDiv();
  }
})();

// CSS for connection status (auto-inject)
const permanentConnectionCSS = `
<style>
.permanent-connection-status {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10000;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.3s ease;
  min-width: 160px;
}

.mm-fox-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
}

.mm-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mm-label {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.2;
}

.mm-account {
  font-size: 11px;
  opacity: 0.85;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.connection-status.connecting {
  background: rgba(45, 52, 54, 0.85);
  color: #fdcb6e;
  border: 1px solid rgba(253, 203, 110, 0.4);
}

.connection-status.connecting .mm-fox-icon {
  animation: mmPulse 1.5s ease-in-out infinite;
}

@keyframes mmPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
}

.connection-status.connected {
  background: rgba(0, 184, 148, 0.9);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.connection-status.disconnected {
  background: rgba(45, 52, 54, 0.85);
  color: #ff7675;
  border: 1px solid rgba(255, 118, 117, 0.4);
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
