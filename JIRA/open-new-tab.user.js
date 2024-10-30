// ==UserScript==
// @name         JIRA - Open New Tab
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Open a new tab when clicking on a link and prevent default behavior
// @author       You
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// @icon         https://i.postimg.cc/MGhDmj8M/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/open-new-tab.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/open-new-tab.user.js
// ==/UserScript==

(function () {
	'use strict';

	function openLinksInNewTab() {
		const linkButtons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"], [data-component-selector="platform-board-kit.ui.column.draggable-column"]'
		);
		linkButtons.forEach(button => {
			// Check if the event listener is already attached
			if (!button.dataset.listenerAdded) {
				button.addEventListener('click', function (event) {
					event.preventDefault();
					event.stopPropagation(); // Stop the event from propagating further
					const link = button.querySelector('a');
					if (link) {
						window.open(link.href, '_blank');
					}
				});
				// Mark the button as having the listener attached
				button.dataset.listenerAdded = true;
			}
		});
	}

	// Run the function on page load
	window.addEventListener('load', openLinksInNewTab);

	// Set up a MutationObserver to reapply the changes when DOM changes
	const observer = new MutationObserver(openLinksInNewTab);
	observer.observe(document.body, { childList: true, subtree: true });
})();
