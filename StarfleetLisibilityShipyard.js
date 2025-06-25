// ==UserScript==
// @name Starfleet Commander - Format Ship Numbers in the shipyard screen
// @namespace User JavaScript and CSS V 3.0.6
// @version 1.3
// @description Formate les nombres 
// @author Asmagorn
// @match https://playstarfleet.com/buildings/shipyard*
// @grant none
// ==/UserScript==
(function() {
    // Fonction pour formater un nombre avec des espaces tous les 3 caractères
    function formatNumberWithSpaces(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    // Fonction principale pour appliquer le formatage
    function applyNumberFormatting() {
        // 1. Gérer les éléments <span class="quantity">x7858531427185900</span>
        const quantityElements = document.querySelectorAll('span.quantity');
        quantityElements.forEach(function(element) {
            const originalText = element.textContent;
            const match = originalText.match(/^x(\d+)$/);
            if (match && match[1]) {
                const numberValue = parseFloat(match[1]);
                if (!isNaN(numberValue)) {
                    element.textContent = 'x' + formatNumberWithSpaces(numberValue);
                }
            }
        });

        // 2. Gérer les éléments <span class="name">... Carmanor Class Cargo x62984369788650</span>
        const nameElements = document.querySelectorAll('span.name');
        nameElements.forEach(function(element) {
            const originalHTML = element.innerHTML;
            const regex = /( x)(\d+)/g;
            let newHTML = originalHTML;

            newHTML = originalHTML.replace(regex, function(fullMatch, prefix, numberStr) {
                const numberValue = parseFloat(numberStr);
                if (!isNaN(numberValue)) {
                    return prefix + formatNumberWithSpaces(numberValue);
                }
                return fullMatch;
            });
            element.innerHTML = newHTML;
        });

        // 3. Gérer les éléments <span class="highlight2">x2556390421757350</span>
        const highlightElements = document.querySelectorAll('span.highlight2');
        highlightElements.forEach(function(element) {
            const originalText = element.textContent;
            const match = originalText.match(/^x(\d+)$/);
            if (match && match[1]) {
                const numberValue = parseFloat(match[1]);
                if (!isNaN(numberValue)) {
                    element.textContent = 'x' + formatNumberWithSpaces(numberValue);
                }
            }
        });
    }

    // Exécute la fonction immédiatement (mode "run on start" du plugin).
    applyNumberFormatting();

})();