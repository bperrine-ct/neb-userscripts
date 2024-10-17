// ==UserScript==
// @name         ChiroTouch Atlassian Favicon Changer
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Change favicon based on issue type for chirotouch.atlassian.net
// @match        https://chirotouch.atlassian.net/*
// @grant        none
// @icon https://chirotouch.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium
// ==/UserScript==

(function () {
  'use strict';

  const defaultFavicon = 'https://chirotouch.atlassian.net/rest/api/2/universal_avatar/view/type/project/avatar/14627?size=xxlarge';

  function isIssuePage() {
    return /\/browse\/[A-Z]+-\d+/.test(window.location.pathname);
  }

  function getIssueTypeIcon() {
    const issueHeader = document.getElementById('jira-issue-header');
    if (!issueHeader) return null;

    const icons = issueHeader.querySelectorAll('img[alt]:not([alt=""])');
    if (icons.length === 0) return null;

    // Get the rightmost icon (last in the NodeList)
    const lastIcon = icons[icons.length - 1];
    return lastIcon.src;
  }

  function changeFavicon() {
    const linkElement = document.querySelector('link[rel="shortcut icon"]') || document.createElement('link');
    linkElement.type = 'image/x-icon';
    linkElement.rel = 'shortcut icon';

    if (isIssuePage()) {
      const issueTypeIcon = getIssueTypeIcon();
      linkElement.href = issueTypeIcon || defaultFavicon;
    } else {
      linkElement.href = defaultFavicon;
    }

    document.head.appendChild(linkElement);
  }

  // Initial check
  changeFavicon();

  // Set up a MutationObserver to watch for changes in the DOM
  const observer = new MutationObserver(changeFavicon);
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for URL changes
  window.addEventListener('popstate', changeFavicon);
})();