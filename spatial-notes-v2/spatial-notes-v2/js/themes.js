function getCurrentTheme() {
if (document.body.classList.contains('dark-theme')) return 'dark';
if (document.body.classList.contains('sepia-theme')) return 'sepia';
if (document.body.classList.contains('eink-theme')) return 'eink';
return 'light';
}
function toggleDarkTheme() {
const body = document.body;
const themeBtn = document.getElementById('themeBtn');

let currentTheme = 'light';
if (body.classList.contains('dark-theme')) {
    currentTheme = 'dark';
} else if (body.classList.contains('sepia-theme')) {
    currentTheme = 'sepia';
} else if (body.classList.contains('eink-theme')) {
    currentTheme = 'eink';
}

// Cycle through themes: light -> dark -> sepia -> eink -> light
if (currentTheme === 'light') {
    body.classList.remove('eink-theme', 'sepia-theme');
    body.classList.add('dark-theme');
    themeBtn.innerHTML = '📜 Sepia';
    localStorage.setItem('theme', 'dark');
    applyCardTheme('dark');
} else if (currentTheme === 'dark') {
    body.classList.remove('dark-theme', 'eink-theme');
    body.classList.add('sepia-theme');
    themeBtn.innerHTML = '📄 E-ink';
    localStorage.setItem('theme', 'sepia');
    applyCardTheme('sepia');
} else if (currentTheme === 'sepia') {
    body.classList.remove('dark-theme', 'sepia-theme');
    body.classList.add('eink-theme');
    themeBtn.innerHTML = '☀️ Ljust';
    localStorage.setItem('theme', 'eink');
    applyCardTheme('eink');
} else {
    body.classList.remove('dark-theme', 'sepia-theme', 'eink-theme');
    themeBtn.innerHTML = '🌙 Mörkt';
    localStorage.setItem('theme', 'light');
    applyCardTheme('light');
}
}

// Get card color value based on theme
function getCardColorValue(colorId, theme) {
const colors = {
    light: {
        1: '#d4f2d4', // Grön
        2: '#ffe4b3', // Orange
        3: '#ffc1cc', // Röd
        4: '#fff7b3', // Gul
        5: '#f3e5f5', // Lila
        6: '#c7e7ff', // Blå
        7: '#e0e0e0', // Grå
        8: '#ffffff'  // Vit
    },
    dark: {
        1: '#3d5a3d', // Mörk Grön
        2: '#5a4d3a', // Mörk Orange
        3: '#5a3c3a', // Mörk Röd
        4: '#5a5a3a', // Mörk Gul
        5: '#4a3d5a', // Mörk Lila
        6: '#2e4a6f', // Mörk Blå
        7: '#555555', // Mörk Grå
        8: '#8a8a8a'  // Ljusgrå (vit blir för ljus i dark theme)
    },
    sepia: {
        1: '#ded6c7', // Sepia Grön
        2: '#e6d6c2', // Sepia Orange
        3: '#ead6c7', // Sepia Röd
        4: '#ebe2d6', // Sepia Gul
        5: '#e2d6c7', // Sepia Lila
        6: '#d6c7b3', // Sepia Blå
        7: '#c0b8a8', // Sepia Grå
        8: '#f5f2e8'  // Sepia Vit
    }
};

// Extract number from colorId (card-color-1 -> 1)
const colorNumber = colorId.toString().replace('card-color-', '');

return colors[theme] && colors[theme][colorNumber] ? colors[theme][colorNumber] : null;
}

function applyCardTheme(theme) {
if (cy) {
    if (theme === 'dark') {
        // Dark theme styling
        cy.style()
            .selector('node').style({
                'background-color': function(node) {
                    const cardColor = node.data('cardColor');
                    if (cardColor) {
                        // Color priority: if card has color, use it regardless of theme
                        return getCardColorValue(cardColor, 'dark');
                    }
                    return '#2a2a2a';
                },
                'color': '#f0f0f0',
                'border-color': '#555'
            })
            .selector('node:selected').style({
                'border-color': '#66b3ff',  // Bright blue for visibility
                'border-width': 5,
                'box-shadow': '0 0 25px rgba(102, 179, 255, 0.8)'
            })
            .selector('node.search-match').style({
                'background-color': '#4a3c00',  // Dark yellow background
                'border-color': '#ffcc00',     // Bright yellow border
                'border-width': 3,
                'box-shadow': '0 0 15px rgba(255, 204, 0, 0.6)'
            })
            .selector('node.pinned').style({
                'border-color': '#4caf50',  // Bright green
                'border-width': 4,
                'box-shadow': '0 0 15px rgba(76, 175, 80, 0.6)'
            })
            .selector('node.temporal-marked').style({
                'border-width': function(node) {
                    return node.data('temporalBorderWidth') || 6;
                },
                'border-color': function(node) {
                    return node.data('temporalBorderColor') || '#ff4500';
                }
            })
            .update();
    } else if (theme === 'sepia') {
        // Sepia theme styling
        cy.style()
            .selector('node').style({
                'background-color': function(node) {
                    const cardColor = node.data('cardColor');
                    if (cardColor) {
                        return getCardColorValue(cardColor, 'sepia');
                    }
                    return '#f0e6d2';
                },
                'color': '#5d4e37',
                'border-color': '#c8a882'
            })
            .selector('node:selected').style({
                'border-color': '#8b7556',  // Dark brown for sepia
                'border-width': 4,
                'box-shadow': '0 0 20px rgba(139, 117, 86, 0.7)'
            })
            .selector('node.search-match').style({
                'background-color': '#f4e8d0',  // Light sepia highlight
                'border-color': '#d2691e',     // Chocolate border
                'border-width': 2,
                'box-shadow': '0 0 10px rgba(210, 105, 30, 0.5)'
            })
            .selector('node.pinned').style({
                'border-color': '#8fbc8f',  // Dark sea green for sepia
                'border-width': 4,
                'box-shadow': '0 0 15px rgba(143, 188, 143, 0.6)'
            })
            .selector('node.temporal-marked').style({
                'border-width': function(node) {
                    return node.data('temporalBorderWidth') || 6;
                },
                'border-color': function(node) {
                    return node.data('temporalBorderColor') || '#ff4500';
                }
            })
            .update();
    } else if (theme === 'eink') {
        // E-ink theme styling - no shadows, sharp contrast
        cy.style()
            .selector('node').style({
                'background-color': function(node) {
                    const cardColor = node.data('cardColor');
                    if (cardColor) {
                        // Keep card colors - user said it's OK
                        return getCardColorValue(cardColor, 'light');
                    }
                    return '#ffffff';
                },
                'color': '#000000',
                'border-color': '#000000',
                'border-width': 2
            })
            .selector('node:selected').style({
                'border-color': '#000000',
                'border-width': 4,
                'box-shadow': 'none'  // No shadows for e-ink
            })
            .selector('node.search-match').style({
                'background-color': '#f0f0f0',
                'border-color': '#000000',
                'border-width': 3,
                'box-shadow': 'none'  // No shadows for e-ink
            })
            .selector('node.pinned').style({
                'border-color': '#000000',
                'border-width': 4,
                'box-shadow': 'none'  // No shadows for e-ink
            })
            .selector('node.temporal-marked').style({
                'border-width': function(node) {
                    return node.data('temporalBorderWidth') || 4;
                },
                'border-color': '#000000'  // All black for e-ink
            })
            .update();
    } else {
        // Light theme styling (default)
        cy.style()
            .selector('node').style({
                'background-color': function(node) {
                    const cardColor = node.data('cardColor');
                    if (cardColor) {
                        return getCardColorValue(cardColor, 'light');
                    }
                    return '#ffffff';
                },
                'color': '#333333',
                'border-color': '#ddd'
            })
            .selector('node:selected').style({
                'border-color': '#1565c0',
                'border-width': 4,
                'box-shadow': '0 0 20px rgba(21, 101, 192, 0.7)'
            })
            .selector('node.search-match').style({
                'background-color': '#fff9c4',
                'border-color': '#f57f17',
                'border-width': 2,
                'box-shadow': '0 0 10px rgba(245, 127, 23, 0.4)'
            })
            .selector('node.pinned').style({
                'border-color': '#2e7d32',
                'border-width': 4,
                'box-shadow': '0 0 15px rgba(46, 125, 50, 0.6)'
            })
            .selector('node.temporal-marked').style({
                'border-width': function(node) {
                    return node.data('temporalBorderWidth') || 6;
                },
                'border-color': function(node) {
                    return node.data('temporalBorderColor') || '#ff4500';
                }
            })
            .update();
    }
}
}

// Load saved theme on page load
function loadSavedTheme() {
const savedTheme = localStorage.getItem('theme') || localStorage.getItem('darkTheme'); // Backward compatibility
const themeBtn = document.getElementById('themeBtn');

// Handle backward compatibility
let theme = 'light';
if (savedTheme === 'dark' || savedTheme === 'true') {
    theme = 'dark';
} else if (savedTheme === 'sepia') {
    theme = 'sepia';
} else if (savedTheme === 'eink') {
    theme = 'eink';
}

if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeBtn) {
        themeBtn.innerHTML = '📜 Sepia';
    }
    setTimeout(() => applyCardTheme('dark'), 100);
} else if (theme === 'sepia') {
    document.body.classList.add('sepia-theme');
    if (themeBtn) {
        themeBtn.innerHTML = '📄 E-ink';
    }
    setTimeout(() => applyCardTheme('sepia'), 100);
} else if (theme === 'eink') {
    document.body.classList.add('eink-theme');
    if (themeBtn) {
        themeBtn.innerHTML = '☀️ Ljust';
    }
    setTimeout(() => applyCardTheme('eink'), 100);
} else {
    if (themeBtn) {
        themeBtn.innerHTML = '🌙 Mörkt';
    }
    setTimeout(() => applyCardTheme('light'), 100);
}
}