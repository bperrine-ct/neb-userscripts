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
		Egg: [
			'Benjamin Calisch',
			'Darielle Ozaki',
			'Jan Roces',
			'Lucas Oliveira Silveira',
			'Odilomar Junior',
			'Ricardo Brandao',
			'Tandreana Chua',
			'Regis Vinicius Rodrigues',
		],
		Arch: ['Anthony Reed', 'Martin Burch'],
	};

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
		addNextReviewerSimple(reviewers, 0, input, section);
	}

	// Simple function to type a name and click the first option
	function addNextReviewerSimple(reviewers, index, input, section) {
		if (index >= reviewers.length) {
			return;
		}

		const reviewer = reviewers[index];

		// Clear the input
		input.value = '';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));

		// Also try to focus and click the input to ensure it's active
		input.focus();
		input.click();

		// Wait a bit to ensure the input is cleared
		setTimeout(() => {
			// Type the reviewer name character by character to simulate real typing
			typeCharByChar(input, reviewer, 0, () => {
				// Wait for the dropdown to appear
				setTimeout(() => {
					// Try multiple selectors to find the option
					const selectors = [
						'[id^="react-select-BitbucketPullRequestReviewers-option-0"]',
						'.fabric-user-picker__option',
						'[role="option"]',
					];

					let option = null;
					for (const selector of selectors) {
						option = document.querySelector(selector);
						if (option) break;
					}

					if (option) {
						// Click the option
						option.click();

						// Wait before adding the next reviewer
						setTimeout(() => {
							addNextReviewerSimple(reviewers, index + 1, input, section);
						}, 1000);
					} else {
						console.warn(`Reviewer "${reviewer}" not found - no option appeared`);

						// Try one more time with a longer wait
						setTimeout(() => {
							// Try again with different selectors
							for (const selector of selectors) {
								option = document.querySelector(selector);
								if (option) {
									option.click();

									setTimeout(() => {
										addNextReviewerSimple(reviewers, index + 1, input, section);
									}, 1000);
									return;
								}
							}

							// If still not found, skip to the next reviewer
							addNextReviewerSimple(reviewers, index + 1, input, section);
						}, 1000);
					}
				}, 800);
			});
		}, 300);
	}

	// Function to type a string character by character to simulate real typing
	function typeCharByChar(input, text, index, callback) {
		if (index >= text.length) {
			// After typing all characters, dispatch additional events
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));

			// Also dispatch keyboard events
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
			setTimeout(() => {
				input.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
				);
				callback();
			}, 100);
			return;
		}

		// Add the next character
		input.value = text.substring(0, index + 1);

		// Dispatch input event
		input.dispatchEvent(new Event('input', { bubbles: true }));

		// Type the next character after a small delay
		setTimeout(() => {
			typeCharByChar(input, text, index + 1, callback);
		}, 50);
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
