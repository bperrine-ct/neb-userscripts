// ==UserScript==
// @name         Jira Status Filter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds a Status filter to Jira boards
// @match        https://*.atlassian.net/jira/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	const STATUS_OPTIONS = [
		{ id: 'inDev', label: 'In Dev' },
		{ id: 'open', label: 'Open' },
		{ id: 'inTesting', label: 'In Testing' },
		{ id: 'inSupport', label: 'In Support' },
	];

	const filterIssuesByStatus = selectedStatuses => {
		sessionStorage.setItem(
			'jiraStatusFilter',
			JSON.stringify(selectedStatuses)
		);

		const applyFilter = () => {
			const swimlanes = document.querySelectorAll(
				'[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
			);

			swimlanes.forEach(swimlane => {
				const statusElement = swimlane.querySelector(
					'[data-testid="platform-board-kit.ui.swimlane.lozenge--text"]'
				);
				if (statusElement) {
					const currentStatus = statusElement.textContent.trim();

					if (!selectedStatuses.length) {
						swimlane.style.display = '';
					} else {
						const statusMap = {
							inDev: 'In Dev',
							open: 'Open',
							inTesting: 'In Testing',
							inSupport: 'In Support',
						};

						const shouldShow = selectedStatuses.some(
							status => currentStatus === statusMap[status]
						);
						swimlane.style.display = shouldShow ? '' : 'none';
					}
				}
			});
		};

		applyFilter();

		const loadAllContent = () => {
			const scrollContainer = document.querySelector(
				'[data-testid="software-board.board"]'
			);
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
			dropdown.className = 'status-filter-dropdown';
			dropdown.style.cssText = `
				position: absolute;
				background: white;
				border: 1px solid #DFE1E6;
				border-radius: 3px;
				box-shadow: 0 4px 8px rgba(0,0,0,0.1);
				z-index: 1000;
				display: none;
				padding: 8px 0;
			`;

			const dropdownContent = STATUS_OPTIONS.map(
				option => `
				<div class="status-option" data-status="${option.id}" style="
					padding: 8px 16px;
					cursor: pointer;
					display: flex;
					align-items: center;
					gap: 8px;
				">
					<input type="checkbox" id="${option.id}" />
					<label for="${option.id}">${option.label}</label>
				</div>
			`
			).join('');

			dropdown.innerHTML = dropdownContent;
			return dropdown;
		};

		const filterDiv = document.createElement('div');
		filterDiv.className = '_1o9zidpf _1f49kb7n _3um0ewfl _lcxv1wug';
		filterDiv.setAttribute('aria-hidden', 'false');
		filterDiv.style.marginBottom = '0';
		filterDiv.style.marginTop = '0';

		filterDiv.innerHTML = `
            <div class="css-ivo26a">
                <button aria-haspopup="true" aria-expanded="false" class="css-5z308y" tabindex="0" type="button">
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
		filterDiv.appendChild(dropdown);

		const button = filterDiv.querySelector('button');
		button.addEventListener('click', e => {
			e.stopPropagation();
			const isExpanded = button.getAttribute('aria-expanded') === 'true';
			button.setAttribute('aria-expanded', !isExpanded);
			dropdown.style.display = isExpanded ? 'none' : 'block';
		});

		dropdown.addEventListener('click', e => {
			const statusOption = e.target.closest('.status-option');
			if (statusOption) {
				const checkbox = statusOption.querySelector(
					'input[type="checkbox"]'
				);
				checkbox.checked = !checkbox.checked;

				const selectedStatuses = Array.from(
					dropdown.querySelectorAll('input[type="checkbox"]:checked')
				).map(cb => cb.id);

				const buttonText = filterDiv.querySelector('._1bto1l2s');
				buttonText.textContent = selectedStatuses.length
					? `Status: ${selectedStatuses.length} selected`
					: 'Status';

				filterIssuesByStatus(selectedStatuses);

				e.stopPropagation();
			}
		});

		const storedStatuses = JSON.parse(
			sessionStorage.getItem('jiraStatusFilter') || '[]'
		);
		if (storedStatuses.length) {
			storedStatuses.forEach(statusId => {
				const checkbox = dropdown.querySelector(`#${statusId}`);
				if (checkbox) {
					checkbox.checked = true;
				}
			});

			const buttonText = filterDiv.querySelector('._1bto1l2s');
			buttonText.textContent = `Status: ${storedStatuses.length} selected`;

			filterIssuesByStatus(storedStatuses);
		}

		const boardObserver = new MutationObserver(mutations => {
			const storedStatuses = JSON.parse(
				sessionStorage.getItem('jiraStatusFilter') || '[]'
			);
			if (storedStatuses.length) {
				filterIssuesByStatus(storedStatuses);
			}
		});

		const board = document.querySelector(
			'[data-testid="software-board.board"]'
		);
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
			epicParent.parentNode.insertBefore(
				filterDiv,
				epicParent.nextSibling
			);
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
})();
