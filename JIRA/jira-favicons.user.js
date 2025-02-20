// ==UserScript==
// @name         JIRA Favicon and Title Cleaner (Specific Issue-Type Containers)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Changes favicon based on the issue type icon from known Jira "issue-type" containers
// @match        https://chirotouch.atlassian.net/*
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/jira-favicons.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/jira-favicons.user.js
// ==/UserScript==

(function () {
	'use strict';

	// Keep track of previous page title
	let previousTitle = document.title;

	// Default fallback favicon
	const defaultFavicon =
		'https://chirotouch.atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/14627?size=xxlarge';

	// Title cleaning functions (modify as needed)
	const cleaners = [
		// Example: remove sprint prefix like "Team-Sp-1-2 - "
		title => title.replace(/^[^-]+-Sp-\d+-\d+\s+-\s+/, ''),

		// Remove anything in brackets "[Done]" etc.
		title => title.replace(/\s*\[[^\]]*\]\s*/g, ' '),

		// Clean up extra spaces, then trim
		title => title.replace(/\s+/g, ' ').trim(),
	];

	function cleanTitle(title) {
		return cleaners.reduce((current, fn) => fn(current), title);
	}

	// Quick check if we're on a /browse/PROJECT-123 style page
	function isIssuePage() {
		return /\/browse\/[A-Z]+-\d+/.test(window.location.pathname);
	}

	/**
	 * Attempt to find the *current* issue-type icon by scanning the
	 * known container test-IDs in the given order.
	 */
	function getIssueTypeIcon() {
		const container = document.querySelector(
			`[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]`
		);
		if (!container) {
			console.log('[Jira Favicons] No matching issue container found.');
			return null;
		}

		// Try to find the icon in the change-issue-type container first
		const changeTypeContainer = container.querySelector(
			'[data-testid="issue.views.issue-base.foundation.change-issue-type.tooltip--container"]'
		);
		if (changeTypeContainer) {
			const img = changeTypeContainer.querySelector('img');
			if (img) {
				return img;
			}
		}

		// Try to find the icon in the noneditable-issue-type container as fallback
		const noneditableContainer = container.querySelector(
			'[data-testid="issue-view-foundation.noneditable-issue-type.tooltip--container"]'
		);
		if (noneditableContainer) {
			const img = noneditableContainer.querySelector('img');
			if (img) {
				return img;
			}
		}

		console.log('[Jira Favicons] No matching issue-type icon found.');
		return null;
	}

	function changeFavicon() {
		// Remove any existing favicons
		const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
		existingFavicons.forEach(favicon => favicon.remove());

		try {
			let icon = null;
			if (isIssuePage()) {
				icon = getIssueTypeIcon();
			}

			// Create and add the favicon link that works in Safari
			const link = document.createElement('link');
			link.type = 'image/x-icon';
			link.rel = 'shortcut icon';
			link.href = icon ? icon.src : defaultFavicon;
			document.head.appendChild(link);
		} catch (error) {
			console.error('[Jira Favicons] Error setting favicon:', error);
		}
	}

	function updatePage() {
		changeFavicon();

		const currentTitle = document.title;
		if (currentTitle !== previousTitle) {
			const newTitle = cleanTitle(currentTitle);
			if (newTitle !== currentTitle) {
				document.title = newTitle;
			}
			previousTitle = newTitle;
		}
	}

	// Wait for page load before initial run
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => setTimeout(updatePage, 500));
	} else {
		setTimeout(updatePage, 500);
	}

	// Watch the DOM for changes (Jira often updates in place)
	const observer = new MutationObserver(() => {
		// Debounce the updates to prevent too many rapid changes
		clearTimeout(observer.timeout);
		observer.timeout = setTimeout(updatePage, 250);
	});
	observer.observe(document.body, { childList: true, subtree: true });

	// Also watch title changes specifically
	const titleObserver = new MutationObserver(() => {
		clearTimeout(titleObserver.timeout);
		titleObserver.timeout = setTimeout(updatePage, 250);
	});
	titleObserver.observe(document.querySelector('title') || document.head, {
		subtree: true,
		characterData: true,
		childList: true,
	});

	// Listen for URL changes with a small delay
	window.addEventListener('popstate', () => {
		setTimeout(updatePage, 500);
	});
})();
