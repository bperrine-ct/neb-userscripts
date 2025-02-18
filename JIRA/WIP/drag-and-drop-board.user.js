// ==UserScript==
// @name         Jira Sprint Board Swimlane Reorder with Immediate DOM Update
// @namespace    http://chirotouch.atlassian.net/
// @version      1.5
// @description  Allow dragging and reordering swimlanes on the sprint board with immediate DOM update and improved drop indicator
// @author
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// ==/UserScript==

(function () {
	'use strict';

	var rapidViewId = null;
	var sprintId = null;
	var customFieldId = null;
	var dragSrcEl = null;
	var dropIndicator = null;
	var insertPosition = 'afterend';

	function createDropIndicator() {
		dropIndicator = document.createElement('div');
		dropIndicator.style.height = '0px';
		dropIndicator.style.borderTop = '2px solid #4C9AFF';
		dropIndicator.style.margin = '0';
		dropIndicator.style.position = 'absolute';
		dropIndicator.style.width = '100%';
		dropIndicator.style.pointerEvents = 'none';
		dropIndicator.style.zIndex = '1000';
	}

	function showDropIndicator(targetElement, position) {
		hideDropIndicator();

		var rect = targetElement.getBoundingClientRect();
		var wrapperRect = targetElement.parentNode.getBoundingClientRect();

		dropIndicator.style.left = wrapperRect.left + 'px';
		dropIndicator.style.width = wrapperRect.width + 'px';

		var offsetTop = window.pageYOffset + rect.top;
		if (position === 'before') {
			dropIndicator.style.top = offsetTop + 'px';
		} else {
			dropIndicator.style.top = offsetTop + rect.height + 'px';
		}

		document.body.appendChild(dropIndicator);
	}

	function hideDropIndicator() {
		if (dropIndicator && dropIndicator.parentNode) {
			dropIndicator.parentNode.removeChild(dropIndicator);
		}
	}

	function getRapidViewIdFromURL() {
		var match = window.location.href.match(/\/boards\/(\d+)/);
		if (match) {
			return parseInt(match[1], 10);
		}
		return null;
	}

	function getActiveSprintId(rapidViewId, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', '/rest/agile/1.0/board/' + rapidViewId + '/sprint?state=active', true);
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
					console.error('Failed to get active sprint:', xhr.responseText);
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
						var customFieldId = rankField.id.replace('customfield_', '');
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

	function getSwimlaneIssueKey(swimlaneElement) {
		var swimlaneHeader = swimlaneElement.querySelector(
			'div[data-testid="platform-board-kit.ui.swimlane.swimlane-content"]'
		);
		if (swimlaneHeader) {
			var issueKeyElement = swimlaneHeader.querySelector('a[href^="/browse/"]');
			if (issueKeyElement) {
				var href = issueKeyElement.getAttribute('href');
				var issueKey = href.replace('/browse/', '');
				return issueKey;
			}
		}
		return null;
	}

	function updateSwimlaneOrder(draggedIssueKey, targetIssueKey) {
		var data = {
			addToBacklog: false,
			calculateNewIssuesOrder: false,
			customFieldId: customFieldId,
			idOrKeys: [draggedIssueKey],
			rapidViewId: rapidViewId,
			sprintId: sprintId,
		};

		if (insertPosition === 'beforebegin') {
			data.idOrKeyBefore = targetIssueKey;
		} else {
			data.idOrKeyAfter = targetIssueKey;
		}

		var xhr = new XMLHttpRequest();
		xhr.open('PUT', '/rest/greenhopper/1.0/sprint/rank', true);
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader('X-Atlassian-Token', 'no-check');
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					console.log('Swimlane order updated successfully');
					// Refresh the page to reflect the changes
					// location.reload();
				} else {
					console.error('Failed to update swimlane order:', xhr.responseText);
				}
			}
		};
		xhr.send(JSON.stringify(data));
	}

	function handleDragStart(e) {
		dragSrcEl = this;
		var issueKey = getSwimlaneIssueKey(this);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', issueKey);
		createDropIndicator();
	}

	function handleDragOver(e) {
		e.preventDefault();

		var rect = this.getBoundingClientRect();
		var offset = e.clientY - rect.top;
		var height = this.offsetHeight;

		if (offset < height / 2) {
			insertPosition = 'beforebegin';
			showDropIndicator(this, 'before');
		} else {
			insertPosition = 'afterend';
			showDropIndicator(this, 'after');
		}

		e.dataTransfer.dropEffect = 'move';
	}

	function handleDragLeave(e) {
		if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) {
			hideDropIndicator();
		}
	}

	function handleDrop(e) {
		e.preventDefault();

		if (dragSrcEl != this) {
			// Swap the 'top' values of the swimlanes
			var dragSrcTop = dragSrcEl.style.top;
			var targetTop = this.style.top;

			dragSrcEl.style.top = targetTop;
			this.style.top = dragSrcTop;

			var draggedIssueKey = e.dataTransfer.getData('text/plain');
			var targetIssueKey = getSwimlaneIssueKey(this);

			updateSwimlaneOrder(draggedIssueKey, targetIssueKey);
		}
		hideDropIndicator();
	}

	function handleDragEnd() {
		hideDropIndicator();
	}

	function initDragAndDrop() {
		var swimlaneElements = document.querySelectorAll(
			'div[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]'
		);

		swimlaneElements.forEach(function (swimlaneElement) {
			var swimlaneHeader = swimlaneElement.querySelector(
				'div[data-testid="platform-board-kit.ui.swimlane.swimlane-content"]'
			);
			if (swimlaneHeader && !swimlaneHeader.getAttribute('data-draggable')) {
				swimlaneHeader.setAttribute('draggable', true);
				swimlaneHeader.setAttribute('data-draggable', 'true');

				swimlaneHeader.addEventListener('dragstart', function (e) {
					handleDragStart.call(swimlaneElement, e);
				});
				swimlaneHeader.addEventListener('dragover', function (e) {
					handleDragOver.call(swimlaneElement, e);
				});
				swimlaneHeader.addEventListener('dragleave', function (e) {
					handleDragLeave.call(swimlaneElement, e);
				});
				swimlaneHeader.addEventListener('drop', function (e) {
					handleDrop.call(swimlaneElement, e);
				});
				swimlaneHeader.addEventListener('dragend', function (e) {
					handleDragEnd.call(swimlaneElement, e);
				});
			}
		});
	}

	function observeDOMChanges() {
		var targetNode = document.querySelector('[data-test-id="software-board.board-area"]');
		if (!targetNode) {
			console.error('Could not find board area');
			return;
		}

		var config = { childList: true, subtree: true };

		var callback = function () {
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
