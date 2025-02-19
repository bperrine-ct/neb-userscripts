// ==UserScript==
// @name         JIRA - Copy as HTML Link
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Makes the copy link button copy an HTML hyperlink with the ticket title
// @author       Ben
// @match        https://chirotouch.atlassian.net/*
// @icon         https://i.postimg.cc/FFbZ0RCz/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/copy-as-html-link.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/copy-as-html-link.user.js
// ==/UserScript==

(function () {
	'use strict';

	// Add styles to make button static
	const style = document.createElement('style');
	style.textContent = `
		.static-button {
			opacity: 1 !important;
			visibility: visible !important;
			-webkit-box-align: baseline;
			align-items: baseline;
			border-width: 0px;
			border-radius: var(--ds-border-radius, 3px);
			box-sizing: border-box;
			display: inline-flex;
			font-size: inherit;
			font-style: normal;
			font-family: inherit;
			font-weight: var(--ds-font-weight-medium, 500);
			max-width: 100%;
			position: relative;
			text-align: center;
			text-decoration: none;
			white-space: nowrap;
			background: var(--ds-background-neutral-subtle, none);
			cursor: pointer;
			height: auto;
			line-height: inherit;
			padding: 0px;
			vertical-align: baseline;
			width: auto;
			-webkit-box-pack: center;
			justify-content: center;
			color: var(--ds-text-subtle, #6B778C) !important;
			transition: none !important;
			animation: none !important;
		}
		.static-button:hover {
			background: none !important;
		}
		.static-button * {
			transition: none !important;
			animation: none !important;
		}
	`;
	document.head.appendChild(style);

	// Function to create our button
	function createCopyButton() {
		const button = document.createElement('button');
		button.className = 'static-button';
		button.tabIndex = 0;
		button.type = 'button';
		button.innerHTML = `
			<span>
				<span role="img" aria-label="Copy link" style="color: var(--ds-text-subtle, #6B778C);">
					<svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
						<g fill="currentcolor" fill-rule="evenodd">
							<path d="m12.856 5.457-.937.92a1 1 0 0 0 0 1.437 1.047 1.047 0 0 0 1.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 0 1 .203 3.81l-2.903 2.852a2.646 2.646 0 0 1-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 0 0-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path>
							<path d="m11.144 19.543.937-.92a1 1 0 0 0 0-1.437 1.047 1.047 0 0 0-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 0 1-.203-3.81l2.903-2.852a2.646 2.646 0 0 1 3.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 0 0 .357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path>
						</g>
					</svg>
				</span>
			</span>`;
		return button;
	}

	function handleCopyLinkClick(event) {
		// Prevent any default behavior
		event.preventDefault();
		event.stopPropagation();

		const button = event.currentTarget;

		// Get the current URL
		const url = window.location.href;

		// Get the title from the heading
		const heading = document.querySelector(
			'[data-testid="issue.views.issue-base.foundation.summary.heading"]'
		);
		if (!heading) {
			return;
		}

		const title = heading.textContent.trim();

		// Create the HTML link
		const htmlContent = `<a href="${url}">${title}</a>`;

		// Create a blob with HTML content
		const blob = new Blob([htmlContent], { type: 'text/html' });
		const clipboardItem = new ClipboardItem({
			'text/html': blob,
		});

		// Copy to clipboard
		navigator.clipboard
			.write([clipboardItem])
			.then(() => {
				// Show success feedback without animation
				const originalHTML = button.innerHTML;
				button.innerHTML = `
					<span>
						<span role="img" style="color: #36B37E;">✓</span>
					</span>`;
				setTimeout(() => {
					button.innerHTML = originalHTML;
				}, 2000);
			})
			.catch(err => {
				console.error('Failed to copy:', err);
				// Show error feedback without animation
				const originalHTML = button.innerHTML;
				button.innerHTML = `
					<span>
						<span role="img" style="color: #FF5630;">✕</span>
					</span>`;
				setTimeout(() => {
					button.innerHTML = originalHTML;
				}, 2000);
			});
	}

	// Wait for the button to exist
	const waitForButton = setInterval(() => {
		const originalButton = document.querySelector(
			'button:has([data-testid="issue.common.component.permalink-button.button.link-icon"])'
		);
		if (originalButton) {
			clearInterval(waitForButton);

			// Create our button
			const newButton = createCopyButton();
			newButton.addEventListener('click', handleCopyLinkClick);

			// Replace the original button
			originalButton.parentNode.replaceChild(newButton, originalButton);
		}
	}, 100);
})();
