// ==UserScript==
// @name         JIRA - Bold & Highlight Ticket Text & Store L3 Update Date in GM
// @namespace    http://tampermonkey.net/
// @version      2.9
// @description  Bold text inside brackets, highlight high-priority rows, and when opening a ticket page or overlay, extract and store its L3 update date in GM storage. Board view then reads the stored date.
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
	 * Helper function to calculate color based on time between 4-5 PM
	 ******************************************************************/
	function getStatusColor(date) {
		const now = date || new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();

		// Convert current time to minutes since start of day
		const currentTimeInMinutes = hours * 60 + minutes;
		// 3:30 PM = 15:30 = 15 * 60 + 30 = 930 minutes
		const startTime = 930;
		// 5:00 PM = 17:00 = 17 * 60 = 1020 minutes
		const endTime = 1020;

		if (
			currentTimeInMinutes < startTime ||
			currentTimeInMinutes >= endTime
		) {
			return '#2ecc71'; // Default green color
		}

		// Calculate progress through the 3:30-5:00 PM period (0 to 1)
		const progress =
			(currentTimeInMinutes - startTime) / (endTime - startTime);

		// RGB values for green and red
		const startColor = { r: 46, g: 204, b: 113 }; // #2ecc71
		const endColor = { r: 231, g: 76, b: 60 }; // #e74c3c

		// Interpolate between colors
		const r = Math.round(
			startColor.r + (endColor.r - startColor.r) * progress
		);
		const g = Math.round(
			startColor.g + (endColor.g - startColor.g) * progress
		);
		const b = Math.round(
			startColor.b + (endColor.b - startColor.b) * progress
		);

		return `rgb(${r}, ${g}, ${b})`;
	}

	/******************************************************************
	 * Helper function to check if a date matches today or tomorrow with time consideration
	 ******************************************************************/
	function isDateCurrentOrTomorrow(dateStr) {
		const [month, day] = dateStr.split('/').map(num => parseInt(num, 10));
		const now = new Date();
		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(today.getDate() + 1);

		const formatDate = date => {
			return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
		};

		const hours = now.getHours();
		const useNextDay = hours >= 17;

		const todayStr = formatDate(useNextDay ? tomorrow : today);
		const tomorrowStr = formatDate(
			useNextDay ? new Date(tomorrow.getTime() + 86400000) : tomorrow
		);
		const checkDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

		return checkDate === todayStr || checkDate === tomorrowStr;
	}

	/******************************************************************
	 * Helper function to update a specific ticket's date display
	 ******************************************************************/
	function updateTicketDateDisplay(ticketId, newDate) {
		// Find the specific ticket's card on the board
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		for (const button of buttons) {
			const keyElem = button.querySelector(
				'[data-testid="platform-card.common.ui.key.key"]'
			);
			if (keyElem && keyElem.textContent.trim() === ticketId) {
				const summary = button.querySelector(
					'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
				);
				if (
					summary &&
					(summary.textContent.includes('L3 Request') ||
						summary.textContent.includes('Internal L3') ||
						summary.textContent.includes('Major') ||
						summary.textContent.includes('FIT') ||
						summary.textContent.includes('HIGH'))
				) {
					// Remove existing date and separators if present
					const existingDate =
						summary.querySelector('.l3-update-date');
					if (existingDate) {
						const parent = existingDate.parentNode;
						const prevSibling = existingDate.previousElementSibling;
						const nextSibling = existingDate.nextElementSibling;

						if (prevSibling && prevSibling.style.borderLeft) {
							parent.removeChild(prevSibling);
						}
						if (nextSibling && nextSibling.style.borderLeft) {
							parent.removeChild(nextSibling);
						}
						parent.removeChild(existingDate);
					}

					// Add new date display
					const separatorBefore = document.createElement('span');
					separatorBefore.className = 'l3-date-separator';
					separatorBefore.style.margin = '0 8px';
					separatorBefore.style.borderLeft =
						'2px solid rgba(255, 255, 255, 0.3)';
					separatorBefore.style.height = '16px';
					separatorBefore.style.display = 'inline-block';
					separatorBefore.style.verticalAlign = 'middle';

					const updateDateSpan = document.createElement('span');
					updateDateSpan.className = 'l3-update-date';
					updateDateSpan.style.fontWeight = 'normal';
					updateDateSpan.style.marginLeft = '5px';
					updateDateSpan.style.marginRight = '5px';
					updateDateSpan.style.color = 'white';
					updateDateSpan.style.textShadow = '1px 1px 2px black';
					updateDateSpan.style.padding = '2px 8px';
					updateDateSpan.style.borderRadius = '4px';
					updateDateSpan.style.fontSize = '12px';

					// Set background color and content based on date
					if (!newDate) {
						updateDateSpan.style.backgroundColor = '#e74c3c'; // Red for no date
						updateDateSpan.innerHTML = `📅 <strong>Open To Check L3 Status Date</strong>`;
					} else if (isDateCurrentOrTomorrow(newDate)) {
						updateDateSpan.style.backgroundColor = getStatusColor(
							new Date()
						);
						updateDateSpan.innerHTML = `📅 <strong>${newDate}</strong>`;
					} else {
						updateDateSpan.style.backgroundColor = '#e74c3c'; // Red for outdated
						updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
						updateDateSpan.style.animation =
							'bubble 2s ease-in-out infinite';
						updateDateSpan.style.position = 'relative';
						updateDateSpan.style.display = 'inline-block';
						updateDateSpan.innerHTML = `📅 <strong>${newDate}</strong>`;
					}

					const separatorAfter = document.createElement('span');
					separatorAfter.className = 'l3-date-separator';
					separatorAfter.style.margin = '0 8px';
					separatorAfter.style.borderLeft =
						'2px solid rgba(255, 255, 255, 0.3)';
					separatorAfter.style.height = '16px';
					separatorAfter.style.display = 'inline-block';
					separatorAfter.style.verticalAlign = 'middle';

					summary.appendChild(separatorBefore);
					summary.appendChild(updateDateSpan);
					summary.appendChild(separatorAfter);
				}
				break;
			}
		}
	}

	/******************************************************************
	 * 1. Extract and store L3 update date from ticket page or overlay
	 ******************************************************************/
	function extractAndStoreL3UpdateDate() {
		// Check if we're on a ticket page or if there's an overlay
		const ticketMatch =
			window.location.pathname.match(/\/browse\/(NEB-\d+)/);
		const overlayTicketId = new URLSearchParams(window.location.search).get(
			'selectedIssue'
		);
		const ticketId = ticketMatch ? ticketMatch[1] : overlayTicketId;

		if (!ticketId) {
			return;
		}
		console.log(
			`[Ticket Page/Overlay] Checking for updates on ${ticketId}`
		);

		// Find the <h2> heading with "Dev / QA Status"
		const devQaHeading = [...document.querySelectorAll('h2')].find(h2 =>
			h2.textContent.includes('Dev / QA Status')
		);

		if (!devQaHeading) {
			console.log(
				`[Ticket Page/Overlay] No "Dev / QA Status" heading found for ${ticketId}`
			);
			return;
		}

		// Usually, the next sibling of that heading's parent holds the date text
		// Adjust if needed based on your Jira DOM structure
		const headingParent = devQaHeading.parentElement; // e.g. <div class="_o0a01u4f ...">
		if (!headingParent) {
			console.log(
				`[Ticket Page/Overlay] No valid parent for the Dev / QA Status heading on ${ticketId}`
			);
			return;
		}

		// Grab the next sibling that should contain the actual date text
		const dateContainer = headingParent.nextElementSibling;
		if (!dateContainer) {
			console.log(
				`[Ticket Page/Overlay] No nextElementSibling for Dev / QA Status container on ${ticketId}`
			);
			return;
		}

		// Get text only from that container
		const containerText =
			dateContainer.innerText || dateContainer.textContent || '';

		console.log(
			`[Ticket Page/Overlay] Dev / QA Status text for ${ticketId}: "${containerText}"`
		);

		// Look for a date in the form MM/DD
		const dateMatch = containerText.match(/(\d{1,2}\/\d{1,2})/);
		if (dateMatch) {
			const date = dateMatch[1];
			const currentStoredDate = GM_getValue(ticketId, '');

			// Only update if the date has changed
			if (currentStoredDate !== date) {
				console.log(
					`[Ticket Page/Overlay] Extracted update date for ${ticketId}: ${date} (changed from ${currentStoredDate})`
				);
				GM_setValue(ticketId, date);

				// If we're in overlay mode, update just this ticket's display
				if (overlayTicketId) {
					updateTicketDateDisplay(ticketId, date);
				}
			}
		} else {
			console.log(
				`[Ticket Page/Overlay] No update date found for ${ticketId}`
			);
		}
	}

	/******************************************************************
	 * 2. Board view processing – read the stored date and display it.
	 ******************************************************************/
	function processL3UpdateDates() {
		console.log(
			'[Board View] Processing L3 update dates from GM storage...'
		);
		// Find all cards on the board
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);
		buttons.forEach(button => {
			// Only process each card once
			if (button.getAttribute('data-l3-date-checked') === 'true') {
				return;
			}

			// Check if the status is COMPLETED
			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (
				statusElement &&
				statusElement.textContent.trim().toUpperCase() === 'COMPLETED'
			) {
				button.setAttribute('data-l3-date-checked', 'true');
				return;
			}

			// Look inside the summary section for "L3 Request"
			const summary = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
			);
			if (
				summary &&
				(summary.textContent.includes('L3 Request') ||
					summary.textContent.includes('Internal L3') ||
					summary.textContent.includes('Major') ||
					summary.textContent.includes('FIT') ||
					summary.textContent.includes('HIGH'))
			) {
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

					// Build date display nodes
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
					updateDateSpan.style.marginLeft = '5px';
					updateDateSpan.style.marginRight = '5px';
					updateDateSpan.style.color = 'white';
					updateDateSpan.style.textShadow = '1px 1px 2px black';
					updateDateSpan.style.padding = '2px 8px';
					updateDateSpan.style.borderRadius = '4px';
					updateDateSpan.style.fontSize = '12px';

					// Set background color and content based on date
					if (!storedDate) {
						updateDateSpan.style.backgroundColor = '#e74c3c'; // Red for no date
						updateDateSpan.innerHTML = `📅 <strong>Open To Check L3 Status Date</strong>`;
					} else if (isDateCurrentOrTomorrow(storedDate)) {
						updateDateSpan.style.backgroundColor = getStatusColor(
							new Date()
						);
						updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;
					} else {
						updateDateSpan.style.backgroundColor = '#e74c3c'; // Red for outdated
						updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
						updateDateSpan.style.animation =
							'bubble 2s ease-in-out infinite';
						updateDateSpan.style.position = 'relative';
						updateDateSpan.style.display = 'inline-block';
						updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;
					}

					const separatorAfter = document.createElement('span');
					separatorAfter.style.margin = '0 8px';
					separatorAfter.style.borderLeft =
						'2px solid rgba(255, 255, 255, 0.3)';
					separatorAfter.style.height = '16px';
					separatorAfter.style.display = 'inline-block';
					separatorAfter.style.verticalAlign = 'middle';

					summary.appendChild(separatorBefore);
					summary.appendChild(updateDateSpan);
					summary.appendChild(separatorAfter);
					console.log(
						`[Board View] Appended ${storedDate ? 'stored update date' : 'blank date indicator'} for ${ticketId}`
					);
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
					backgroundSpan.style.marginRight = '5px';
					content = content.replace(
						/(L3 Request|Minor|Moderate|Major|Critical)(?!\s{2})/g,
						'$1  '
					);
					content = content.replace(/(?<!\s{2})Cases/g, '  Cases');
					content = content.replace(/Cases:(?!\s)/g, 'Cases: ');
					content = content.replace(/(?<!\s)\/(?!\s)/, ' / ');

					if (numberRegex.test(content)) {
						backgroundSpan.style.backgroundColor = '#64BA3B';
					} else if (
						content.includes('L3 Request') ||
						content.includes('Internal L3')
					) {
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
			// Comment out or remove the console.log if it's too noisy
			console.log('[MutationObserver] Mutation detected:', mutation);
		});
		highlightCriticalRows();
		applyFormatting();
		processL3UpdateDates();
		createCopyButton();

		// Check if we're in an overlay view and extract date if needed
		const overlayTicketId = new URLSearchParams(window.location.search).get(
			'selectedIssue'
		);
		if (overlayTicketId) {
			extractAndStoreL3UpdateDate();
		}
	});

	function startObserving() {
		observer.observe(document.body, { childList: true, subtree: true });
		console.log('[startObserving] Started observing DOM changes.');

		// If on a ticket page or if overlay is present, start periodic checking of L3 status date
		if (
			window.location.pathname.match(/\/browse\/NEB-\d+/) ||
			new URLSearchParams(window.location.search).get('selectedIssue')
		) {
			console.log('[startObserving] Starting periodic L3 status check');
			setInterval(extractAndStoreL3UpdateDate, 1000);
		}
	}

	/******************************************************************
	 * 5. Run the appropriate functions on page load.
	 ******************************************************************/
	window.addEventListener('load', () => {
		console.log('[load] Window loaded, executing functions...');
		// If on a ticket page or if overlay is present, extract and store the update date
		if (
			window.location.pathname.match(/\/browse\/NEB-\d+/) ||
			new URLSearchParams(window.location.search).get('selectedIssue')
		) {
			extractAndStoreL3UpdateDate();
		} else {
			// Otherwise, assume board view
			highlightCriticalRows();
			applyFormatting();
			processL3UpdateDates();
			createCopyButton();
		}
		startObserving();
	});

	// In case the page is already loaded, start observing immediately.
	startObserving();

	// Add CSS animation for bubble effect
	const style = document.createElement('style');
	style.textContent = `
        @keyframes bubble {
            0% {
                transform: scale(1);
                box-shadow: 0 0 10px #ff0000;
            }
            50% {
                transform: scale(1.05);
                box-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000;
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 10px #ff0000;
            }
        }
    `;
	document.head.appendChild(style);

	function createCopyButton() {
		const boardHeader = document.querySelector(
			'[data-testid="software-board.header.title.container"]'
		);
		const existingButton = document.getElementById('copy-outdated-button');

		// Check for outdated tickets first
		const outdatedTickets = [];
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		buttons.forEach(button => {
			// Check if the status is COMPLETED
			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (
				statusElement &&
				statusElement.textContent.trim().toUpperCase() === 'COMPLETED'
			) {
				return;
			}

			const summary = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
			);
			const keyElem = button.querySelector(
				'[data-testid="platform-card.common.ui.key.key"]'
			);
			const dateElem = summary?.querySelector('.l3-update-date');

			if (summary && keyElem && dateElem) {
				const ticketId = keyElem.textContent.trim();
				const isOpenToCheck =
					dateElem.textContent.includes('Open To Check');
				const dateMatch =
					dateElem.textContent.match(/(\d{1,2}\/\d{1,2})/);

				let displayedDate = '';
				if (isOpenToCheck) {
					displayedDate = 'NONE';
				} else if (dateMatch) {
					displayedDate = dateMatch[1];
				}

				if (
					isOpenToCheck ||
					(displayedDate && !isDateCurrentOrTomorrow(displayedDate))
				) {
					outdatedTickets.push({
						text: `https://chirotouch.atlassian.net/browse/${ticketId} [${displayedDate}]`,
						date: displayedDate,
					});
				}
			}
		});

		// If there are no outdated tickets and button exists, remove it
		if (outdatedTickets.length === 0) {
			if (existingButton) {
				existingButton.remove();
			}
			return;
		}

		// If button already exists, just update its state
		if (existingButton) {
			return;
		}

		const copyButton = document.createElement('button');
		copyButton.id = 'copy-outdated-button';
		copyButton.style.cssText = `
			background-color: #e74c3c;
			color: white;
			border: none;
			padding: 8px 16px;
			border-radius: 4px;
			margin-left: 16px;
			cursor: pointer;
			font-weight: bold;
			transition: background-color 0.3s;
			display: flex;
			align-items: center;
			gap: 8px;
		`;
		copyButton.innerHTML = `
			<span>📋</span>
			<span>Copy Outdated Tickets</span>
		`;

		copyButton.addEventListener('mouseover', () => {
			copyButton.style.backgroundColor = '#c0392b';
		});

		copyButton.addEventListener('mouseout', () => {
			copyButton.style.backgroundColor = '#e74c3c';
		});

		copyButton.addEventListener('click', () => {
			// Recheck outdated tickets before copying
			const currentOutdatedTickets = [];
			const currentButtons = document.querySelectorAll(
				'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
			);

			currentButtons.forEach(button => {
				const statusElement = button.querySelector(
					'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
				);
				if (
					statusElement &&
					statusElement.textContent.trim().toUpperCase() ===
						'COMPLETED'
				) {
					return;
				}

				const summary = button.querySelector(
					'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
				);
				const keyElem = button.querySelector(
					'[data-testid="platform-card.common.ui.key.key"]'
				);
				const dateElem = summary?.querySelector('.l3-update-date');

				if (summary && keyElem && dateElem) {
					const ticketId = keyElem.textContent.trim();
					const isOpenToCheck =
						dateElem.textContent.includes('Open To Check');
					const dateMatch =
						dateElem.textContent.match(/(\d{1,2}\/\d{1,2})/);

					let displayedDate = '';
					if (isOpenToCheck) {
						displayedDate = 'NONE';
					} else if (dateMatch) {
						displayedDate = dateMatch[1];
					}

					if (
						isOpenToCheck ||
						(displayedDate &&
							!isDateCurrentOrTomorrow(displayedDate))
					) {
						currentOutdatedTickets.push({
							text: `https://chirotouch.atlassian.net/browse/${ticketId} [${displayedDate}]`,
							date: displayedDate,
						});
					}
				}
			});

			// If no outdated tickets remain, remove button and return
			if (currentOutdatedTickets.length === 0) {
				copyButton.remove();
				return;
			}

			// Sort by date (NONE first, then oldest to newest)
			currentOutdatedTickets.sort((a, b) => {
				if (a.date === 'NONE' && b.date !== 'NONE') return -1;
				if (a.date !== 'NONE' && b.date === 'NONE') return 1;
				if (a.date === 'NONE' && b.date === 'NONE') return 0;

				const [aMonth, aDay] = a.date.split('/').map(Number);
				const [bMonth, bDay] = b.date.split('/').map(Number);
				if (aMonth !== bMonth) return aMonth - bMonth;
				return aDay - bDay;
			});

			const text = currentOutdatedTickets
				.map(ticket => ticket.text)
				.join('\n');
			navigator.clipboard.writeText(text).then(() => {
				copyButton.innerHTML = `
					<span>✅</span>
					<span>Copied ${currentOutdatedTickets.length} tickets!</span>
				`;
				setTimeout(() => {
					copyButton.innerHTML = `
						<span>📋</span>
						<span>Copy Outdated Tickets</span>
					`;
				}, 2000);
			});
		});

		boardHeader.appendChild(copyButton);
	}
})();
