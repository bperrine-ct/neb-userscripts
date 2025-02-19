// ==UserScript==
// @name         JIRA - Copy as HTML Link
// @namespace    http://tampermonkey.net/
// @version      1.1
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
				<span role="img" aria-label="Copy link" style="color: var(--ds-text-subtle, #6B778C); font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
					<svg width="16" height="16" viewBox="0 0 24 24" role="presentation">
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

		// Get the URL from the breadcrumb link
		const breadcrumbLink = document.querySelector(
			'[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]'
		);
		if (!breadcrumbLink) {
			return;
		}
		const url = new URL(breadcrumbLink.href).toString();

		// Get the title from the heading
		const heading = document.querySelector(
			'[data-testid="issue.views.issue-base.foundation.summary.heading"]'
		);
		if (!heading) {
			return;
		}

		const title = heading.textContent.trim();

		// Create the HTML link and plain text URL
		const htmlContent = `<a href="${url}">${title}</a>`;

		// Create blobs for both formats
		const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
		const textBlob = new Blob([url], { type: 'text/plain' });

		const clipboardItem = new ClipboardItem({
			'text/html': htmlBlob,
			'text/plain': textBlob,
		});

		// Copy to clipboard
		navigator.clipboard
			.write([clipboardItem])
			.then(() => {
				// Show success feedback without animation
				const originalHTML = button.innerHTML;
				button.innerHTML = `
					<span>
						<span role="img" data-testid="issue.common.component.permalink-button.button.check-circle-icon" style="color: #36B37E; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
							<svg width="16" height="16" viewBox="0 0 24 24" role="presentation">
								<path d="M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm0 2C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.414-9.414l4.242-4.242a1 1 0 1 1 1.414 1.414l-4.242 4.242a1 1 0 0 1-1.414 0L8.344 11.758a1 1 0 1 1 1.414-1.414L11 11.586z" fill="currentColor" fill-rule="evenodd"></path>
							</svg>
						</span>
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
						<span role="img" style="color: #FF5630; font-size: 16px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">✕</span>
					</span>`;
				setTimeout(() => {
					button.innerHTML = originalHTML;
				}, 2000);
			});
	}

	// Wait for the button or icon to exist
	const waitForButton = setInterval(() => {
		// Try to find either the button wrapper, button, or standalone icon
		const originalElement = document.querySelector(
			'[data-testid="issue.common.component.permalink-button.button.copy-link-button-wrapper"], button:has([role="img"][aria-label="Copy link"]), [role="img"][aria-label="Copy link"]'
		);
		if (originalElement) {
			clearInterval(waitForButton);

			// Create our button
			const newButton = createCopyButton();
			newButton.addEventListener('click', handleCopyLinkClick);

			// Handle different element types
			if (originalElement.dataset.testid?.includes('copy-link-button-wrapper')) {
				// If it's the full wrapper, replace the entire structure
				originalElement.parentNode.replaceChild(newButton, originalElement);
			} else if (originalElement.tagName === 'BUTTON') {
				// If it's a button, replace it
				originalElement.parentNode.replaceChild(newButton, originalElement);
			} else {
				// For standalone icon, replace it
				originalElement.parentNode.replaceChild(newButton, originalElement);
			}
		}
	}, 100);
})();
