// ==UserScript==
// @name          Starfleet Commander - Format Ship Numbers in Divs (moving fleets) and add spans (fleet selection in blue)
// @namespace     User JavaScript and CSS V 3.0.6
// @version       1.4
// @description   Formate les nombres dans les <div class="ship"> avec espaces tous les 3 chiffres + bouton toggle // ajoute des span en bleu dans la selection des fleets
// @author        GPT + Asmagorn
// @match         https://playstarfleet.com/fleet?current_planet=*
// @grant         none
// ==/UserScript==

(function() {
    'use strict';

    let formatted = true;

    // This function now directly formats the string representation of the number
    function formatNumberGroups(text) {
        // Targets 'x' followed by 4 or more digits
        return text.replace(/x(\d{4,})/, (_, numStr) => {
            // No parseFloat or BigInt needed here, just string manipulation
            return 'x' + numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        });
    }

    // This function unformats by removing spaces from the string representation
    function unformatNumberGroups(text) {
        // Targets 'x' followed by digits and spaces
        return text.replace(/x(\d{1,3}(?: \d{3})+)/, (_, numStr) => {
            // Removes all spaces from the number string
            return 'x' + numStr.replace(/ /g, '');
        });
    }

    function processShipDivs(format = true) {
        document.querySelectorAll('div.ship').forEach(div => {
            const nodes = Array.from(div.childNodes);
            nodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().startsWith('x')) {
                    let cleaned = node.textContent.trim();
                    // Ensure the number part is purely digits before attempting to format/unformat
                    // This regex ensures we only process 'x' followed by digits (and possibly spaces for unformat)
                    const matchFormat = cleaned.match(/^x(\d+(?: \d{3})*)$/); // Allows for already formatted numbers for unformat
                    if (matchFormat) {
                        let updated = format
                            ? formatNumberGroups(cleaned)
                            : unformatNumberGroups(cleaned);
                        node.textContent = updated;
                    }
                }
            });
        });
    }

    function createToggleButton() {
        const btn = document.createElement('button');
        btn.textContent = '👁 Affichage lisible : ON';
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = '9999';
        btn.style.padding = '6px 10px';
        btn.style.fontSize = '14px';
        btn.style.cursor = 'pointer';
        btn.style.background = '#222';
        btn.style.color = 'white';
        btn.style.border = '1px solid #888';
        btn.style.borderRadius = '5px';

        btn.addEventListener('click', () => {
            formatted = !formatted;
            btn.textContent = `👁 Affichage lisible : ${formatted ? 'ON' : 'OFF'}`;
            processShipDivs(formatted);
            // Also update the blue formatted spans
            document.querySelectorAll('.formatted-display').forEach(span => {
                span.style.display = formatted ? "inline" : "none";
            });
        });

        document.body.appendChild(btn);
    }

    // This function also needs to work with string representations
    function formatNumber(text) {
        // Ensure we're dealing with digits only (remove any existing spaces if present)
        const cleanedNumberStr = text.replace(/ /g, '');
        return cleanedNumberStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function createFormattedSpans() {
        document.querySelectorAll('span[id^="ship_quantity_"][id$="_max"]').forEach((span) => {
            if (span.dataset.processed === "true") return;

            const raw = span.textContent.trim();
            // Important: only format if 'raw' actually looks like a number string
            if (!/^\d+$/.test(raw)) {
                return; // Skip if it's not purely digits
            }

            const displaySpan = document.createElement("span");
            displaySpan.className = "formatted-display";
            displaySpan.style.marginLeft = "6px";
            displaySpan.style.color = "#6cf"; // couleur discrète
            displaySpan.style.fontSize = "90%";
            displaySpan.style.display = formatted ? "inline" : "none";
            displaySpan.textContent = formatNumber(raw);

            span.insertAdjacentElement("afterend", displaySpan);
            span.dataset.processed = "true";
        });
    }

    // Init
    window.addEventListener('load', () => {
        createToggleButton();
        processShipDivs(); // formate au départ
        createFormattedSpans();
    });

})();