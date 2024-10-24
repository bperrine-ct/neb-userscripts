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
                let text = node.nodeValue;
                const bracketRegex = /\[([^\]]+)\]/g;
                const ageRegex = /(Age:\s*\d+)/g;
                const numberRegex = /\d+/g;
                const nebRegex = /NEB-\d+/g; // Regex to match "NEB-#####"
                let lastIndex = 0;
                let fragments = [];
                let match;

                // Remove "NEB-#####" text
                text = text.replace(nebRegex, '');

                // Handle bracketed text
                while ((match = bracketRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        // Add text before the match
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create a span element for the text with a black background
                    const backgroundSpan = document.createElement('span');
                    backgroundSpan.style.backgroundColor = 'black';
                    backgroundSpan.style.color = 'white';
                    backgroundSpan.textContent = match[0]; // Include the brackets

                    // Bold all numbers within the bracketed text
                    backgroundSpan.innerHTML = backgroundSpan.innerHTML.replace(numberRegex, (num) => {
                        return `<span style="font-weight: bold;">${num}</span>`;
                    });

                    fragments.push(backgroundSpan);
                    lastIndex = bracketRegex.lastIndex;
                }

                // Handle "Age: x" where x is any number
                while ((match = ageRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        // Add text before the match
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    // Create a span element for the text with a black background
                    const backgroundSpan = document.createElement('span');
                    backgroundSpan.style.backgroundColor = 'black';
                    backgroundSpan.style.color = 'white';
                    backgroundSpan.textContent = match[0]; // Include "Age: x"

                    // Bold the number in "Age: x"
                    backgroundSpan.innerHTML = backgroundSpan.innerHTML.replace(numberRegex, (num) => {
                        return `<span style="font-weight: bold;">${num}</span>`;
                    });

                    fragments.push(backgroundSpan);
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
