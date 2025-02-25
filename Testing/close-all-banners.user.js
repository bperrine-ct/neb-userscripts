// ==UserScript==
// @name         Close Nebula Banner Messages on Esc Key (Nested Shadow DOM Support)
// @namespace    https://nebula.care/
// @version      1.0
// @description  Automatically close banner messages on Esc key press, even in nested Shadow DOMs
// @author
// @match        https://*.nebula.care/*
// @match        https://practice.chirotouch.com/practice/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	// Utility function to recursively search nested Shadow DOM
	function querySelectorAllDeep(selector, root = document) {
		const elements = Array.from(root.querySelectorAll(selector));

		// Traverse Shadow DOM roots
		root.querySelectorAll('*').forEach(el => {
			if (el.shadowRoot) {
				elements.push(...querySelectorAllDeep(selector, el.shadowRoot));
			}
		});

		return elements;
	}

	// Utility function to check if element is a descendant of a selector (considering Shadow DOM)
	function isDescendantOf(element, selector) {
		let currentElement = element;
		while (currentElement) {
			if (currentElement.matches && currentElement.matches(selector)) {
				return true;
			}
			currentElement = currentElement.parentNode || currentElement.host;
		}
		return false;
	}

	// Listen for the Esc key press
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && !event.repeat) {
			// Esc key

			// Find all close icons
			const closeIcons = querySelectorAllDeep('neb-icon.icon-close');

			closeIcons.forEach(closeIcon => {
				// Check if the close icon is inside a neb-banner-message
				if (isDescendantOf(closeIcon, 'neb-banner-message')) {
					// Click the close icon
					closeIcon.click();
				}
			});

			if (!closeIcons.length) {
				console.warn('No close icons found. Make sure you are using the correct selector.');
			}
		}
	});
})();
