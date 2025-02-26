// ==UserScript==
// @name         Bitbucket Reviewer Groups
// @version      0.1
// @description  Add buttons to quickly add groups of reviewers to Bitbucket pull requests
// @match        https://bitbucket.org/*
// @match        https://chirotouch.atlassian.net/*
// @namespace    http://tampermonkey.net/
// @author       Ben
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/Bitbucket/bitbucket-reviewer-groups.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/Bitbucket/bitbucket-reviewer-groups.user.js
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// ==/UserScript==

(async function () {
	'use strict';

	// Configuration - Define your reviewer groups here
	const DEFAULT_GROUPS = {
		Egg: ['Ricardo Brandao', 'Tandreana Chua'],
	};

	// Set to true to use the direct selection method instead of simulating user input
	const USE_DIRECT_SELECTION = true;

	// Set to true to use the most aggressive method for finding and clicking options
	const USE_AGGRESSIVE_SELECTION = true;

	// Styles for the buttons and container
	const STYLES = `
        .reviewer-groups-container {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            background-color: #f5f5f5;
        }
        .reviewer-groups-title {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .reviewer-group-button {
            margin-right: 8px;
            margin-bottom: 8px;
            padding: 6px 12px;
            background-color: #0052CC;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .reviewer-group-button:hover {
            background-color: #0747A6;
        }
        .reviewer-group-edit {
            margin-top: 8px;
            display: none;
        }
        .reviewer-group-edit textarea {
            width: 100%;
            height: 100px;
            margin-bottom: 8px;
            font-family: monospace;
            font-size: 12px;
        }
        .reviewer-group-edit button {
            margin-right: 8px;
        }
        .toggle-edit-button {
            background-color: #6B778C;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 4px 8px;
            font-size: 11px;
            cursor: pointer;
            margin-left: 10px;
        }
        .toggle-edit-button:hover {
            background-color: #505F79;
        }
    `;

	// Load saved groups or use defaults
	let reviewerGroups = await GM.getValue('reviewerGroups', DEFAULT_GROUPS);

	// Function to add the reviewer groups UI
	function addReviewerGroupsUI() {
		// Find all reviewer sections
		const reviewerSections = document.querySelectorAll('section[aria-label="Review status"]');

		if (reviewerSections.length === 0) {
			// Not on a pull request page or the UI has changed
			return;
		}

		// Add styles to the page
		const styleElement = document.createElement('style');
		styleElement.textContent = STYLES;
		document.head.appendChild(styleElement);

		// Process each reviewer section
		reviewerSections.forEach(section => {
			// Check if we've already added our UI to this section
			if (section.querySelector('.reviewer-groups-container')) {
				return;
			}

			// Find the add reviewer container
			const addReviewerContainer = section.querySelector(
				'[data-testid="add-reviewer-container"]'
			);
			if (!addReviewerContainer) {
				return;
			}

			// Create our container
			const container = document.createElement('div');
			container.className = 'reviewer-groups-container';

			// Add title with edit button
			const titleContainer = document.createElement('div');
			titleContainer.className = 'reviewer-groups-title';
			titleContainer.textContent = 'Reviewer Groups';

			const editButton = document.createElement('button');
			editButton.className = 'toggle-edit-button';
			editButton.textContent = 'Edit Groups';
			editButton.onclick = () => toggleEditMode(container);
			titleContainer.appendChild(editButton);

			container.appendChild(titleContainer);

			// Add group buttons
			const buttonsContainer = document.createElement('div');
			buttonsContainer.className = 'reviewer-groups-buttons';

			Object.keys(reviewerGroups).forEach(groupName => {
				const button = document.createElement('button');
				button.className = 'reviewer-group-button';
				button.textContent = groupName;
				button.onclick = () => addReviewersFromGroup(groupName, section);
				buttonsContainer.appendChild(button);
			});

			container.appendChild(buttonsContainer);

			// Add edit area (hidden by default)
			const editArea = document.createElement('div');
			editArea.className = 'reviewer-group-edit';

			const textarea = document.createElement('textarea');
			textarea.value = JSON.stringify(reviewerGroups, null, 2);
			editArea.appendChild(textarea);

			const saveButton = document.createElement('button');
			saveButton.className = 'reviewer-group-button';
			saveButton.textContent = 'Save';
			saveButton.onclick = () => saveGroups(textarea, container);
			editArea.appendChild(saveButton);

			const cancelButton = document.createElement('button');
			cancelButton.className = 'reviewer-group-button';
			cancelButton.style.backgroundColor = '#6B778C';
			cancelButton.textContent = 'Cancel';
			cancelButton.onclick = () => toggleEditMode(container);
			editArea.appendChild(cancelButton);

			container.appendChild(editArea);

			// Insert our container after the add reviewer container
			addReviewerContainer.parentNode.insertBefore(
				container,
				addReviewerContainer.nextSibling
			);
		});
	}

	// Function to toggle edit mode
	function toggleEditMode(container) {
		const editArea = container.querySelector('.reviewer-group-edit');
		const buttonsContainer = container.querySelector('.reviewer-groups-buttons');

		if (editArea.style.display === 'block') {
			editArea.style.display = 'none';
			buttonsContainer.style.display = 'block';
		} else {
			editArea.style.display = 'block';
			buttonsContainer.style.display = 'none';

			// Refresh the textarea with current groups
			const textarea = editArea.querySelector('textarea');
			textarea.value = JSON.stringify(reviewerGroups, null, 2);
		}
	}

	// Function to save groups
	async function saveGroups(textarea, container) {
		try {
			const newGroups = JSON.parse(textarea.value);
			reviewerGroups = newGroups;
			await GM.setValue('reviewerGroups', newGroups);

			// Refresh the buttons
			const buttonsContainer = container.querySelector('.reviewer-groups-buttons');
			buttonsContainer.innerHTML = '';

			Object.keys(newGroups).forEach(groupName => {
				const button = document.createElement('button');
				button.className = 'reviewer-group-button';
				button.textContent = groupName;
				button.onclick = () =>
					addReviewersFromGroup(groupName, container.closest('section'));
				buttonsContainer.appendChild(button);
			});

			// Hide edit area
			toggleEditMode(container);
		} catch (error) {
			alert('Error saving groups: ' + error.message);
		}
	}

	// Function to add reviewers from a group
	function addReviewersFromGroup(groupName, section) {
		const reviewers = reviewerGroups[groupName];
		if (!reviewers || reviewers.length === 0) {
			return;
		}

		// Find the input field
		const inputContainer = section.querySelector('.fabric-user-picker__input-container');
		if (!inputContainer) {
			return;
		}

		const input = inputContainer.querySelector('input');
		if (!input) {
			return;
		}

		// Focus the input to ensure the dropdown will appear
		input.focus();

		// Add each reviewer one by one
		if (USE_DIRECT_SELECTION) {
			addNextReviewerDirect(reviewers, 0, input, section);
		} else {
			addNextReviewer(reviewers, 0, input, section);
		}
	}

	// Function to directly set input value and select option (more reliable in some cases)
	function addNextReviewerDirect(reviewers, index, input, section) {
		if (index >= reviewers.length) {
			return;
		}

		const reviewer = reviewers[index];

		// Clear the input
		input.value = '';
		input.dispatchEvent(new Event('input', { bubbles: true }));

		// Wait a bit to ensure the input is cleared
		setTimeout(() => {
			// Set the value directly
			input.value = reviewer;

			// Dispatch events to trigger the dropdown
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			input.dispatchEvent(
				new KeyboardEvent('keydown', {
					bubbles: true,
					cancelable: true,
					key: 'ArrowDown',
					keyCode: 40,
				})
			);

			// Wait for the dropdown to appear
			setTimeout(() => {
				// Try to find the option using various methods
				findAndClickOption(section, reviewer, () => {
					// Wait before adding the next reviewer
					setTimeout(() => {
						addNextReviewerDirect(reviewers, index + 1, input, section);
					}, 1000);
				});
			}, 1000);
		}, 300);
	}

	// Function to find and click the correct option using multiple strategies
	function findAndClickOption(section, reviewer, callback) {
		if (USE_AGGRESSIVE_SELECTION) {
			// Most aggressive approach: directly target the option by ID pattern and reviewer name
			const optionId = 'react-select-BitbucketPullRequestReviewers-option-0';
			const option = document.getElementById(optionId);

			if (option) {
				option.click();
				callback();
				return;
			}

			// Try to find any element with the reviewer name and click its parent option
			const allElements = document.querySelectorAll('*');
			for (const element of allElements) {
				if (element.textContent && element.textContent.includes(reviewer)) {
					// Find the closest option parent
					let parent = element;
					while (
						parent &&
						!parent.id?.includes('option') &&
						!parent.getAttribute('role') === 'option'
					) {
						parent = parent.parentElement;
						if (!parent) break;
					}

					if (
						parent &&
						(parent.id?.includes('option') || parent.getAttribute('role') === 'option')
					) {
						parent.click();
						callback();
						return;
					}
				}
			}
		}

		// Try different selectors to find the option
		const selectors = [
			'.fabric-user-picker__option',
			'[id^="react-select-BitbucketPullRequestReviewers-option"]',
			'.css-2am054-option',
			'[role="option"]',
		];

		// First try: direct selector match
		for (const selector of selectors) {
			const options = section.querySelectorAll(selector);

			for (const option of options) {
				// Check if this option contains the reviewer name
				if (option.textContent.includes(reviewer)) {
					option.click();
					callback();
					return;
				}
			}
		}

		// Second try: look for the option by searching for the reviewer name in any element
		const allElements = section.querySelectorAll('*');
		for (const element of allElements) {
			if (
				element.textContent.includes(reviewer) &&
				(element.getAttribute('role') === 'option' || element.closest('[role="option"]'))
			) {
				const optionElement =
					element.getAttribute('role') === 'option'
						? element
						: element.closest('[role="option"]');

				optionElement.click();
				callback();
				return;
			}
		}

		// Third try: check for shadow DOM elements
		const shadowRoots = [];
		for (const element of section.querySelectorAll('*')) {
			if (element.shadowRoot) {
				shadowRoots.push(element.shadowRoot);
			}
		}

		// Search in shadow roots
		for (const shadowRoot of shadowRoots) {
			const shadowElements = shadowRoot.querySelectorAll('*');
			for (const element of shadowElements) {
				if (element.textContent.includes(reviewer)) {
					// Find the closest clickable parent
					let clickTarget = element;
					while (clickTarget && !clickTarget.getAttribute('role') === 'option') {
						clickTarget = clickTarget.parentElement;
					}

					if (clickTarget) {
						clickTarget.click();
						callback();
						return;
					}
				}
			}
		}

		// If we get here, we couldn't find the option
		console.warn(`Reviewer "${reviewer}" not found - no matching option`);
		callback(); // Continue with the next reviewer anyway
	}

	// Function to add reviewers one by one
	function addNextReviewer(reviewers, index, input, section) {
		if (index >= reviewers.length) {
			return;
		}

		const reviewer = reviewers[index];

		// Clear the input
		input.value = '';

		// Trigger input event to clear previous results
		input.dispatchEvent(new Event('input', { bubbles: true }));

		// Small delay to ensure the input is cleared
		setTimeout(() => {
			// Set the value to the reviewer name
			input.value = reviewer;

			// Create and dispatch input event
			const inputEvent = new Event('input', { bubbles: true });
			input.dispatchEvent(inputEvent);

			// Also dispatch a keydown event to ensure the dropdown appears
			const keydownEvent = new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'ArrowDown',
				keyCode: 40,
			});
			input.dispatchEvent(keydownEvent);

			// Wait for the dropdown to appear and select the first result
			setTimeout(() => {
				// Find the option in the dropdown
				const option = section.querySelector('.fabric-user-picker__option');

				if (option) {
					// Click the option
					option.click();

					// Wait a bit before adding the next reviewer
					setTimeout(() => {
						addNextReviewer(reviewers, index + 1, input, section);
					}, 800);
				} else {
					// Try to find the option with a more specific selector
					const specificOption = section.querySelector(
						'[id^="react-select-BitbucketPullRequestReviewers-option"]'
					);

					if (specificOption) {
						specificOption.click();

						setTimeout(() => {
							addNextReviewer(reviewers, index + 1, input, section);
						}, 800);
					} else {
						// If no option found, skip to the next reviewer
						console.warn(`Reviewer "${reviewer}" not found`);
						setTimeout(() => {
							addNextReviewer(reviewers, index + 1, input, section);
						}, 500);
					}
				}
			}, 800);
		}, 200);
	}

	// Initialize the script
	function init() {
		// Add the UI
		addReviewerGroupsUI();

		// Set up a MutationObserver to detect when new reviewer sections are added
		const observer = new MutationObserver(mutations => {
			for (const mutation of mutations) {
				if (mutation.addedNodes.length) {
					addReviewerGroupsUI();
				}
			}
		});

		// Start observing the document body
		observer.observe(document.body, { childList: true, subtree: true });
	}

	// Wait for the page to load
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
