// Global variables
let cy;
let searchActive = false;
let copiedCards = []; // Store copied cards for arrangement commands

// Annotation system variables
let annotationMode = 'select';
let annotationColor = '#ff6b6b';
let connectionStartNode = null;
let annotationToolbarVisible = false;

// Mouse position tracking
let lastMouseX = null;
let lastMouseY = null;
