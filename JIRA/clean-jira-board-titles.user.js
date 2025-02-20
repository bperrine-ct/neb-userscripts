// ==UserScript==
// @name         Clean Jira Board Titles
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Removes the sprint prefix from Jira board titles
// @author       Ben
// @match        https://chirotouch.atlassian.net/jira/software/c/projects/NEB/boards/*
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/clean-jira-board-titles.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/clean-jira-board-titles.user.js
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	let previousTitle = document.title;

	// Create a title observer
	const titleObserver = new MutationObserver(() => {
		const currentTitle = document.title;

		// Only proceed if the title has actually changed
		if (currentTitle !== previousTitle) {
			console.log('Title changed from:', previousTitle, 'to:', currentTitle);

			// Match pattern like "GottaKeepEmAllocated-Sp-4-25 - "
			const sprintPrefixRegex = /^[^-]+-Sp-\d+-\d+\s+-\s+/;
			if (sprintPrefixRegex.test(currentTitle)) {
				const newTitle = currentTitle.replace(sprintPrefixRegex, '');
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
