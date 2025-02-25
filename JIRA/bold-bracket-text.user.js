// ==UserScript==
// @name         JIRA - Bold & Highlight Ticket Text & Store L3 Update Date in GM
// @namespace    http://tampermonkey.net/
// @version      3.9.0
// @description  Bold text inside brackets, highlight high-priority rows, and when opening a ticket page or overlay, extract and store its L3 update date in GM storage. Board view then reads the stored date.
// @author		 Ben
// @match        https://chirotouch.atlassian.net/*
// @icon         https://i.postimg.cc/FFbZ0RCz/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/bold-bracket-text.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/bold-bracket-text.user.js
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.xmlHttpRequest
// ==/UserScript==

(function () {
	'use strict';

	/******************************************************************
	 * HELPER FUNCTIONS
	 ******************************************************************/
	function isExcludedImage(element) {
		const img = element.querySelector('img[src*="10318"]');
		return !!img;
	}

	function getStatusColor(date = new Date(), isTomorrow = false, hasTBD = false) {
		if (isTomorrow) {
			return '#2ecc71'; // Always green for tomorrow's date
		}

		const hours = date.getHours();
		const minutes = date.getMinutes();
		const currentTimeInMinutes = hours * 60 + minutes;
		const startTime = 930; // 3:30 PM
		const endTime = 1020; // 5:00 PM

		if (currentTimeInMinutes < startTime || currentTimeInMinutes >= endTime) {
			if (hasTBD) {
				return '#1a8a4c';
			}
			return '#2ecc71';
		}

		const progress = (currentTimeInMinutes - startTime) / (endTime - startTime);

		let startColor;

		if (hasTBD) {
			startColor = { r: 26, g: 138, b: 76 }; // #1a8a4c
		} else {
			startColor = { r: 46, g: 204, b: 113 }; // #2ecc71
		}

		const endColor = { r: 231, g: 76, b: 60 }; // #e74c3c

		const r = Math.round(startColor.r + (endColor.r - startColor.r) * progress);
		const g = Math.round(startColor.g + (endColor.g - startColor.g) * progress);
		const b = Math.round(startColor.b + (endColor.b - startColor.b) * progress);

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
			isCurrentOrTomorrow: checkDate === todayStr || checkDate === tomorrowStr,
		};
	}

	function getTooltipText(date, currentTimeInMinutes, hasTBD = false) {
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

		if (dateStatus.isTomorrow) return 'Yeehaw cowboy! You responsible AF 🤠';
		if (dateStatus.isCurrent && hasTBD)
			return 'Status is current, but needs some attention and love on it 🧡';
		if (dateStatus.isCurrent) return 'All current, noice 😎';
		return 'OH NOES UPDATE SOON D:';
	}

	// Shows a full-screen overlay prompting the user to reload.
	function showReloadOverlay(message = 'Please reload the page to see all updates') {
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
		overlay.style.flexDirection = 'column';
		overlay.style.alignItems = 'center';
		overlay.style.justifyContent = 'center';
		overlay.style.fontSize = '24px';
		overlay.style.zIndex = '10000';

		const messageElem = document.createElement('div');
		messageElem.textContent = message;

		const reloadButton = document.createElement('button');
		reloadButton.textContent = 'Reload Now';
		reloadButton.style.marginTop = '20px';
		reloadButton.style.padding = '10px 20px';
		reloadButton.style.fontSize = '18px';
		reloadButton.style.backgroundColor = '#3498db';
		reloadButton.style.color = 'white';
		reloadButton.style.border = 'none';
		reloadButton.style.borderRadius = '4px';
		reloadButton.style.cursor = 'pointer';
		reloadButton.addEventListener('click', () => {
			window.location.reload();
		});

		const closeButton = document.createElement('button');
		closeButton.textContent = 'Close';
		closeButton.style.marginTop = '10px';
		closeButton.style.padding = '5px 10px';
		closeButton.style.fontSize = '14px';
		closeButton.style.backgroundColor = 'transparent';
		closeButton.style.color = 'white';
		closeButton.style.border = '1px solid white';
		closeButton.style.borderRadius = '4px';
		closeButton.style.cursor = 'pointer';
		closeButton.addEventListener('click', () => {
			document.body.removeChild(overlay);
		});

		overlay.appendChild(messageElem);
		overlay.appendChild(reloadButton);
		overlay.appendChild(closeButton);

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
		if (top + tooltipRect.height + fullStatusTooltipRect.height + 5 > viewportHeight) {
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
			const keyElem = button.querySelector('[data-testid="platform-card.common.ui.key.key"]');
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
					// Remove any existing date display and separators
					const existingDate = summary.querySelector('.l3-update-date');
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
					const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

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
							updateDateSpan.style.backgroundColor = getStatusColor(
								now,
								dateStatus.isTomorrow,
								fullStatus.toUpperCase().includes('TBD')
							);
							updateDateSpan.innerHTML = `📅 <strong>${newDate}</strong>`;
							if (dateStatus.isTomorrow) {
								updateDateSpan.style.boxShadow = '0 0 10px #2ecc71';
								updateDateSpan.style.animation =
									'greenBubble 2s ease-in-out infinite';
								updateDateSpan.style.position = 'relative';
								updateDateSpan.style.display = 'inline-block';
							} else if (fullStatus.toUpperCase().includes('TBD')) {
								updateDateSpan.style.boxShadow = '0 0 10px #1a8a4c';
								updateDateSpan.style.animation =
									'greenBubble 2s ease-in-out infinite';
								updateDateSpan.style.position = 'relative';
								updateDateSpan.style.display = 'inline-block';
							}
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(
									newDate,
									currentTimeInMinutes,
									fullStatus.toUpperCase().includes('TBD')
								),
								fullStatus
							);
						} else {
							updateDateSpan.style.backgroundColor = '#e74c3c';
							updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
							updateDateSpan.style.animation = 'bubble 2s ease-in-out infinite';
							updateDateSpan.style.position = 'relative';
							updateDateSpan.style.display = 'inline-block';
							updateDateSpan.innerHTML = `📅 <strong>${newDate}</strong>`;
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(
									newDate,
									currentTimeInMinutes,
									fullStatus.toUpperCase().includes('TBD')
								),
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

					// Create/update buttons after updating a date
					createCopyButton();
					createOpenButton();
					break;
				}
			}
		}
	}

	async function extractAndStoreL3UpdateDate() {
		const ticketMatch = window.location.pathname.match(/\/browse\/(NEB-\d+)/);
		const overlayTicketId = new URLSearchParams(window.location.search).get('selectedIssue');
		const ticketId = ticketMatch ? ticketMatch[1] : overlayTicketId;
		if (!ticketId) return;

		const devQaHeading = [...document.querySelectorAll('h2')].find(h2 =>
			h2.textContent.includes('Dev / QA Status')
		);
		if (!devQaHeading) {
			return;
		}
		const headingParent = devQaHeading.parentElement;
		if (!headingParent) {
			return;
		}
		const dateContainer = headingParent.nextElementSibling;
		if (!dateContainer) {
			return;
		}
		const containerText = dateContainer.innerText || dateContainer.textContent || '';

		const dateMatch = containerText.match(/(\d{1,2}\/\d{1,2})/);
		if (dateMatch) {
			const date = dateMatch[1];
			const currentStoredData = await GM.getValue(ticketId, {});
			const newData = {
				date: date,
				fullStatus: containerText.trim(),
			};

			if (JSON.stringify(currentStoredData) !== JSON.stringify(newData)) {
				await GM.setValue(ticketId, newData);
				if (overlayTicketId) {
					updateTicketDateDisplay(ticketId, date, containerText);
				}
			}
		}
	}

	async function processL3UpdateDates() {
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		const processButton = async button => {
			if (
				button.getAttribute('data-l3-date-checked') === 'true' ||
				button.getAttribute('data-l3-date-being-updated') === 'true'
			)
				return;

			button.setAttribute('data-l3-date-being-updated', 'true');

			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (statusElement && statusElement.textContent.trim().toUpperCase() === 'COMPLETED') {
				button.setAttribute('data-l3-date-checked', 'true');
				button.removeAttribute('data-l3-date-being-updated');
				return;
			}

			// Skip if the row contains the excluded image
			if (isExcludedImage(button)) {
				button.setAttribute('data-l3-date-checked', 'true');
				button.removeAttribute('data-l3-date-being-updated');
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
				// Remove any existing date display and separators
				const existingDate = summary.querySelector('.l3-update-date');
				if (existingDate) {
					const parent = existingDate.parentNode;
					const prevSibling = existingDate.previousElementSibling;
					const nextSibling = existingDate.nextElementSibling;
					if (prevSibling && prevSibling.className === 'l3-date-separator')
						parent.removeChild(prevSibling);
					if (nextSibling && nextSibling.className === 'l3-date-separator')
						parent.removeChild(nextSibling);
					parent.removeChild(existingDate);
				}

				const keyElem = button.querySelector(
					'[data-testid="platform-card.common.ui.key.key"]'
				);
				if (keyElem) {
					const ticketId = keyElem.textContent.trim();
					const storedData = await GM.getValue(ticketId, {});
					const storedDate = storedData.date || '';
					const storedStatus = storedData.fullStatus || '';
					const hasTBD = storedStatus.toUpperCase().includes('TBD');
					const separatorBefore = document.createElement('span');
					separatorBefore.className = 'l3-date-separator';
					separatorBefore.style.cssText =
						'margin: 0 8px; border-left: 2px solid rgba(255,255,255,0.3); height: 16px; display: inline-block; vertical-align: middle;';
					const updateDateSpan = document.createElement('span');
					updateDateSpan.className = 'l3-update-date';
					updateDateSpan.style.cssText =
						'font-weight: normal; margin: 0 5px; color: white; text-shadow: 1px 1px 2px black; padding: 2px 8px; border-radius: 4px; font-size: 12px; cursor: help;';
					const now = new Date();
					const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

					if (!storedDate) {
						updateDateSpan.style.backgroundColor = '#e74c3c';
						updateDateSpan.innerHTML = `📅 <strong>Open To Check L3 Status Date</strong>`;
						addTooltipEvents(
							updateDateSpan,
							getTooltipText(null, currentTimeInMinutes, hasTBD),
							null
						);
					} else {
						const dateStatus = isDateCurrentOrTomorrow(storedDate);
						if (dateStatus.isCurrentOrTomorrow) {
							updateDateSpan.style.backgroundColor = getStatusColor(
								now,
								dateStatus.isTomorrow,
								hasTBD
							);
							updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;
							if (dateStatus.isTomorrow) {
								updateDateSpan.style.boxShadow = '0 0 10px #2ecc71';
								updateDateSpan.style.animation =
									'greenBubble 2s ease-in-out infinite';
								updateDateSpan.style.position = 'relative';
								updateDateSpan.style.display = 'inline-block';
							} else if (hasTBD) {
								updateDateSpan.style.boxShadow = '0 0 10px #1a8a4c';
								updateDateSpan.style.animation =
									'greenBubble 2s ease-in-out infinite';
								updateDateSpan.style.position = 'relative';
								updateDateSpan.style.display = 'inline-block';
							}
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(storedDate, currentTimeInMinutes, hasTBD),
								storedStatus
							);
						} else {
							updateDateSpan.style.backgroundColor = '#e74c3c';
							updateDateSpan.style.boxShadow = '0 0 10px #ff0000';
							updateDateSpan.style.animation = 'bubble 2s ease-in-out infinite';
							updateDateSpan.style.position = 'relative';
							updateDateSpan.style.display = 'inline-block';
							updateDateSpan.innerHTML = `📅 <strong>${storedDate}</strong>`;
							addTooltipEvents(
								updateDateSpan,
								getTooltipText(storedDate, currentTimeInMinutes, hasTBD),
								storedStatus
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
			}
			button.setAttribute('data-l3-date-checked', 'true');
			button.removeAttribute('data-l3-date-being-updated');
		};

		await Promise.all(Array.from(buttons).map(processButton));

		// Create/update buttons after processing dates
		createCopyButton();
		createOpenButton();
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
							document.createTextNode(text.substring(lastIndex, match.index))
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
					} else if (content.includes('L3 Request') || content.includes('Internal L3')) {
						backgroundSpan.style.backgroundColor = '#F79233';
					} else if (
						['Minor', 'Moderate', 'Major'].some(term => content.includes(term))
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
					fragments.push(document.createTextNode(text.substring(lastIndex)));
				}
				if (fragments.length > 0) {
					const parent = node.parentNode;
					fragments.forEach(fragment => parent.insertBefore(fragment, node));
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
					const isHighPriority = ['[Major', '[Critical', 'Patch', 'Promotion'].some(
						keyword => text.includes(keyword)
					);
					if (isHighPriority) {
						button.style.backgroundColor = 'rgba(211, 24, 0, 0.1)';
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
		const existingCopyButton = document.getElementById('copy-outdated-button');
		const outdatedTickets = [];
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		buttons.forEach(button => {
			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (statusElement && statusElement.textContent.trim().toUpperCase() === 'COMPLETED') {
				return;
			}

			// Skip if the row contains the excluded image
			if (isExcludedImage(button)) {
				return;
			}

			const summary = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
			);
			const keyElem = button.querySelector('[data-testid="platform-card.common.ui.key.key"]');
			const dateElem = summary?.querySelector('.l3-update-date');

			if (summary && keyElem && dateElem) {
				const ticketId = keyElem.textContent.trim();
				const summaryText = summary.textContent.trim();

				const isOpenToCheck = dateElem.textContent.includes('Open To Check');
				const dateMatch = dateElem.textContent.match(/(\d{1,2}\/\d{1,2})/);
				let displayedDate = '';

				if (isOpenToCheck) {
					displayedDate = 'NONE';
				} else if (dateMatch) {
					displayedDate = dateMatch[1];
				}

				// Push ticket if it's flagged as "Open To Check" or its date is outdated
				if (
					isOpenToCheck ||
					(displayedDate && !isDateCurrentOrTomorrow(displayedDate).isCurrentOrTomorrow)
				) {
					// Extract the first bracketed text if it exists
					const bracketMatch = summaryText.match(/\[(.*?)\]/);
					const bracketContent = bracketMatch ? bracketMatch[1] : '';

					// Remove the bracketed content and clean up the text
					let cleanSummary = summaryText
						.replace(/\[.*?\]/g, '') // Remove all bracketed content
						.replace(/\|\|/g, '') // Remove ||
						.replace(/\s+/g, ' ') // Replace multiple spaces with single space
						.replace(/\s*\d{1,2}\/\d{1,2}\s*/g, '') // Remove calendar dates like MM/DD
						.replace(/📅\s*/g, '') // Remove calendar emoji
						.trim();

					// If there's bracket content, format it properly
					const formattedBracketText = bracketContent ? `[${bracketContent}] ` : '';

					outdatedTickets.push({
						text: `${formattedBracketText}${ticketId} - ${cleanSummary}`,
						date: displayedDate,
						id: ticketId,
						url: `https://chirotouch.atlassian.net/browse/${ticketId}`,
					});
				}
			}
		});

		// Create (or re-use) the button container.
		let buttonContainer = document.getElementById('jira-custom-buttons');
		if (!buttonContainer) {
			buttonContainer = document.createElement('div');
			buttonContainer.id = 'jira-custom-buttons';
			buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-left: 16px;';
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
					// Sort tickets by date (NONE comes last)
					const sortedTickets = [...outdatedTickets].sort((a, b) => {
						if (a.date === 'NONE') return 1;
						if (b.date === 'NONE') return -1;

						// Parse dates and handle single-digit months
						const parseDate = dateStr => {
							const [month, day] = dateStr.split('/').map(n => parseInt(n, 10));
							const currentYear = new Date().getFullYear();

							// Assume dates from October onwards (>=10) are from last year
							const year = month >= 10 ? currentYear - 1 : currentYear;

							// Ensure month and day are properly padded for string comparison
							const paddedMonth = month.toString().padStart(2, '0');
							const paddedDay = day.toString().padStart(2, '0');
							return `${year}${paddedMonth}${paddedDay}`;
						};

						const dateA = parseDate(a.date);
						const dateB = parseDate(b.date);
						return dateA.localeCompare(dateB);
					});

					const htmlContent = `<meta charset='utf-8'><ol>${sortedTickets
						.map(ticket => {
							let dateText = ticket.date;
							if (dateText !== 'NONE') {
								// Format the date with leading zeros for month
								const [month, day] = dateText.split('/').map(n => parseInt(n, 10));
								dateText = `${month.toString().padStart(2, '0')}/${day}`;
							} else {
								dateText = 'No Date';
							}
							return `<li><a href="${ticket.url}" rel="noreferrer noopener" target="_blank" title="${ticket.url}">${ticket.text}</a><ul><li><strong>Last Update: </strong>${dateText}</li></ul></li>`;
						})
						.join('')}</ol>`;

					// Create a blob with HTML content
					const blob = new Blob([htmlContent], { type: 'text/html' });
					const clipboardItem = new ClipboardItem({
						'text/html': blob,
					});

					navigator.clipboard
						.write([clipboardItem])
						.then(() => {
							copyButton.innerHTML = `<span>✅</span><span>Copied ${outdatedTickets.length} tickets!</span>`;
							setTimeout(() => {
								copyButton.innerHTML = `<span>📋</span><span>Copy Outdated Tickets</span>`;
							}, 2000);
						})
						.catch(err => {
							console.error('Failed to copy:', err);
							copyButton.innerHTML = `<span>❌</span><span>Failed to copy</span>`;
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

	// Fetches ticket statuses via JIRA REST API
	async function fetchTicketStatusesViaAPI(ticketIds) {
		if (!ticketIds || ticketIds.length === 0) return {};

		// Create JQL query to get all tickets at once
		const jql = `issuekey in (${ticketIds.join(',')})`;
		const apiUrl = `https://chirotouch.atlassian.net/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=customfield_10039,summary,status`;

		try {
			const response = await new Promise((resolve, reject) => {
				GM.xmlHttpRequest({
					method: 'GET',
					url: apiUrl,
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					onload: function (response) {
						if (response.status >= 200 && response.status < 300) {
							resolve(JSON.parse(response.responseText));
						} else {
							reject(
								new Error(
									`API request failed with status ${response.status}: ${response.statusText}`
								)
							);
						}
					},
					onerror: function (error) {
						reject(new Error('API request failed: ' + error));
					},
				});
			});

			// Process the response and extract the L3 update dates
			const results = {};
			if (response && response.issues) {
				response.issues.forEach(issue => {
					const ticketId = issue.key;
					const devQaStatus = issue.fields.customfield_10039 || '';

					// Extract date using the same regex as in extractAndStoreL3UpdateDate
					const dateMatch = devQaStatus.match(/(\d{1,2}\/\d{1,2})/);
					const date = dateMatch ? dateMatch[1] : '';

					results[ticketId] = {
						date: date,
						fullStatus: devQaStatus.trim(),
						summary: issue.fields.summary,
						status: issue.fields.status?.name || '',
					};

					// Store the data in GM storage for future use
					GM.setValue(ticketId, {
						date: date,
						fullStatus: devQaStatus.trim(),
					});
				});
			}

			return results;
		} catch (error) {
			// Show reload overlay if there's an authentication error
			if (error.message.includes('401') || error.message.includes('403')) {
				showReloadOverlay();
			}
			return {};
		}
	}

	// Creates the Open Tickets button independently.
	function createOpenButton() {
		const existingOpenButton = document.getElementById('fetch-statuses-button');
		let ticketsToFetch = [];
		const buttons = document.querySelectorAll(
			'[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		buttons.forEach(button => {
			const statusElement = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
			);
			if (statusElement && statusElement.textContent.trim().toUpperCase() === 'COMPLETED')
				return;

			// Skip if the row contains the excluded image
			if (isExcludedImage(button)) return;

			const summary = button.querySelector(
				'[data-testid="platform-board-kit.ui.swimlane.summary-section"]'
			);
			const keyElem = button.querySelector('[data-testid="platform-card.common.ui.key.key"]');
			const dateElem = summary?.querySelector('.l3-update-date');

			if (summary && keyElem && dateElem) {
				const isOpenToCheck = dateElem.textContent.includes('Open To Check');
				const dateMatch = dateElem.textContent.match(/(\d{1,2}\/\d{1,2})/);
				const ticketId = keyElem.textContent.trim();

				if (
					isOpenToCheck ||
					(dateMatch && !isDateCurrentOrTomorrow(dateMatch[1]).isCurrentOrTomorrow)
				) {
					ticketsToFetch.push(ticketId);
				}
			}
		});

		let buttonContainer = document.getElementById('jira-custom-buttons');
		if (!buttonContainer) {
			buttonContainer = document.createElement('div');
			buttonContainer.id = 'jira-custom-buttons';
			buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-left: 16px;';
			const boardHeader = document.querySelector(
				'[data-testid="software-board.header.title.container"]'
			);
			if (boardHeader) boardHeader.appendChild(buttonContainer);
		}

		if (ticketsToFetch.length > 0) {
			if (!existingOpenButton) {
				const fetchButton = document.createElement('button');
				fetchButton.id = 'fetch-statuses-button';
				fetchButton.style.cssText =
					'background-color: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background-color 0.3s; display: flex; align-items: center; gap: 8px;';
				fetchButton.innerHTML = `<span>🔄</span><span>Fetch Statuses (${ticketsToFetch.length})</span>`;
				fetchButton.addEventListener('mouseover', () => {
					fetchButton.style.backgroundColor = '#2980b9';
				});
				fetchButton.addEventListener('mouseout', () => {
					fetchButton.style.backgroundColor = '#3498db';
				});
				fetchButton.addEventListener('click', async () => {
					// Change button appearance to indicate loading
					fetchButton.disabled = true;
					fetchButton.style.backgroundColor = '#95a5a6';
					fetchButton.innerHTML = `<span>⏳</span><span>Fetching ${ticketsToFetch.length} tickets...</span>`;

					try {
						// Fetch ticket statuses via API
						const ticketStatuses = await fetchTicketStatusesViaAPI(ticketsToFetch);
						const updatedCount = Object.keys(ticketStatuses).length;

						// Update the display for each ticket
						for (const [ticketId, statusData] of Object.entries(ticketStatuses)) {
							if (statusData.date) {
								updateTicketDateDisplay(
									ticketId,
									statusData.date,
									statusData.fullStatus
								);
							}
						}

						// Update button to show success
						fetchButton.disabled = false;
						fetchButton.style.backgroundColor = '#27ae60';
						fetchButton.innerHTML = `<span>✅</span><span>Updated ${updatedCount} tickets!</span>`;

						// If we updated a significant number of tickets, show the reload overlay
						if (updatedCount > 5) {
							showReloadOverlay();
						}

						// Reset button after a delay
						setTimeout(() => {
							fetchButton.style.backgroundColor = '#3498db';
							fetchButton.innerHTML = `<span>🔄</span><span>Fetch Statuses (${ticketsToFetch.length})</span>`;
						}, 3000);
					} catch (error) {
						console.error('Error fetching ticket statuses:', error);

						// Update button to show error
						fetchButton.disabled = false;
						fetchButton.style.backgroundColor = '#e74c3c';
						fetchButton.innerHTML = `<span>❌</span><span>Error: ${error.message}</span>`;

						// Reset button after a delay
						setTimeout(() => {
							fetchButton.style.backgroundColor = '#3498db';
							fetchButton.innerHTML = `<span>🔄</span><span>Fetch Statuses (${ticketsToFetch.length})</span>`;
						}, 3000);
					}
				});
				buttonContainer.appendChild(fetchButton);
			}
		} else if (existingOpenButton) {
			existingOpenButton.remove();
		}
	}

	/******************************************************************
	 * MUTATION OBSERVER & INITIALIZATION
	 ******************************************************************/
	const observer = new MutationObserver(() => {
		highlightCriticalRows();
		applyFormatting();
		processL3UpdateDates().catch(err => console.error('Error processing L3 dates:', err));
		// Use a slight delay to ensure the DOM is updated before creating buttons.
		setTimeout(() => {
			createCopyButton();
			createOpenButton();
		}, 100);

		// If in an overlay view, check and extract the L3 update date.
		const overlayTicketId = new URLSearchParams(window.location.search).get('selectedIssue');
		if (overlayTicketId) {
			extractAndStoreL3UpdateDate().catch(err =>
				console.error('Error extracting L3 date:', err)
			);
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
			setInterval(() => {
				extractAndStoreL3UpdateDate().catch(err =>
					console.error('Error extracting L3 date:', err)
				);
			}, 1000);
		}
	}

	window.addEventListener('load', () => {
		console.log('[load] Window loaded, executing functions...');
		if (
			window.location.pathname.match(/\/browse\/NEB-\d+/) ||
			new URLSearchParams(window.location.search).get('selectedIssue')
		) {
			extractAndStoreL3UpdateDate().catch(err =>
				console.error('Error extracting L3 date:', err)
			);
		} else {
			highlightCriticalRows();
			applyFormatting();
			processL3UpdateDates().catch(err => console.error('Error processing L3 dates:', err));
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
    @keyframes orangeBubble {
      0% { transform: scale(1); box-shadow: 0 0 10px #F79233; }
      50% { transform: scale(1.05); box-shadow: 0 0 20px #F79233, 0 0 30px #F79233; }
      100% { transform: scale(1); box-shadow: 0 0 10px #F79233; }
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
