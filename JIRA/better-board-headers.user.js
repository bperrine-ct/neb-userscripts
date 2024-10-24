  // ==UserScript==
  // @name         JIRA - Better Headers on Boards
  // @namespace    http://tampermonkey.net/
  // @version      0.2
  // @description  Wrap rows under headers into a bordered box
  // @author       You
  // @match        https://chirotouch.atlassian.net/*
  // @grant        none
  // ==/UserScript==

  (function() {
      'use strict';

      function wrapRows() {
          const summaries = document.querySelectorAll('[data-testid="platform-board-kit.ui.swimlane.summary-section"]');

          summaries.forEach(summary => {
              const text = summary.textContent;

              if (text.includes('─') || text.includes('═')) {
                  // Increase the font size and add padding
                  summary.style.fontSize = '20px'; // Adjust the size as needed
                  summary.style.fontWeight = 'bold'; // Make the text bold
                  summary.style.textAlign = 'center'; // Center the text

                  // Find the parent component and add padding-top
                  const parentWrapper = summary.closest('[data-testid="platform-board-kit.ui.swimlane.swimlane-wrapper"]');
                  if (parentWrapper) {
                      parentWrapper.style.paddingTop = '30px'; // Adjust the padding as needed
                  }

                  // Set the text color based on the header content
                  if (text.includes('L3')) {
                      summary.style.color = '#F79233';
                      summary.style.textShadow = '0 0 3px #000';
                  } else if (text.includes('Defects')) {
                      summary.style.color = '#D31800';
                      summary.style.textShadow = '0 0 3px #000';
                  } else if (text.includes('STORIES')) {
                      summary.style.color = '#64BA3B';
                      summary.style.textShadow = '0 0 3px #000';
                  } else if (text.includes('ARCHITECTURE')) {
                      summary.style.color = '#E8DD2B';
                      summary.style.textShadow = '0 0 3px #000';
                  } else if (text.includes('TECHNICAL')) {
                      summary.style.color = '#4BAEE8';
                      summary.style.textShadow = '0 0 3px #000';
                  } else {
                      summary.style.color = '#4BAEE8';
                      summary.style.textShadow = '0 0 3px #000';
                  }
              }
          });
      }

      // Run the function on page load
      window.addEventListener('load', wrapRows);

      // Set up a MutationObserver to reapply the changes
      const observer = new MutationObserver(wrapRows);
      observer.observe(document.body, { childList: true, subtree: true });
  })();
