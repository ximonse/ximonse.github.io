/**
 * Spatial View v1.0
 * Main entry point
 */

import './styles.css';
import { initCanvas, addNewCard, exportCanvas, importImage, searchCards } from './lib/canvas.js';
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

  // Initialize canvas (Konva) - always initialize for switching
  await initCanvas();

  // Setup event listeners
  setupEventListeners();

  // If starting in column view, render it
  if (state.currentView === 'column') {
    await renderColumnView();
  }

  console.log('Spatial View ready!');
}

/**
 * Setup global event listeners
 */
function setupEventListeners() {
  // Apply saved theme from localStorage
  const body = document.body;
  const savedTheme = localStorage.getItem('theme') || state.theme;
  if (savedTheme && savedTheme !== 'light') {
    body.classList.remove('dark-theme', 'eink-theme', 'sepia-theme');
    if (savedTheme === 'dark') {
      body.classList.add('dark-theme');
    } else if (savedTheme === 'eink') {
      body.classList.add('eink-theme');
    }
    state.theme = savedTheme;
    console.log('Applied saved theme:', savedTheme);
  }

  // Update theme button text
  const themeBtn = document.getElementById('btn-theme-toggle');
  const themeNames = {
    'light': '☀️ Ljust',
    'dark': '🌙 Mörkt',
    'eink': '📄 E-ink'
  };
  if (themeBtn) {
    themeBtn.textContent = themeNames[savedTheme] || '🎨 Tema';
  }

  // View toggle
  const viewToggle = document.getElementById('btn-view-toggle');
  viewToggle?.addEventListener('click', toggleView);

  // Theme toggle
  themeBtn?.addEventListener('click', toggleTheme);

  // Import button
  const importBtn = document.getElementById('btn-import');
  importBtn?.addEventListener('click', handleImport);

  // Search
  const searchInput = document.getElementById('search-input');
  searchInput?.addEventListener('input', debounce(handleSearch, 300));

  // Escape to clear search (local - when focused)
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      handleSearch({ target: searchInput }); // Clear search results
      searchInput.blur(); // Unfocus the search input
    }
  });

  // Global Escape handler for search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // If search has content, clear it
      if (searchInput && searchInput.value) {
        searchInput.value = '';
        handleSearch({ target: searchInput }); // Clear search results
        searchInput.blur(); // Unfocus the search input
      }
    }
  });

  // Listen for toggle view event from canvas
  window.addEventListener('toggleView', toggleView);

  // Listen for toggle theme event from canvas
  window.addEventListener('toggleTheme', toggleTheme);
}

/**
 * Toggle between board and column view
 */
async function toggleView() {
  state.currentView = state.currentView === 'board' ? 'column' : 'board';

  const boardView = document.getElementById('board-view');
  const columnView = document.getElementById('column-view');
  const toggleBtn = document.getElementById('btn-view-toggle');

  if (state.currentView === 'board') {
    boardView?.classList.add('active');
    columnView?.classList.remove('active');
    toggleBtn.textContent = '🔄 Vy';
  } else {
    boardView?.classList.remove('active');
    columnView?.classList.add('active');
    toggleBtn.textContent = '🔄 Vy';
    // Load cards in column view
    await renderColumnView();
  }
}

/**
 * Render cards in column view
 */
async function renderColumnView() {
  const cardList = document.getElementById('card-list');
  if (!cardList) return;

  // Import storage to get cards
  const { getAllCards } = await import('./lib/storage.js');
  const cards = await getAllCards();

  // Clear existing content
  cardList.innerHTML = '';

  if (cards.length === 0) {
    cardList.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;">Inga kort ännu. Klicka på "+ Lägg till" för att skapa ett kort.</div>';
    return;
  }

  // Sort cards by last modified (newest first)
  const sortedCards = [...cards].sort((a, b) => {
    const timeA = a.lastModified || 0;
    const timeB = b.lastModified || 0;
    return timeB - timeA;
  });

  // Render each card
  sortedCards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.className = 'column-card';
    cardElement.style.cssText = `
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s;
    `;

    if (card.image) {
      // Image card
      const img = document.createElement('img');
      // Handle both direct base64 string and object format
      const imageSrc = typeof card.image === 'string' ? card.image : card.image.base64;
      img.src = imageSrc;
      img.style.cssText = `
        width: 100%;
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin-bottom: 12px;
        display: block;
      `;

      // Error handling for images
      img.onerror = () => {
        console.error('Failed to load image for card:', card.id);
        img.style.display = 'none';
        const errorText = document.createElement('div');
        errorText.textContent = '⚠️ Bild kunde inte laddas';
        errorText.style.cssText = `
          padding: 20px;
          background: #fff3cd;
          border-radius: 4px;
          color: #856404;
          text-align: center;
          margin-bottom: 12px;
        `;
        cardElement.insertBefore(errorText, cardElement.firstChild);
      };

      cardElement.appendChild(img);

      if (card.text || card.backText) {
        const text = document.createElement('div');
        text.textContent = card.backText || card.text || '';
        text.style.cssText = `
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          white-space: pre-wrap;
        `;
        cardElement.appendChild(text);
      }
    } else {
      // Text card
      const text = document.createElement('div');
      text.textContent = card.text || 'Tomt kort';
      text.style.cssText = `
        font-size: 16px;
        color: #1a1a1a;
        line-height: 1.6;
        white-space: pre-wrap;
      `;
      cardElement.appendChild(text);
    }

    // Hover effect
    cardElement.addEventListener('mouseenter', () => {
      cardElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      cardElement.style.transform = 'translateY(-2px)';
    });

    cardElement.addEventListener('mouseleave', () => {
      cardElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
      cardElement.style.transform = 'translateY(0)';
    });

    // Click to edit in column view
    cardElement.addEventListener('click', () => {
      showColumnEditDialog(card, cardElement);
    });

    cardList.appendChild(cardElement);
  });
}

/**
 * Show edit dialog for card in column view
 */
async function showColumnEditDialog(card, cardElement) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  `;

  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  `;

  // Title
  const title = document.createElement('h2');
  title.textContent = card.image ? 'Redigera bildkort' : 'Redigera textkort';
  title.style.cssText = `
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #1a1a1a;
  `;
  dialog.appendChild(title);

  // If image card, show image
  if (card.image) {
    const img = document.createElement('img');
    // Handle both direct base64 string and object format
    const imageSrc = typeof card.image === 'string' ? card.image : card.image.base64;
    img.src = imageSrc;
    img.style.cssText = `
      width: 100%;
      border-radius: 8px;
      margin-bottom: 16px;
    `;
    dialog.appendChild(img);
  }

  // Text area
  const textarea = document.createElement('textarea');
  const textToEdit = card.image ? (card.backText || '') : (card.text || '');
  textarea.value = textToEdit;
  textarea.style.cssText = `
    width: 100%;
    min-height: 200px;
    padding: 12px;
    font-size: 16px;
    font-family: sans-serif;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    resize: vertical;
    margin-bottom: 16px;
  `;
  dialog.appendChild(textarea);

  // Buttons container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `;

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️ Ta bort';
  deleteBtn.style.cssText = `
    padding: 10px 20px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  deleteBtn.addEventListener('mouseenter', () => {
    deleteBtn.style.background = '#c82333';
  });
  deleteBtn.addEventListener('mouseleave', () => {
    deleteBtn.style.background = '#dc3545';
  });
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Är du säker på att du vill ta bort detta kort?')) {
      const { deleteCard } = await import('./lib/storage.js');
      await deleteCard(card.id);
      overlay.remove();
      await renderColumnView(); // Refresh the view
    }
  });

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Avbryt';
  cancelBtn.style.cssText = `
    padding: 10px 20px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#5a6268';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#6c757d';
  });
  cancelBtn.addEventListener('click', () => {
    overlay.remove();
  });

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Spara';
  saveBtn.style.cssText = `
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  `;
  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.background = '#218838';
  });
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.background = '#28a745';
  });
  saveBtn.addEventListener('click', async () => {
    const newText = textarea.value;
    const { updateCard } = await import('./lib/storage.js');

    if (card.image) {
      await updateCard(card.id, { backText: newText });
    } else {
      await updateCard(card.id, { text: newText });
    }

    overlay.remove();
    await renderColumnView(); // Refresh the view
  });

  buttonContainer.appendChild(deleteBtn);
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(saveBtn);
  dialog.appendChild(buttonContainer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus textarea
  textarea.focus();
  textarea.select();

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Close on ESC
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Toggle theme
 */
function toggleTheme() {
  const body = document.body;

  // Get current theme from class
  let currentTheme = 'light';
  if (body.classList.contains('dark-theme')) currentTheme = 'dark';
  else if (body.classList.contains('eink-theme')) currentTheme = 'eink';

  const themes = ['light', 'dark', 'eink'];
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  const nextTheme = themes[nextIndex];

  // Remove all theme classes
  body.classList.remove('dark-theme', 'eink-theme', 'sepia-theme');

  // Add new theme class (except for light which is default)
  if (nextTheme === 'dark') {
    body.classList.add('dark-theme');
  } else if (nextTheme === 'eink') {
    body.classList.add('eink-theme');
  }

  // Also set data attribute for consistency
  body.setAttribute('data-theme', nextTheme);
  localStorage.setItem('theme', nextTheme);
  state.theme = nextTheme;

  // Update button text
  const themeBtn = document.getElementById('btn-theme-toggle');
  const themeNames = {
    'light': '☀️ Ljust',
    'dark': '🌙 Mörkt',
    'eink': '📄 E-ink'
  };
  if (themeBtn) {
    themeBtn.textContent = themeNames[nextTheme] || '🎨 Tema';
  }

  console.log(`Theme changed to: ${nextTheme}`);
}

/**
 * Handle import action
 */
async function handleImport() {
  if (state.currentView !== 'board') {
    alert('Byt till Board-vy för att lägga till bilder');
    return;
  }

  // Open file picker directly (quality dialog shows after)
  try {
    await importImage();
  } catch (error) {
    console.error('Import failed:', error);
    alert('Misslyckades att importera bild: ' + error.message);
  }
}

/**
 * Handle search input
 */
async function handleSearch(event) {
  const query = event.target.value;
  console.log('[main.js] handleSearch called with:', query);
  console.log('[main.js] currentView:', state.currentView);

  if (state.currentView === 'board') {
    await searchCards(query);
  } else {
    console.log('[main.js] Search only works in board view');
  }
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
