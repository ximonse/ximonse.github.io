// ============================================================
// SPATIAL NOTES - GLOBAL CONFIGURATION & VARIABLES
// ============================================================

// Core Cytoscape instance
let cy;

// Search state
let searchActive = false;

// Card operations
let copiedCards = []; // Store copied cards for arrangement commands

// Annotation system variables
let annotationMode = 'select';
let annotationColor = '#ff6b6b';
let connectionStartNode = null;
let annotationToolbarVisible = false;
let resizeMode = false;

// Mouse position tracking
let lastMousePosition = { x: null, y: null };

// Undo/Redo system
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STEPS = 20;

// Text measurement system
let textRuler = null;
const heightCache = new Map();

// Initial welcome cards data
const initialCards = [
    {
        id: 'welcome-1',
        label: `📌 Välkommen till Spatial Notes!

• Högerklicka på canvasen för att skapa kort
• Dubbelklicka på kort för att redigera
• Markera flera kort och tryck V, H, eller G+V för arrangement
• Tryck Ctrl+S för att spara`,
        x: 300,
        y: 150
    },
    {
        id: 'welcome-2',
        label: `🎨 Färgkodning

• Tryck 1-8 för att färga markerade kort
• Tryck 0 för att ta bort färg
• Högerklick → Färg för fler alternativ`,
        x: 700,
        y: 150
    }
];

// UI State
let currentClickHandler = null;
let sortMode = null; // null, 'textLength-asc', 'textLength-desc', 'alphabetic-asc', 'alphabetic-desc', 'color', 'date-asc', 'date-desc', 'temporal-asc', 'temporal-desc', 'tagCount'
let showMetadata = false;
let isSimplifiedToolbar = localStorage.getItem('spatial-notes-simplified-toolbar') === 'true';

// Autosave state
let hasChanges = false;
let autosaveInterval = null;

// AI Chat system (ChatGPT integration)
let aiChatHistory = [];
const AI_STORAGE_KEY = 'spatial-notes-openai-key';
const aiColorCycle = ['card-color-1', 'card-color-2', 'card-color-3', 'card-color-4', 'card-color-5', 'card-color-6', 'card-color-7', 'card-color-8'];
const aiAssistantState = {
    currentColor: 0,
    sessionColors: new Map()
};

// Google Drive integration constants
const GOOGLE_CLIENT_ID = '971005822021-8ebrpd92n1upsedg7s5fn80mnmvhou5d.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU01T1-DQ-dY4'; // Public API key for Picker
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
let isGoogleApiLoaded = false;
