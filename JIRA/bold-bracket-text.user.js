// ==UserScript==
// @name         JIRA - Bold & Highlight Ticket Text & Store L3 Update Date in GM
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Bold text inside brackets, highlight high-priority rows, and when opening a ticket page, extract and store its L3 update date in GM storage. Board view then reads the stored date.
// @author
// @match        https://chirotouch.atlassian.net/*
// @icon         https://i.postimg.cc/FFbZ0RCz/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/bold-bracket-text.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/bold-bracket-text.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
	'use strict';

	/******************************************************************
	 * 1. When opening a ticket page, extract and store its update date
	 ******************************************************************/
	function extractAndStoreL3UpdateDate() {
		// Only run on ticket pages; the URL should contain "/browse/NEB-####"
		const ticketMatch =
			window.location.pathname.match(/\/browse\/(NEB-\d+)/);
		if (!ticketMatch) {
			return;
		}
		const ticketId = ticketMatch[1];
		console.log(`[Ticket Page] Detected ticket page for ${ticketId}`);

		// Find the container that includes "Dev / QA Status"
		// (We simply search all divs for text including that phrase.)
		const container = Array.from(document.querySelectorAll('div')).find(
			div => div.textContent.includes('Dev / QA Status')
		);
		if (!container) {
			console.log(
				`[Ticket Page] No "Dev / QA Status" container found for ${ticketId}`
			);
			return;
		}
		console.log(
			`[Ticket Page] Found "Dev / QA Status" container for ${ticketId}`
		);
		const containerText = container.textContent;
		console.log(`[Ticket Page] Container text: "${containerText}"`);

		// Look for a date in square brackets, e.g. "[ 02/12 ]"
		const dateMatch = containerText.match(/\[\s*(\d{1,2}\/\d{1,2})\s*\]/);
		if (dateMatch) {
			const date = dateMatch[1];
			const currentStoredDate = GM_getValue(ticketId, '');

			// Only update if the date has changed
			if (currentStoredDate !== date) {
				console.log(
					`[Ticket Page] Extracted update date for ${ticketId}: ${date} (changed from ${currentStoredDate})`
				);
				GM_setValue(ticketId, date);
			}
		} else {
			console.log(`[Ticket Page] No update date found for ${ticketId}`);
		}
	}

	/******************************************************************
	 * 2. Board view processing – read the stored date and display it.
	 ******************************************************************/
	function processL3UpdateDates() {
		console.log(
			'[Board View] Processing L3 update dates from GM storage...'
		);
		// Find all cards on the board.
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);
		buttons.forEach(button => {
			// Only process each card once.
			if (button.getAttribute('data-l3-date-checked') === 'true') {
				return;
			}
			// Look inside the summary section for "L3 Request"
			const summary = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
			);
			if (summary && summary.textContent.includes('L3 Request')) {
				// Get the ticket id from the key element (e.g. "NEB-85006")
				const keyElem = button.querySelector(
					'[data-testid="platform-card.common.ui.key.key"]'
				);
				if (keyElem) {
					const ticketId = keyElem.textContent.trim();
					console.log(
						`[Board View] Found L3 Request row for ticket: ${ticketId}`
					);
					// Read the stored update date from GM storage
					const storedDate = GM_getValue(ticketId, '');
					if (storedDate) {
						const separatorBefore = document.createElement('span');
						separatorBefore.style.margin = '0 8px';
						separatorBefore.style.borderLeft =
							'2px solid rgba(255, 255, 255, 0.3)';
						separatorBefore.style.height = '16px';
						separatorBefore.style.display = 'inline-block';
						separatorBefore.style.verticalAlign = 'middle';

						const updateDateSpan = document.createElement('span');
						updateDateSpan.className = 'l3-update-date';
						updateDateSpan.style.fontWeight = 'normal';
						updateDateSpan.style.marginLeft = '10px';
						updateDateSpan.style.color = 'white';
						updateDateSpan.style.textShadow = '1px 1px 2px black';
						updateDateSpan.style.padding = '2px 8px';
						updateDateSpan.style.borderRadius = '4px';
						updateDateSpan.style.fontSize = '12px';
						updateDateSpan.style.backgroundColor = '#F79233'; // L3 Request color
						updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;

						const separatorAfter = document.createElement('span');
						separatorAfter.style.margin = '0 8px';
						separatorAfter.style.padding = '0 8px';
						separatorAfter.style.borderLeft =
							'2px solid rgba(255, 255, 255, 0.3)';
						separatorAfter.style.height = '16px';
						separatorAfter.style.display = 'inline-block';
						separatorAfter.style.verticalAlign = 'middle';

						summary.appendChild(separatorBefore);
						summary.appendChild(updateDateSpan);
						summary.appendChild(separatorAfter);
						console.log(
							`[Board View] Appended stored update date for ${ticketId}: ${storedDate}`
						);
					} else {
						console.log(
							`[Board View] No stored update date found for ${ticketId}`
						);
					}
				}
			}
			button.setAttribute('data-l3-date-checked', 'true');
		});
	}

	/******************************************************************
	 * 3. Existing functions for formatting & highlighting
	 ******************************************************************/
	function applyFormatting() {
		const summaries = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
		);
		summaries.forEach(summary => {
			if (summary.getAttribute('data-processed') !== 'true') {
				boldTextInsideBracketsAndAge(summary);
				summary.setAttribute('data-processed', 'true');
			}
		});
	}

	function highlightCriticalRows() {
		const rows = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
		);
		rows.forEach(row => {
			const linkButtons = row.querySelectorAll(
				'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
			);
			linkButtons.forEach(button => {
				if (button.getAttribute('data-processed') !== 'true') {
					const text = button.textContent;
					const isHighPriority = [
						'[Major',
						'[Critical',
						'Patch',
						'Promotion',
					].some(keyword => text.includes(keyword));
					if (isHighPriority) {
						button.style.backgroundColor = 'rgba(211, 24, 0, 0.1)';
						console.log(
							`[highlightCriticalRows] Marking high priority: ${text.trim()}`
						);
					}
					button.setAttribute('data-processed', 'true');
				}
			});
		});
	}

	function boldTextInsideBracketsAndAge(element) {
		const childNodes = Array.from(element.childNodes);
		childNodes.forEach(node => {
			if (node.nodeType === Node.TEXT_NODE) {
				let text = node.nodeValue;
				const bracketRegex = /\[([^\]]+)\]/g;
				const ageRegex = / Age:\s*(\d+)/;
				const numberRegex = /^\d+$/;
				const nebRegex = /NEB-\d+\s*-?\s*/g;
				const pipeRegex = /\|\|/g;
				const ageMatch = text.match(ageRegex);
				const age = ageMatch ? ` Age: ${ageMatch[1]}` : '';
				text = text.replace(ageRegex, '');
				text = text.replace(pipeRegex, '');
				text = text.replace(nebRegex, '');
				let lastIndex = 0;
				let fragments = [];
				let match;
				let isFirstHighlight = true;

				while ((match = bracketRegex.exec(text)) !== null) {
					if (match.index > lastIndex) {
						fragments.push(
							document.createTextNode(
								text.substring(lastIndex, match.index)
							)
						);
					}
					let content = match[1].trim();
					if (content === '0') {
						lastIndex = bracketRegex.lastIndex;
						continue;
					}

					// Add age only to the first colored highlight
					if (isFirstHighlight && age && !content.includes('Age:')) {
						content = `${content} / ${age}`;
						isFirstHighlight = false;
					}
					const backgroundSpan = document.createElement('span');
					backgroundSpan.style.color = 'white';
					backgroundSpan.style.textShadow = '1px 1px 2px black';
					backgroundSpan.style.borderRadius = '4px';
					content = content.replace(
						/(L3 Request|Minor|Moderate|Major|Critical)(?!\s{2})/g,
						'$1  '
					);
					content = content.replace(/(?<!\s{2})Cases/g, '  Cases');
					content = content.replace(/Cases:(?!\s)/g, 'Cases: ');
					content = content.replace(/(?<!\s)\/(?!\s)/, ' / ');
					if (numberRegex.test(content)) {
						backgroundSpan.style.backgroundColor = '#64BA3B';
					} else if (content.includes('L3 Request')) {
						backgroundSpan.style.backgroundColor = '#F79233';
					} else if (
						['Minor', 'Moderate', 'Major'].some(term =>
							content.includes(term)
						)
					) {
						backgroundSpan.style.backgroundColor = '#D31800';
					} else if (content.includes('TT')) {
						backgroundSpan.style.backgroundColor = '#4BAEE8';
					} else if (content.includes('UII')) {
						backgroundSpan.style.backgroundColor = '#9360E1';
					} else {
						backgroundSpan.style.backgroundColor = 'black';
					}
					backgroundSpan.textContent = `【  ${content}  】`;
					backgroundSpan.innerHTML = backgroundSpan.innerHTML.replace(
						/(?<!L)\d+/g,
						num => `<span style="font-weight: bold;">${num}</span>`
					);
					fragments.push(backgroundSpan);
					lastIndex = bracketRegex.lastIndex;
				}
				if (lastIndex < text.length) {
					fragments.push(
						document.createTextNode(text.substring(lastIndex))
					);
				}
				if (fragments.length > 0) {
					const parent = node.parentNode;
					fragments.forEach(fragment => {
						parent.insertBefore(fragment, node);
					});
					parent.removeChild(node);
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				boldTextInsideBracketsAndAge(node);
			}
		});
	}

	/******************************************************************
	 * 4. MutationObserver – run our functions when the DOM changes.
	 ******************************************************************/
	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			console.log('[MutationObserver] Mutation detected:', mutation);
		});
		highlightCriticalRows();
		applyFormatting();
		processL3UpdateDates();
	});

	function startObserving() {
		observer.observe(document.body, { childList: true, subtree: true });
		console.log('[startObserving] Started observing DOM changes.');

		// If on a ticket page, start periodic checking of L3 status date
		if (window.location.pathname.match(/\/browse\/NEB-\d+/)) {
			console.log('[startObserving] Starting periodic L3 status check');
			setInterval(extractAndStoreL3UpdateDate, 1000);
		}
	}

	/******************************************************************
	 * 5. Run the appropriate functions on page load.
	 ******************************************************************/
	window.addEventListener('load', () => {
		console.log('[load] Window loaded, executing functions...');
		// If on a ticket page, extract and store the update date.
		if (window.location.pathname.match(/\/browse\/NEB-\d+/)) {
			extractAndStoreL3UpdateDate();
		} else {
			// Otherwise, assume board view.
			highlightCriticalRows();
			applyFormatting();
			processL3UpdateDates();
		}
		startObserving();
	});

	// In case the page is already loaded, start observing immediately.
	startObserving();
})();
