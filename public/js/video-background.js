/**
 * EtherVox Background Handler
 * Manages background image effects and enhancements
 * 
 * @file video-background.js
 * @description Handles background image initialization and effects
 */

// ===============================================
// BACKGROUND INITIALIZATION
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
  initializeBackground();
});

/**
 * Initialize background with effects
 */
function initializeBackground() {
  const bgContainer = document.querySelector('.video-background');
  
  if (!bgContainer) {
    console.log('Background container not found');
    return;
  }
  
  console.log('EtherVox background initialized');
  
  // Add subtle animation class (optional - remove if not wanted)
  // bgContainer.classList.add('animated');
  
  // Add pulse glow effect (optional - remove if not wanted)
  // bgContainer.classList.add('pulse');
  
  // Preload the background image
  preloadBackgroundImage();
}

/**
 * Preload background image for smoother loading
 */
function preloadBackgroundImage() {
  const img = new Image();
  img.src = '/assets/eth5.jpeg';
  
  img.onload = function() {
    console.log('Background image loaded successfully');
    document.querySelector('.video-background')?.classList.add('loaded');
  };
  
  img.onerror = function() {
    console.log('Background image failed to load');
  };
}

// ===============================================
// OVERLAY STYLE FUNCTIONS
// ===============================================

/**
 * Change background overlay style
 * @param {string} style - 'default', 'dark', 'light', 'gradient-blue', 'minimal'
 */
function setOverlayStyle(style) {
  const overlay = document.querySelector('.video-overlay');
  if (!overlay) return;
  
  // Remove all style classes
  overlay.classList.remove('dark', 'light', 'gradient-blue', 'minimal');
  
  // Add new style class
  if (style && style !== 'default') {
    overlay.classList.add(style);
  }
}

/**
 * Toggle background animation
 * @param {boolean} enable - Enable or disable animation
 */
function toggleBackgroundAnimation(enable) {
  const bgContainer = document.querySelector('.video-background');
  if (!bgContainer) return;
  
  if (enable) {
    bgContainer.classList.add('animated');
  } else {
    bgContainer.classList.remove('animated');
  }
}

/**
 * Toggle pulse glow effect
 * @param {boolean} enable - Enable or disable pulse effect
 */
function togglePulseEffect(enable) {
  const bgContainer = document.querySelector('.video-background');
  if (!bgContainer) return;
  
  if (enable) {
    bgContainer.classList.add('pulse');
  } else {
    bgContainer.classList.remove('pulse');
  }
}

// ===============================================
// PERFORMANCE OPTIMIZATION
// ===============================================

/**
 * Pause animations when tab is not visible to save resources
 */
document.addEventListener('visibilitychange', function() {
  const bgContainer = document.querySelector('.video-background');
  if (!bgContainer) return;
  
  if (document.hidden) {
    bgContainer.style.animationPlayState = 'paused';
  } else {
    bgContainer.style.animationPlayState = 'running';
  }
});

/**
 * Reduce effects on slow connections
 */
if ('connection' in navigator) {
  const connection = navigator.connection;
  
  if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
    const bgContainer = document.querySelector('.video-background');
    if (bgContainer) {
      bgContainer.classList.remove('animated', 'pulse');
      console.log('Slow connection detected, disabling background effects');
    }
  }
}
