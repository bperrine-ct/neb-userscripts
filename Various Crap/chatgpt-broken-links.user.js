// ==UserScript==
// @name         ChatGPT - Broken Link Highlighter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Highlights broken links in yellow
// @author       You
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @icon         https://chatgpt.com/favicon.ico
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/Various Crap/chatgpt-broken-links.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/Various Crap/chatgpt-broken-links.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
	'use strict';

	const styles = `
        .broken-link {
            color: #cc3300 !important;
        }
    `;

	// Add styles to document
	const styleSheet = document.createElement('style');
	styleSheet.textContent = styles;
	document.head.appendChild(styleSheet);

	// Function to check and update links
	const processLinks = () => {
		const links = document.querySelectorAll('a[rel="noopener"][target="_new"]');

		links.forEach(link => {
			const hasHref = link.hasAttribute('href');

			// Remove existing classes
			link.classList.remove('broken-link');

			// Only add broken-link class if needed
			if (!hasHref) {
				link.classList.add('broken-link');
			}
		});
	};

	// Create and observe DOM changes
	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			// Check if the href attribute was modified
			if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
				processLinks();
			} else if (mutation.type === 'childList') {
				processLinks();
			}
		});
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['href'],
	});

	// Initial processing
	processLinks();
})();
