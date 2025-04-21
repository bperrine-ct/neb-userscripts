// ==UserScript==
// @name         Jira Status Filter
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adds a Status filter to Jira boards
// @match        https://chirotouch.atlassian.net/*
// @grant        GM.getValue
// @grant        GM.setValue
// @icon         https://i.postimg.cc/MHWssTH3/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/status-dropdown.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/status-dropdown.user.js
// ==/UserScript==

(function () {
	'use strict';

	// Helper function to update filter badge
	const updateFilterBadge = (filterDiv, selectedCount, excludedCount) => {
		// Remove existing badge if any
		const existingBadge = filterDiv.querySelector(
			'[data-testid="filters.common.ui.list.status-filter-badge"]'
		);
		if (existingBadge) {
			existingBadge.remove();
		}

		// Get the button text element
		const buttonText = filterDiv.querySelector('._1bto1l2s');
		buttonText.textContent = 'Status';

		// If there are selected or excluded statuses, add a badge
		const totalCount = selectedCount + excludedCount;
		if (totalCount > 0) {
			const badge = document.createElement('span');
			badge.setAttribute('data-testid', 'filters.common.ui.list.status-filter-badge');
			badge.className = '_1e0c1o8l _19bv1y44';
			badge.innerHTML = `
				<span class="_2rkopd34 _18zr12x7 _1e0c116y _1o9zidpf _1kz6184x _bfhkomb0">
					<span class="css-zvtm5t">${totalCount}</span>
				</span>
			`;

			// Insert badge after the text
			const filterSpan = buttonText.closest(
				'[data-testid="filters.common.ui.list.status-filter"]'
			);
			filterSpan.appendChild(badge);
		}
	};

	const STATUS_OPTIONS = [
		{
			id: 'implemented',
			label: 'Implemented',
			background: '#ff9999',
			text: 'black',
		},
		{
			id: 'readytotest',
			label: 'Ready to Test',
			background: '#ff9999',
			text: 'black',
		},
		{
			id: 'intesting',
			label: 'In Testing',
			background: 'red',
			text: 'white',
		},
		{ id: 'pr', label: 'PR', background: '#2a5cdb', text: 'white' },
		{
			id: 'signoff',
			label: 'Sign Off',
			background: 'purple',
			text: 'white',
		},
		{ id: 'indev', label: 'In Dev', background: '#bbf2ed', text: 'black' },
		{
			id: 'insupport',
			label: 'In Support',
			background: '#f55653',
			text: 'black',
		},
		{ id: 'patch', label: 'Patch', background: 'orange', text: 'black' },
		{ id: 'open', label: 'Open', background: '#272d33', text: '#9faebc' },
		{
			id: 'refinement',
			label: 'Refinement Done',
			background: '#58736c',
			text: 'white',
		},
		{
			id: 'completed',
			label: 'Completed',
			background: '#1c332a',
			text: '#7ee3b8',
		},
	];

	// Helper function to save filters to GM storage
	const saveFilters = async statuses => {
		console.log('saveFilters called with:', statuses);
		await GM.setValue('jiraStatusFilter', JSON.stringify(statuses));
		console.log('Saved to GM storage:', JSON.stringify(statuses));
		// Also save to sessionStorage for backward compatibility
		sessionStorage.setItem('jiraStatusFilter', JSON.stringify(statuses));
		console.log('Saved to sessionStorage:', JSON.stringify(statuses));
		return true; // Return a value for the promise chain
	};

	// Helper function to load filters from GM storage
	const loadFilters = async () => {
		console.log('loadFilters called');
		const storedFilters = await GM.getValue('jiraStatusFilter', '[]');
		console.log('Loaded filters from GM storage:', storedFilters);
		return JSON.parse(storedFilters);
	};

	// Helper function to update statuses and ensure include/exclude are mutually exclusive
	const updateStatuses = (container, filterDiv) => {
		console.log('updateStatuses called');
		// Get all checked checkboxes
		const selectedStatuses = Array.from(
			container.querySelectorAll('input[type="checkbox"]:checked')
		).map(cb => cb.id);
		console.log('Selected statuses:', selectedStatuses);

		// Get all excluded statuses (buttons with non-none background)
		const excludeButtons = container.querySelectorAll('.exclude-status-btn');
		const excludedStatusIds = Array.from(excludeButtons)
			.filter(btn => btn.style.background !== 'none')
			.map(btn => `!${btn.dataset.status}`);
		console.log('Excluded statuses:', excludedStatusIds);

		// Combine both, ensuring no status is both included and excluded
		const newStatuses = [...selectedStatuses];

		excludedStatusIds.forEach(excludedId => {
			const regularId = excludedId.substring(1);
			// Only add if not already included
			if (!newStatuses.includes(regularId)) {
				newStatuses.push(excludedId);
			}
		});
		console.log('Combined new statuses:', newStatuses);

		// Apply the filter
		filterIssuesByStatus(newStatuses);

		// Update badge
		const excludedCount = newStatuses.filter(s => s.startsWith('!')).length;
		const includedCount = newStatuses.filter(s => !s.startsWith('!')).length;
		console.log(`Updating badge: ${includedCount} included, ${excludedCount} excluded`);
		updateFilterBadge(filterDiv, includedCount, excludedCount);

		return newStatuses;
	};

	const filterIssuesByStatus = selectedStatuses => {
		console.log('filterIssuesByStatus called with:', selectedStatuses);

		// Save to GM storage
		saveFilters(selectedStatuses);

		const applyFilter = () => {
			console.log('Applying filter to swimlanes');
			const swimlanes = document.querySelectorAll(
				'[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
			);
			console.log(`Found ${swimlanes.length} swimlanes to filter`);

			swimlanes.forEach(swimlane => {
				const swimlaneText = swimlane.textContent || '';
				if (swimlaneText.includes('─') || swimlaneText.includes('═')) {
					swimlane.style.display = '';
					swimlane.style.position = '';
					swimlane.style.height = '';
					swimlane.style.overflow = '';
					return;
				}

				const statusElement = swimlane.querySelector(
					'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
				);
				if (statusElement) {
					const currentStatus = statusElement.textContent.trim();

					if (!selectedStatuses.length) {
						swimlane.style.display = '';
						swimlane.style.position = '';
						swimlane.style.height = '';
						swimlane.style.overflow = '';
						return;
					}

					const excludedStatuses = selectedStatuses
						.filter(s => s.startsWith('!'))
						.map(s => STATUS_OPTIONS.find(opt => opt.id === s.substring(1))?.label)
						.filter(Boolean);

					const includedStatuses = selectedStatuses
						.filter(s => !s.startsWith('!'))
						.map(s => STATUS_OPTIONS.find(opt => opt.id === s)?.label)
						.filter(Boolean);

					// Show if current status is not in excluded statuses AND
					// (there are no included statuses OR current status is in included statuses)
					const isNotExcluded = !excludedStatuses.includes(currentStatus);
					const shouldInclude =
						!includedStatuses.length || includedStatuses.includes(currentStatus);

					if (isNotExcluded && shouldInclude) {
						swimlane.style.display = '';
						swimlane.style.position = '';
						swimlane.style.height = '';
						swimlane.style.overflow = '';
					} else {
						swimlane.style.display = 'none';
						swimlane.style.position = 'absolute';
						swimlane.style.height = '0';
						swimlane.style.overflow = 'hidden';
					}
				}
			});
		};

		applyFilter();

		const loadAllContent = () => {
			const scrollContainer = document.querySelector('[data-testid="software-board.board"]');
			if (!scrollContainer) return;

			scrollContainer.style.minHeight = '100%';
			scrollContainer.style.height = 'auto';

			const scrollEvent = new Event('scroll');
			window.dispatchEvent(scrollEvent);
		};

		loadAllContent();
	};

	// Function to handle clearing all filters
	const clearAllFilters = (container, filterDiv) => {
		console.log('clearAllFilters function called');
		const checkboxes = container.querySelectorAll('input[type="checkbox"]');
		const excludeButtons = container.querySelectorAll('.exclude-status-btn');

		console.log(
			`Found ${checkboxes.length} checkboxes and ${excludeButtons.length} exclude buttons`
		);

		checkboxes.forEach(cb => {
			cb.checked = false;
			console.log(`Unchecked checkbox: ${cb.id}`);
		});

		excludeButtons.forEach(btn => {
			btn.style.background = 'none';
			btn.style.color = 'var(--ds-text, #C7D1DB)';
			console.log(`Reset exclude button for: ${btn.dataset.status}`);
		});

		// Clear filters from GM storage and sessionStorage
		console.log('Clearing filters from storage');
		saveFilters([])
			.then(() => {
				console.log('Filters cleared from storage successfully');
			})
			.catch(err => {
				console.error('Error clearing filters:', err);
			});

		// Apply empty filter to show all issues
		console.log('Applying empty filter');
		filterIssuesByStatus([]);

		// Update badge (remove it)
		console.log('Updating filter badge');
		updateFilterBadge(filterDiv, 0, 0);

		console.log('Clear All operation completed');
	};

	const createStatusFilter = async () => {
		const filterContainer = document.querySelector(
			'[data-testid="software-filters.ui.list-filter-container"] > ul'
		);
		if (!filterContainer) return;

		const createDropdown = () => {
			const dropdown = document.createElement('div');
			dropdown.className = '_1o9zidpf _1f49kb7n _3um0ewfl _lcxv1wug';
			dropdown.style.cssText = `
				position: fixed;
				background: var(--ds-surface-overlay, #1B1F23);
				border-radius: 3px;
				box-shadow: var(--ds-shadow-overlay, 0 4px 8px rgba(0,0,0,0.1));
				z-index: 1000;
				display: none;
				padding: 4px 0;
				min-width: 200px;
				width: 300px;
				max-width: 90vw;
				max-height: calc(100vh - 150px);
				overflow-y: auto;
				overflow-x: hidden;
				scrollbar-width: thin;
				scrollbar-color: var(--ds-border-focused, #4C9AFF) transparent;
			`;

			// Add scrollbar styling for WebKit browsers (Chrome, Safari)
			const scrollbarStyle = document.createElement('style');
			scrollbarStyle.textContent = `
				.status-filter-dropdown::-webkit-scrollbar {
					width: 8px;
				}
				.status-filter-dropdown::-webkit-scrollbar-track {
					background: transparent;
				}
				.status-filter-dropdown::-webkit-scrollbar-thumb {
					background-color: var(--ds-border-focused, #4C9AFF);
					border-radius: 4px;
				}
				.status-option {
					cursor: pointer;
				}
			`;
			document.head.appendChild(scrollbarStyle);

			const container = document.createElement('div');
			container.setAttribute('data-focus-lock-disabled', 'false');
			container.className = 'css-1f7ebe5-container';

			// Add Clear All button at the top
			const clearAllButton = document.createElement('div');
			clearAllButton.style.cssText = `
				padding: 8px 12px;
				border-bottom: 1px solid var(--ds-border, #2E3B47);
				margin-bottom: 4px;
				position: sticky;
				top: 0;
				background: var(--ds-surface-overlay,rgb(115, 124, 132));
				z-index: 2;
			`;
			clearAllButton.innerHTML = `
				<button
					id="clear-all-status-btn"
					class="clear-all-btn"
					style="
						background: var(--ds-background-neutral,rgb(164, 175, 194));
						color: var(--ds-text-inverse, #FFFFFF);
						border: none;
						padding: 4px 8px;
						border-radius: 3px;
						cursor: pointer;
						width: 100%;
						font-weight: 500;
					"
					onclick="console.log('Clear All button inline click'); event.stopPropagation(); return false;"
				>Clear All</button>
			`;
			container.appendChild(clearAllButton);

			const dropdownContent = STATUS_OPTIONS.map(
				option => `
				<div class="css-19kn38z-option status-option" role="option" aria-selected="false" style="padding: 6px 12px;">
					<label style="display: flex; align-items: center; color: ${option.text}; cursor: pointer; width: 100%; background: ${option.background}; padding: 4px 8px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
						<input
							type="checkbox"
							id="${option.id}"
							style="margin-right: 8px; cursor: pointer; flex-shrink: 0;"
						/>
						<span style="overflow: hidden; text-overflow: ellipsis;">${option.label}</span>
						<button
							class="exclude-status-btn"
							data-status="${option.id}"
							style="
								margin-left: auto;
								background: none;
								border: 1px solid ${option.text};
								color: ${option.text};
								cursor: pointer;
								padding: 0 4px;
								min-width: 20px;
								height: 20px;
								display: flex;
								align-items: center;
								justify-content: center;
								border-radius: 3px;
								flex-shrink: 0;
							"
						>-</button>
					</label>
				</div>
			`
			).join('');

			container.innerHTML += dropdownContent;
			dropdown.appendChild(container);

			// Add hover effect to options
			const options = container.querySelectorAll('.status-option');
			options.forEach(option => {
				option.addEventListener('mouseover', () => {
					option.style.backgroundColor = 'var(--ds-background-selected, #282E33)';
				});
				option.addEventListener('mouseout', () => {
					option.style.backgroundColor = '';
				});
			});

			// Add click handler for exclude buttons
			container.addEventListener('click', e => {
				if (e.target.classList.contains('exclude-status-btn')) {
					e.preventDefault();
					e.stopPropagation();

					const button = e.target;
					const statusId = button.dataset.status;
					const checkbox = container.querySelector(`#${statusId}`);

					// Toggle button appearance
					const isExcluded = button.style.background !== 'none';
					if (isExcluded) {
						button.style.background = 'none';
						button.style.color = 'var(--ds-text, #C7D1DB)';
					} else {
						button.style.background = 'var(--ds-text, #C7D1DB)';
						button.style.color = 'var(--ds-surface-overlay, #1B1F23)';

						// If excluding, uncheck the include checkbox
						if (checkbox) {
							checkbox.checked = false;
						}
					}

					// Update statuses and UI
					updateStatuses(container, filterDiv);
				}
			});

			// Add click handler for checkboxes to ensure mutual exclusivity
			container.addEventListener('change', e => {
				if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
					const statusId = e.target.id;
					const excludeBtn = container.querySelector(`[data-status="${statusId}"]`);

					// If checkbox is checked, reset the exclude button
					if (e.target.checked && excludeBtn) {
						excludeBtn.style.background = 'none';
						excludeBtn.style.color = 'var(--ds-text, #C7D1DB)';
					}

					// Update statuses and UI
					updateStatuses(container, filterDiv);
				}
			});

			// Add click handler for the entire row
			container.addEventListener('click', e => {
				// Only handle clicks on the row or label, not on the checkbox or exclude button
				if (
					e.target.classList.contains('exclude-status-btn') ||
					e.target.type === 'checkbox'
				) {
					return;
				}

				// Find the closest status option row
				const statusOption = e.target.closest('.status-option');
				if (statusOption) {
					const checkbox = statusOption.querySelector('input[type="checkbox"]');
					if (checkbox) {
						// Toggle the checkbox
						checkbox.checked = !checkbox.checked;

						// If checkbox is now checked, reset the exclude button
						if (checkbox.checked) {
							const statusId = checkbox.id;
							const excludeBtn = statusOption.querySelector(
								`[data-status="${statusId}"]`
							);
							if (excludeBtn) {
								excludeBtn.style.background = 'none';
								excludeBtn.style.color = 'var(--ds-text, #C7D1DB)';
							}
						}

						// Trigger a change event to update the UI
						const changeEvent = new Event('change', { bubbles: true });
						checkbox.dispatchEvent(changeEvent);
					}
				}
			});

			// Add Clear All button click handler
			const clearAllButtonElement = container.querySelector('#clear-all-status-btn');
			console.log('Clear All button found:', clearAllButtonElement !== null);

			if (clearAllButtonElement) {
				clearAllButtonElement.addEventListener('click', e => {
					e.preventDefault();
					e.stopPropagation();
					console.log('Clear All button clicked');
					clearAllFilters(container, filterDiv);
				});
				console.log('Clear All button event listener attached');
			} else {
				console.error('Clear All button not found');
			}

			return dropdown;
		};

		const filterDiv = document.createElement('li');
		filterDiv.className = '_1o9zidpf _1f49kb7n _3um0ewfl _lcxv1wug _19pkidpf';
		filterDiv.setAttribute('aria-hidden', 'false');
		filterDiv.style.marginBottom = '0';
		filterDiv.style.marginTop = '0';

		filterDiv.innerHTML = `
            <div class="css-ivo26a">
                <button aria-haspopup="true" aria-expanded="false" class="css-13rzeaj" tabindex="0" type="button">
                    <span class="css-178ag6o">
                        <span role="presentation">
                            <span data-testid="filters.common.ui.list.status-filter" class="_1e0c1txw">
                                <span class="_p12f68cl _o5721q9c _1reo15vq _18m915vq _1bto1l2s">Status</span>
                            </span>
                        </span>
                    </span>
                    <span class="css-5a6fwh">
                        <span data-vc="icon-undefined" aria-hidden="true" class="css-snhnyn" style="--icon-primary-color: var(--ds-icon, #44546F); --icon-secondary-color: var(--ds-surface, #FFFFFF);">
                            <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
                                <path fill="currentcolor" fill-rule="evenodd" d="M8.292 10.293a1.01 1.01 0 0 0 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 0 0 0-1.419.987.987 0 0 0-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 0 0-1.406 0"></path>
                            </svg>
                        </span>
                    </span>
                </button>
            </div>
        `;

		const dropdown = createDropdown();
		dropdown.classList.add('status-filter-dropdown');
		filterDiv.appendChild(dropdown);

		const button = filterDiv.querySelector('button');
		button.addEventListener('click', e => {
			e.stopPropagation();
			const isExpanded = dropdown.style.display === 'block';
			button.setAttribute('aria-expanded', !isExpanded);

			if (!isExpanded) {
				const buttonRect = button.getBoundingClientRect();
				dropdown.style.display = 'block';
				dropdown.style.top = `${buttonRect.bottom}px`;
				dropdown.style.left = `${buttonRect.left}px`;
			} else {
				dropdown.style.display = 'none';
			}
		});

		dropdown.addEventListener('click', e => {
			const statusOption = e.target.closest('.status-option');
			if (
				statusOption &&
				e.target.tagName !== 'INPUT' &&
				!e.target.classList.contains('exclude-status-btn')
			) {
				const checkbox = statusOption.querySelector('input[type="checkbox"]');
				checkbox.checked = !checkbox.checked;

				// If checkbox is now checked, reset the exclude button
				if (checkbox.checked) {
					const statusId = checkbox.id;
					const excludeBtn = statusOption.querySelector(`[data-status="${statusId}"]`);
					if (excludeBtn) {
						excludeBtn.style.background = 'none';
						excludeBtn.style.color = 'var(--ds-text, #C7D1DB)';
					}
				}

				// Update statuses and UI
				updateStatuses(dropdown, filterDiv);
			}
		});

		// Load filters from GM storage
		const storedStatuses = await loadFilters();

		if (storedStatuses.length) {
			storedStatuses.forEach(statusId => {
				const cleanStatusId = statusId.replace('!', '');
				const checkbox = dropdown.querySelector(`#${cleanStatusId}`);
				if (checkbox) {
					if (statusId.startsWith('!')) {
						const excludeBtn = dropdown.querySelector(
							`[data-status="${cleanStatusId}"]`
						);
						if (excludeBtn) {
							excludeBtn.style.background = 'var(--ds-text, #C7D1DB)';
							excludeBtn.style.color = 'var(--ds-surface-overlay, #1B1F23)';
						}
						checkbox.checked = false;
					} else {
						checkbox.checked = true;
						// If included, make sure exclude button is reset
						const excludeBtn = dropdown.querySelector(
							`[data-status="${cleanStatusId}"]`
						);
						if (excludeBtn) {
							excludeBtn.style.background = 'none';
							excludeBtn.style.color = 'var(--ds-text, #C7D1DB)';
						}
					}
				}
			});

			// Update badge
			const excludedCount = storedStatuses.filter(s => s.startsWith('!')).length;
			const selectedCount = storedStatuses.filter(s => !s.startsWith('!')).length;
			updateFilterBadge(filterDiv, selectedCount, excludedCount);

			filterIssuesByStatus(storedStatuses);
		}

		const boardObserver = new MutationObserver(async () => {
			const storedStatuses = await loadFilters();
			if (storedStatuses.length) {
				filterIssuesByStatus(storedStatuses);
			}
		});

		const board = document.querySelector('[data-testid="software-board.board"]');
		if (board) {
			boardObserver.observe(board, {
				childList: true,
				subtree: true,
				attributes: false,
				characterData: false,
			});
		}

		const epicFilter = document.querySelector(
			'[data-testid="filters.common.ui.list.epic-filter"]'
		);
		if (epicFilter) {
			const epicParent = epicFilter.closest('._1o9zidpf');
			epicParent.parentNode.insertBefore(filterDiv, epicParent.nextSibling);
		} else {
			// Insert the filter into the list
			const quickFilterItem = filterContainer.querySelector(
				'li:has([data-testid="filters.common.ui.list.quick-filters-filter"])'
			);
			if (quickFilterItem) {
				quickFilterItem.parentNode.insertBefore(filterDiv, quickFilterItem.nextSibling);
			} else {
				// Fallback: append to the container if quick filter isn't found
				filterContainer.appendChild(filterDiv);
			}
		}
	};

	const observer = new MutationObserver((mutations, obs) => {
		const filterContainer = document.querySelector(
			'[data-testid="software-filters.ui.list-filter-container"]'
		);
		if (filterContainer) {
			createStatusFilter();
			obs.disconnect();
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	document.addEventListener('click', e => {
		const statusDropdown = document.querySelector('.status-filter-dropdown');
		const statusButton =
			statusDropdown?.previousElementSibling?.querySelector('[aria-haspopup="true"]');

		if (
			statusDropdown &&
			statusButton &&
			!statusDropdown.contains(e.target) &&
			!statusButton.contains(e.target)
		) {
			statusButton.setAttribute('aria-expanded', 'false');
			statusDropdown.style.display = 'none';
		}
	});
})();
