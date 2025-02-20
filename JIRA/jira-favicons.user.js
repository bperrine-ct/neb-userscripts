// ==UserScript==
// @name         JIRA Favicon and Title Cleaner
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Changes favicon based on issue type and cleans up page titles
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// @icon         https://chirotouch.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/jira-favicons.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/jira-favicons.user.js
// ==/UserScript==

(function () {
	'use strict';

	let previousTitle = document.title;

	const defaultFavicon =
		'https://chirotouch.atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/14627?size=xxlarge';

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

	function isIssuePage() {
		return /\/browse\/[A-Z]+-\d+/.test(window.location.pathname);
	}

	function getIssueTypeIcon() {
		const issueHeader = document.getElementById('jira-issue-header');
		if (!issueHeader) return null;

		const icons = issueHeader.querySelectorAll('img[alt]:not([alt=""])');
		if (icons.length === 0) return null;

		// Get the rightmost icon (last in the NodeList)
		const lastIcon = icons[icons.length - 1];
		return lastIcon.src;
	}

	function changeFavicon() {
		const linkElement =
			document.querySelector('link[rel="shortcut icon"]') || document.createElement('link');
		linkElement.type = 'image/x-icon';
		linkElement.rel = 'shortcut icon';

		if (isIssuePage()) {
			const issueTypeIcon = getIssueTypeIcon();
			linkElement.href = issueTypeIcon || defaultFavicon;
		} else {
			linkElement.href = defaultFavicon;
		}

		document.head.appendChild(linkElement);
	}

	// Handle both favicon and title changes
	function updatePage() {
		// Update favicon
		changeFavicon();

		// Update title
		const currentTitle = document.title;
		if (currentTitle !== previousTitle) {
			console.log('Title changed from:', previousTitle, 'to:', currentTitle);

			const newTitle = cleanTitle(currentTitle);
			if (newTitle !== currentTitle) {
				document.title = newTitle;
				console.log('Cleaned title to:', newTitle);
			}

			previousTitle = document.title;
		}
	}

	// Initial check
	updatePage();

	// Set up a MutationObserver to watch for changes in the DOM
	const observer = new MutationObserver(updatePage);
	observer.observe(document.body, { childList: true, subtree: true });

	// Also observe title changes specifically
	const titleObserver = new MutationObserver(updatePage);
	titleObserver.observe(document.querySelector('title') || document.head, {
		subtree: true,
		characterData: true,
		childList: true,
	});

	// Listen for URL changes
	window.addEventListener('popstate', updatePage);
})();
