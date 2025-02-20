// ==UserScript==
// @name         JIRA Favicon and Title Cleaner
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Changes favicon based on issue type and cleans up page titles (optimized for Safari with logging)
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
	const cleanTitle = title => cleaners.reduce((current, cleaner) => cleaner(current), title);

	function isIssuePage() {
		return /\/browse\/[A-Z]+-\d+/.test(window.location.pathname);
	}

	function getIssueTypeIcon() {
		const issueHeader = document.getElementById('jira-issue-header');
		if (!issueHeader) {
			console.log('getIssueTypeIcon: issueHeader not found.');
			return null;
		}

		const icons = issueHeader.querySelectorAll('img[alt]:not([alt=""])');
		if (icons.length === 0) {
			console.log('getIssueTypeIcon: No valid icons found.');
			return null;
		}

		// Use the rightmost icon (last in the NodeList)
		const iconSrc = icons[icons.length - 1].src;
		console.log('getIssueTypeIcon: Found icon source:', iconSrc);
		return iconSrc;
	}

	function updateFavicon() {
		console.log('updateFavicon: Attempting to update favicon...');
		// Look for an existing favicon element (supports Safari by checking for "icon" in the rel)
		let linkElement = document.querySelector('link[rel*="icon"]');
		if (!linkElement) {
			console.log('updateFavicon: No existing favicon link found, creating one.');
			linkElement = document.createElement('link');
			linkElement.rel = 'icon';
			document.head.appendChild(linkElement);
		} else {
			console.log('updateFavicon: Existing favicon link found:', linkElement.href);
		}

		const newFavicon = isIssuePage() ? getIssueTypeIcon() || defaultFavicon : defaultFavicon;
		console.log('updateFavicon: New favicon URL determined as:', newFavicon);

		if (linkElement.href !== newFavicon) {
			console.log(
				`updateFavicon: Updating favicon from ${linkElement.href} to ${newFavicon}`
			);
			linkElement.href = newFavicon;
		} else {
			console.log('updateFavicon: Favicon already up-to-date.');
		}
	}

	function updateTitle() {
		const currentTitle = document.title;
		if (currentTitle !== previousTitle) {
			console.log('updateTitle: Title changed from:', previousTitle, 'to:', currentTitle);
			const newTitle = cleanTitle(currentTitle);
			if (newTitle !== currentTitle) {
				document.title = newTitle;
				console.log('updateTitle: Cleaned title to:', newTitle);
			}
			previousTitle = document.title;
		}
	}

	// Handle both favicon and title changes
	function updatePage() {
		updateFavicon();
		updateTitle();
	}

	// Initial check
	updatePage();

	// Use a single MutationObserver for the entire document to capture title and DOM changes
	const observer = new MutationObserver(updatePage);
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		characterData: true,
	});

	// Listen for URL changes (popstate and hashchange)
	window.addEventListener('popstate', () => {
		console.log('URL change detected via popstate.');
		updatePage();
	});
	window.addEventListener('hashchange', () => {
		console.log('URL hash change detected.');
		updatePage();
	});

	// Fallback interval for Safari in case MutationObserver misses some changes
	setInterval(() => {
		console.log('Fallback interval triggered.');
		updatePage();
	}, 1000);
})();
