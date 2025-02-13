// ==UserScript==
// @name         JIRA - Bold & Highlight Ticket Text & Store L3 Update Date in GM
// @namespace    http://tampermonkey.net/
// @version      3.6
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
	 * HELPER FUNCTIONS
	 ******************************************************************/
	function getStatusColor(date = new Date(), isTomorrow = false) {
		if (isTomorrow) {
			return '#2ecc71'; // Always green for tomorrow's date
		}

		const hours = date.getHours();
		const minutes = date.getMinutes();
		const currentTimeInMinutes = hours * 60 + minutes;
		const startTime = 930; // 3:30 PM
		const endTime = 1020; // 5:00 PM

		if (
			currentTimeInMinutes < startTime ||
			currentTimeInMinutes >= endTime
		) {
			return '#2ecc71'; // Default green color
		}

		const progress =
			(currentTimeInMinutes - startTime) / (endTime - startTime);
		const startColor = { r: 46, g: 204, b: 113 }; // #2ecc71
		const endColor = { r: 231, g: 76, b: 60 }; // #e74c3c

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

	function isDateCurrentOrTomorrow(dateStr) {
		const [month, day] = dateStr.split('/').map(num => parseInt(num, 10));
		const now = new Date();
		const today = new Date();
		const tomorrow = new Date();
		tomorrow.setDate(today.getDate() + 1);

		const formatDate = date =>
			`${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

		const hours = now.getHours();
		const useNextDay = hours >= 17;
		const todayStr = formatDate(useNextDay ? tomorrow : today);
		const tomorrowStr = formatDate(
			useNextDay ? new Date(tomorrow.getTime() + 86400000) : tomorrow
		);
		const checkDate = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

		return {
			isCurrent: checkDate === todayStr,
			isTomorrow: checkDate === tomorrowStr,
			isCurrentOrTomorrow:
				checkDate === todayStr || checkDate === tomorrowStr,
		};
	}

	function getTooltipText(date, currentTimeInMinutes) {
		if (!date) {
			return 'Either blank or you should double check 🤔';
		}
		const startTime = 930;
		const endTime = 1020;
		const dateStatus = isDateCurrentOrTomorrow(date);

		if (
			currentTimeInMinutes >= startTime &&
			currentTimeInMinutes < endTime &&
			!dateStatus.isTomorrow
		) {
			return "Big brain strat: Update this to be tomorrow's date before End Of Day \n\nTomorrow morning, if Casey checks, then it's already current🧠";
		}

		if (dateStatus.isTomorrow)
			return 'Yeehaw cowboy! You responsible AF 🤠';
		if (dateStatus.isCurrent) return 'All current, noice 😎';
		return 'OH NOES UPDATE SOON D:';
	}

	// Shows a full-screen overlay prompting the user to reload.
	function showReloadOverlay() {
		const overlay = document.createElement('div');
		overlay.id = 'reload-overlay';
		overlay.style.position = 'fixed';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
		overlay.style.color = 'white';
		overlay.style.display = 'flex';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';
		overlay.style.fontSize = '24px';
		overlay.style.zIndex = '10000';
		overlay.textContent = 'Please reload';
		document.body.appendChild(overlay);
	}

	function addTooltipEvents(element, tooltipText, fullStatusText) {
		element.addEventListener('mousemove', e => {
			showTooltip(tooltipText, fullStatusText, e);
		});
		element.addEventListener('mouseleave', hideTooltip);
	}

	/******************************************************************
	 * TOOLTIP FUNCTIONS & STYLES
	 ******************************************************************/
	const tooltip = document.createElement('div');
	tooltip.className = 'custom-tooltip';
	document.body.appendChild(tooltip);

	const fullStatusTooltip = document.createElement('div');
	fullStatusTooltip.className = 'custom-tooltip full-status-tooltip';
	document.body.appendChild(fullStatusTooltip);

	function showTooltip(text, fullStatusText, event) {
		tooltip.textContent = text;
		tooltip.classList.add('visible');

		if (fullStatusText) {
			fullStatusTooltip.textContent = fullStatusText;
			fullStatusTooltip.classList.add('visible');
		}

		positionTooltip(event);
	}

	function hideTooltip() {
		tooltip.classList.remove('visible');
		fullStatusTooltip.classList.remove('visible');
	}

	function positionTooltip(event) {
		const x = event.clientX;
		const y = event.clientY;
		const tooltipRect = tooltip.getBoundingClientRect();
		const fullStatusTooltipRect = fullStatusTooltip.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let left = x + 10;
		let top = y + 10;

		if (left + tooltipRect.width > viewportWidth) {
			left = x - tooltipRect.width - 10;
		}
		if (
			top + tooltipRect.height + fullStatusTooltipRect.height + 5 >
			viewportHeight
		) {
			top = y - tooltipRect.height - fullStatusTooltipRect.height - 10;
		}

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;

		fullStatusTooltip.style.left = `${left}px`;
		fullStatusTooltip.style.top = `${top + tooltipRect.height + 5}px`;
	}

	/******************************************************************
	 * TICKET DATE DISPLAY & EXTRACTION FUNCTIONS
	 ******************************************************************/
	function updateTicketDateDisplay(ticketId, newDate, fullStatus) {
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
					// Remove any existing date display and separators.
					const existingDate =
						summary.querySelector('.l3-update-date');
					if (existingDate) {
						const parent = existingDate.parentNode;
						const prevSibling = existingDate.previousElementSibling;
						const nextSibling = existingDate.nextElementSibling;
						if (prevSibling && prevSibling.style.borderLeft)
							parent.removeChild(prevSibling);
						if (nextSibling && nextSibling.style.borderLeft)
							parent.removeChild(nextSibling);
						parent.removeChild(existingDate);
					}
					const separatorBefore = document.createElement('span');
					separatorBefore.className = 'l3-date-separator';
					separatorBefore.style.cssText =
						'margin: 0 8px; border-left: 2px solid rgba(255,255,255,0.3); height: 16px; display: inline-block; vertical-align: middle;';
					const updateDateSpan = document.createElement('span');
					updateDateSpan.className = 'l3-update-date';
					updateDateSpan.style.cssText =
						'font-weight: normal; margin: 0 5px; color: white; text-shadow: 1px 1px 2px black; padding: 2px 8px; border-radius: 4px; font-size: 12px; cursor: help;';
					const now = new Date();
					const currentTimeInMinutes =
						now.getHours() * 60 + now.getMinutes();

					if (!newDate) {
						updateDateSpan.style.backgroundColor = '#e74c3c';
						updateDateSpan.innerHTML = `📅 <strong>Open To Check L3 Status Date</strong>`;
						addTooltipEvents(
							updateDateSpan,
							getTooltipText(null, currentTimeInMinutes),
							fullStatus
						);
					} else {
						const dateStatus = isDateCurrentOrTomorrow(newDate);
						if (dateStatus.isCurrentOrTomorrow) {
							updateDateSpan.style.backgroundColor =
								getStatusColor(now, dateStatus.isTomorrow);
							updateDateSpan.innerHTML = `📅 <strong>${newDate}</strong>`;
							if (dateStatus.isTomorrow) {
								updateDateSpan.style.boxShadow =
									'0 0 10px #2ecc71';
								updateDateSpan.style.animation =
									'greenBubble 2s ease-in-out infinite';
								updateDateSpan.style.position = 'relative';
								updateDateSpan.style.display = 'inline-block';
							}
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(newDate, currentTimeInMinutes),
								fullStatus
							);
						} else {
							updateDateSpan.style.backgroundColor = '#e74c3c';
							updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
							updateDateSpan.style.animation =
								'bubble 2s ease-in-out infinite';
							updateDateSpan.style.position = 'relative';
							updateDateSpan.style.display = 'inline-block';
							updateDateSpan.innerHTML = `📅 <strong>${newDate}</strong>`;
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(newDate, currentTimeInMinutes),
								fullStatus
							);
						}
					}

					const separatorAfter = document.createElement('span');
					separatorAfter.className = 'l3-date-separator';
					separatorAfter.style.cssText =
						'margin: 0 8px; border-left: 2px solid rgba(255,255,255,0.3); height: 16px; display: inline-block; vertical-align: middle;';
					summary.appendChild(separatorBefore);
					summary.appendChild(updateDateSpan);
					summary.appendChild(separatorAfter);
				}
				break;
			}
		}
	}

	function extractAndStoreL3UpdateDate() {
		const ticketMatch =
			window.location.pathname.match(/\/browse\/(NEB-\d+)/);
		const overlayTicketId = new URLSearchParams(window.location.search).get(
			'selectedIssue'
		);
		const ticketId = ticketMatch ? ticketMatch[1] : overlayTicketId;
		if (!ticketId) return;
		console.log(
			`[Ticket Page/Overlay] Checking for updates on ${ticketId}`
		);

		const devQaHeading = [...document.querySelectorAll('h2')].find(h2 =>
			h2.textContent.includes('Dev / QA Status')
		);
		if (!devQaHeading) {
			console.log(
				`[Ticket Page/Overlay] No "Dev / QA Status" heading found for ${ticketId}`
			);
			return;
		}
		const headingParent = devQaHeading.parentElement;
		if (!headingParent) {
			console.log(
				`[Ticket Page/Overlay] No valid parent for the Dev / QA Status heading on ${ticketId}`
			);
			return;
		}
		const dateContainer = headingParent.nextElementSibling;
		if (!dateContainer) {
			console.log(
				`[Ticket Page/Overlay] No nextElementSibling for Dev / QA Status container on ${ticketId}`
			);
			return;
		}
		const containerText =
			dateContainer.innerText || dateContainer.textContent || '';
		console.log(
			`[Ticket Page/Overlay] Dev / QA Status text for ${ticketId}: "${containerText}"`
		);

		const dateMatch = containerText.match(/(\d{1,2}\/\d{1,2})/);
		const currentStoredData = GM_getValue(ticketId, {});
		const newData = {
			date: dateMatch ? dateMatch[1] : 'NONE',
			fullStatus: containerText.trim() || 'NONE',
		};

		if (JSON.stringify(currentStoredData) !== JSON.stringify(newData)) {
			console.log(
				`[Ticket Page/Overlay] Extracted update date for ${ticketId}: ${newData.date} (changed from ${currentStoredData.date || 'none'})`
			);
			GM_setValue(ticketId, newData);
			if (overlayTicketId) {
				updateTicketDateDisplay(
					ticketId,
					newData.date,
					newData.fullStatus
				);
			}
		}
	}

	function processL3UpdateDates() {
		console.log(
			'[Board View] Processing L3 update dates from GM storage...'
		);
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);
		buttons.forEach(button => {
			if (button.getAttribute('data-l3-date-checked') === 'true') return;

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
				const keyElem = button.querySelector(
					'[data-testid="platform-card.common.ui.key.key"]'
				);
				if (keyElem) {
					const ticketId = keyElem.textContent.trim();
					console.log(
						`[Board View] Found L3 Request row for ticket: ${ticketId}`
					);
					const storedData = GM_getValue(ticketId, {});
					const storedDate = storedData.date || 'NONE';
					const storedStatus = storedData.fullStatus || 'NONE';
					const separatorBefore = document.createElement('span');
					separatorBefore.style.cssText =
						'margin: 0 8px; border-left: 2px solid rgba(255,255,255,0.3); height: 16px; display: inline-block; vertical-align: middle;';
					const updateDateSpan = document.createElement('span');
					updateDateSpan.className = 'l3-update-date';
					updateDateSpan.style.cssText =
						'font-weight: normal; margin: 0 5px; color: white; text-shadow: 1px 1px 2px black; padding: 2px 8px; border-radius: 4px; font-size: 12px; cursor: help;';
					const now = new Date();
					const currentTimeInMinutes =
						now.getHours() * 60 + now.getMinutes();

					if (storedDate === 'NONE') {
						updateDateSpan.style.backgroundColor = '#e74c3c';
						updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
						updateDateSpan.style.animation =
							'bubble 2s ease-in-out infinite';
						updateDateSpan.style.position = 'relative';
						updateDateSpan.style.display = 'inline-block';
						updateDateSpan.innerHTML = `📅 <strong>NONE</strong>`;
						addTooltipEvents(
							updateDateSpan,
							getTooltipText(null, currentTimeInMinutes),
							null
						);
					} else {
						const dateStatus = isDateCurrentOrTomorrow(storedDate);
						if (dateStatus.isCurrentOrTomorrow) {
							updateDateSpan.style.backgroundColor =
								getStatusColor(now, dateStatus.isTomorrow);
							updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;
							if (dateStatus.isTomorrow) {
								updateDateSpan.style.boxShadow =
									'0 0 10px #2ecc71';
								updateDateSpan.style.animation =
									'greenBubble 2s ease-in-out infinite';
								updateDateSpan.style.position = 'relative';
								updateDateSpan.style.display = 'inline-block';
							}
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(
									storedDate,
									currentTimeInMinutes
								),
								storedStatus === 'NONE' ? null : storedStatus
							);
						} else {
							updateDateSpan.style.backgroundColor = '#e74c3c';
							updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
							updateDateSpan.style.animation =
								'bubble 2s ease-in-out infinite';
							updateDateSpan.style.position = 'relative';
							updateDateSpan.style.display = 'inline-block';
							updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(
									storedDate,
									currentTimeInMinutes
								),
								storedStatus === 'NONE' ? null : storedStatus
							);
						}
					}
					const separatorAfter = document.createElement('span');
					separatorAfter.style.cssText =
						'margin: 0 8px; border-left: 2px solid rgba(255,255,255,0.3); height: 16px; display: inline-block; vertical-align: middle;';
					summary.appendChild(separatorBefore);
					summary.appendChild(updateDateSpan);
					summary.appendChild(separatorAfter);
					console.log(
						`[Board View] Appended ${storedDate !== 'NONE' ? 'stored update date' : 'blank date indicator'} for ${ticketId}`
					);
				}
			}
			button.setAttribute('data-l3-date-checked', 'true');
		});
	}

	/******************************************************************
	 * FORMATTING & HIGHLIGHTING FUNCTIONS
	 ******************************************************************/
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
				const fragments = [];
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
					if (isFirstHighlight && age && !content.includes('Age:')) {
						content = `${content} / ${age}`;
						isFirstHighlight = false;
					}
					const backgroundSpan = document.createElement('span');
					backgroundSpan.style.cssText =
						'color: white; text-shadow: 1px 1px 2px black; border-radius: 4px; margin-right: 5px;';
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
					fragments.forEach(fragment =>
						parent.insertBefore(fragment, node)
					);
					parent.removeChild(node);
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				boldTextInsideBracketsAndAge(node);
			}
		});
	}

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

	/******************************************************************
	 * BUTTON CREATION FUNCTIONS
	 ******************************************************************/

	// Creates the Copy Outdated Tickets button independently.
	function createCopyButton() {
		const existingCopyButton = document.getElementById(
			'copy-outdated-button'
		);
		const outdatedTickets = [];
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		console.log(
			'[createCopyButton] Found',
			buttons.length,
			'total buttons to check'
		);

		buttons.forEach(button => {
			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (
				statusElement &&
				statusElement.textContent.trim().toUpperCase() === 'COMPLETED'
			) {
				console.log('[createCopyButton] Skipping completed ticket');
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
				console.log(`[createCopyButton] Checking ticket ${ticketId}`);

				const storedData = GM_getValue(ticketId, {});
				const storedDate = storedData.date || 'NONE';

				if (storedDate === 'NONE') {
					console.log(
						`[createCopyButton] Ticket ${ticketId} has no date`
					);
					outdatedTickets.push({
						text: `https://chirotouch.atlassian.net/browse/${ticketId} [NONE]`,
						date: 'NONE',
						id: ticketId,
					});
				} else if (
					!isDateCurrentOrTomorrow(storedDate).isCurrentOrTomorrow
				) {
					console.log(
						`[createCopyButton] Adding outdated ticket ${ticketId} with date ${storedDate}`
					);
					outdatedTickets.push({
						text: `https://chirotouch.atlassian.net/browse/${ticketId} [${storedDate}]`,
						date: storedDate,
						id: ticketId,
					});
				}
			}
		});

		console.log(
			'[createCopyButton] Found',
			outdatedTickets.length,
			'outdated tickets:',
			outdatedTickets
		);

		// Create (or re-use) the button container.
		let buttonContainer = document.getElementById('jira-custom-buttons');
		if (!buttonContainer) {
			buttonContainer = document.createElement('div');
			buttonContainer.id = 'jira-custom-buttons';
			buttonContainer.style.cssText =
				'display: flex; gap: 8px; margin-left: 16px;';
			const boardHeader = document.querySelector(
				'[data-testid="software-board.header.title.container"]'
			);
			if (boardHeader) boardHeader.appendChild(buttonContainer);
		}

		if (outdatedTickets.length > 0) {
			if (!existingCopyButton) {
				const copyButton = document.createElement('button');
				copyButton.id = 'copy-outdated-button';
				copyButton.style.cssText =
					'background-color: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background-color 0.3s; display: flex; align-items: center; gap: 8px;';
				copyButton.innerHTML = `<span>📋</span><span>Copy Outdated Tickets</span>`;
				copyButton.addEventListener('mouseover', () => {
					copyButton.style.backgroundColor = '#c0392b';
				});
				copyButton.addEventListener('mouseout', () => {
					copyButton.style.backgroundColor = '#e74c3c';
				});
				copyButton.addEventListener('click', () => {
					const text = outdatedTickets
						.map(ticket => ticket.text)
						.join('\n');
					navigator.clipboard.writeText(text).then(() => {
						copyButton.innerHTML = `<span>✅</span><span>Copied ${outdatedTickets.length} tickets!</span>`;
						setTimeout(() => {
							copyButton.innerHTML = `<span>📋</span><span>Copy Outdated Tickets</span>`;
						}, 2000);
					});
				});
				buttonContainer.appendChild(copyButton);
			}
		} else if (existingCopyButton) {
			existingCopyButton.remove();
		}
	}

	// Creates the Open Tickets button independently.
	function createOpenButton() {
		const existingOpenButton = document.getElementById(
			'open-tickets-button'
		);
		let openToCheckCount = 0;
		let outdatedL3Count = 0;
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);
		buttons.forEach(button => {
			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (
				statusElement &&
				statusElement.textContent.trim().toUpperCase() === 'COMPLETED'
			)
				return;
			const summary = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
			);
			const keyElem = button.querySelector(
				'[data-testid="platform-card.common.ui.key.key"]'
			);
			const dateElem = summary?.querySelector('.l3-update-date');

			if (summary && keyElem && dateElem) {
				const isOpenToCheck =
					dateElem.textContent.includes('Open To Check');
				const dateMatch =
					dateElem.textContent.match(/(\d{1,2}\/\d{1,2})/);

				if (isOpenToCheck) {
					openToCheckCount++;
				} else if (
					dateMatch &&
					!isDateCurrentOrTomorrow(dateMatch[1]).isCurrentOrTomorrow
				) {
					outdatedL3Count++;
				}
			}
		});

		let buttonContainer = document.getElementById('jira-custom-buttons');
		if (!buttonContainer) {
			buttonContainer = document.createElement('div');
			buttonContainer.id = 'jira-custom-buttons';
			buttonContainer.style.cssText =
				'display: flex; gap: 8px; margin-left: 16px;';
			const boardHeader = document.querySelector(
				'[data-testid="software-board.header.title.container"]'
			);
			if (boardHeader) boardHeader.appendChild(buttonContainer);
		}

		const totalCount = openToCheckCount + outdatedL3Count;
		if (totalCount > 0) {
			if (!existingOpenButton) {
				const openButton = document.createElement('button');
				openButton.id = 'open-tickets-button';
				openButton.style.cssText =
					'background-color: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background-color 0.3s; display: flex; align-items: center; gap: 8px;';
				openButton.innerHTML = `<span>🔍</span><span>Open All Tickets Needing Updates (${totalCount})</span>`;
				openButton.addEventListener('mouseover', () => {
					openButton.style.backgroundColor = '#2980b9';
				});
				openButton.addEventListener('mouseout', () => {
					openButton.style.backgroundColor = '#3498db';
				});
				openButton.addEventListener('click', () => {
					const ticketsToOpen = [];
					buttons.forEach(button => {
						const statusElement = button.querySelector(
							'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
						);
						if (
							statusElement &&
							statusElement.textContent.trim().toUpperCase() ===
								'COMPLETED'
						)
							return;
						const summary = button.querySelector(
							'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
						);
						const keyElem = button.querySelector(
							'[data-testid="platform-card.common.ui.key.key"]'
						);
						const dateElem =
							summary?.querySelector('.l3-update-date');

						if (summary && keyElem && dateElem) {
							const isOpenToCheck =
								dateElem.textContent.includes('Open To Check');
							const dateMatch =
								dateElem.textContent.match(
									/(\d{1,2}\/\d{1,2})/
								);

							if (
								isOpenToCheck ||
								(dateMatch &&
									!isDateCurrentOrTomorrow(dateMatch[1])
										.isCurrentOrTomorrow)
							) {
								ticketsToOpen.push(keyElem.textContent.trim());
							}
						}
					});
					ticketsToOpen.forEach(ticketId => {
						window.open(
							`https://chirotouch.atlassian.net/browse/${ticketId}`,
							'_blank'
						);
					});
					openButton.innerHTML = `<span>✅</span><span>Opened ${ticketsToOpen.length} tickets!</span>`;
					showReloadOverlay();
					setTimeout(() => {
						openButton.innerHTML = `<span>🔍</span><span>Open All Tickets Needing Updates (${totalCount})</span>`;
					}, 2000);
				});
				buttonContainer.appendChild(openButton);
			}
		} else if (existingOpenButton) {
			existingOpenButton.remove();
		}
	}

	/******************************************************************
	 * MUTATION OBSERVER & INITIALIZATION
	 ******************************************************************/
	const observer = new MutationObserver(mutations => {
		// For debugging, you can uncomment the line below:
		// console.log('[MutationObserver] Mutation detected:', mutations);
		highlightCriticalRows();
		applyFormatting();
		processL3UpdateDates();
		// Use a slight delay to ensure the DOM is updated before creating buttons.
		setTimeout(() => {
			createCopyButton();
			createOpenButton();
		}, 100);

		// If in an overlay view, check and extract the L3 update date.
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
		if (
			window.location.pathname.match(/\/browse\/NEB-\d+/) ||
			new URLSearchParams(window.location.search).get('selectedIssue')
		) {
			console.log('[startObserving] Starting periodic L3 status check');
			setInterval(extractAndStoreL3UpdateDate, 1000);
		}
	}

	window.addEventListener('load', () => {
		console.log('[load] Window loaded, executing functions...');
		if (
			window.location.pathname.match(/\/browse\/NEB-\d+/) ||
			new URLSearchParams(window.location.search).get('selectedIssue')
		) {
			extractAndStoreL3UpdateDate();
		} else {
			highlightCriticalRows();
			applyFormatting();
			processL3UpdateDates();
			// Delay button creation slightly to allow DOM updates.
			setTimeout(() => {
				createCopyButton();
				createOpenButton();
			}, 100);
		}
		startObserving();
	});

	// In case the page is already loaded.
	startObserving();

	/******************************************************************
	 * CSS FOR ANIMATIONS & TOOLTIP
	 ******************************************************************/
	const style = document.createElement('style');
	style.textContent = `
    @keyframes bubble {
      0% { transform: scale(1); box-shadow: 0 0 10px #ff0000; }
      50% { transform: scale(1.05); box-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000; }
      100% { transform: scale(1); box-shadow: 0 0 10px #ff0000; }
    }
    @keyframes greenBubble {
      0% { transform: scale(1); box-shadow: 0 0 10px #2ecc71; }
      50% { transform: scale(1.05); box-shadow: 0 0 20px #2ecc71, 0 0 30px #2ecc71; }
      100% { transform: scale(1); box-shadow: 0 0 10px #2ecc71; }
    }
    .custom-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      pointer-events: none;
      max-width: 300px;
      white-space: pre-wrap;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(5px);
      transform: translate(10px, 10px);
      transition: opacity 0.15s ease-in-out;
      opacity: 0;
    }
    .custom-tooltip.visible { opacity: 1; }
    .full-status-tooltip {
        background: rgba(0, 0, 0, 0.8);
        border-color: rgba(255,255,255,0.1);
        font-size: 12px;
        padding: 8px 12px;
    }
  `;
	document.head.appendChild(style);
})();
