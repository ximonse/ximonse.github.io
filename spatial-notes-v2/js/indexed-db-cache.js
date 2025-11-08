// ============================================================
// SPATIAL NOTES - INDEXEDDB CACHE
// High-performance local cache for projects
// ============================================================

const DB_NAME = 'SpatialNotesCache';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let db = null;

// Initialize IndexedDB
async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('❌ IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('✅ IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'projectName' });

        // Create indexes for querying
        objectStore.createIndex('lastModified', 'lastModified', { unique: false });
        objectStore.createIndex('lastSynced', 'lastSynced', { unique: false });

        console.log('📦 Created IndexedDB object store');
      }
    };
  });
}

// Save project to IndexedDB cache
async function saveProjectToCache(projectName, projectData) {
  if (!db) await initIndexedDB();

  const perfStart = performance.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const cacheEntry = {
      projectName: projectName,
      data: projectData,
      lastModified: Date.now(),
      lastSynced: Date.now(),
      size: JSON.stringify(projectData).length,
      cardCount: projectData.cards ? projectData.cards.length : 0,
      edgeCount: projectData.edges ? projectData.edges.length : 0
    };

    const request = objectStore.put(cacheEntry);

    request.onsuccess = () => {
      const perfTime = performance.now() - perfStart;
      console.log(`💾 Cached "${projectName}" to IndexedDB in ${perfTime.toFixed(2)}ms (${(cacheEntry.size / 1024 / 1024).toFixed(2)}MB)`);
      resolve(true);
    };

    request.onerror = () => {
      console.error('❌ Failed to cache project:', request.error);
      reject(request.error);
    };
  });
}

// Load project from IndexedDB cache
async function loadProjectFromCache(projectName) {
  if (!db) await initIndexedDB();

  const perfStart = performance.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(projectName);

    request.onsuccess = () => {
      const result = request.result;

      if (result) {
        const perfTime = performance.now() - perfStart;
        const ageMinutes = Math.round((Date.now() - result.lastSynced) / 60000);

        console.log(`⚡ Loaded "${projectName}" from cache in ${perfTime.toFixed(2)}ms (${ageMinutes}min old, ${result.cardCount} cards)`);
        resolve(result.data);
      } else {
        console.log(`📭 No cached data for "${projectName}"`);
        resolve(null);
      }
    };

    request.onerror = () => {
      console.error('❌ Failed to load from cache:', request.error);
      reject(request.error);
    };
  });
}

// Check if cache exists and how old it is
async function getCacheInfo(projectName) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(projectName);

    request.onsuccess = () => {
      const result = request.result;

      if (result) {
        const ageMs = Date.now() - result.lastSynced;
        resolve({
          exists: true,
          lastSynced: result.lastSynced,
          ageMs: ageMs,
          ageMinutes: Math.round(ageMs / 60000),
          size: result.size,
          cardCount: result.cardCount,
          edgeCount: result.edgeCount
        });
      } else {
        resolve({ exists: false });
      }
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Delete project from cache
async function deleteProjectFromCache(projectName) {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(projectName);

    request.onsuccess = () => {
      console.log(`🗑️ Deleted "${projectName}" from cache`);
      resolve(true);
    };

    request.onerror = () => {
      console.error('❌ Failed to delete from cache:', request.error);
      reject(request.error);
    };
  });
}

// List all cached projects
async function listCachedProjects() {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      const projects = request.result.map(entry => ({
        name: entry.projectName,
        lastSynced: entry.lastSynced,
        ageMinutes: Math.round((Date.now() - entry.lastSynced) / 60000),
        size: entry.size,
        cardCount: entry.cardCount,
        edgeCount: entry.edgeCount
      }));

      console.log(`📚 Found ${projects.length} cached projects`);
      resolve(projects);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Clear all cache (for debugging/reset)
async function clearAllCache() {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();

    request.onsuccess = () => {
      console.log('🧹 Cleared all cache');
      resolve(true);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Get total cache size and statistics
async function getCacheStats() {
  if (!db) await initIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      const projects = request.result;
      const totalSize = projects.reduce((sum, p) => sum + p.size, 0);
      const totalCards = projects.reduce((sum, p) => sum + p.cardCount, 0);
      const totalEdges = projects.reduce((sum, p) => sum + p.edgeCount, 0);

      const stats = {
        projectCount: projects.length,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        totalCards: totalCards,
        totalEdges: totalEdges,
        avgProjectSizeMB: projects.length > 0 ? (totalSize / projects.length / 1024 / 1024).toFixed(2) : 0
      };

      console.log(`📊 Cache stats: ${stats.projectCount} projects, ${stats.totalSizeMB}MB, ${totalCards} cards`);
      resolve(stats);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Initialize on load
initIndexedDB().catch(err => {
  console.error('Failed to initialize IndexedDB:', err);
  // Fallback to no caching if IndexedDB fails
});

// Expose functions globally
window.saveProjectToCache = saveProjectToCache;
window.loadProjectFromCache = loadProjectFromCache;
window.getCacheInfo = getCacheInfo;
window.deleteProjectFromCache = deleteProjectFromCache;
window.listCachedProjects = listCachedProjects;
window.clearAllCache = clearAllCache;
window.getCacheStats = getCacheStats;
