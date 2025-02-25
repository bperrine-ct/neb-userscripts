// ==UserScript==
// @name         JIRA - Better Headers on Boards
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Wrap rows under headers into a bordered box
// @author       You
// @match        https://chirotouch.atlassian.net/*
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/better-board-headers.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/better-board-headers.user.js
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	function wrapRows() {
		const summaries = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
		);

		summaries.forEach(summary => {
			const text = summary.textContent;

			if (text.includes('─') || text.includes('═')) {
				// Increase the font size and add padding
				summary.style.fontSize = '20px'; // Adjust the size as needed
				summary.style.fontWeight = 'bold'; // Make the text bold
				summary.style.textAlign = 'center'; // Center the text

				// Find the parent component and add padding-top
				const parentWrapper = summary.closest(
					'[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
				);
				if (parentWrapper) {
					parentWrapper.style.paddingTop = '30px'; // Adjust the padding as needed
				}

				// Get theme from the html element
				const isDarkMode =
					document.documentElement.getAttribute('data-color-mode') === 'dark';
				const shadowColor = isDarkMode ? '#000' : '#fff';

				// Set the text color and shadow based on the header content
				if (text.includes('L3')) {
					summary.style.color = '#F79233';
					summary.style.textShadow = `0 0 3px ${shadowColor}`;
				} else if (text.includes('Defects')) {
					summary.style.color = '#D31800';
					summary.style.textShadow = `0 0 3px ${shadowColor}`;
				} else if (text.includes('STORIES')) {
					summary.style.color = '#64BA3B';
					summary.style.textShadow = `0 0 3px ${shadowColor}`;
				} else if (text.includes('ARCHITECTURE')) {
					summary.style.color = isDarkMode ? '#E8DD2B' : '#ABA41F';
					summary.style.textShadow = `0 0 3px ${shadowColor}`;
				} else if (text.includes('TECHNICAL')) {
					summary.style.color = '#4BAEE8';
					summary.style.textShadow = `0 0 3px ${shadowColor}`;
				} else {
					summary.style.color = isDarkMode ? '#4BAEE8' : '#2a66e4';
					summary.style.textShadow = `0 0 3px ${shadowColor}`;
				}

				// Find and hide the header elements
				const swimlaneContent = summary
					.closest('[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]')
					?.querySelector(
						'[data-testid="platform-board-kit.ui.swimlane.swimlane-content"]'
					);

				if (swimlaneContent) {
					swimlaneContent
						.querySelectorAll('img[src*="universal_avatar"]')
						.forEach(el => (el.style.display = 'none'));

					swimlaneContent
						.querySelectorAll('span.css-snhnyn')
						.forEach(el => (el.style.display = 'none'));
					swimlaneContent
						.querySelectorAll('div._11c8qk37._syaz1n3s')
						.forEach(el => (el.style.display = 'none'));
					swimlaneContent
						.querySelectorAll('div._1e0c1txw._13t37vkz._11ko1txw')
						.forEach(el => (el.style.display = 'none'));
					swimlaneContent
						.querySelectorAll('[data-testid="platform-card.common.ui.key.key"]')
						.forEach(el => (el.style.display = 'none'));
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
