// ==UserScript==
// @name         Better Headers on Boards
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Wrap rows under headers into a bordered box
// @author       You
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function wrapRows() {
        const summaries = document.querySelectorAll('[data-testid="platform-board-kit.ui.swimlane.summary-section"]');

        summaries.forEach(summary => {
            if (summary.textContent.includes('─') || summary.textContent.includes('═')) {
                // Increase the font size and add padding
                summary.style.fontSize = '20px'; // Adjust the size as needed
                summary.style.fontWeight = 'bold'; // Make the text bold
                summary.style.textAlign = 'center'; // Center the text

                // Find the parent component and add padding-top
                const parentWrapper = summary.closest('[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]');
                if (parentWrapper) {
                    parentWrapper.style.paddingTop = '30px'; // Adjust the padding as needed
                }
            }
        });
    }

    // Run the function on page load
    window.addEventListener('load', wrapRows);

    // Set up a MutationObserver to reapply the changes
    const observer = new MutationObserver(wrapRows);
    observer.observe(document.body, { childList: true, subtree: true });
})();
