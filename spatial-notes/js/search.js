        function performSearch(query) {
            if (!query.trim()) {
                clearSearch();
                return;
            }
            
            searchActive = true;
            let matchCount = 0;
            
            cy.nodes().forEach(node => {
                const title = (node.data('title') || '').toLowerCase();
                const text = (node.data('text') || '').toLowerCase();
                const tags = (node.data('tags') || []).join(' ').toLowerCase();
                const hiddenTags = (node.data('hidden_tags') || []).join(' ').toLowerCase();
                
                // IMAGE SEARCH INTEGRATION - Add image annotation and filename to searchable text
                const imageAnnotation = (node.data('annotation') || '').toLowerCase();
                const originalFileName = (node.data('originalFileName') || '').toLowerCase();
                const searchableImageText = imageAnnotation + ' ' + originalFileName;
                
                const searchableText = title + ' ' + text + ' ' + tags + ' ' + hiddenTags + ' ' + searchableImageText;
                
                const matches = evaluateBooleanQuery(query.toLowerCase(), searchableText);
                
                if (matches) {
                    node.addClass('search-match');
                    node.removeClass('search-non-match'); // Remove blur if it was there
                    node.data('searchMatch', true);
                    // Don't select directly - let ESC convert to selected
                    matchCount++;
                } else {
                    node.removeClass('search-match');
                    node.addClass('search-non-match'); // Add blur for non-matches
                    node.data('searchMatch', false);
                    node.unselect(); // Avmarkera kortet
                }
            });
            
            // Show search results info
            const searchInfo = document.getElementById('searchInfo');
            searchInfo.textContent = `${matchCount} kort hittade`;
            searchInfo.classList.add('visible');
            
            // Show/hide mobile select button
            const selectBtn = document.getElementById('searchSelectBtn');
            if (matchCount > 0) {
                selectBtn.style.display = 'inline-block';
            } else {
                selectBtn.style.display = 'none';
            }
            
            // Apply smart sorting to search results if in column view
            if (isColumnView && matchCount > 0) {
                applySmartSearchSorting();
            }
        }
        
        // Smart search sorting: week+todo priorities, then color order
        function applySmartSearchSorting() {
            // Get all search-matched nodes
            const matchedNodes = cy.nodes('.search-match').toArray();
            
            // Sort with complex priority system
            const sortedNodes = matchedNodes.sort((a, b) => {
                // Priority 1: Week tags + todo tags (oldest week first)
                const aWeekTodo = getWeekTodoPriority(a);
                const bWeekTodo = getWeekTodoPriority(b);
                if (aWeekTodo !== bWeekTodo) {
                    return aWeekTodo - bWeekTodo; // Lower number = higher priority
                }
                
                // Priority 2: Color order (röd, orange, vit, gul, lila, blå, grön, grå)
                const aColor = getColorPriority(a);
                const bColor = getColorPriority(b);
                return aColor - bColor;
            });
            
            // Apply visual order in column view
            if (isColumnView) {
                setTimeout(() => {
                    renderColumnView(); // This will use the sorted order
                }, 50);
            }
        }
        
        function getWeekTodoPriority(node) {
            const tags = (node.data('tags') || []).map(tag => tag.toLowerCase());
            const hasTodo = tags.some(tag => tag.includes('todo'));
            
            if (!hasTodo) return 1000; // No todo = lowest priority
            
            // Find week tags (format: 25v40, 24v52, etc.)
            const weekTags = tags.filter(tag => /\d{2}v\d{1,2}/.test(tag));
            if (weekTags.length === 0) return 500; // Todo but no week = medium priority
            
            // Get earliest week number for sorting
            let earliestWeek = 9999;
            weekTags.forEach(weekTag => {
                const match = weekTag.match(/(\d{2})v(\d{1,2})/);
                if (match) {
                    const year = parseInt(match[1]);
                    const week = parseInt(match[2]);
                    const sortValue = year * 100 + week; // 2540 for 25v40
                    earliestWeek = Math.min(earliestWeek, sortValue);
                }
            });
            
            return earliestWeek; // Lower week number = higher priority
        }
        
        function getColorPriority(node) {
            const cardColor = node.data('cardColor');
            if (!cardColor) return 8; // No color = lowest color priority
            
            // Extract color number (card-color-3 -> 3)
            const colorMatch = cardColor.match(/card-color-(\d)/);
            if (!colorMatch) return 8;
            
            const colorNum = parseInt(colorMatch[1]);
            
            // Color priority order: röd(3), orange(2), vit(8), gul(4), lila(5), blå(6), grön(1), grå(7)
            const colorOrder = {
                3: 1, // röd
                2: 2, // orange  
                8: 3, // vit
                4: 4, // gul
                5: 5, // lila
                6: 6, // blå
                1: 7, // grön
                7: 8  // grå
            };
            
            return colorOrder[colorNum] || 9;
        }
        
        // Boolean query evaluation
        function evaluateBooleanQuery(query, searchableText) {
            // Handle different boolean operators
            
            // Split by OR first (lowest precedence)
            if (query.includes(' or ')) {
                const orParts = query.split(' or ');
                return orParts.some(part => evaluateBooleanQuery(part.trim(), searchableText));
            }
            
            // Handle NOT operations - improved logic
            if (query.includes(' not ')) {
                const notIndex = query.indexOf(' not ');
                const beforeNot = query.substring(0, notIndex).trim();
                const afterNot = query.substring(notIndex + 5).trim(); // ' not '.length = 5
                
                // If there's something before NOT, it must match
                let beforeMatches = true;
                if (beforeNot) {
                    beforeMatches = evaluateBooleanQuery(beforeNot, searchableText);
                }
                
                // The part after NOT must NOT match
                const afterMatches = evaluateBooleanQuery(afterNot, searchableText);
                
                return beforeMatches && !afterMatches;
            }
            
            // Handle AND operations (default behavior and explicit)
            const andParts = query.includes(' and ') ? 
                query.split(' and ') : 
                query.split(' ').filter(term => term.length > 0);
                
            return andParts.every(term => {
                term = term.trim();
                if (term.startsWith('"') && term.endsWith('"')) {
                    // Exact phrase search
                    const phrase = term.slice(1, -1);
                    return searchableText.includes(phrase);
                } else {
                    // Regular word search
                    return searchableText.includes(term);
                }
            });
        }
        
