// ==UserScript==
// @name         Bitbucket PR Enhancements
// @namespace    https://bitbucket.org/
// @version      1.0
// @description  Auto-clicks "Show X more", highlights/reorders [Ignore] PRs, highlights STALE PRs, highlights unit test files
// @match        https://bitbucket.org/*
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/Bitbucket/highlight-rows.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/Bitbucket/highlight-rows.user.js
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const highlightStaleColor = 'rgba(245, 205, 71, 0.3)'; // Semi-transparent #F5CD47
	const highlightIgnoreColor = 'rgba(52, 152, 219, 0.3)'; // Semi-transparent #3498db

	let debounceTimer = null;

	// 1) Auto-click any element with text like "Show X more..."
	//    so hidden PR rows become visible.
	function expandShowMore() {
		// Find all <span> elements whose text content starts with "Show " and then some digits, etc.
		// e.g. "Show 3 more...", "Show 12 more"
		// We'll use a regular expression to match "Show <number> more".
		const allSpans = document.querySelectorAll('span');
		allSpans.forEach(span => {
			// Skip if we already clicked this once
			if (span.dataset.expanded === 'true') return;

			const text = span.textContent.trim();
			// Regex to match "Show <digits> more" (optionally with ellipsis)
			// Example strings: "Show 3 more...", "Show 5 more", "Show 12 more..."
			if (/^Show\s+\d+\s+more(\.\.\.)?$/.test(text)) {
				span.click();
				// Mark so we don't click it again
				span.dataset.expanded = 'true';
			}
		});
	}

	// 2) Highlight & reorder PR rows
	function highlightAndReorder() {
		const prRows = document.querySelectorAll('tr[data-qa="pull-request-row"]');
		const ignoreRowsToMove = [];

		prRows.forEach(row => {
			// If this row was already processed, skip
			if (row.dataset.processed === 'true') return;

			const rowText = row.textContent;

			// Highlight rows containing "STALE"
			if (rowText.includes('STALE')) {
				row.style.backgroundColor = highlightStaleColor;
			}

			// If "[Ignore]" is found, highlight, remove text, queue for reordering
			if (rowText.includes('[Ignore]')) {
				row.style.backgroundColor = highlightIgnoreColor;

				// Remove "[Ignore]" from the link text
				const link = row.querySelector('a[data-qa="pull-request-row-link"]');
				if (link && link.textContent.includes('[Ignore]')) {
					link.textContent = link.textContent.replace('[Ignore]', '').trim();
				}

				ignoreRowsToMove.push(row);
			}

			// Mark this row as processed
			row.dataset.processed = 'true';
		});

		// Move [Ignore] rows to the bottom of their parent <tbody>
		ignoreRowsToMove.forEach(row => {
			row.parentNode.appendChild(row);
		});
	}

	// 3) Highlight unit test files
	function highlightUnitTestFiles() {
		// Find all elements with the specified class
		const elements = document.querySelectorAll('.css-2mk060.e1sanmi10');

		elements.forEach(element => {
			// Skip if this element was already processed
			if (element.dataset.testProcessed === 'true') return;

			// Find the associated div that contains the file path
			const filePathDiv = element.querySelector('div[id^="chg-"]');

			if (filePathDiv && filePathDiv.className === 'css-1wsg2j3 e1sanmi11') {
				// Check if the file path contains *.unit.test.js
				const filePath = filePathDiv.id.replace('chg-', '');

				if (filePath.includes('.unit.test.js')) {
					// Apply a thick outline with the ignore color instead of background
					element.style.outline = `4px solid ${highlightIgnoreColor}`;
					element.style.outlineOffset = '-4px';
				}
			}

			// Mark as processed
			element.dataset.testProcessed = 'true';
		});
	}

	// 4) Run all actions together, debounced
	function performAllActions() {
		// Cancel any existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		// Debounce so multiple DOM changes in quick succession only trigger once
		debounceTimer = setTimeout(() => {
			expandShowMore();
			highlightAndReorder();
			highlightUnitTestFiles();
			debounceTimer = null;
		}, 250); // Adjust delay as you see fit
	}

	// Attempt to observe a narrower container if possible
	const prContainer =
		document.querySelector('table[data-qa="pull-request-table"]') ||
		document.querySelector('[data-qa="pull-request-table"]') ||
		document.body; // fallback if the above selectors fail

	// Run immediately on load
	performAllActions();

	// Observe container for DOM changes
	const observer = new MutationObserver(() => {
		performAllActions();
	});

	observer.observe(prContainer, {
		childList: true,
		subtree: true,
	});
})();
