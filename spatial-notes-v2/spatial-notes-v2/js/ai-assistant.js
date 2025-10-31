function getCurrentTheme() {
    if (document.body.classList.contains('dark-theme')) return 'dark';
    if (document.body.classList.contains('sepia-theme')) return 'sepia';
    if (document.body.classList.contains('eink-theme')) return 'eink';
    return 'light';
}

// Multi-card paste dialog
function showMultiCardPasteDialog() {
    // Remove any existing dialog
    const existingDialog = document.querySelector('.multi-card-paste-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'multi-card-paste-dialog';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 5000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">Skapa flera kort från text</h3>
        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
            Klistra in text. Två tomma rader = nytt kort.<br>
            Sista raden med #tagg1 #tagg2 blir riktiga taggar.
        </p>
        <textarea id="multiCardText" placeholder="Första anteckningen här...

Andra anteckningen...
#work #urgent

Tredje anteckningen...
#personal #todo" style="
            width: 100%;
            height: 300px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
        "></textarea>
        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelMultiCard" style="
                padding: 8px 16px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
            ">Avbryt</button>
            <button id="createMultiCards" style="
                padding: 8px 16px;
                border: none;
                background: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            ">Skapa kort</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus textarea
    const textarea = document.getElementById('multiCardText');
    textarea.focus();
    
    // Event handlers
    document.getElementById('cancelMultiCard').onclick = () => {
        overlay.remove();
    };
    
    document.getElementById('createMultiCards').onclick = () => {
        const text = textarea.value.trim();
        if (text) {
            createMultipleCardsFromText(text);
            overlay.remove();
        } else {
            alert('Skriv in lite text först!');
        }
    };
    
    // Close on Escape
    function handleEscape(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    }
    document.addEventListener('keydown', handleEscape);
    
    // Close on click outside dialog
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Parse and create multiple cards from text
function createMultipleCardsFromText(text) {
    // Split on double line breaks (two consecutive newlines)
    const blocks = text.split(/\n\s*\n/).filter(block => block.trim());
    
    console.log('Found', blocks.length, 'text blocks');
    
    let createdCount = 0;
    const startPosition = { x: 200, y: 200 };
    
    blocks.forEach((block, index) => {
        const lines = block.trim().split('\n');
        const lastLine = lines[lines.length - 1].trim();
        
        let cardText = '';
        let tags = [];
        
        // Check if last line contains tags (starts with # and has #words)
        if (lastLine.startsWith('#') && lastLine.includes('#')) {
            // Extract tags from last line: #tagg1 #tagg2 #tagg3
            const tagMatches = lastLine.match(/#\w+/g);
            if (tagMatches) {
                tags = tagMatches.map(tag => tag.substring(1)); // Remove # prefix
                // Card text is everything except the last line
                cardText = lines.slice(0, -1).join('\n').trim();
            } else {
                // Last line starts with # but no valid tags, include it in text
                cardText = lines.join('\n').trim();
            }
        } else {
            // No tags, all lines become card text
            cardText = lines.join('\n').trim();
        }
        
        // Skip empty cards
        if (!cardText) return;
        
        // Create card
        const cardId = generateCardId();
        const position = {
            x: startPosition.x + (index * 50), // Offset each card
            y: startPosition.y + (index * 50)
        };
        
        const nodeData = {
            id: cardId,
            text: cardText,
            isManualCard: true,
            tags: tags
        };
        
        const newNode = cy.add({
            group: 'nodes',
            data: nodeData,
            position: position
        });
        
        // Apply auto-gray coloring for #done tags
        applyAutoDoneColoring(newNode);
        
        createdCount++;
        console.log(`Created card ${index + 1}: "${cardText.substring(0, 30)}..." with tags:`, tags);
    });
    
    // Show success message
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `Skapade ${createdCount} kort från texten`;
        statusDiv.classList.add('visible');
        setTimeout(() => {
            statusDiv.classList.remove('visible');
        }, 3000);
    }
    
    console.log(`Multi-card paste complete: ${createdCount} cards created`);
}

// ====================================================================================================
// 🤖 AI ASSISTANT - Claude Integration with Chat Panel
// ====================================================================================================

let aiChatHistory = [];

// Toggle AI Panel
function toggleAIPanel() {
    const panel = document.getElementById('aiPanel');
    const apiKey = localStorage.getItem('claudeApiKey');

    if (!apiKey) {
        showClaudeAPIKeyDialog();
        return;
    }

    if (panel.classList.contains('visible')) {
        panel.classList.remove('visible');
    } else {
        panel.classList.add('visible');
        // Focus input
        setTimeout(() => {
            document.getElementById('aiPanelInput').focus();
        }, 100);
    }
}

// Send AI Message from panel
async function sendAIMessage() {
    const input = document.getElementById('aiPanelInput');
    const sendBtn = document.getElementById('aiPanelSend');
    const query = input.value.trim();

    if (!query) return;

    const apiKey = localStorage.getItem('claudeApiKey');
    if (!apiKey) {
        addChatMessage('system', 'API-nyckel saknas. Stäng panelen och öppna igen för att ange nyckel.');
        return;
    }

    // Add user message to chat
    addChatMessage('user', query);
    input.value = '';

    // Disable send button
    sendBtn.disabled = true;

    // Show loading
    addChatMessage('system', 'AI tänker...');

    try {
        const response = await askClaudeAboutNotes(query, apiKey);

        // Remove loading message
        removeLastSystemMessage();

        // Add assistant response
        addChatMessage('assistant', response);
    } catch (error) {
        removeLastSystemMessage();
        addChatMessage('system', `Fel: ${error.message}`);
        console.error('AI error:', error);
    } finally {
        sendBtn.disabled = false;
    }
}

// Add message to chat
function addChatMessage(role, text) {
    const messagesContainer = document.getElementById('aiMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add to history (except system messages)
    if (role !== 'system') {
        aiChatHistory.push({ role, text });
    }
}

// Remove last system message (loading indicator)
function removeLastSystemMessage() {
    const messagesContainer = document.getElementById('aiMessages');
    const systemMessages = messagesContainer.querySelectorAll('.ai-message.system');
    if (systemMessages.length > 0) {
        systemMessages[systemMessages.length - 1].remove();
    }
}

// Handle Enter key in AI input
document.addEventListener('DOMContentLoaded', function() {
    const aiInput = document.getElementById('aiPanelInput');
    if (aiInput) {
        aiInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }
});

// Dialog to enter Claude API key
function showClaudeAPIKeyDialog() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    dialog.innerHTML = `
        <h2 style="margin: 0 0 20px 0; color: #333;">🤖 Claude AI-assistent</h2>
        <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
            För att använda AI-assistenten behöver du en Claude API-nyckel från Anthropic.
        </p>
        <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">
            <strong>Så här skaffar du en nyckel:</strong><br>
            1. Gå till <a href="https://console.anthropic.com/" target="_blank" style="color: #007bff;">console.anthropic.com</a><br>
            2. Skapa ett konto eller logga in<br>
            3. Gå till "API Keys" och skapa en ny nyckel<br>
            4. Klistra in nyckeln här nedan
        </p>
        <p style="margin: 0 0 15px 0; color: #e67e22; font-size: 13px;">
            ⚠️ Din API-nyckel sparas endast lokalt i din webbläsare.
        </p>
        <input type="password" id="claudeApiKeyInput" placeholder="sk-ant-api03-..." style="
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
            box-sizing: border-box;
            margin-bottom: 20px;
        ">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelApiKey" style="
                padding: 10px 20px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Avbryt</button>
            <button id="saveApiKey" style="
                padding: 10px 20px;
                border: none;
                background: #007bff;
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Spara och fortsätt</button>
        </div>
        <p style="margin: 20px 0 0 0; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            Du kan senare ta bort din API-nyckel via Inställningar-menyn.
        </p>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const input = document.getElementById('claudeApiKeyInput');
    input.focus();

    document.getElementById('cancelApiKey').onclick = () => {
        overlay.remove();
    };

    document.getElementById('saveApiKey').onclick = () => {
        const apiKey = input.value.trim();
        if (apiKey && apiKey.startsWith('sk-ant-')) {
            localStorage.setItem('claudeApiKey', apiKey);
            overlay.remove();
            toggleAIPanel();
        } else {
            alert('Ogiltig API-nyckel. Claude API-nycklar börjar med "sk-ant-"');
        }
    };

    // Save on Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('saveApiKey').click();
        }
    });

    // Close on Escape
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
        }
    });
}


const aiColorCycle = ['card-color-1', 'card-color-2', 'card-color-3', 'card-color-4', 'card-color-5', 'card-color-6', 'card-color-7', 'card-color-8'];
const aiAssistantState = {
    initialized: false,
    isProcessing: false,
    cachedKey: '',
    speechRecognition: null,
    isListening: false,
    voiceBuffer: '',
    silenceStop: false,
    lastPrompt: ''
};

function getStoredAiKeyRaw() {
    try {
        return localStorage.getItem(AI_STORAGE_KEY);
    } catch (error) {
        console.warn('Kunde inte läsa AI-nyckel från localStorage:', error);
        return null;
    }
}

function setStoredAiKeyRaw(value) {
    try {
        localStorage.setItem(AI_STORAGE_KEY, value);
        return true;
    } catch (error) {
        console.warn('Kunde inte spara AI-nyckel i localStorage:', error);
        return false;
    }
}

function removeStoredAiKeyRaw() {
    try {
        localStorage.removeItem(AI_STORAGE_KEY);
        return true;
    } catch (error) {
        console.warn('Kunde inte ta bort AI-nyckel från localStorage:', error);
        return false;
    }
}

function hasStoredAiKey() {
    const storedValue = getStoredAiKeyRaw();
    return typeof storedValue === 'string' && storedValue.length > 0;
}

function clearTemporaryAiKey() {
    aiAssistantState.cachedKey = '';
    refreshAiKeyUI();
}

function updateAiSecurityNotice() {
    const notice = document.getElementById('aiAssistantSecurityNotice');
    if (!notice) return;

    const storedValue = getStoredAiKeyRaw();
    const hasStoredKey = !!storedValue;
    const isSecure = window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const baseMessage = 'Nyckeln skickas direkt från din webbläsare till OpenAI.';
    const storageMessage = hasStoredKey
        ? ' Den är sparad lokalt i den här webbläsaren. Lämna fältet tomt och klicka på "Spara" för att ta bort den.'
        : ' Den sparas bara i minnet under den aktuella sessionen.';
    const warningMessage = isSecure
        ? ''
        : ' ⚠️ Kör helst appen via https:// eller från localhost innan du anger nyckeln.';

    notice.innerHTML = `<strong>Säkerhet:</strong> ${baseMessage}${storageMessage}${warningMessage}`;
}

function toggleAiPanel(forceClose = false) {
    const panel = document.getElementById('aiAssistantPanel');
    if (!panel) return;

    const toggleBtn = document.getElementById('aiAssistantToggleBtn');
    const isHidden = panel.classList.contains('hidden');
    const shouldClose = forceClose || !isHidden;

    if (shouldClose) {
        panel.classList.add('hidden');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }
        stopAiVoiceInput(true);
        return;
    }

    panel.classList.remove('hidden');
    if (toggleBtn) {
        toggleBtn.classList.add('active');
    }

    initAiAssistant();
    refreshAiKeyUI();
    updateAiSecurityNotice();

    setTimeout(() => {
        const prompt = document.getElementById('aiAssistantPrompt');
        if (prompt && !prompt.value) {
            prompt.focus();
        }
    }, 120);
}

function activateChatgptAi() {
    const panel = document.getElementById('aiAssistantPanel');
    if (!panel) {
        console.warn('AI-assistentpanelen kunde inte hittas.');
        return;
    }

    const wasHidden = panel.classList.contains('hidden');
    if (wasHidden) {
        toggleAiPanel();
    }

    const promptField = document.getElementById('aiAssistantPrompt');
    const currentPrompt = promptField ? promptField.value.trim() : '';
    const promptToUse = currentPrompt || aiAssistantState.lastPrompt || '';

    if (!currentPrompt && promptToUse && promptField) {
        promptField.value = promptToUse;
    }

    const apiKeyInput = document.getElementById('aiAssistantApiKey');
    const typedKey = apiKeyInput ? apiKeyInput.value.trim() : '';

    let availableKey = '';

    if (typedKey) {
        availableKey = typedKey;
    } else {
        availableKey = getAiApiKey() || '';
    }

    if (!promptToUse) {
        setAiStatus('Skriv en instruktion till AI-assistenten eller använd rösten för att komma igång.', 'info');
        if (promptField) {
            promptField.focus();
        }
        return;
    }

    if (!availableKey) {
        setAiStatus('Fyll i din OpenAI API-nyckel innan du startar AI-sorteringen.', 'error');
        if (apiKeyInput) {
            apiKeyInput.focus();
        }
        return;
    }

    if (wasHidden) {
        setTimeout(() => runAiSorting(), 80);
    } else {
        runAiSorting();
    }
}

function initAiAssistant() {
    refreshAiKeyUI();

    if (aiAssistantState.initialized) {
        return;
    }

    aiAssistantState.initialized = true;

    const prompt = document.getElementById('aiAssistantPrompt');
    if (prompt) {
        prompt.addEventListener('keydown', function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                runAiSorting();
            }
        });
    }
}

function refreshAiKeyUI() {
    const input = document.getElementById('aiAssistantApiKey');
    if (!input) {
        updateAiSecurityNotice();
        return;
    }

    const stored = getStoredAiKeyRaw();
    if (stored) {
        try {
            aiAssistantState.cachedKey = atob(stored);
        } catch (error) {
            aiAssistantState.cachedKey = stored;
        }
        input.value = '';
        input.placeholder = 'Nyckel sparad i webbläsaren';
    } else {
        if (!aiAssistantState.cachedKey) {
            input.value = '';
        }
        input.placeholder = 'OpenAI API-nyckel';
    }

    updateAiSecurityNotice();
}

function getAiApiKey() {
    if (aiAssistantState.cachedKey) {
        return aiAssistantState.cachedKey;
    }

    const stored = getStoredAiKeyRaw();
    if (stored) {
        try {
            aiAssistantState.cachedKey = atob(stored);
        } catch (error) {
            aiAssistantState.cachedKey = stored;
        }
    }
    return aiAssistantState.cachedKey;
}

function saveAiApiKey() {
    const input = document.getElementById('aiAssistantApiKey');
    if (!input) return;

    const value = input.value.trim();

    if (!value) {
        const removed = removeStoredAiKeyRaw();
        aiAssistantState.cachedKey = '';
        input.value = '';
        refreshAiKeyUI();
        setAiStatus(removed ? 'API-nyckeln har tagits bort från webbläsaren.' : 'API-nyckeln används nu bara temporärt.', 'info');
        return;
    }

    const confirmed = window.confirm('API-nyckeln sparas okrypterat i den här webbläsaren. Fortsätt bara om du litar på enheten och nätverket.');
    if (!confirmed) {
        setAiStatus('Ingen API-nyckel sparades.', 'info');
        updateAiSecurityNotice();
        return;
    }

    let valueToStore = value;
    try {
        valueToStore = btoa(value);
    } catch (error) {
        // Fall back to klartext om base64 inte fungerar
    }

    const success = setStoredAiKeyRaw(valueToStore);
    if (!success) {
        setAiStatus('Kunde inte spara nyckeln i webbläsaren. Den används endast temporärt.', 'error');
        aiAssistantState.cachedKey = value;
        input.value = '';
        updateAiSecurityNotice();
        return;
    }

    aiAssistantState.cachedKey = value;
    input.value = '';
    refreshAiKeyUI();
    setAiStatus('API-nyckeln sparades lokalt. Radera den efter användning om andra har åtkomst till enheten.', 'success');
}

function setAiStatus(message, type = 'info') {
    const statusEl = document.getElementById('aiAssistantStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.classList.remove('success', 'error', 'loading');

    if (type === 'success' || type === 'error' || type === 'loading') {
        statusEl.classList.add(type);
    }
}

function escapeHtml(text) {
    if (typeof text !== 'string') {
        return '';
    }
    return text.replace(/[&<>"']/g, function(char) {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case '\'': return '&#39;';
            default: return char;
        }
    });
}

function renderAiGroupingPreview(groups, summary) {
    const container = document.getElementById('aiAssistantGroups');
    if (!container) return;

    if ((!Array.isArray(groups) || groups.length === 0) && !summary) {
        container.innerHTML = '';
        return;
    }

    const htmlParts = [];

    if (summary) {
        htmlParts.push(`<div class="ai-assistant-summary">${escapeHtml(summary)}</div>`);
    }

    if (Array.isArray(groups)) {
        groups.forEach((group, index) => {
            const title = group?.title || group?.name || `Grupp ${index + 1}`;
            const ids = Array.isArray(group?.card_ids) ? group.card_ids : Array.isArray(group?.cards) ? group.cards : [];
            const listItems = ids.length ? ids.map(id => {
                const node = cy ? cy.getElementById(id) : null;
                if (node && node.length > 0) {
                    const nodeTitle = node.data('title') || '';
                    const nodeText = node.data('text') || '';
                    const preview = nodeTitle || nodeText.split(/\n/)[0] || id;
                    return escapeHtml(preview);
                }
                return escapeHtml(id);
            }) : ['(inga kort)'];

            const listHtml = listItems.map(item => `<li>${item}</li>`).join('');
            htmlParts.push(`<div class="ai-group-preview"><h4>${escapeHtml(title)}</h4><ul>${listHtml}</ul></div>`);
        });
    }

    container.innerHTML = htmlParts.join('');
}

function extractJsonFromText(text) {
    if (typeof text !== 'string') return null;
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    const jsonSnippet = text.slice(firstBrace, lastBrace + 1);
    try {
        return JSON.parse(jsonSnippet);
    } catch (error) {
        console.warn('Failed to parse JSON snippet from AI response:', error);
        return null;
    }
}

function parseAiResponse(content) {
    if (!content) {
        throw new Error('Tomt svar från AI:n.');
    }

    try {
        return JSON.parse(content);
    } catch (error) {
        const fallback = extractJsonFromText(content);
        if (fallback) {
            return fallback;
        }
        console.warn('Unable to parse AI response:', content);
        throw new Error('Kunde inte tolka svaret från AI:n.');
    }
}

function applyAiGrouping(groups, layout = 'stack') {
    if (!Array.isArray(groups) || groups.length === 0) {
        throw new Error('AI-svaret innehöll inga grupper att sortera.');
    }

    const normalizedGroups = groups.map((group, index) => {
        const ids = Array.isArray(group?.card_ids) ? group.card_ids : Array.isArray(group?.cards) ? group.cards : [];
        return {
            title: group?.title || group?.name || `Grupp ${index + 1}`,
            cardIds: ids.filter(id => typeof id === 'string' && id.trim().length > 0)
        };
    }).filter(group => group.cardIds.length > 0);

    if (normalizedGroups.length === 0) {
        throw new Error('Inga av korten i AI-svaret matchade nuvarande bräda.');
    }

    const preparedGroups = normalizedGroups.map(group => {
        const nodes = group.cardIds.map(id => cy ? cy.getElementById(id) : null)
            .filter(node => node && node.length > 0 && !node.hasClass('annotation-shape'));
        return {
            title: group.title,
            nodes
        };
    }).filter(group => group.nodes.length > 0);

    if (preparedGroups.length === 0) {
        throw new Error('AI föreslog endast kort som inte längre finns eller som inte går att flytta.');
    }

    if (!cy || preparedGroups.length === 0) {
        throw new Error('Brädan är inte redo ännu. Försök igen om en stund.');
    }

    saveState();

    const arrangePos = getArrangementPosition();
    const baseX = arrangePos.x;
    const baseY = arrangePos.y;

    if (layout === 'grid') {
        // GRID LAYOUT - varje grupp i egen kolumn (g+v style)
        const numGroups = preparedGroups.length;
        const maxCols = Math.min(6, numGroups);
        const columnSpacing = 400; // Large spacing between columns
        const verticalGap = 80; // Gap between cards in column

        cy.batch(() => {
            preparedGroups.forEach((group, groupIndex) => {
                const col = groupIndex % maxCols;
                const row = Math.floor(groupIndex / maxCols);

                const groupX = baseX + col * columnSpacing;
                let currentY = baseY + row * 800; // Large row spacing
                const color = aiColorCycle[groupIndex % aiColorCycle.length];

                // Place cards in COLUMN (different Y positions)
                group.nodes.forEach(node => {
                    const nodeHeight = getMeasuredTextHeight(node);
                    node.position({ x: groupX, y: currentY });
                    if (color) {
                        node.data('cardColor', color);
                    }
                    applyAutoDoneColoring(node);
                    currentY += nodeHeight + verticalGap; // Move down for next card
                });
            });
        });
    } else {
        // STACK LAYOUT - alla kort i gruppen på EXAKT SAMMA position (q style)
        const numGroups = preparedGroups.length;
        const maxCols = Math.min(6, Math.ceil(Math.sqrt(numGroups)));
        const pileSpacing = 500; // Large spacing to avoid overlap

        cy.batch(() => {
            preparedGroups.forEach((group, groupIndex) => {
                const col = groupIndex % maxCols;
                const row = Math.floor(groupIndex / maxCols);

                // Calculate pile position (all cards in pile get same position)
                const pileX = baseX + col * pileSpacing;
                const pileY = baseY + row * pileSpacing;
                const color = aiColorCycle[groupIndex % aiColorCycle.length];

                // Stack all cards at the SAME position (creates a visual pile)
                group.nodes.forEach(node => {
                    node.position({ x: pileX, y: pileY }); // Same position for all cards in pile!
                    if (color) {
                        node.data('cardColor', color);
                    }
                    applyAutoDoneColoring(node);
                });
            });
        });
    }

    if (typeof isColumnView !== 'undefined' && isColumnView) {
        renderColumnViewDebounced();
    }
}

async function runAiSorting() {
    if (aiAssistantState.isProcessing) {
        return;
    }

    if (!cy) {
        setAiStatus('Brädan är inte redo ännu. Försök igen om en liten stund.', 'error');
        return;
    }

    const storedKeyBeforeRun = hasStoredAiKey();

    const promptField = document.getElementById('aiAssistantPrompt');
    const rawPrompt = promptField ? promptField.value.trim() : '';

    if (!rawPrompt) {
        setAiStatus('Skriv först vad AI:n ska göra – till exempel hur grupper ska skapas.', 'error');
        if (promptField) {
            promptField.focus();
        }
        return;
    }

    aiAssistantState.lastPrompt = rawPrompt;

    const apiKeyInput = document.getElementById('aiAssistantApiKey');
    const typedKey = apiKeyInput ? apiKeyInput.value.trim() : '';
    if (typedKey) {
        aiAssistantState.cachedKey = typedKey;
        if (apiKeyInput) {
            apiKeyInput.value = '';
            apiKeyInput.placeholder = 'Nyckel används tillfälligt';
        }
        updateAiSecurityNotice();
    }

    const usingTemporaryKey = !!typedKey && !storedKeyBeforeRun;
    const usingOverrideKey = !!typedKey && storedKeyBeforeRun;

    const apiKey = getAiApiKey();
    if (!apiKey) {
        const missingKeyNote = typedKey || !storedKeyBeforeRun ? ' Temporär nyckel har rensats.' : '';
        setAiStatus('Fyll i din OpenAI API-nyckel för att använda ChatGPT-sortering.' + missingKeyNote, 'error');
        clearTemporaryAiKey();
        if (apiKeyInput) {
            apiKeyInput.focus();
        }
        return;
    }

    const selectedNodes = cy.$(':selected').filter(node => !node.hasClass('annotation-shape'));
    const selectedIds = selectedNodes.map(node => node.id());

    const cards = cy.nodes().filter(node => !node.hasClass('annotation-shape')).map(node => ({
        id: node.id(),
        title: node.data('title') || '',
        text: node.data('text') || '',
        tags: node.data('tags') || [],
        type: node.data('type') || 'text',
        cardColor: node.data('cardColor') || '',
        selected: selectedIds.includes(node.id())
    }));

    if (!cards.length) {
        const noCardsNote = typedKey ? ' Temporär nyckel har rensats.' : '';
        setAiStatus('Det finns inga kort att analysera ännu.' + noCardsNote, 'error');
        clearTemporaryAiKey();
        return;
    }

    setAiStatus('AI analyserar dina kort...', 'loading');
    aiAssistantState.isProcessing = true;

    const runBtn = document.getElementById('aiAssistantRunBtn');
    const originalBtnText = runBtn ? runBtn.textContent : '';
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = 'Arbetar...';
    }

    const voiceBtn = document.getElementById('aiAssistantVoiceBtn');
    if (voiceBtn) {
        voiceBtn.disabled = true;
    }

    try {
        const payload = {
            model: 'gpt-4o-mini',
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `Du är en expert på VISUELL SPATIAL ORGANISATION av anteckningskort på en oändlig canvas.

VIKTIGT - Två olika layouttyper:

1. "KATEGORIER/OMRÅDEN" (när användaren säger: sortera, kategorisera, organisera, dela upp):
   - Layout: "grid" - varje grupp får egen KOLUMN med kort under varandra
   - Grupperna placeras BREDVID varandra med stort avstånd
   - Perfekt för att visa kategorier visuellt separerade

2. "HÖGAR/STAPLAR" (när användaren säger: hög, stapel, samla, kluster):
   - Layout: "stack" - alla kort i gruppen staplas på EXAKT SAMMA position
   - Skapar VERKLIGA HÖGAR av kort
   - Perfekt för att samla relaterade kort i kompakta högar

Din uppgift:
1. Analysera användarens instruktion och välj rätt layout
2. Inkludera ALLA kort - varje kort måste placeras i någon grupp
3. Skapa grupper baserat på innehåll/tags/färg
4. Ge varje grupp ett tydligt namn

Output-format (JSON):
{
  "layout": "grid" eller "stack",
  "groups": [
    {
      "title": "Gruppnamn",
      "card_ids": ["id1", "id2", ...]
    }
  ],
  "summary": "Kort förklaring på svenska"
}

KRITISKT:
- ALLA kort MÅSTE inkluderas i någon grupp
- Om kort inte passar någonstans: skapa "Övrigt"-grupp
- Kort med "selected": true är markerade av användaren (viktigt!)
- Använd ENBART kort-ID:n som finns i listan
- Svara alltid med giltig JSON`
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        instruction: rawPrompt,
                        cards
                    })
                }
            ]
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMessage = `OpenAI svarade med felkod ${response.status}.`;
            try {
                const errorData = await response.json();
                if (errorData?.error?.message) {
                    errorMessage = errorData.error.message;
                }
            } catch (parseError) {
                console.warn('Could not parse OpenAI error response:', parseError);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        const parsed = parseAiResponse(content);

        renderAiGroupingPreview(parsed?.groups || [], parsed?.summary || parsed?.note || '');

        const layout = parsed?.layout || 'stack'; // Default to stack if not specified
        applyAiGrouping(parsed?.groups || [], layout);

        let successMessage = parsed?.summary ? parsed.summary : 'Klart! Korten sorterades enligt AI-förslaget.';
        if (usingTemporaryKey) {
            successMessage += ' Din temporära API-nyckel har nu rensats.';
        } else if (usingOverrideKey) {
            successMessage += ' Den sparade nyckeln ligger kvar och används nästa gång.';
        }
        setAiStatus(successMessage, 'success');

    } catch (error) {
        console.error('AI sorting failed:', error);
        let errorMessage = error.message || 'Något gick fel vid AI-sorteringen.';
        if (usingTemporaryKey) {
            errorMessage += ' Din temporära API-nyckel har rensats.';
        } else if (usingOverrideKey) {
            errorMessage += ' Den tillfälliga nyckeln togs bort – den sparade nyckeln finns kvar.';
        }
        setAiStatus(errorMessage, 'error');
    } finally {
        aiAssistantState.isProcessing = false;
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = originalBtnText || 'Analysera & sortera';
        }
        if (voiceBtn) {
            voiceBtn.disabled = false;
        }
        clearTemporaryAiKey();
    }
}

function stopAiVoiceInput(silent = false) {
    if (aiAssistantState.speechRecognition && aiAssistantState.isListening) {
        if (silent) {
            aiAssistantState.silenceStop = true;
        }
        try {
            aiAssistantState.speechRecognition.stop();
        } catch (error) {
            console.warn('Failed to stop speech recognition:', error);
        }
    }
}

function toggleAiVoiceInput() {
    if (aiAssistantState.isProcessing) {
        setAiStatus('Vänta tills AI-analysen är klar innan du använder röstinmatning.', 'error');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setAiStatus('Din webbläsare stödjer tyvärr inte röstinmatning.', 'error');
        return;
    }

    if (!aiAssistantState.speechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'sv-SE';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            aiAssistantState.isListening = true;
            aiAssistantState.silenceStop = false;
            const voiceBtn = document.getElementById('aiAssistantVoiceBtn');
            if (voiceBtn) {
                voiceBtn.classList.add('active');
                voiceBtn.textContent = '⏹️ Stoppa';
            }
            const promptField = document.getElementById('aiAssistantPrompt');
            aiAssistantState.voiceBuffer = promptField ? promptField.value.trim() : '';
            setAiStatus('Lyssnar... prata tydligt så transkriberas din instruktion.', 'loading');
        };

        recognition.onend = () => {
            aiAssistantState.isListening = false;
            const voiceBtn = document.getElementById('aiAssistantVoiceBtn');
            if (voiceBtn) {
                voiceBtn.classList.remove('active');
                voiceBtn.textContent = '🎤 Röst';
            }

            if (aiAssistantState.silenceStop) {
                aiAssistantState.silenceStop = false;
                return;
            }

            setAiStatus('Röstinmatningen har stoppats.', 'info');
        };

        recognition.onerror = event => {
            console.warn('AI voice recognition error:', event.error);
            setAiStatus(`Röstinmatning misslyckades: ${event.error}`, 'error');
            stopAiVoiceInput(true);
        };

        recognition.onresult = event => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            const promptField = document.getElementById('aiAssistantPrompt');
            if (promptField) {
                const prefix = aiAssistantState.voiceBuffer ? aiAssistantState.voiceBuffer + ' ' : '';
                promptField.value = (prefix + transcript).trim();
                promptField.focus();
                aiAssistantState.lastPrompt = promptField.value.trim();
            }
        };

        aiAssistantState.speechRecognition = recognition;
    }

    if (aiAssistantState.isListening) {
        stopAiVoiceInput();
    } else {
        try {
            aiAssistantState.speechRecognition.start();
        } catch (error) {
            console.warn('Unable to start speech recognition:', error);
            setAiStatus('Kunde inte starta röstinmatning. Kontrollera mikrofonåtkomst.', 'error');
        }
    }
}

// ====================================================================================================
// 🤖 CLAUDE AI ASSISTANT
// ====================================================================================================

// Dialog to ask AI a question
function showAIQueryDialog() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        width: 90%;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    dialog.innerHTML = `
        <h2 style="margin: 0 0 10px 0; color: #333;">🤖 Fråga AI om dina anteckningar</h2>
        <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
            AI:n kan söka, sammanfatta och analysera dina kort.
        </p>
        <textarea id="aiQueryInput" placeholder="Exempel:
- Vilka kort handlar om projektplanering?
- Sammanfatta mina anteckningar om AI
- Hitta alla todo-uppgifter för nästa vecka
- Vad har jag skrivit om design?" style="
            width: 100%;
            height: 120px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            box-sizing: border-box;
            margin-bottom: 15px;
        "></textarea>
        <div id="aiResponseArea" style="
            display: none;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
            max-height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.6;
        "></div>
        <div id="aiLoadingArea" style="
            display: none;
            text-align: center;
            padding: 20px;
            color: #666;
        ">
            <div style="display: inline-block; animation: spin 1s linear infinite;">⏳</div>
            <p style="margin: 10px 0 0 0;">AI tänker...</p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelAIQuery" style="
                padding: 10px 20px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Stäng</button>
            <button id="askAI" style="
                padding: 10px 20px;
                border: none;
                background: #007bff;
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
            ">Fråga AI</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    const input = document.getElementById('aiQueryInput');
    input.focus();

    document.getElementById('cancelAIQuery').onclick = () => {
        overlay.remove();
    };

    document.getElementById('askAI').onclick = async () => {
        const query = input.value.trim();
        if (!query) {
            alert('Skriv en fråga först!');
            return;
        }

        // Show loading, hide previous response
        document.getElementById('aiLoadingArea').style.display = 'block';
        document.getElementById('aiResponseArea').style.display = 'none';
        document.getElementById('askAI').disabled = true;

        try {
            const response = await askClaudeAboutNotes(query);

            // Show response
            document.getElementById('aiLoadingArea').style.display = 'none';
            const responseArea = document.getElementById('aiResponseArea');
            responseArea.textContent = response;
            responseArea.style.display = 'block';
            document.getElementById('askAI').disabled = false;
        } catch (error) {
            document.getElementById('aiLoadingArea').style.display = 'none';
            document.getElementById('askAI').disabled = false;
            alert('Fel vid AI-anrop: ' + error.message);
        }
    };

    // Ask on Ctrl+Enter
    input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            document.getElementById('askAI').click();
        }
    });

    // Close on Escape
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
        }
    });
}

// Extract keywords from query for smart filtering
function extractKeywords(query) {
    // Remove common Swedish stop words
    const stopWords = ['och', 'eller', 'om', 'för', 'från', 'till', 'med', 'i', 'på', 'att', 'är', 'den', 'det', 'som', 'har', 'kan', 'var', 'ska', 'vad', 'hur', 'när', 'vilka', 'alla', 'mina', 'dina'];

    const words = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)]; // Remove duplicates
}

// Calculate relevance score for a card based on keywords
function calculateRelevanceScore(node, keywords) {
    const title = (node.data('title') || '').toLowerCase();
    const text = (node.data('text') || '').toLowerCase();
    const tags = (node.data('tags') || []).join(' ').toLowerCase();
    const fullContent = `${title} ${text} ${tags}`;

    let score = 0;

    keywords.forEach(keyword => {
        // Title match = 3 points
        if (title.includes(keyword)) score += 3;
        // Tag match = 2 points
        if (tags.includes(keyword)) score += 2;
        // Text match = 1 point
        if (text.includes(keyword)) score += 1;
    });

    return score;
}

// Call Claude API with smart note filtering
async function askClaudeAboutNotes(query) {
    const apiKey = localStorage.getItem('claudeApiKey');

    if (!apiKey) {
        throw new Error('Ingen API-nyckel hittades. Klicka på AI-assistenten igen för att lägga till en.');
    }

    const totalCards = cy.nodes().length;
    const MAX_CARDS = 100; // Analyze up to 100 most relevant cards

    // Smart filtering: only send relevant cards if we have many
    let cardsToSend;
    let filterInfo = '';

    if (totalCards <= MAX_CARDS) {
        // Send all cards if we have 50 or fewer
        cardsToSend = cy.nodes().toArray();
        filterInfo = `Analyserar alla ${totalCards} kort.`;
    } else {
        // Extract keywords and rank cards by relevance
        const keywords = extractKeywords(query);
        console.log('📊 Extracted keywords:', keywords);

        // Score all cards
        const scoredCards = cy.nodes().map(node => ({
            node: node,
            score: calculateRelevanceScore(node, keywords)
        }));

        // Sort by score (highest first) and take top MAX_CARDS
        scoredCards.sort((a, b) => b.score - a.score);

        // Take cards with score > 0, up to MAX_CARDS
        const relevantCards = scoredCards.filter(item => item.score > 0).slice(0, MAX_CARDS);

        if (relevantCards.length === 0) {
            // No relevant cards found, take most recent MAX_CARDS
            cardsToSend = cy.nodes().slice(0, MAX_CARDS).toArray();
            filterInfo = `Inga specifikt matchande kort hittades. Analyserar de ${cardsToSend.length} senaste korten.`;
        } else {
            cardsToSend = relevantCards.map(item => item.node);
            filterInfo = `Filtrerade från ${totalCards} kort till de ${cardsToSend.length} mest relevanta (sparar ~${Math.round((1 - cardsToSend.length / totalCards) * 100)}% tokens).`;
        }

        console.log('📊 Filter info:', filterInfo);
    }

    // Collect notes from selected cards
    const selectedNotes = cardsToSend.map(node => {
        const title = node.data('title') || '';
        const text = node.data('text') || '';
        const tags = (node.data('tags') || []).join(', ');
        const hidden_tags = (node.data('hidden_tags') || []).join(', ');
        const cardColor = node.data('cardColor') || '';
        const export_source = node.data('export_source') || '';
        const id = node.id();

        let noteText = '';
        if (title) noteText += `Titel: ${title}\n`;
        if (text) noteText += `Text: ${text}\n`;
        if (tags) noteText += `Taggar: ${tags}\n`;
        if (cardColor) noteText += `Färg: ${cardColor}\n`;
        if (export_source) noteText += `Källa: ${export_source}\n`;
        if (hidden_tags) noteText += `Metadata: ${hidden_tags}\n`;
        noteText += `ID: ${id}`;

        return noteText;
    }).filter(note => note.trim());

    const notesContext = selectedNotes.join('\n\n---\n\n');

    // Create prompt
    let prompt = `Du är en VISUELL organisationsexpert för anteckningar.

VIKTIGT - Anpassa ditt svar efter situationen:

KONKRET UPPDRAG (användaren ber dig göra något specifikt):
- Använd verktyg direkt utan att prata mycket
- Kortfattat svar (max 2 meningar)
- Exempel: "organisera i högar", "skapa mindmap", "visa som flöde"

VAGA FRÅGOR (användaren är osäker eller ber om förslag):
- Ge konkreta förslag på vad du kan göra
- Förklara alternativ (kluster vs mindmap vs flöde)
- Fråga om förtydligande om nödvändigt
- Exempel: "vad kan du göra?", "hjälp mig organisera", "hur ska jag strukturera detta?"

VERKTYG du kan använda:
- arrange_clusters: Dela kort i separata högar/kategorier med färgade etiketter. Systemet beräknar automatiskt positioner så högar INTE överlappar. Du behöver bara ange gruppnamn och vilka kort som hör till varje grupp.
- create_arrows: Rita pilar mellan kort (perfekt för mindmaps och flödesscheman)
- arrange_grid: Arrangera kort i rutnät
- arrange_circle: Arrangera kort i cirkel (bra för att visa relationer)
- create_annotation: Skapa stora textetiketter

EXEMPEL PÅ VAD DU KAN ERBJUDA:
- Dela kort i ämnesområden (använd arrange_clusters - positioner hanteras automatiskt)
- Skapa mindmap med central idé och pilar (använd create_arrows)
- Skapa flödesschema med sekventiella pilar (använd arrange_grid + create_arrows)
- Hitta samband mellan kort och visa med pilar

`;

    if (totalCards > MAX_CARDS) {
        prompt += `OBS: Användaren har totalt ${totalCards} kort, men du får bara se de ${cardsToSend.length} mest relevanta för denna fråga.

`;
    }

    prompt += `Här är ${selectedNotes.length} anteckningar:

${notesContext}

Användarens fråga: ${query}

Svara på svenska. Om uppdraget är tydligt: använd verktyg direkt och var kortfattad. Om uppdraget är vagt: ge förslag och fråga om förtydligande.`;

    // Define tools that AI can use to manipulate cards
    const tools = [
        {
            name: "filter_and_show",
            description: "Filter and show only specific cards, hiding all others. Use when user wants to see only certain cards.",
            input_schema: {
                type: "object",
                properties: {
                    card_ids: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of card IDs to show"
                    },
                    reason: {
                        type: "string",
                        description: "Brief explanation of why these cards were selected"
                    }
                },
                required: ["card_ids", "reason"]
            }
        },
        {
            name: "create_annotation",
            description: "Create a large visual label/annotation box with text. Use for creating visual markers or category headers.",
            input_schema: {
                type: "object",
                properties: {
                    text: {
                        type: "string",
                        description: "Text to display in the annotation"
                    },
                    color: {
                        type: "string",
                        enum: ["red", "blue", "green", "yellow", "purple", "orange"],
                        description: "Color of the annotation box"
                    },
                    x: {
                        type: "number",
                        description: "X position (default center if not specified)"
                    },
                    y: {
                        type: "number",
                        description: "Y position (default center if not specified)"
                    }
                },
                required: ["text", "color"]
            }
        },
        {
            name: "arrange_grid",
            description: "Arrange cards in a grid layout. Perfect for organizing cards by category.",
            input_schema: {
                type: "object",
                properties: {
                    card_ids: {
                        type: "array",
                        items: { type: "string" },
                        description: "Card IDs to arrange"
                    },
                    columns: {
                        type: "number",
                        description: "Number of columns in grid (default 5)"
                    },
                    start_x: {
                        type: "number",
                        description: "Starting X position (default 100)"
                    },
                    start_y: {
                        type: "number",
                        description: "Starting Y position (default 100)"
                    }
                },
                required: ["card_ids"]
            }
        },
        {
            name: "arrange_circle",
            description: "Arrange cards in a circle around a center point. Great for showing relationships.",
            input_schema: {
                type: "object",
                properties: {
                    card_ids: {
                        type: "array",
                        items: { type: "string" },
                        description: "Card IDs to arrange in circle"
                    },
                    center_x: {
                        type: "number",
                        description: "Center X position"
                    },
                    center_y: {
                        type: "number",
                        description: "Center Y position"
                    },
                    radius: {
                        type: "number",
                        description: "Circle radius in pixels (default 400)"
                    }
                },
                required: ["card_ids", "center_x", "center_y"]
            }
        },
        {
            name: "arrange_timeline",
            description: "Arrange cards in a week grid (Monday-Sunday columns) based on their dates. Perfect for todos and tasks.",
            input_schema: {
                type: "object",
                properties: {
                    card_ids: {
                        type: "array",
                        items: { type: "string" },
                        description: "Card IDs to arrange in timeline"
                    }
                },
                required: ["card_ids"]
            }
        },
        {
            name: "arrange_clusters",
            description: "Organize cards into separate visual clusters/piles with labels. System automatically calculates positions to prevent overlap. Perfect for categorizing cards into distinct groups.",
            input_schema: {
                type: "object",
                properties: {
                    groups: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: {
                                    type: "string",
                                    description: "Name/label for this cluster"
                                },
                                card_ids: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Card IDs in this cluster"
                                }
                            },
                            required: ["name", "card_ids"]
                        },
                        description: "Array of groups/clusters to create. System will auto-position them with proper spacing."
                    }
                },
                required: ["groups"]
            }
        },
        {
            name: "create_arrows",
            description: "Create arrows between cards to show relationships, flow, or hierarchy. Perfect for mindmaps and flowcharts.",
            input_schema: {
                type: "object",
                properties: {
                    connections: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                from: {
                                    type: "string",
                                    description: "Source card ID"
                                },
                                to: {
                                    type: "string",
                                    description: "Target card ID"
                                },
                                color: {
                                    type: "string",
                                    enum: ["red", "blue", "green", "yellow", "purple", "orange", "black"],
                                    description: "Arrow color (default red)"
                                }
                            },
                            required: ["from", "to"]
                        },
                        description: "Array of arrow connections to create"
                    }
                },
                required: ["connections"]
            }
        }
    ];

    // Build messages array with conversation history
    // Include last 10 messages (5 exchanges) for better context
    const messages = [];
    const recentHistory = aiChatHistory.slice(-10); // Last 10 messages max

    // Add history messages
    recentHistory.forEach(msg => {
        messages.push({
            role: msg.role,
            content: msg.text
        });
    });

    // Add current user message
    messages.push({
        role: 'user',
        content: prompt
    });

    console.log(`📝 Sending ${messages.length} messages to API (${recentHistory.length} from history + 1 new)`);

    // Call Claude API with tools
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8192,
            system: "Du är en intelligent och hjälpsam visuell organisationsassistent. Analysera användarens behov innan du agerar. Var vänlig, professionell och förklara ditt resonemang när det är användbart. Om något är oklart, fråga istället för att gissa.",
            tools: tools,
            messages: messages
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Claude API error:', error);
        throw new Error(`API-fel (${response.status}): ${error}`);
    }

    const data = await response.json();

    // Handle tool use
    let textResponse = '';
    const toolCalls = [];

    for (const content of data.content) {
        if (content.type === 'text') {
            textResponse += content.text;
        } else if (content.type === 'tool_use') {
            toolCalls.push(content);
        }
    }

    // Execute tool calls
    if (toolCalls.length > 0) {
        console.log('🤖 AI wants to execute tools:', toolCalls);
        for (const toolCall of toolCalls) {
            await executeAITool(toolCall.name, toolCall.input);
        }
    }

    // Return text response with filter info
    return `💡 ${filterInfo}\n\n${textResponse || 'AI utförde visuella åtgärder.'}`;
}

// Execute AI tool based on name
async function executeAITool(toolName, input) {
    console.log(`🔧 Executing tool: ${toolName}`, input);

    switch (toolName) {
        case 'filter_and_show':
            await aiFilterAndShow(input);
            break;
        case 'create_annotation':
            await aiCreateAnnotation(input);
            break;
        case 'arrange_grid':
            await aiArrangeGrid(input);
            break;
        case 'arrange_circle':
            await aiArrangeCircle(input);
            break;
        case 'arrange_timeline':
            await aiArrangeTimeline(input);
            break;
        case 'arrange_clusters':
            await aiArrangeClusters(input);
            break;
        case 'create_arrows':
            await aiCreateArrows(input);
            break;
        default:
            console.warn(`Unknown tool: ${toolName}`);
    }
}

// AI Tool: Filter and show specific cards
async function aiFilterAndShow(input) {
    const { card_ids, reason } = input;

    console.log(`🔍 Filtering to show ${card_ids.length} cards: ${reason}`);

    // Hide all cards first
    cy.nodes().style('display', 'none');

    // Show only specified cards
    card_ids.forEach(cardId => {
        const node = cy.getElementById(cardId);
        if (node.length > 0) {
            node.style('display', 'element');
        }
    });

    // Zoom to fit visible cards
    const visibleNodes = cy.nodes().filter(node => node.style('display') === 'element');
    if (visibleNodes.length > 0) {
        cy.fit(visibleNodes, 50);
    }

    // Show status message
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `AI visar ${card_ids.length} kort: ${reason}. (Rensa sökfältet för att visa alla kort igen)`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 8000);
    }
}

// AI Tool: Create annotation/label
async function aiCreateAnnotation(input) {
    const { text, color, x, y } = input;

    console.log(`📝 Creating annotation: "${text}" in ${color}`);

    // Color mapping
    const colorMap = {
        'red': '#ff4444',
        'blue': '#4444ff',
        'green': '#44ff44',
        'yellow': '#ffff44',
        'purple': '#ff44ff',
        'orange': '#ffaa44'
    };

    // Position: use provided or default to center
    const position = {
        x: x || 500,
        y: y || 300
    };

    // Create annotation node
    const annotationId = 'annotation-' + Date.now();
    const newNode = cy.add({
        group: 'nodes',
        data: {
            id: annotationId,
            label: text,
            isAnnotation: true,
            annotationType: 'shape',
            backgroundColor: colorMap[color] || '#ff4444'
        },
        position: position
    });

    // Style the annotation
    newNode.addClass('annotation-shape');
    newNode.style({
        'width': Math.max(text.length * 45, 600),
        'height': 300,
        'background-color': colorMap[color] || '#ff4444',
        'label': text,
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '50px',
        'font-weight': 'bold',
        'color': '#ffffff',
        'text-outline-width': 2,
        'text-outline-color': '#000000',
        'shape': 'rectangle',
        'border-width': 4,
        'border-color': '#000000'
    });

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `AI skapade etikett: "${text}"`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 3000);
    }

    saveBoard();
}

// AI Tool: Arrange cards in grid
async function aiArrangeGrid(input) {
    const { card_ids, columns = 5, start_x = 100, start_y = 100 } = input;

    console.log(`📐 Arranging ${card_ids.length} cards in ${columns}-column grid`);

    const spacing_x = 180;
    const spacing_y = 150;

    card_ids.forEach((cardId, index) => {
        const node = cy.getElementById(cardId);
        if (node.length > 0) {
            const col = index % columns;
            const row = Math.floor(index / columns);

            node.position({
                x: start_x + (col * spacing_x),
                y: start_y + (row * spacing_y)
            });
        }
    });

    // Fit view to arranged cards
    const arrangedNodes = card_ids.map(id => cy.getElementById(id)).filter(n => n.length > 0);
    if (arrangedNodes.length > 0) {
        cy.fit(cy.collection(arrangedNodes), 50);
    }

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `AI arrangerade ${card_ids.length} kort i grid (${columns} kolumner)`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 3000);
    }

    saveBoard();
}

// AI Tool: Arrange cards in circle
async function aiArrangeCircle(input) {
    const { card_ids, center_x, center_y, radius = 400 } = input;

    console.log(`⭕ Arranging ${card_ids.length} cards in circle around (${center_x}, ${center_y})`);

    const angleStep = (2 * Math.PI) / card_ids.length;

    card_ids.forEach((cardId, index) => {
        const node = cy.getElementById(cardId);
        if (node.length > 0) {
            const angle = index * angleStep - (Math.PI / 2); // Start from top
            const x = center_x + (radius * Math.cos(angle));
            const y = center_y + (radius * Math.sin(angle));

            node.position({ x, y });
        }
    });

    // Fit view
    const arrangedNodes = card_ids.map(id => cy.getElementById(id)).filter(n => n.length > 0);
    if (arrangedNodes.length > 0) {
        cy.fit(cy.collection(arrangedNodes), 100);
    }

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `AI arrangerade ${card_ids.length} kort i cirkel`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 3000);
    }

    saveBoard();
}

// AI Tool: Arrange cards in timeline (week grid)
async function aiArrangeTimeline(input) {
    const { card_ids } = input;

    console.log(`📅 Arranging ${card_ids.length} cards in week timeline`);

    // Create week day columns
    const weekDays = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];
    const columnWidth = 200;
    const rowHeight = 150;
    const startX = 100;
    const startY = 150;

    // Create column headers (annotations)
    weekDays.forEach((day, index) => {
        const headerId = `week-header-${index}`;
        // Remove existing header if present
        cy.getElementById(headerId).remove();

        const headerNode = cy.add({
            group: 'nodes',
            data: {
                id: headerId,
                label: day,
                isAnnotation: true,
                annotationType: 'shape'
            },
            position: {
                x: startX + (index * columnWidth),
                y: startY - 80
            }
        });

        headerNode.addClass('annotation-shape');
        headerNode.style({
            'width': 150,
            'height': 50,
            'background-color': '#4444ff',
            'label': day,
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '16px',
            'font-weight': 'bold',
            'color': '#ffffff',
            'shape': 'rectangle',
            'border-width': 2,
            'border-color': '#000000'
        });
    });

    // Sort cards by date and place in columns
    const cardsByDay = [[], [], [], [], [], [], []]; // Mon-Sun

    card_ids.forEach(cardId => {
        const node = cy.getElementById(cardId);
        if (node.length > 0) {
            // Try to extract date from card
            const text = (node.data('text') || '') + ' ' + (node.data('tags') || []).join(' ');
            const datePatterns = parseDateFromContent(text);

            if (datePatterns.length > 0) {
                const date = datePatterns[0].date;
                const dayOfWeek = (date.getDay() + 6) % 7; // Mon=0, Sun=6
                cardsByDay[dayOfWeek].push(node);
            } else {
                // No date found, put in first column
                cardsByDay[0].push(node);
            }
        }
    });

    // Position cards in their columns
    cardsByDay.forEach((cards, dayIndex) => {
        cards.forEach((node, cardIndex) => {
            node.position({
                x: startX + (dayIndex * columnWidth),
                y: startY + (cardIndex * rowHeight)
            });
        });
    });

    // Fit view
    cy.fit(null, 50);

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `AI skapade vecko-timeline med ${card_ids.length} kort`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 3000);
    }

    saveBoard();
}

// AI Tool: Arrange cards in clusters with labels (auto-calculated positions)
async function aiArrangeClusters(input) {
    const { groups } = input;

    console.log(`📦 Creating ${groups.length} clusters with auto-spacing`);

    // Rotate through colors automatically
    const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44', '#ff44ff', '#ffaa44'];

    // Card and spacing constants
    const CARD_SPACING_X = 220;  // Horizontal space between cards (increased from 180)
    const CARD_SPACING_Y = 180;  // Vertical space between cards (increased from 150)
    const CLUSTER_MARGIN = 600;  // Space between clusters (increased from 400)
    const START_Y = 200;         // Starting Y position

    let currentX = 200;  // Starting X position for first cluster

    groups.forEach((group, groupIndex) => {
        const { name, card_ids } = group;
        const color = colors[groupIndex % colors.length];

        // Calculate cluster grid dimensions
        const cols = Math.ceil(Math.sqrt(card_ids.length));
        const rows = Math.ceil(card_ids.length / cols);

        // Calculate cluster dimensions (total width/height needed)
        const clusterWidth = cols * CARD_SPACING_X;
        const clusterHeight = rows * CARD_SPACING_Y;

        // Cluster center for label placement
        const clusterCenterX = currentX + (clusterWidth / 2);

        // Create cluster label above cluster
        const labelId = 'cluster-label-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        const labelNode = cy.add({
            group: 'nodes',
            data: {
                id: labelId,
                label: name,
                isAnnotation: true,
                annotationType: 'shape'
            },
            position: {
                x: clusterCenterX,
                y: START_Y - 100
            }
        });

        // Style label
        labelNode.addClass('annotation-shape');
        labelNode.style({
            'width': Math.max(name.length * 30, 400),
            'height': 80,
            'background-color': color,
            'label': name,
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '32px',
            'font-weight': 'bold',
            'color': '#ffffff',
            'text-outline-width': 2,
            'text-outline-color': '#000000',
            'shape': 'rectangle',
            'border-width': 3,
            'border-color': '#000000'
        });

        // Arrange cards in grid starting from currentX (left edge, not center)
        card_ids.forEach((cardId, index) => {
            const node = cy.getElementById(cardId);
            if (node.length > 0) {
                const col = index % cols;
                const row = Math.floor(index / cols);

                node.position({
                    x: currentX + (col * CARD_SPACING_X),
                    y: START_Y + (row * CARD_SPACING_Y)
                });
            }
        });

        // Move currentX for next cluster (current cluster width + margin)
        currentX += clusterWidth + CLUSTER_MARGIN;
    });

    // Fit view to all clusters
    cy.fit(null, 100);

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        const totalCards = groups.reduce((sum, g) => sum + g.card_ids.length, 0);
        statusDiv.textContent = `AI skapade ${groups.length} kluster med ${totalCards} kort`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 4000);
    }

    saveBoard();
}

// AI Tool: Create arrows between cards
async function aiCreateArrows(input) {
    const { connections } = input;

    console.log(`🔗 Creating ${connections.length} arrows`);

    const colorMap = {
        'red': '#ff4444',
        'blue': '#4444ff',
        'green': '#44ff44',
        'yellow': '#ffff44',
        'purple': '#ff44ff',
        'orange': '#ffaa44',
        'black': '#000000'
    };

    connections.forEach(conn => {
        const { from, to, color = 'red' } = conn;

        const sourceNode = cy.getElementById(from);
        const targetNode = cy.getElementById(to);

        if (sourceNode.length > 0 && targetNode.length > 0) {
            const edgeId = generateCardId();
            const arrowColor = colorMap[color] || colorMap['red'];

            cy.add({
                data: {
                    id: edgeId,
                    source: from,
                    target: to,
                    isAnnotation: true,
                    annotationType: 'connection',
                    connectionType: 'arrow'
                },
                classes: 'annotation-connection'
            });

            const edge = cy.getElementById(edgeId);
            edge.style({
                'line-color': arrowColor,
                'target-arrow-color': arrowColor,
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'width': 5,
                'arrow-scale': 1.8
            });

            console.log(`🔗 Created arrow: ${from} → ${to} (${color})`);
        }
    });

    // Show status
    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = `AI skapade ${connections.length} pilar`;
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 3000);
    }

    saveBoard();
}


// Show all cards (reset AI filter and zoom)
function showAllCards() {
    cy.nodes().style('display', 'element');
    cy.fit(null, 50);

    const statusDiv = document.getElementById('selectionInfo');
    if (statusDiv) {
        statusDiv.textContent = 'Alla kort visas nu';
        statusDiv.classList.add('visible');
        setTimeout(() => statusDiv.classList.remove('visible'), 2000);
    }
}

// Clear search
function clearSearch() {
    searchActive = false;

    cy.nodes().removeClass('search-match');
    cy.nodes().removeClass('search-non-match'); // Remove blur from non-matches
    cy.nodes().data('searchMatch', false);
    cy.nodes().unselect(); // Avmarkera alla kort när sökning rensas

    // Show all cards (reset display from AI filter)
    cy.nodes().style('display', 'element');

    const searchInfo = document.getElementById('searchInfo');
    searchInfo.classList.remove('visible');

    // Hide mobile select button
    const selectBtn = document.getElementById('searchSelectBtn');
    selectBtn.style.display = 'none';
}

// Tag filtering functions with Boolean logic
function performTagFilter(filterText) {
    if (!filterText.trim()) {
        clearTagFilter();
        return;
    }
    
    const query = filterText.toLowerCase().trim();
    let matchCount = 0;
    
    cy.nodes().forEach(node => {
        const nodeTags = node.data('tags') || [];
        const nodeTagsLower = nodeTags.map(tag => tag.toLowerCase());
        
        // Create searchable tag string (space-separated for boolean evaluation)
        const searchableTagText = nodeTagsLower.join(' ');
        
        // Use boolean evaluation on tags
        const matches = evaluateBooleanTagQuery(query, searchableTagText, nodeTagsLower);
        
        if (matches) {
            node.removeClass('tag-filtered');
            matchCount++;
        } else {
            node.addClass('tag-filtered');
        }
    });
    
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.textContent = `${matchCount} kort matchade tag-filter: "${filterText}"`;
    searchInfo.classList.add('visible');
}

// Boolean query evaluation specifically for tags
function evaluateBooleanTagQuery(query, searchableTagText, nodeTagsArray) {
    // Handle different boolean operators for tags
    
    // Split by OR first (lowest precedence)
    if (query.includes(' or ')) {
        const orParts = query.split(' or ');
        return orParts.some(part => evaluateBooleanTagQuery(part.trim(), searchableTagText, nodeTagsArray));
    }
    
    // Handle NOT operations
    if (query.includes(' not ')) {
        const notIndex = query.indexOf(' not ');
        const beforeNot = query.substring(0, notIndex).trim();
        const afterNot = query.substring(notIndex + 5).trim(); // ' not '.length = 5
        
        // If there's something before NOT, it must match
        let beforeMatches = true;
        if (beforeNot) {
            beforeMatches = evaluateBooleanTagQuery(beforeNot, searchableTagText, nodeTagsArray);
        }
        
        // The part after NOT must NOT match
        const afterMatches = evaluateBooleanTagQuery(afterNot, searchableTagText, nodeTagsArray);
        
        return beforeMatches && !afterMatches;
    }
    
    // Handle AND operations (default behavior and explicit)
    const andParts = query.includes(' and ') ? 
        query.split(' and ') : 
        query.split(' ').filter(term => term.length > 0);
        
    return andParts.every(term => {
        term = term.trim();
        
        if (term.startsWith('"') && term.endsWith('"')) {
            // Exact tag search - must match complete tag
            const exactTag = term.slice(1, -1);
            return nodeTagsArray.some(tag => tag === exactTag);
        } else {
            // Partial tag search - can be part of any tag
            return nodeTagsArray.some(tag => tag.includes(term));
        }
    });
}

function clearTagFilter() {
    cy.nodes().removeClass('tag-filtered');
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.classList.remove('visible');
}

// Multi-selection functions
function pinSelectedCards() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    selectedNodes.forEach(node => {
        if (!node.hasClass('pinned')) {
            pinCard(node);
        }
    });
    if (selectedNodes.length > 0) {
        console.log(`Pinned ${selectedNodes.length} cards`);
        updateSelectionInfo(); // Update after pinning
    }
}

function unpinSelectedCards() {
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    selectedNodes.forEach(node => {
        if (node.hasClass('pinned')) {
            unpinCard(node);
        }
    });
    if (selectedNodes.length > 0) {
        console.log(`Unpinned ${selectedNodes.length} cards`);
        updateSelectionInfo(); // Update after unpinning
    }
}

function deleteSelectedCards() {
    // Get all selected nodes and edges
    const selectedNodes = cy.$('node:selected, node[searchMatch="true"]');
    const selectedEdges = cy.$('edge:selected');
    console.log(`Delete attempt on ${selectedNodes.length} selected nodes and ${selectedEdges.length} selected edges`);
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
    
    // Save state for undo before deleting
    saveState();
    
    // Delete selected edges (arrows) first - they have no protection
    if (selectedEdges.length > 0) {
        const edgeCount = selectedEdges.length;
        cy.batch(() => {
            selectedEdges.remove();
        });
        console.log(`✅ Deleted ${edgeCount} selected arrows`);
        
        // Save the board to persist changes
        saveBoard();
    }
    
    // Filter out ALL pinned cards using proper filtering
    const unpinnedNodes = selectedNodes.filter(function(node) {
        const hasClass = node.hasClass('pinned');
        const hasData = node.data('pinned');
        const isPinned = hasClass || hasData;
        
        console.log(`Node ${node.id()}: hasClass=${hasClass}, hasData=${hasData}, isPinned=${isPinned}`);
        return !isPinned;
    });
    
    const pinnedNodes = selectedNodes.filter(function(node) {
        const hasClass = node.hasClass('pinned');
        const hasData = node.data('pinned');
        return hasClass || hasData;
    });
    
    console.log(`Unpinned to delete: ${unpinnedNodes.length}, Pinned to skip: ${pinnedNodes.length}`);
    
    // Only delete unpinned nodes
    if (unpinnedNodes.length > 0) {
        const count = unpinnedNodes.length;
        unpinnedNodes.remove();
        console.log(`Successfully deleted ${count} unpinned cards`);
        updateSelectionInfo(); // Update after deletion
    }
    
    // Show message if user tried to delete pinned cards
    if (pinnedNodes.length > 0) {
        const pinnedCount = pinnedNodes.length;
        console.log(`PROTECTED: Skipped ${pinnedCount} pinned cards - unpin them first to delete`);
        
        // Show a brief visual feedback
        const searchInfo = document.getElementById('searchInfo');
        if (searchInfo) {
            searchInfo.textContent = `🔒 ${pinnedCount} pinnade kort skyddade - ta bort pinning först`;
            searchInfo.classList.add('visible');
            setTimeout(() => {
                searchInfo.classList.remove('visible');
            }, 4000);
        }
    }
}

// ====================================================================================================
// 🤖 GOOGLE GEMINI ASSISTANT
// ====================================================================================================

// Dialog to enter Google AI API key
function showGoogleAIAPIKeyDialog() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #333;">✨ Gemini AI Assistent</h2>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">
                För att använda bildigenkänning med Gemini behöver du en Google AI API-nyckel.
            </p>
            <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">
                <strong>Så här skaffar du en nyckel:</strong><br>
                1. Gå till <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #007bff;">Google AI Studio</a><br>
                2. Skapa ett konto eller logga in<br>
                3. Klicka på "Create API key"<br>
                4. Klistra in nyckeln här nedan
            </p>
            <p style="margin: 0 0 15px 0; color: #e67e22; font-size: 13px;">
                ⚠️ Din API-nyckel sparas endast lokalt i din webbläsare.
            </p>
            <input type="password" id="googleAiApiKeyInput" placeholder="Din Google AI API-nyckel..." style="
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-family: monospace;
                font-size: 14px;
                box-sizing: border-box;
                margin-bottom: 20px;
            ">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelApiKey" style="
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">Avbryt</button>
                <button id="saveApiKey" style="
                    padding: 10px 20px;
                    border: none;
                    background: #007bff;
                    color: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">Spara och fortsätt</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const input = document.getElementById('googleAiApiKeyInput');
        input.focus();

        const closeDialog = (key = null) => {
            overlay.remove();
            resolve(key);
        };

        document.getElementById('cancelApiKey').onclick = () => closeDialog();

        document.getElementById('saveApiKey').onclick = () => {
            const apiKey = input.value.trim();
            if (apiKey) {
                localStorage.setItem('googleAiApiKey', apiKey);
                closeDialog(apiKey);
            } else {
                alert('Vänligen ange en giltig API-nyckel.');
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('saveApiKey').click();
            }
        });

        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDialog();
            }
        });
    });
}

async function getGoogleAIAPIKey() {
    let apiKey = localStorage.getItem('googleAiApiKey');
    if (apiKey) {
        return apiKey;
    }
    
    apiKey = await showGoogleAIAPIKeyDialog();
    return apiKey;
}

// ========================================
// SORTING SYSTEM - EASY TO FIND
// ========================================
// Global sorting state
let sortMode = null; // null, 'textLength-asc', 'textLength-desc', 'alphabetic-asc', 'alphabetic-desc', 'color', 'date-asc', 'date-desc', 'temporal-asc', 'temporal-desc', 'tagCount'

function showSortMenu(event) {
