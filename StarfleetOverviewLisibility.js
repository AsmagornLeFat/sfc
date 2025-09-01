// ==UserScript==
// @name         Starfleet Commander - Format Numbers on Overview Screen
// @namespace    Starfleet Commander
// @version      1.0
// @description  Formats numbers in quantity spans on the overview page for better readability.
// @author       Asmagorn
// @match        https://playstarfleet.com/overview*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to format a number with spaces as thousand separators
    function formatNumberWithSpaces(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    // Main function to apply the formatting
    function applyNumberFormatting() {
        console.log("SFCScript: Applying number formatting on overview page.");
        const quantityElements = document.querySelectorAll('span.quantity');
        
        quantityElements.forEach(function(element) {
            const originalText = element.textContent;
            const match = originalText.match(/^x(\d+)$/);
            
            if (match && match[1]) {
                const numberValue = match[1];
                if (numberValue) {
                    element.textContent = 'x' + formatNumberWithSpaces(numberValue);
                }
            }
        });
    }

    // Use a MutationObserver to apply the script when the page content changes
    const observer = new MutationObserver((mutationsList, observer) => {
        let needsUpdate = false;
        if (mutationsList.some(m => m.type === 'childList' && m.addedNodes.length > 0)) {
            const relevantNodesAdded = Array.from(mutationsList)
                .flatMap(m => Array.from(m.addedNodes))
                .some(node => node.nodeType === 1 && (
                    node.querySelector && node.querySelector('span.quantity')
                ));
            if (relevantNodesAdded) {
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            console.log("SFCScript: DOM change detected. Re-applying number formatting.");
            applyNumberFormatting();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run of the script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyNumberFormatting);
    } else {
        applyNumberFormatting();
    }
})();