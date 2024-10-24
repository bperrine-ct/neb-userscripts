// ==UserScript==
// @name         Open New Tab
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Open a new tab when clicking on a link and prevent default behavior
// @author       You
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function openLinksInNewTab() {
        const linkButtons = document.querySelectorAll('[data-testid="platform-board-kit.ui.swimlane.link-button"]');
        linkButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();  // Stop the event from propagating further
                const link = button.querySelector('a');
                if (link) {
                    window.open(link.href, '_blank');
                }
            });
        });
    }

    // Run the function on page load
    window.addEventListener('load', openLinksInNewTab);

    // Set up a MutationObserver to reapply the changes when DOM changes
    const observer = new MutationObserver(openLinksInNewTab);
    observer.observe(document.body, { childList: true, subtree: true });
})();
