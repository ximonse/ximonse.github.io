/**
 * Spatial View v1.0
 * Main entry point
 */

import './styles.css';
import { initCanvas, addNewCard, exportCanvas, importImage } from './lib/canvas.js';
import { initStorage } from './lib/storage.js';

// App state
const state = {
  currentView: 'board', // 'board' | 'column'
  deviceMode: detectDeviceMode(),
  theme: localStorage.getItem('theme') || 'light',
  cards: [],
};

/**
 * Detect device mode for optimizations
 */
function detectDeviceMode() {
  const ua = navigator.userAgent.toLowerCase();
  
  // E-ink detection (Viwoood AiPaper Mini or similar)
  if (ua.includes('eink') || ua.includes('viwoood')) {
    return 'eink';
  }
  
  // Mobile detection
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    return 'mobile';
  }
  
  // Tablet detection
  if (/tablet|ipad/.test(ua) || (window.innerWidth <= 1024 && 'ontouchstart' in window)) {
    return 'tablet';
  }
  
  return 'desktop';
}

/**
 * Apply device-specific optimizations
 */
function applyDeviceOptimizations() {
  const body = document.body;
  body.classList.add(`device-${state.deviceMode}`);
  
  if (state.deviceMode === 'eink') {
    // E-ink mode: disable animations, use column view
    state.theme = 'eink';
    state.currentView = 'column';
    console.log('E-ink mode activated');
  }
  
  if (state.deviceMode === 'mobile') {
    // Mobile mode: start with column view
    state.currentView = 'column';
    console.log('Mobile mode activated');
  }
}

/**
 * Initialize app
 */
async function init() {
  console.log('Initializing Spatial View...');
  console.log('Device mode:', state.deviceMode);
  
  // Apply device optimizations
  applyDeviceOptimizations();
  
  // Initialize storage
  await initStorage();
  
  // Initialize canvas (Konva)
  if (state.currentView === 'board') {
    await initCanvas();
  }
  
  // Setup event listeners
  setupEventListeners();
  
  console.log('Spatial View ready!');
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // View toggle
  const viewToggle = document.getElementById('btn-view-toggle');
  viewToggle?.addEventListener('click', toggleView);
  
  // Import button
  const importBtn = document.getElementById('btn-import');
  importBtn?.addEventListener('click', handleImport);
  
  // Search
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', debounce(handleSearch, 300));
}

/**
 * Toggle between board and column view
 */
function toggleView() {
  state.currentView = state.currentView === 'board' ? 'column' : 'board';
  
  const boardView = document.getElementById('board-view');
  const columnView = document.getElementById('column-view');
  const toggleBtn = document.getElementById('btn-view-toggle');
  
  if (state.currentView === 'board') {
    boardView?.classList.add('active');
    columnView?.classList.remove('active');
    toggleBtn.textContent = 'Kolumn';
  } else {
    boardView?.classList.remove('active');
    columnView?.classList.add('active');
    toggleBtn.textContent = 'Board';
  }
}

/**
 * Handle import action
 */
async function handleImport() {
  if (state.currentView !== 'board') {
    alert('Byt till Board-vy för att skapa kort');
    return;
  }

  // Show menu: text or image
  const choice = prompt('Välj kort-typ:\n1 = Text\n2 = Bild\n3 = Kamera (mobile)', '2');

  if (!choice) return;

  if (choice === '1') {
    // Text card
    await addNewCard();
  } else if (choice === '2' || choice === '3') {
    // Image card
    try {
      const quality = prompt('Välj kvalitet:\n1 = Låg (700px)\n2 = Normal (1200px)\n3 = Hög (2000px)', '2');
      const qualityMap = { '1': 'low', '2': 'normal', '3': 'high' };
      const selectedQuality = qualityMap[quality] || 'normal';

      await importImage(selectedQuality);
    } catch (error) {
      alert('Misslyckades att importera bild: ' + error.message);
    }
  }
}

/**
 * Handle search input
 */
function handleSearch(event) {
  const query = event.target.value;
  console.log('Search:', query);
  // TODO: Implement search
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export state for debugging
if (import.meta.env.DEV) {
  window.__SPATIAL_VIEW__ = state;
}
