// ==UserScript==
// @name         JIRA Favicon and Title Cleaner (Specific Issue-Type Containers)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Changes favicon based on the issue type icon from known Jira "issue-type" containers
// @match        https://chirotouch.atlassian.net/*
// @grant        GM.xmlHttpRequest
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
		// e.g. document.querySelector('[data-testid="issue.views.issue-base.foundation.change-issue-type.tooltip--container"]');
		const container = document.querySelector(
			`[data-testid="issue.views.issue-base.foundation.breadcrumbs.breadcrumb-current-issue-container"]`
		);
		if (container) {
			// Look for an <img> within that container
			const img = container.querySelector('img');
			if (img && img.src) {
				return img.src;
			}
		}

		// If neither container was found or no <img> was inside them,
		// return null to trigger our fallback.
		console.log('[Jira Favicons] No matching issue-type container found.');
		return null;
	}

	async function changeFavicon() {
		// Remove any existing favicons
		const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
		existingFavicons.forEach(favicon => favicon.remove());

		try {
			let iconUrl = defaultFavicon;
			if (isIssuePage()) {
				const issueIcon = getIssueTypeIcon();
				if (issueIcon) {
					iconUrl = issueIcon;
				}
			}

			// Fetch the image and convert to base64
			const response = await GM.xmlHttpRequest({
				method: 'GET',
				url: iconUrl,
				responseType: 'arraybuffer',
			});

			const base64 = btoa(
				new Uint8Array(response.response).reduce(
					(data, byte) => data + String.fromCharCode(byte),
					''
				)
			);

			const dataUrl = `data:image/png;base64,${base64}`;

			// Create and add the favicon link that works in Safari
			const link = document.createElement('link');
			link.type = 'image/x-icon';
			link.rel = 'shortcut icon';
			link.href = dataUrl;
			document.head.appendChild(link);
		} catch (error) {
			console.error('[Jira Favicons] Error setting favicon:', error);
		}
	}

	async function updatePage() {
		await changeFavicon();

		const currentTitle = document.title;
		if (currentTitle !== previousTitle) {
			const newTitle = cleanTitle(currentTitle);
			if (newTitle !== currentTitle) {
				document.title = newTitle;
			}
			previousTitle = newTitle;
		}
	}

	// Initial run
	updatePage();

	// Watch the DOM for changes (Jira often updates in place)
	const observer = new MutationObserver(updatePage);
	observer.observe(document.body, { childList: true, subtree: true });

	// Also watch title changes specifically
	const titleObserver = new MutationObserver(updatePage);
	titleObserver.observe(document.querySelector('title') || document.head, {
		subtree: true,
		characterData: true,
		childList: true,
	});

	// Listen for URL changes
	window.addEventListener('popstate', updatePage);
})();
