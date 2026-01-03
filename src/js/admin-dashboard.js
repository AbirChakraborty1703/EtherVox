/**
 * EtherVox Admin Dashboard JavaScript
 * 
 * @file admin-dashboard.js
 * @description Handles admin dashboard functionality and navigation
 * @version 1.0.0
 */

// ===============================================
// INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
  checkAuthentication();
  loadDashboardStats();
  initializeAnimations();
});

// ===============================================
// AUTHENTICATION CHECK
// ===============================================
function checkAuthentication() {
  // First, check if token is in URL (passed from login)
  const urlParams = new URLSearchParams(window.location.search);
  const authHeader = urlParams.get('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const tokenFromUrl = authHeader.replace('Bearer ', '');
    // Store in localStorage for future use
    localStorage.setItem('jwtTokenAdmin', tokenFromUrl);
    console.log('[AUTH] Token stored from URL to localStorage');
  }
  
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  if (!adminToken) {
    console.warn('No admin token found. Redirecting to login...');
    window.location.replace('/');
    return;
  }
  
  // Decode and validate token (basic check)
  try {
    const tokenParts = adminToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    console.log('[AUTH] Admin authenticated successfully');
    console.log('[AUTH] Token (first 30 chars):', adminToken.substring(0, 30) + '...');
    updateAdminInfo();
    
  } catch (error) {
    console.error('Token validation failed:', error);
    localStorage.removeItem('jwtTokenAdmin');
    window.location.replace('/');
  }
}
// ===============================================
// UPDATE ADMIN INFO
// ===============================================
function updateAdminInfo() {
  const adminNameElement = document.getElementById('adminName');
  if (adminNameElement) {
    // You can extract admin name from token or set it dynamically
    adminNameElement.textContent = 'Administrator';
  }
}

// ===============================================
// NAVIGATION FUNCTIONS
// ===============================================
function navigateToAddCandidate() {
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  console.log('[NAV] Navigating to AddCandidate');
  console.log('[NAV] Token exists:', !!adminToken);
  console.log('[NAV] Token (first 50 chars):', adminToken ? adminToken.substring(0, 50) + '...' : 'null');
  
  if (!adminToken) {
    alert('⚠️ Session expired. Please login again.');
    window.location.replace('/');
    return;
  }
  
  // Add smooth transition animation
  const card = event.target.closest('.dashboard-card');
  if (card) {
    card.style.transform = 'scale(0.95)';
  }
  
  const targetUrl = `/AddCandidate.html?Authorization=Bearer ${adminToken}`;
  console.log('[NAV] Target URL:', targetUrl.substring(0, 100) + '...');
  
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 200);
}

function navigateToSetVote() {
  const adminToken = localStorage.getItem('jwtTokenAdmin');
  
  if (!adminToken) {
    alert('⚠️ Session expired. Please login again.');
    window.location.replace('/');
    return;
  }
  
  // Add smooth transition animation
  const card = event.target.closest('.dashboard-card');
  card.style.transform = 'scale(0.95)';
  
  setTimeout(() => {
    window.location.href = `/SetVote.html?Authorization=Bearer ${adminToken}`;
  }, 200);
}

// ===============================================
// LOGOUT FUNCTION
// ===============================================
function logout() {
  if (confirm('🔐 Are you sure you want to logout?\n\nThis will end your current admin session.')) {
    try {
      // Clear all stored tokens
      localStorage.removeItem('jwtTokenAdmin');
      localStorage.removeItem('jwtTokenVoter');
      sessionStorage.clear();
      
      // Update logout button
      const logoutBtn = document.getElementById('logoutButton');
      if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;
      }
      
      // Show logout message with animation
      showNotification('👋 Logging out...', 'info');
      
      // Redirect to login page
      setTimeout(() => {
        window.location.replace('/');
      }, 1000);
      
    } catch (error) {
      console.error('Logout error:', error);
      window.location.replace('/');
    }
  }
}

// ===============================================
// LOAD DASHBOARD STATISTICS
// ===============================================
async function loadDashboardStats() {
  try {
    // Load total candidates from MongoDB
    await loadCandidatesCount();
    
    // Load voting status
    await loadVotingStatus();
    
    // Load total votes (if available)
    await loadTotalVotes();
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showNotification('⚠️ Could not load some statistics', 'warning');
  }
}

// ===============================================
// LOAD CANDIDATES COUNT
// ===============================================
async function loadCandidatesCount() {
  try {
    const response = await fetch('http://127.0.0.1:8001/candidates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwtTokenAdmin')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const candidatesCount = data.count || 0;
      
      const totalCandidatesElement = document.getElementById('totalCandidates');
      if (totalCandidatesElement) {
        animateCounter(totalCandidatesElement, 0, candidatesCount, 1000);
      }
    } else {
      console.warn('Could not load candidates count');
      document.getElementById('totalCandidates').textContent = '-';
    }
  } catch (error) {
    console.error('Error loading candidates count:', error);
    document.getElementById('totalCandidates').textContent = '-';
  }
}

// ===============================================
// LOAD VOTING STATUS
// ===============================================
async function loadVotingStatus() {
  try {
    // This would connect to your smart contract to check voting status
    // For now, we'll set a placeholder
    const votingStatusElement = document.getElementById('votingStatus');
    if (votingStatusElement) {
      votingStatusElement.textContent = 'Not Set';
      votingStatusElement.style.color = '#ffd700';
    }
  } catch (error) {
    console.error('Error loading voting status:', error);
    document.getElementById('votingStatus').textContent = 'Unknown';
  }
}

// ===============================================
// LOAD TOTAL VOTES
// ===============================================
async function loadTotalVotes() {
  try {
    // This would connect to your smart contract to get total votes
    // For now, we'll set to 0
    const totalVotesElement = document.getElementById('totalVotes');
    if (totalVotesElement) {
      totalVotesElement.textContent = '0';
    }
  } catch (error) {
    console.error('Error loading total votes:', error);
    document.getElementById('totalVotes').textContent = '-';
  }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

// Animate counter from start to end
function animateCounter(element, start, end, duration) {
  const startTime = Date.now();
  const range = end - start;
  
  function updateCounter() {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const currentValue = Math.floor(start + (range * progress));
    element.textContent = currentValue;
    
    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    }
  }
  
  requestAnimationFrame(updateCounter);
}

// Show notification message
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// Initialize animations
function initializeAnimations() {
  // Add entrance animations to cards
  const cards = document.querySelectorAll('.dashboard-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    
    setTimeout(() => {
      card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 200);
  });
}

// ===============================================
// CSS ANIMATIONS (Add to document)
// ===============================================
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ===============================================
// ERROR HANDLING
// ===============================================
window.addEventListener('error', function(event) {
  console.error('Dashboard error:', event.error);
});

// Prevent unauthorized access
window.addEventListener('beforeunload', function() {
  // Could add cleanup logic here if needed
});
