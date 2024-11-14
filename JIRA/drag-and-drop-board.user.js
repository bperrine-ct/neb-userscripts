// ==UserScript==
// @name         Jira Sprint Board Issue Reorder
// @namespace    http://chirotouch.atlassian.net/
// @version      1.0
// @description  Allow dragging and reordering issues on the sprint board
// @author       [Your Name]
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	var rapidViewId = null;
	var sprintId = null;
	var customFieldId = null;
	var dragSrcEl = null;

	function getRapidViewIdFromURL() {
		var match = window.location.href.match(/\/boards\/(\d+)/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return null;
	}

	function getActiveSprintId(rapidViewId, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open(
			'GET',
			'/rest/agile/1.0/board/' + rapidViewId + '/sprint?state=active',
			true
		);
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					var response = JSON.parse(xhr.responseText);
					if (response.values && response.values.length > 0) {
						var sprintId = response.values[0].id;
						callback(sprintId);
					} else {
						console.error('No active sprint found');
					}
				} else {
					console.error(
						'Failed to get active sprint:',
						xhr.responseText
					);
				}
			}
		};
		xhr.send();
	}

	function getCustomFieldId(callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '/rest/api/2/field', true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					var response = JSON.parse(xhr.responseText);
					var rankField = response.find(function (field) {
						return field.name === 'Rank';
					});
					if (rankField) {
						var customFieldId = rankField.id.replace(
							'customfield_',
							''
						);
						callback(parseInt(customFieldId, 10));
					} else {
						console.error('Rank field not found');
					}
				} else {
					console.error('Failed to get fields:', xhr.responseText);
				}
			}
		};
		xhr.send();
	}

	function getIssueKey(issueElement) {
		var link = issueElement.querySelector('a[href^="/browse/"]');
		if (link) {
			var href = link.getAttribute('href');
			var issueKey = href.replace('/browse/', '');
			return issueKey;
		}
		return null;
	}

	function updateIssueOrder(draggedIssueKey, targetIssueKey) {
		var data = {
			addToBacklog: false,
			calculateNewIssuesOrder: false,
			customFieldId: customFieldId,
			idOrKeys: [draggedIssueKey],
			rapidViewId: rapidViewId,
			sprintId: sprintId,
			idOrKeyBefore: targetIssueKey,
		};

		var xhr = new XMLHttpRequest();
		xhr.open('PUT', '/rest/greenhopper/1.0/sprint/rank', true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('X-Atlassian-Token', 'no-check');
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					console.log('Issue order updated successfully');
				} else {
					console.error(
						'Failed to update issue order:',
						xhr.responseText
					);
				}
			}
		};
		xhr.send(JSON.stringify(data));
	}

	function handleDragStart(e) {
		this.style.opacity = '0.4';
		dragSrcEl = this;
		var issueKey = getIssueKey(this);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', issueKey);
	}

	function handleDragOver(e) {
		if (e.preventDefault) {
			e.preventDefault(); // Necessary. Allows us to drop.
		}
		e.dataTransfer.dropEffect = 'move';
		return false;
	}

	function handleDrop(e) {
		if (e.stopPropagation) {
			e.stopPropagation(); // Stops some browsers from redirecting.
		}

		if (dragSrcEl != this) {
			// Swap the elements in the DOM
			var parentNode = this.parentNode;
			parentNode.insertBefore(dragSrcEl, this);

			// Now, we need to send the PUT request to update the ordering
			var draggedIssueKey = e.dataTransfer.getData('text/plain');
			var targetIssueKey = getIssueKey(this);

			updateIssueOrder(draggedIssueKey, targetIssueKey);
		}
		return false;
	}

	function handleDragEnd(e) {
		this.style.opacity = '1';
	}

	function initDragAndDrop() {
		var issueElements = document.querySelectorAll(
			'button[data-testid="platform-board-kit.ui.swimlane.link-button"]'
		);

		issueElements.forEach(function (issueElement) {
			if (!issueElement.getAttribute('data-draggable')) {
				issueElement.setAttribute('draggable', true);
				issueElement.setAttribute('data-draggable', 'true');

				issueElement.addEventListener('dragstart', handleDragStart);
				issueElement.addEventListener('dragover', handleDragOver);
				issueElement.addEventListener('drop', handleDrop);
				issueElement.addEventListener('dragend', handleDragEnd);
			}
		});
	}

	function observeDOMChanges() {
		var targetNode = document.querySelector(
			'[data-test-id="software-board.board-area"]'
		);
		if (!targetNode) {
			console.error('Could not find board area');
			return;
		}

		var config = { childList: true, subtree: true };

		var callback = function (mutationsList, observer) {
			initDragAndDrop();
		};

		var observer = new MutationObserver(callback);
		observer.observe(targetNode, config);
	}

	// Initialization
	rapidViewId = getRapidViewIdFromURL();
	if (rapidViewId) {
		getActiveSprintId(rapidViewId, function (id) {
			sprintId = id;
			getCustomFieldId(function (cfId) {
				customFieldId = cfId;
				// Now, initialize drag and drop
				initDragAndDrop();
				observeDOMChanges();
			});
		});
	} else {
		console.error('Could not determine rapidViewId from URL');
	}
})();
