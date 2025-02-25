// ==UserScript==
// @name         JIRA - Highlight Statuses
// @namespace    http://tampermonkey.net/
// @version      3.4.6
// @description  Highlight various statuses with specific colors, adjust epic lozenge styling for improved visibility, and add theme selection
// @author       BEST QA
// @match        https://chirotouch.atlassian.net/*
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/highlight-statuses.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/highlight-statuses.user.js
// @grant        GM_xmlhttpRequest
// @connect      chirotouch.atlassian.net
// @icon         https://i.postimg.cc/nL7d512Y/image.png
// ==/UserScript==

(function () {
	const THEMES = {
		Default: {
			IMPLEMENTED: { background: '#ff9999', text: 'black' },
			'READY TO TEST': { background: '#ff9999', text: 'black' },
			'IN TESTING': { background: 'red', text: 'white' },
			PR: { background: '#2a5cdb', text: 'white' },
			'SIGN OFF': { background: 'purple', text: 'white' },
			'IN PROGRESS': { background: '#bbf2ed', text: 'black' },
			'IN DEV': { background: '#bbf2ed', text: 'black' },
			'AUTO - SKIPPED': { background: '#f55653', text: 'black' },
			'IN SUPPORT': { background: '#f55653', text: 'black' },
			'AUTO - RETRY': { background: '#f59998', text: 'black' },
			'AUTO - IN PROGRESS': { background: '#bbf2ed', text: 'black' },
			'AUTO - PR': { background: '#2a5cdb', text: 'white' },
			'IN REFINEMENT': {
				background: 'var(--ds-background-neutral,#DFE1E6)',
				text: 'var(--ds-text,#42526E)',
			},
			'REFINEMENT DONE': {
				background: 'var(--ds-background-neutral,#DFE1E6)',
				text: 'var(--ds-text,#42526E)',
			},
			PATCH: { background: 'orange', text: 'black' },
			OPEN: { background: '#272d33', text: '#9faebc' },
			REVIEW: { background: '#272d33', text: '#9faebc' },
			COMPLETED: { background: '#1c332a', text: '#7ee3b8' },
		},
		Vaporwave: {
			IMPLEMENTED: { background: '#ff6ec7', text: 'white' },
			'READY TO TEST': { background: '#ff6ec7', text: 'white' },
			'IN TESTING': { background: '#28b3bd', text: 'white' },
			'IN PROGRESS': { background: '#d9b3ff', text: 'white' },
			'SIGN OFF': { background: '#a8e6cf', text: 'black' },
			PR: { background: '#e6b917', text: 'black' },
			COMPLETED: { background: 'black', text: '#fffc4d' }, // No background color specified
		},
		Starfield: {
			OPEN: { background: '#22304f', text: 'white' }, //dark blue
			'IN PROGRESS': { background: '#48668d', text: 'white' }, //light blue
			PR: { background: '#d0a14c', text: 'white' }, //yellow
			IMPLEMENTED: { background: '#cc5a30', text: 'white' }, //orange
			'READY TO TEST': { background: '#c22237', text: 'white' }, //red
			'IN TESTING': { background: '#c22237', text: 'white' }, //red
			'SIGN OFF': { background: 'black', text: 'white' },
			COMPLETED: { background: 'white', text: 'black' }, // No background color specified
		},
		Darielle: {
			IMPLEMENTED: { background: '#ff9999', text: 'black' },
			'READY TO TEST': { background: '#ff9999', text: 'black' },
			'IN TESTING': { background: 'red', text: 'white' },
			PR: { background: 'orange', text: 'black' },
			'SIGN OFF': { background: 'purple', text: 'white' },
			'IN PROGRESS': { background: '#bbf2ed', text: 'black' },
			'AUTO - SKIPPED': { background: '#f55653', text: 'black' },
			'AUTO - RETRY': { background: '#f59998', text: 'black' },
			'AUTO - IN PROGRESS': { background: '#bbf2ed', text: 'black' },
			'AUTO - PR': { background: 'orange', text: 'black' },
			'IN REFINEMENT': {
				background: 'var(--ds-background-neutral,#DFE1E6)',
				text: 'var(--ds-text,#42526E)',
			},
			'REFINEMENT DONE': {
				background: 'var(--ds-background-neutral,#DFE1E6)',
				text: 'var(--ds-text,#42526E)',
			},
		},
		Tandreana: {
			IMPLEMENTED: { background: '#E3F4F4', text: 'black' },
			'READY TO TEST': { background: '#B0D9B1', text: 'black' },
			'IN TESTING': { background: '#DC8686', text: 'white' },
			PR: { background: '#E5D9F2', text: 'black' },
			'SIGN OFF': { background: '#804674', text: 'white' },
			'IN PROGRESS': { background: '#FEDEFF', text: 'black' },
			'AUTO - SKIPPED': { background: '#f55653', text: 'black' },
			'AUTO - RETRY': { background: '#f59998', text: 'black' },
			'AUTO - IN PROGRESS': { background: '#bbf2ed', text: 'black' },
			'AUTO - PR': { background: '#DFCCFB', text: 'white' },
			'IN REFINEMENT': {
				background: 'var(--ds-background-neutral,#DFE1E6)',
				text: 'var(--ds-text,#42526E)',
			},
			'REFINEMENT DONE': {
				background: 'var(--ds-background-neutral,#DFE1E6)',
				text: 'var(--ds-text,#42526E)',
			},
			PATCH: { background: '#FFD4B2', text: 'black' },
			OPEN: { background: '#ECDFCC', text: '#black' },
			REVIEW: { background: '#272d33', text: '#9faebc' },
			COMPLETED: { background: '#CEEDC7', text: 'black' },
			'IN DEV': { background: '#FFB6C1', text: 'black' },
		},
	};

	const AVATAR_MAPPINGS = {
		'Tandreana Chua': 'https://i.pinimg.com/736x/db/fb/66/dbfb66fae994bdbc07284198d52eaf36.jpg',
		// "Ricardo Brandao": "https://i.postimg.cc/wMS97Zrr/Ricardo.jpg"
		// Add more mappings as needed
	};

	let currentTheme = THEMES.Default;

	// Cache for storing retest dates to avoid repeated API calls
	const retestDateCache = {};

	// Statuses that should show retest dates
	const RETEST_STATUSES = ['IN TESTING', 'READY TO TEST', 'IMPLEMENTED'];

	// Function to fetch retest date from Jira API
	function fetchRetestDate(issueKey) {
		return new Promise(resolve => {
			// Check cache first
			if (retestDateCache[issueKey]) {
				resolve(retestDateCache[issueKey]);
				return;
			}

			const apiUrl = `https://chirotouch.atlassian.net/rest/api/2/issue/${issueKey}?fields=customfield_12885`;

			GM_xmlhttpRequest({
				method: 'GET',
				url: apiUrl,
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				onload: function (response) {
					try {
						const data = JSON.parse(response.responseText);
						const retestDate = data.fields.customfield_12885;

						// Store in cache
						retestDateCache[issueKey] = retestDate;
						resolve(retestDate);
					} catch (error) {
						console.error('Error parsing retest date:', error);
						resolve(null);
					}
				},
				onerror: function (error) {
					console.error('Error fetching retest date:', error);
					resolve(null);
				},
			});
		});
	}

	// Function to calculate days between dates
	function calculateDaysBetween(dateString) {
		if (!dateString) return null;

		const retestDate = new Date(dateString);
		const today = new Date();

		// Reset time part for accurate day calculation
		retestDate.setHours(0, 0, 0, 0);
		today.setHours(0, 0, 0, 0);

		const diffTime = retestDate - today;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		return diffDays;
	}

	// Function to update status text with retest date
	async function updateStatusWithRetestDate(element, issueKey) {
		try {
			const retestDate = await fetchRetestDate(issueKey);
			if (!retestDate) return;

			const daysDiff = calculateDaysBetween(retestDate);
			if (daysDiff === null) return;

			// Check if we already added the days indicator
			const existingDaysIndicator =
				element.parentNode.querySelector('.retest-days-indicator');
			if (existingDaysIndicator) {
				existingDaysIndicator.textContent = `(${daysDiff})`;
				return;
			}

			// Create a new element for the days indicator
			const daysIndicator = document.createElement('span');
			daysIndicator.className = 'retest-days-indicator';
			daysIndicator.textContent = `(${daysDiff})`;
			daysIndicator.style.marginLeft = '4px';
			daysIndicator.style.fontWeight = 'bold';

			// Add tooltip with full date
			const formattedDate = new Date(retestDate).toLocaleDateString();
			daysIndicator.title = `Retest Date: ${formattedDate}`;

			// Insert after the status element
			element.parentNode.insertBefore(daysIndicator, element.nextSibling);
		} catch (error) {
			console.error('Error updating status with retest date:', error);
		}
	}

	function applyStyles(element, color, textColor = 'white', padding = true) {
		if (color) {
			element.style.setProperty('background-color', color, 'important');
		}
		element.style.setProperty('color', textColor, 'important');
		element.style.setProperty('border-radius', '4px', 'important');

		if (padding) {
			element.style.setProperty('padding', '2px 6px', 'important');
		}
	}

	function highlightStatuses() {
		const applyThemeWithFallback = statusText => {
			return currentTheme[statusText] || THEMES.Default[statusText];
		};

		// Original selector
		document
			.querySelectorAll('div._1e0c116y._1bsb1osq._2rko1l7b._16qs13jn._y44vglyw')
			.forEach(div => {
				const button = div.querySelector('button');

				if (button) {
					const statusText = button.textContent.trim().toUpperCase();

					if (applyThemeWithFallback(statusText)) {
						applyStyles(
							button,
							applyThemeWithFallback(statusText).background,
							applyThemeWithFallback(statusText).text,
							false
						);

						applyStyles(
							div,
							applyThemeWithFallback(statusText).background,
							applyThemeWithFallback(statusText).text,
							false
						);
					}
				}
			});

		// New selector for updated Jira UI
		document
			.querySelectorAll('div._2rko1l7b._1e0c116y._1bsb1osq._16qs1pcf._y44vglyw')
			.forEach(div => {
				const button = div.querySelector('button');

				if (button) {
					const statusText = button.textContent.trim().toUpperCase();

					if (applyThemeWithFallback(statusText)) {
						applyStyles(
							button,
							applyThemeWithFallback(statusText).background,
							applyThemeWithFallback(statusText).text,
							false
						);

						applyStyles(
							div,
							applyThemeWithFallback(statusText).background,
							applyThemeWithFallback(statusText).text,
							false
						);
					}
				}
			});

		// Additional selector for status buttons in the spotlight view
		document
			.querySelectorAll('div[data-testid="ref-spotlight-target-status-spotlight"] button')
			.forEach(button => {
				const statusText = button.textContent.trim().toUpperCase();
				const themeStyle = applyThemeWithFallback(statusText);

				if (themeStyle) {
					applyStyles(button, themeStyle.background, themeStyle.text, false);

					// Also style the parent container
					const container = button.closest(
						'div._2rko1l7b._1e0c116y._1bsb1osq._16qs1pcf._y44vglyw'
					);
					if (container) {
						applyStyles(container, themeStyle.background, themeStyle.text, false);
					}
				}
			});

		// Process status lozenges
		document
			.querySelectorAll(
				'span[data-testid="platform-board-kit.ui.swimlane.lozenge"], ' +
					'span[data-testid="platform-board-kit.ui.swimlane.lozenge--text"], ' +
					'div[data-testid^="issue.fields.status.common.ui.status-lozenge"] span, ' +
					'span.css-1iv2wki div._1bsb1osq, ' +
					'span[data-testid="common-components-status-lozenge.status-lozenge--text"]'
			)
			.forEach(el => {
				const statusText = el.textContent.trim().toUpperCase();
				const themeStyle = applyThemeWithFallback(statusText);

				// Check if element is within swimlane-wrapper and has flag icon
				const isInSwimlane = el.closest(
					'div[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
				);
				const hasFlagIcon = isInSwimlane?.querySelector(
					'span[data-vc="icon-undefined"][aria-label="Flagged"]'
				);

				if (themeStyle) {
					// Apply flag background color if flagged, otherwise use theme color
					const backgroundColor =
						isInSwimlane && hasFlagIcon ? '#FF5630' : themeStyle.background;
					const textColor = isInSwimlane && hasFlagIcon ? '#000' : themeStyle.text;
					applyStyles(el, backgroundColor, textColor);

					el.style.setProperty(
						'border-radius',
						'var(--ds-border-radius, 3px)',
						'important'
					);

					el.style.setProperty('box-sizing', 'border-box', 'important');
					el.style.setProperty('display', 'inline-block', 'important');
					el.style.setProperty(
						'font-weight',
						'var(--ds-font-weight-bold, 700)',
						'important'
					);

					el.style.setProperty('padding', '0 var(--ds-space-050, 4px)', 'important');

					el.style.setProperty('text-transform', 'uppercase', 'important');
					el.style.setProperty('vertical-align', 'top', 'important');
					el.style.setProperty('max-width', '200px', 'important');
					el.style.setProperty('overflow', 'hidden', 'important');
					el.style.setProperty('text-overflow', 'ellipsis', 'important');
					el.style.setProperty('white-space', 'nowrap', 'important');
					el.style.setProperty('width', '100%', 'important');
				}
			});
	}

	function hideEpicLozenges() {
		document
			.querySelectorAll('div[data-testid="platform-board-kit.ui.swimlane.epic.lozenge"]')
			.forEach(el => {
				el.style.setProperty('display', 'none', 'important');
			});
	}

	function createThemeSelector() {
		const themeSelector = document.createElement('select');
		themeSelector.id = 'theme-selector';
		themeSelector.style.marginRight = '10px';
		themeSelector.style.padding = '8px';
		themeSelector.style.borderRadius = '4px';
		themeSelector.style.border = '1px solid #ccc';
		themeSelector.style.fontSize = '14px';
		themeSelector.style.backgroundColor = 'transparent';

		Object.keys(THEMES).forEach(theme => {
			const option = document.createElement('option');
			option.value = theme;
			option.textContent = theme;
			themeSelector.appendChild(option);
		});

		const savedTheme = getSelectedTheme();
		themeSelector.value = savedTheme;
		currentTheme = THEMES[savedTheme];

		themeSelector.addEventListener('change', event => {
			currentTheme = THEMES[event.target.value];
			setSelectedTheme(event.target.value);
			highlightStatuses();
		});

		const navBar = document.querySelector('nav[aria-label="Primary"]');

		if (navBar) {
			navBar.appendChild(themeSelector);
		}
	}

	function getSelectedTheme() {
		return localStorage.getItem('selectedTheme') || 'Default';
	}

	function setSelectedTheme(theme) {
		localStorage.setItem('selectedTheme', theme);
	}

	function changeAvatars() {
		// First instance
		document
			.querySelectorAll('div[data-testid="platform-board-kit.ui.swimlane.swimlane-content"]')
			.forEach(div => {
				const nameSpan = div.querySelector('span[id$="-avatar-label"]');

				if (nameSpan && AVATAR_MAPPINGS[nameSpan.textContent.trim()]) {
					const imgs = div.querySelectorAll('img[data-vc="avatar-image"]');
					imgs.forEach(img => {
						img.src = AVATAR_MAPPINGS[nameSpan.textContent.trim()];
					});
				}
			});

		// Second instance
		document.querySelectorAll('div[data-testid="read-view-container"]').forEach(div => {
			const nameSpan = div.querySelector(
				'span[data-testid="issue.views.field.user.assignee.name.wrapper"] span'
			);

			if (nameSpan && AVATAR_MAPPINGS[nameSpan.textContent.trim()]) {
				const imgs = div.querySelectorAll('img[data-vc="avatar-image"]');
				imgs.forEach(img => {
					img.src = AVATAR_MAPPINGS[nameSpan.textContent.trim()];
				});
			}
		});

		// Third instance
		document
			.querySelectorAll(
				'div[data-testid="profilecard-next.ui.profilecard.profilecard-trigger"]'
			)
			.forEach(div => {
				const nameSpan = div.querySelector('span[id$="-avatar-label"]');

				if (nameSpan && AVATAR_MAPPINGS[nameSpan.textContent.trim()]) {
					const imgs = div.querySelectorAll('img[data-vc="avatar-image"]');
					imgs.forEach(img => {
						img.src = AVATAR_MAPPINGS[nameSpan.textContent.trim()];
					});
				}
			});

		// Fourth instance
		document
			.querySelectorAll('div[role="menu"] div[role="menuitemcheckbox"]')
			.forEach(button => {
				const nameSpan = button.querySelector('span[id$="-avatar-label"]');

				if (nameSpan && AVATAR_MAPPINGS[nameSpan.textContent.trim()]) {
					const imgs = button.querySelectorAll('img[data-vc="avatar-image"]');
					imgs.forEach(img => {
						img.src = AVATAR_MAPPINGS[nameSpan.textContent.trim()];
					});
				}
			});
	}

	function processStatusElements() {
		document
			.querySelectorAll(
				'span[data-testid="platform-board-kit.ui.swimlane.lozenge--text"], ' +
					'div[data-testid^="issue.fields.status.common.ui.status-lozenge"] span, ' +
					'span[data-testid="common-components-status-lozenge.status-lozenge--text"]'
			)
			.forEach(el => {
				const statusText = el.textContent.trim().toUpperCase();

				// Only process specific statuses
				if (!RETEST_STATUSES.includes(statusText)) return;

				// Find the issue key
				let issueKey = null;

				// For board view
				const issueContainer =
					el.closest('[data-testid="platform-board-kit.ui.card.card"]') ||
					el.closest('[data-testid="platform-board-kit.ui.swimlane.swimlane-content"]');

				if (issueContainer) {
					const keyElement = issueContainer.querySelector(
						'[data-testid="platform-card.common.ui.key.key"]'
					);
					if (keyElement) {
						issueKey = keyElement.textContent.trim();
					}
				}

				// For issue detail view
				if (!issueKey) {
					const urlMatch = window.location.href.match(/\/browse\/([A-Z]+-\d+)/);
					if (urlMatch && urlMatch[1]) {
						issueKey = urlMatch[1];
					}
				}

				if (issueKey && !el.hasAttribute('data-retest-processing')) {
					el.setAttribute('data-retest-processing', 'true');
					updateStatusWithRetestDate(el, issueKey);
				}
			});
	}

	// Run the functions when the page loads
	window.addEventListener('load', () => {
		createThemeSelector();
		highlightStatuses();
		hideEpicLozenges();
		changeAvatars();
		processStatusElements();
	});

	// Set up a mutation observer to handle dynamic content
	const observer = new MutationObserver(() => {
		highlightStatuses();
		hideEpicLozenges();
		changeAvatars();
		processStatusElements();
	});
	observer.observe(document.body, { childList: true, subtree: true });

	// Speed up the initial load by manually triggering the highlight on backlog pages
	if (window.location.href.includes('/jira/software/c/projects/')) {
		highlightStatuses();
		processStatusElements();
	}

	// Also check for issue detail pages
	if (window.location.href.includes('/browse/')) {
		highlightStatuses();
		processStatusElements();
	}
})();
