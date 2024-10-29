// ==UserScript==
// @name         JIRA - Bold & Highlight Ticket Text
// @namespace    http://tampermonkey.net/
// @version      1.3.1
// @description  Bold text inside brackets and "Age: x" where x is any number without altering existing styles
// @author       
// @match        https://chirotouch.atlassian.net/*
// @icon         https://i.postimg.cc/FFbZ0RCz/image.png
// @downloadURL  https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/bold-bracket-text.user.js
// @updateURL    https://github.com/bperrine-ct/neb-userscripts/raw/refs/heads/master/JIRA/bold-bracket-text.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to apply formatting
    function applyFormatting() {
        const summaries = document.querySelectorAll('[data-testid="platform-board-kit.ui.swimlane.summary-section"]');

        summaries.forEach(summary => {
            // Check if the element has already been processed
            if (summary.getAttribute('data-processed') !== 'true') {
                // Process child nodes to bold text inside brackets and "Age: x"
                boldTextInsideBracketsAndAge(summary);

                // Mark this element as processed
                summary.setAttribute('data-processed', 'true');
            }
        });
    }

    // Set up the MutationObserver
    const observer = new MutationObserver(() => {
        applyFormatting();
    });

    // Function to start observing
    function startObserving() {
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Run the function on page load
    window.addEventListener('load', () => {
        applyFormatting();
        startObserving();
    });

    function boldTextInsideBracketsAndAge(element) {
        const childNodes = Array.from(element.childNodes);

        childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.nodeValue;
                const bracketRegex = /\[([^\]]+)\]/g;
                const ageRegex = / Age:\s*(\d+)/;
                const numberRegex = /^\d+$/;
                const nebRegex = /NEB-\d+\s*-?\s*/g;
                const pipeRegex = /\|\|/g;
                
                // Find age first and store it
                const ageMatch = text.match(ageRegex);
                const age = ageMatch ? ` Age: ${ageMatch[1]}` : '';
                
                // Remove age and pipes from text
                text = text.replace(ageRegex, '');
                text = text.replace(pipeRegex, '');
                
                // Remove "NEB-####" and any following " -"
                text = text.replace(nebRegex, '');

                let lastIndex = 0;
                let fragments = [];
                let match;

                while ((match = bracketRegex.exec(text)) !== null) {
                    if (match.index > lastIndex) {
                        fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                    }

                    let content = match[1].trim();

                    // Skip [0] brackets
                    if (content === '0') {
                        lastIndex = bracketRegex.lastIndex;
                        continue;
                    }

                    // Add age to the bracket content if it exists
                    if (age && !content.includes('Age:')) {
                        content = `${content}/${age}`;
                    }

                    const backgroundSpan = document.createElement('span');
                    backgroundSpan.style.color = 'white';
                    backgroundSpan.style.textShadow = '1px 1px 2px black';
                    backgroundSpan.style.borderRadius = '4px';

                    // Add two spaces after specific words
                    content = content.replace(/(L3 Request|Minor|Moderate|Major|Critical)(?!\s{2})/g, '$1  ');
                    // Add two spaces before "Cases"
                    content = content.replace(/(?<!\s{2})Cases/g, '  Cases');
                    // Add space after "Cases:"
                    content = content.replace(/Cases:(?!\s)/g, 'Cases: ');

                    // Add spaces around the first slash in "Cases"
                    content = content.replace(/(?<!\s)\/(?!\s)/, ' / ');

                    if (numberRegex.test(content)) {
                        backgroundSpan.style.backgroundColor = '#64BA3B';
                    } else if (content.includes('L3 Request')) {
                        backgroundSpan.style.backgroundColor = '#F79233';
                    } else if (['Minor', 'Moderate', 'Major'].some(term => content.includes(term))) {
                        backgroundSpan.style.backgroundColor = '#D31800';
                    } else if (content.includes('TT')) {
                        backgroundSpan.style.backgroundColor = '#4BAEE8';
                    } else if (content.includes('UII')) {
                        backgroundSpan.style.backgroundColor = '#9360E1';
                    } else {
                        backgroundSpan.style.backgroundColor = 'black';
                    }

                    backgroundSpan.textContent = `【  ${content}  】`;

                    backgroundSpan.innerHTML = backgroundSpan.innerHTML.replace(/\d+/g, (num) => {
                        return `<span style="font-weight: bold;">${num}</span>`;
                    });

                    fragments.push(backgroundSpan);
                    lastIndex = bracketRegex.lastIndex;
                }

                if (lastIndex < text.length) {
                    fragments.push(document.createTextNode(text.substring(lastIndex)));
                }

                if (fragments.length > 0) {
                    const parent = node.parentNode;
                    fragments.forEach(fragment => {
                        parent.insertBefore(fragment, node);
                    });
                    parent.removeChild(node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                boldTextInsideBracketsAndAge(node);
            }
        });
    }

    // Start observing
    startObserving();
})();
