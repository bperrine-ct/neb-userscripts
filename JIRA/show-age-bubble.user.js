// ==UserScript==
// @name         Jira NEB Age Bubble
// @namespace    https://chirotouch.atlassian.net/
// @version      0.1.1
// @description  Show a bubble with the ticket's Age on the left
// @match        https://chirotouch.atlassian.net/jira/software/c/projects/NEB/boards/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	/**
	 * A small CSS snippet to style the age bubble.
	 * Adjust as you see fit (colors, spacing, font size, etc.).
	 */
	const bubbleCSS = `
    .neb-age-bubble {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #FF5630;   /* A Jira-ish red color, pick any */
      color: #FFFFFF;
      font-weight: bold;
      font-size: 0.75rem;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      margin-left: 8px;  /* Adjusted to place bubble after subtask icons */
      z-index: 9999;
      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .neb-age-has-bubble {
      position: relative !important;
    }
  `;

	// Inject the above CSS into the page
	function addGlobalStyle(css) {
		const style = document.createElement('style');
		style.innerHTML = css;
		document.head.appendChild(style);
	}
	addGlobalStyle(bubbleCSS);

	/**
	 * Extracts the "Age: XX" from the given text (e.g., from aria-label).
	 * Returns either the numeric string (e.g., "28") or null if not found.
	 */
	function extractAge(text) {
		// Looking for:  "Age: <number>"
		// e.g. "NEB-83167 - [DATA FIX REQUIRED] ...  || Age: 28"
		const match = text.match(/\bAge:\s*(\d+)\b/i);
		return match ? match[1] : null;
	}

	/**
	 * Insert (or update) the bubble for a given issue card element, if needed.
	 */
	function insertAgeBubble(issueCard) {
		// 1) Check if the card already has a bubble to avoid duplicates
		if (issueCard.querySelector('.neb-age-bubble')) {
			return; // Already has a bubble
		}

		// 2) Attempt to find the aria-label or text that includes "Age: XX"
		const ariaLabel = issueCard.getAttribute('aria-label') || '';
		const foundAge = extractAge(ariaLabel);
		if (!foundAge) {
			return; // No age found in text
		}

		// 3) If we do have an age, add the bubble
		issueCard.classList.add('neb-age-has-bubble');

		const bubble = document.createElement('span');
		bubble.className = 'neb-age-bubble';
		bubble.textContent = foundAge; // e.g., "28"

		// 4) Place bubble after the subtask icons
		const subtaskIcon = issueCard.querySelector('span[role="img"][aria-label="subtaskIcon"]');
		if (subtaskIcon) {
			subtaskIcon.after(bubble);
		} else {
			// Fallback if no subtask icon is found
			issueCard.prepend(bubble);
		}
	}

	/**
	 * Scans all issue-cards on the page and tries to insert an age bubble.
	 */
	function scanForAgeBubbles() {
		// Each backlog item on Jira boards typically has
		// a data-testid that starts with "software-backlog.card-list.card.content-container..."
		// and the clickable area usually has a class with `_kqswstnw ...`.
		// But we specifically want the <div tabindex="0" role="button" aria-label="...Age: XX..." >
		// That element typically has:
		//    data-testid="software-backlog.card-list.card.card-contents.interaction-layer.accessible-card"
		const allIssueCards = document.querySelectorAll(
			'div[data-testid^="software-backlog.card-list.card.card-contents.interaction-layer.accessible-card"]'
		);

		allIssueCards.forEach(card => {
			insertAgeBubble(card);
		});
	}

	// Observe the entire backlog container, because Jira lazy-loads and re-renders
	const backlogRoot = document.body;
	if (!backlogRoot) return;

	const observer = new MutationObserver(() => {
		// Whenever the DOM changes, attempt a re-scan
		scanForAgeBubbles();
	});

	observer.observe(backlogRoot, {
		childList: true,
		subtree: true,
	});

	// Initial scan
	scanForAgeBubbles();
})();
