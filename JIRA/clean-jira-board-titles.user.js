// ==UserScript==
// @name         Clean Jira Board Titles
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Cleans up Jira page titles by removing sprint prefixes and bracketed content
// @author       Ben
// @match        https://chirotouch.atlassian.net/*
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/clean-jira-board-titles.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/clean-jira-board-titles.user.js
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	let previousTitle = document.title;

	// Title cleaning functions
	const cleaners = [
		// Remove sprint prefix (e.g., "GottaKeepEmAllocated-Sp-4-25 - ")
		title => title.replace(/^[^-]+-Sp-\d+-\d+\s+-\s+/, ''),
		// Remove anything in brackets (e.g., "[Done]" or "[In Progress]")
		title => title.replace(/\s*\[[^\]]*\]\s*/g, ' '),
		// Clean up any double spaces and trim
		title => title.replace(/\s+/g, ' ').trim(),
	];

	// Apply all cleaners in sequence
	const cleanTitle = title => {
		return cleaners.reduce((current, cleaner) => cleaner(current), title);
	};

	// Create a title observer
	const titleObserver = new MutationObserver(() => {
		const currentTitle = document.title;

		// Only proceed if the title has actually changed
		if (currentTitle !== previousTitle) {
			console.log('Title changed from:', previousTitle, 'to:', currentTitle);

			const newTitle = cleanTitle(currentTitle);
			if (newTitle !== currentTitle) {
				document.title = newTitle;
				console.log('Cleaned title to:', newTitle);
			}

			previousTitle = document.title;
		}
	});

	// Start observing the title
	titleObserver.observe(document.querySelector('title') || document.head, {
		subtree: true,
		characterData: true,
		childList: true,
	});
})();
