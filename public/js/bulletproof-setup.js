/**
 * EtherVox Bulletproof Configuration Script
 * This script ensures MetaMask and Ganache are properly connected
 */

// Configuration for your exact Ganache setup
const BULLETPROOF_CONFIG = {
  ganache: {
    host: '127.0.0.1',
    port: 7545,
    networkId: 5777,
    chainId: 1337,
    gasPrice: 2000000000, // 2 gwei (as per your Ganache)
    gasLimit: 6721975
  },
  
  metamask: {
    networkName: 'EtherVox Local Network',
    rpcUrl: 'http://127.0.0.1:7545',
    chainId: '0x539', // 1337 in hex
    currencySymbol: 'ETH'
  },
  
  // Your actual Ganache accounts
  accounts: {
    owner: '0x996d2CcE9274F529f1A5f1Ab2540b05e33B85e51', // Index 1 - Contract Owner
    voter1: '0x7ACb02c2c530Ce7b25c6f8129cf3b02fa341b916', // Index 2 - Current connected
    tester: '0x46Bfc1AF145720bDb57fe1FCcf3F6dB07B38975'  // Index 0 - Test account
  }
};

// Function to add network to MetaMask
async function addEtherVoxNetwork() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BULLETPROOF_CONFIG.metamask.chainId,
          chainName: BULLETPROOF_CONFIG.metamask.networkName,
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: [BULLETPROOF_CONFIG.metamask.rpcUrl],
          blockExplorerUrls: null
        }]
      });
      
      console.log('✅ EtherVox network added to MetaMask successfully!');
      return true;
    } catch (error) {
      console.error('❌ Failed to add network:', error);
      return false;
    }
  }
  return false;
}

// Function to switch to EtherVox network
async function switchToEtherVoxNetwork() {
  if (window.ethereum) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BULLETPROOF_CONFIG.metamask.chainId }]
      });
      
      console.log('✅ Switched to EtherVox network successfully!');
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added yet, try to add it
        return await addEtherVoxNetwork();
      }
      console.error('❌ Failed to switch network:', error);
      return false;
    }
  }
  return false;
}

// Function to verify connection
async function verifyConnection() {
  if (window.ethereum) {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      console.log('🔍 Current Chain ID:', chainId);
      console.log('🔍 Expected Chain ID:', BULLETPROOF_CONFIG.metamask.chainId);
      console.log('🔍 Connected Account:', accounts[0]);
      
      if (chainId === BULLETPROOF_CONFIG.metamask.chainId) {
        console.log('✅ Connected to correct network!');
        
        // Check if connected account is owner
        if (accounts[0] && accounts[0].toLowerCase() === BULLETPROOF_CONFIG.accounts.owner.toLowerCase()) {
          console.log('👑 Connected as contract owner - can add candidates!');
          // Add visual indicator
          showStatus('✅ Connected as CONTRACT OWNER - Ready to add candidates!', 'success');
        } else {
          console.log('⚠️ Not connected as owner - switch to owner account to add candidates');
          showStatus('⚠️ WRONG ACCOUNT! Switch to Owner Account: ' + BULLETPROOF_CONFIG.accounts.owner, 'warning');
        }
        
        return true;
      } else {
        console.log('❌ Wrong network - attempting to switch...');
        return await switchToEtherVoxNetwork();
      }
    } catch (error) {
      console.error('❌ Connection verification failed:', error);
      return false;
    }
  }
  return false;
}

// Function to show status messages
function showStatus(message, type = 'info') {
  // Remove existing status if any
  const existingStatus = document.getElementById('bulletproof-status');
  if (existingStatus) {
    existingStatus.remove();
  }
  
  const statusDiv = document.createElement('div');
  statusDiv.id = 'bulletproof-status';
  statusDiv.innerHTML = message;
  
  const colors = {
    success: '#10b981',
    warning: '#f59e0b', 
    error: '#ef4444',
    info: '#3b82f6'
  };
  
  statusDiv.style.cssText = `
    position: fixed;
    top: 60px;
    right: 10px;
    z-index: 9999;
    background: ${colors[type]};
    color: white;
    border: none;
    padding: 15px 20px;
    border-radius: 8px;
    font-weight: bold;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  document.body.appendChild(statusDiv);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (statusDiv.parentNode) {
      statusDiv.remove();
    }
  }, 10000);
}

// Auto-setup function
async function bulletproofSetup() {
  console.log('🚀 Starting EtherVox Bulletproof Setup...');
  
  if (!window.ethereum) {
    alert('❌ MetaMask not detected! Please install MetaMask.');
    return false;
  }
  
  // Step 1: Request account access
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('✅ Account access granted');
  } catch (error) {
    console.error('❌ Account access denied:', error);
    return false;
  }
  
  // Step 2: Add/Switch network
  const networkSetup = await switchToEtherVoxNetwork();
  if (!networkSetup) {
    console.error('❌ Network setup failed');
    return false;
  }
  
  // Step 3: Verify connection
  const verified = await verifyConnection();
  if (verified) {
    console.log('🎉 Bulletproof setup complete!');
    console.log('📋 Setup Summary:');
    console.log('   - Network: EtherVox Local Network');
    console.log('   - RPC URL:', BULLETPROOF_CONFIG.metamask.rpcUrl);
    console.log('   - Chain ID:', BULLETPROOF_CONFIG.metamask.chainId);
    console.log('   - Owner Account:', BULLETPROOF_CONFIG.accounts.owner);
    return true;
  }
  
  return false;
}

// Export for use in main app
window.BULLETPROOF_CONFIG = BULLETPROOF_CONFIG;
window.bulletproofSetup = bulletproofSetup;
window.verifyConnection = verifyConnection;

// Auto-run setup when script loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 EtherVox Bulletproof Configuration Loaded');
  
  // Add setup button to page if it doesn't exist
  if (!document.getElementById('bulletproof-setup-btn')) {
    const setupBtn = document.createElement('button');
    setupBtn.id = 'bulletproof-setup-btn';
    setupBtn.innerHTML = '🛡️ Bulletproof Setup';
    setupBtn.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: #ff6b35;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
    `;
    setupBtn.onclick = bulletproofSetup;
    document.body.appendChild(setupBtn);
  }
});

console.log('🔧 EtherVox Bulletproof Configuration Script Loaded Successfully!');
