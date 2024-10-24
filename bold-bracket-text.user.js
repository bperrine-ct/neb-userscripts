// ==UserScript==
// @name         Better Headers on Boards
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Bold text inside brackets without altering existing styles
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

            // Process child nodes to bold text inside brackets
            boldTextInsideBrackets(summary);

            // Mark this element as processed
            summary.setAttribute('data-processed', 'true');
        });

        // Reconnect the observer after modifications are done
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function boldTextInsideBrackets(element) {
        const childNodes = Array.from(element.childNodes);

        childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                // Process text nodes
                const text = node.nodeValue;
                const regex = /\[([^\]]+)\]/g;
                let match;
                let lastIndex = 0;
                const fragments = [];

                while ((match = regex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        // Add text before the match
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create a span element for the bolded text
                    const boldSpan = document.createElement('span');
                    boldSpan.style.fontWeight = 'bold';
                    boldSpan.textContent = match[0]; // Include the brackets

                    fragments.push(boldSpan);

                    lastIndex = regex.lastIndex;
                }

                if (lastIndex < text.length) {
                    // Add remaining text after the last match
                    fragments.push(document.createTextNode(text.substring(lastIndex)));
                }

                if (fragments.length > 0) {
                    // Replace the original text node with the fragments
                    const parent = node.parentNode;
                    fragments.forEach(fragment => {
                        parent.insertBefore(fragment, node);
                    });
                    parent.removeChild(node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Recursively process child elements
                boldTextInsideBrackets(node);
            }
        });
    }

    // Run the function on page load
    window.addEventListener('load', wrapRows);

    // Start observing mutations
    observer.observe(document.body, { childList: true, subtree: true });
})();
