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
	const unitTestIconUrl = 'https://i.postimg.cc/4dnBvhRR/Unit-Test.png';

	let debounceTimer = null;

	// Add CSS styles for unit test icons
	function addCustomStyles() {
		const styleElement = document.createElement('style');
		styleElement.textContent = `
			.unit-test-icon {
				width: 16px;
				height: 16px;
				background-image: url('${unitTestIconUrl}');
				background-size: contain;
				background-repeat: no-repeat;
				position: relative;
				display: inline-block;
				margin-right: 5px;
				vertical-align: middle;
				z-index: 1000;
			}
		`;
		document.head.appendChild(styleElement);
	}

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

	// 3) Highlight unit test files and change their icons
	function highlightUnitTestFiles() {
		console.log('Running highlightUnitTestFiles');

		// Find all file links
		const fileLinks = document.querySelectorAll('a[href^="#chg-"]');
		console.log('Found file links:', fileLinks.length);

		fileLinks.forEach(link => {
			// Skip if this element was already processed
			if (link.dataset.testProcessed === 'true') return;

			// Get the file path from the href attribute
			const filePath = link.getAttribute('href').replace('#chg-', '');

			// Check if the file path contains .unit.test.js
			if (filePath.includes('.unit.test.js')) {
				console.log('Found unit test file:', filePath);

				// Apply a thick outline to the parent element with class css-2mk060
				const parentElement = link.closest('.css-2mk060.e1sanmi10');
				if (parentElement) {
					parentElement.style.outline = `4px solid ${highlightIgnoreColor}`;
					parentElement.style.outlineOffset = '-4px';
					console.log('Applied outline to parent element');
				}

				// Find the icon container - try multiple selectors
				const iconContainer =
					link.querySelector('.css-1wits42') ||
					link.querySelector('[data-vc="icon-undefined"]') ||
					link.querySelector('svg').closest('span');

				if (iconContainer) {
					console.log('Found icon container:', iconContainer);

					// Hide the original icon
					iconContainer.style.display = 'none';

					// Create a new icon element
					const newIcon = document.createElement('img');
					newIcon.className = 'unit-test-icon';
					newIcon.src = unitTestIconUrl;
					newIcon.width = 16;
					newIcon.height = 16;
					newIcon.alt = 'Unit Test';

					// Insert the new icon at the beginning of the link
					link.insertBefore(newIcon, link.firstChild);
					console.log('Inserted new icon');
				} else {
					console.log('Icon container not found');
				}
			}

			// Mark as processed
			link.dataset.testProcessed = 'true';
		});

		// Also handle file headers
		replaceFileHeaderIcons();
	}

	// Replace icons in file headers for unit test files
	function replaceFileHeaderIcons() {
		console.log('Checking file headers');

		// Find all file headers
		const fileHeaders = document.querySelectorAll('div[data-qa="bk-file__header"]');
		console.log('Found file headers:', fileHeaders.length);

		fileHeaders.forEach(header => {
			// Skip if this header was already processed
			if (header.dataset.testHeaderProcessed === 'true') return;

			// Find the file path element
			const filePathElement = header.querySelector('h2[data-qa="bk-filepath"]');
			if (!filePathElement) return;

			// Get the file path text
			const filePathText = filePathElement.textContent;

			// Check if it's a unit test file
			if (filePathText.includes('.unit.test.js')) {
				console.log('Found unit test file header:', filePathText);

				// Find the icon container
				const iconContainer = header.querySelector('.css-1wits42');
				if (iconContainer) {
					console.log('Found header icon container');

					// Hide the original icon
					iconContainer.style.display = 'none';

					// Create a new icon element
					const newIcon = document.createElement('img');
					newIcon.className = 'unit-test-icon';
					newIcon.src = unitTestIconUrl;
					newIcon.width = 16;
					newIcon.height = 16;
					newIcon.alt = 'Unit Test';

					// Insert the new icon next to the hidden one
					iconContainer.parentNode.insertBefore(newIcon, iconContainer);
					console.log('Inserted new header icon');
				}

				// Add a thick outline to the header
				header.style.outline = `4px solid ${highlightIgnoreColor}`;
				header.style.outlineOffset = '-4px';
			}

			// Mark as processed
			header.dataset.testHeaderProcessed = 'true';
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

	// Add custom styles
	addCustomStyles();

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
