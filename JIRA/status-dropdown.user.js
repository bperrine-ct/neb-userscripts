// ==UserScript==
// @name         Jira Status Filter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a Status filter to Jira boards
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// @icon         https://i.postimg.cc/MHWssTH3/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/status-dropdown.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/status-dropdown.user.js
// ==/UserScript==

(function () {
	'use strict';

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
			id: 'completed',
			label: 'Completed',
			background: '#1c332a',
			text: '#7ee3b8',
		},
	];

	const filterIssuesByStatus = selectedStatuses => {
		sessionStorage.setItem('jiraStatusFilter', JSON.stringify(selectedStatuses));

		const applyFilter = () => {
			const swimlanes = document.querySelectorAll(
				'[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
			);

			swimlanes.forEach(swimlane => {
				const swimlaneText = swimlane.textContent || '';
				if (swimlaneText.includes('─') || swimlaneText.includes('═')) {
					swimlane.style.display = '';
					return;
				}

				const statusElement = swimlane.querySelector(
					'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
				);
				if (statusElement) {
					const currentStatus = statusElement.textContent.trim();

					if (!selectedStatuses.length) {
						swimlane.style.display = '';
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

					swimlane.style.display = isNotExcluded && shouldInclude ? '' : 'none';
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

	const createStatusFilter = () => {
		const filterContainer = document.querySelector(
			'[data-testid="software-filters.ui.list-filter-container"] > div'
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
				max-height: 80vh;
				overflow-y: auto;
			`;

			const container = document.createElement('div');
			container.setAttribute('data-focus-lock-disabled', 'false');
			container.className = 'css-1f7ebe5-container';

			// Add Clear All button at the top
			const clearAllButton = document.createElement('div');
			clearAllButton.style.cssText = `
				padding: 8px 12px;
				border-bottom: 1px solid var(--ds-border, #2E3B47);
				margin-bottom: 4px;
			`;
			clearAllButton.innerHTML = `
				<button
					class="clear-all-btn"
					style="
						background: var(--ds-background-danger, #AE2A19);
						color: var(--ds-text-inverse, #FFFFFF);
						border: none;
						padding: 4px 8px;
						border-radius: 3px;
						cursor: pointer;
						width: 100%;
					"
				>Clear All</button>
			`;
			container.appendChild(clearAllButton);

			const dropdownContent = STATUS_OPTIONS.map(
				option => `
				<div class="css-19kn38z-option status-option" role="option" aria-selected="false" style="padding: 6px 12px;">
					<label style="display: flex; align-items: center; color: ${option.text}; cursor: pointer; width: 100%; background: ${option.background}; padding: 4px 8px; border-radius: 3px;">
						<input
							type="checkbox"
							id="${option.id}"
							style="margin-right: 8px; cursor: pointer;"
						/>
						${option.label}
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
							"
						>-</button>
					</label>
				</div>
			`
			).join('');

			container.innerHTML = dropdownContent;
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
					}

					if (checkbox) {
						checkbox.checked = false;
						// Get all currently selected statuses (both included and excluded)
						const currentStatuses = JSON.parse(
							sessionStorage.getItem('jiraStatusFilter') || '[]'
						);
						const selectedStatuses = Array.from(
							container.querySelectorAll('input[type="checkbox"]:checked')
						).map(cb => cb.id);

						// Handle the excluded status
						const excludedStatusId = `!${statusId}`;
						let newStatuses;

						if (isExcluded) {
							// Remove the excluded status
							newStatuses = currentStatuses.filter(s => s !== excludedStatusId);
						} else {
							// Add the new excluded status while preserving existing ones
							newStatuses = [
								...currentStatuses.filter(s => s !== statusId),
								excludedStatusId,
							];
						}

						// Add the regular selected statuses (if any)
						selectedStatuses.forEach(id => {
							if (!newStatuses.includes(id)) {
								newStatuses.push(id);
							}
						});

						filterIssuesByStatus(newStatuses);

						// Update button text
						const buttonText = filterDiv.querySelector('._1bto1l2s');
						const excludedCount = newStatuses.filter(s => s.startsWith('!')).length;
						const selectedCount = newStatuses.filter(s => !s.startsWith('!')).length;
						buttonText.textContent =
							excludedCount || selectedCount
								? `Status: ${selectedCount} selected, ${excludedCount} excluded`
								: 'Status';
					}
				}
			});

			// Add Clear All button click handler
			clearAllButton.addEventListener('click', () => {
				const checkboxes = container.querySelectorAll('input[type="checkbox"]');
				const excludeButtons = container.querySelectorAll('.exclude-status-btn');

				checkboxes.forEach(cb => (cb.checked = false));
				excludeButtons.forEach(btn => {
					btn.style.background = 'none';
					btn.style.color = 'var(--ds-text, #C7D1DB)';
				});

				filterIssuesByStatus([]);

				const buttonText = filterDiv.querySelector('._1bto1l2s');
				buttonText.textContent = 'Status';
			});

			return dropdown;
		};

		const filterDiv = document.createElement('div');
		filterDiv.className = '_1o9zidpf _1f49kb7n _3um0ewfl _lcxv1wug';
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
			if (statusOption) {
				const checkbox = statusOption.querySelector('input[type="checkbox"]');
				checkbox.checked = !checkbox.checked;

				const selectedStatuses = Array.from(
					dropdown.querySelectorAll('input[type="checkbox"]:checked')
				).map(cb => cb.id);

				const buttonText = filterDiv.querySelector('._1bto1l2s');
				buttonText.textContent = selectedStatuses.length
					? `Status: ${selectedStatuses.length} selected`
					: 'Status';

				filterIssuesByStatus(selectedStatuses);
			}
		});

		const storedStatuses = JSON.parse(sessionStorage.getItem('jiraStatusFilter') || '[]');
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
					} else {
						checkbox.checked = true;
					}
				}
			});

			const buttonText = filterDiv.querySelector('._1bto1l2s');
			const excludedCount = storedStatuses.filter(s => s.startsWith('!')).length;
			const selectedCount = storedStatuses.filter(s => !s.startsWith('!')).length;
			buttonText.textContent = `Status: ${selectedCount} selected, ${excludedCount} excluded`;

			filterIssuesByStatus(storedStatuses);
		}

		const boardObserver = new MutationObserver(() => {
			const storedStatuses = JSON.parse(sessionStorage.getItem('jiraStatusFilter') || '[]');
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
			filterContainer.appendChild(filterDiv);
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
