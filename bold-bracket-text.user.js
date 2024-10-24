// ==UserScript==
// @name         Bold Bracket Text
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Bold text inside brackets and "Age: x" where x is any number without altering existing styles
// @author       
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Set up the MutationObserver at the top so it's accessible within wrapRows
    const observer = new MutationObserver(wrapRows);

    function wrapRows() {
        // Disconnect the observer to prevent it from triggering due to our DOM changes
        observer.disconnect();

        const summaries = document.querySelectorAll('[data-testid="platform-board-kit.ui.swimlane.summary-section"]');

        summaries.forEach(summary => {
            // Check if the element has already been processed
            if (summary.getAttribute('data-processed') === 'true') {
                return; // Skip this element
            }

            // Process child nodes to bold text inside brackets and "Age: x"
            boldTextInsideBracketsAndAge(summary);

            // Mark this element as processed
            summary.setAttribute('data-processed', 'true');
        });

        // Reconnect the observer after modifications are done
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function boldTextInsideBracketsAndAge(element) {
        const childNodes = Array.from(element.childNodes);

        childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                // Process text nodes
                const text = node.nodeValue;
                const bracketRegex = /\[([^\]]+)\]/g;
                const ageRegex = /(Age:\s*\d+)/g;
                let lastIndex = 0;
                let fragments = [];
                let match;

                // Handle bracketed text
                while ((match = bracketRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        // Add text before the match
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create a span element for the bolded bracket text
                    const boldSpan = document.createElement('span');
                    boldSpan.style.fontWeight = 'bold';
                    boldSpan.textContent = match[0]; // Include the brackets

                    fragments.push(boldSpan);
                    lastIndex = bracketRegex.lastIndex;
                }

                // Handle "Age: x" where x is any number
                while ((match = ageRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        // Add text before the match
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create a span element for the bolded Age: x text
                    const boldSpan = document.createElement('span');
                    boldSpan.style.fontWeight = 'bold';
                    boldSpan.textContent = match[0]; // Include "Age: x"

                    fragments.push(boldSpan);
                    lastIndex = ageRegex.lastIndex;
                }

                // Add remaining text after the last match
                if (lastIndex < text.length) {
                    fragments.push(document.createTextNode(text.substring(lastIndex)));
                }

                // If any fragments were created, replace the original text node
                if (fragments.length > 0) {
                    const parent = node.parentNode;
                    fragments.forEach(fragment => {
                        parent.insertBefore(fragment, node);
                    });
                    parent.removeChild(node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Recursively process child elements
                boldTextInsideBracketsAndAge(node);
            }
        });
    }

    // Run the function on page load
    window.addEventListener('load', wrapRows);

    // Start observing mutations
    observer.observe(document.body, { childList: true, subtree: true });
})();
