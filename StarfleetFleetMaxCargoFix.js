// ==UserScript==
// @name         Starfleet Commander Fleet Max Cargo Fix
// @namespace    Starfleet Commander
// @version      2.6.1
// @description  Adds "Max" buttons next to resource inputs on the fleet page, calculating max cargo by deducting fuel consumption from the game's native max, and ensuring raw number formatting (no commas/dots) using BigInt for very large numbers.
// @match        https://playstarfleet.com/fleet*
// @match        https://*.playstarfleet*.com/fleet*
// @match        https://*.stardriftempires.com/fleet*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("SFCScript: Script chargé. Configuration de MutationObserver.");

    // Define resource types with their input ID and the parameter name for select_max_cargo
    const resourceTypes = [
        { inputId: 'send_ore', paramName: 'ore', label: 'Ore' },
        { inputId: 'send_crystal', paramName: 'crystal', label: 'Crystal' },
        { inputId: 'send_hydrogen', paramName: 'hydrogen', label: 'Hydrogen' }
    ];

    /**
     * Parses a number string that might contain commas or dots (as thousands separators)
     * into a BigInt to handle arbitrarily large integers without precision loss.
     * @param {string} str The string to parse (e.g., "123,456", "1.234.567", "4.20051830155514e+22").
     * @returns {BigInt} The parsed BigInt value.
     */
    function parseBigInt(str) {
        // Remove all commas and dots from the string before parsing.
        // Also, strip any scientific notation part (e.g., "e+22") as BigInt doesn't parse it.
        // We assume the game will provide the full number or select_max_cargo fills it correctly.
        const cleanedStr = String(str).replace(/[.,]/g, '').split('e')[0]; // Remove commas/dots and anything after 'e'
        try {
            return BigInt(cleanedStr === '' ? '0' : cleanedStr);
        } catch (e) {
            console.error(`SFCScript: [ERROR] Impossible de parser "${str}" en BigInt. Nettoyé: "${cleanedStr}". Erreur:`, e);
            return BigInt(0);
        }
    }

    /**
     * Calculates and sets the custom max cargo for a given resource input,
     * deducting fuel consumption from the game's native max cargo.
     * @param {string} resourceInputId The ID of the resource input field (e.g., 'send_ore').
     * @param {string} resourceParamName The parameter name for select_max_cargo (e.g., 'ore').
     */
    function calculateAndSetCustomMax(resourceInputId, resourceParamName) {
        console.log(`SFCScript: calculateAndSetCustomMax appelée pour ${resourceInputId}.`);

        const resourceInput = document.getElementById(resourceInputId);
        if (!resourceInput) {
            console.error(`SFCScript: [ERROR] Élément de saisie pour '${resourceInputId}' non trouvé.`);
            return;
        }

        const taskConsumptionElement = document.getElementById('task_consumption');
        if (!taskConsumptionElement) {
            console.error('SFCScript: [ERROR] Élément span#task_consumption (carburant nécessaire) non trouvé. Impossible d\'effectuer la soustraction.');
            return;
        }

        // --- DEBUG LOGS START ---
        console.log(`SFCScript: [DEBUG] taskConsumptionElement.textContent (raw): "${taskConsumptionElement.textContent}"`);
        // --- DEBUG LOGS END ---

        const fuelConsumption = parseBigInt(taskConsumptionElement.textContent);
        console.log(`SFCScript: [DEBUG] Carburant nécessaire (fuelConsumption parsed BigInt): ${fuelConsumption}`);

        // BigInt does not have isNaN, check if it's a valid BigInt (e.g., not BigInt(0) if it should be more)
        // For simplicity, we assume parseBigInt returns 0n on error, and rely on logs for debugging issues where it should not be 0.

        // Step 1 & 2: Temporarily call native select_max_cargo to get game's calculated max
        if (typeof select_max_cargo === 'function') {
            select_max_cargo(resourceParamName);
            console.log(`SFCScript: select_max_cargo('${resourceParamName}') du jeu appelée temporairement.`);
        } else {
            console.error(`SFCScript: [ERROR] La fonction native select_max_cargo() n'est pas disponible. Impossible de calculer le max.`);
            return;
        }

        // --- DEBUG LOGS START ---
        console.log(`SFCScript: [DEBUG] resourceInput.value (raw after select_max_cargo): "${resourceInput.value}"`);
        // --- DEBUG LOGS END ---

        // Step 3: Read the value that the game just put into the input field
        let nativeMaxAmount = parseBigInt(resourceInput.value);
        console.log(`SFCScript: [DEBUG] Max natif du jeu (nativeMaxAmount parsed BigInt): ${nativeMaxAmount}`);

        // Step 4 & 5: Perform the custom calculation using BigInt arithmetic
        let finalAmount = nativeMaxAmount - fuelConsumption;
        // Ensure finalAmount is not negative for resource quantities
        if (finalAmount < 0n) { // Use '0n' for BigInt zero
            finalAmount = 0n;
        }
        console.log(`SFCScript: [DEBUG] Montant final après déduction carburant (calculated finalAmount BigInt): ${finalAmount}`);

        // Step 6: Set the input field with the new calculated value, ensuring no commas or spaces.
        // String(BigInt) will automatically format it as a plain number string.
        resourceInput.value = String(finalAmount);
        console.log(`SFCScript: Valeur finale définie pour ${resourceInputId}: ${resourceInput.value} (format brut BigInt).`);


        // Trigger native game function to update consumption after setting the value
        if (typeof task_consumption === 'function') {
            task_consumption();
            console.log('SFCScript: task_consumption() appelée après ajustement.');
        } else {
             // console.warn('SFCScript: [WARN] La fonction task_consumption() du jeu n\'est pas disponible.');
        }
    }

    let initializeRetryCount = 0;
    const MAX_INITIALIZE_RETRIES = 5;
    const RETRY_DELAY_MS = 500;

    function initializeMaxButtons() {
        console.log("SFCScript: initializeMaxButtons appelée.");
        let foundAllInputs = true;

        resourceTypes.forEach(resource => {
            const inputElement = document.getElementById(resource.inputId);
            if (inputElement) {
                let existingMaxButton = null;
                // Check for our own added button
                if (inputElement.nextElementSibling &&
                    inputElement.nextElementSibling.id === `max_btn_${resource.inputId}`) {
                    existingMaxButton = inputElement.nextElementSibling;
                }

                if (!existingMaxButton) {
                    const maxButton = document.createElement('button');
                    maxButton.id = `max_btn_${resource.inputId}`;
                    maxButton.textContent = 'Max';
                    maxButton.style.marginLeft = '5px';
                    maxButton.style.padding = '0 5px';
                    maxButton.style.fontSize = '10px';
                    maxButton.style.verticalAlign = 'middle';
                    maxButton.style.cursor = 'pointer';

                    maxButton.onclick = (event) => {
                        event.preventDefault(); // Prevent default button behavior
                        calculateAndSetCustomMax(resource.inputId, resource.paramName);
                    };

                    inputElement.parentNode.insertBefore(maxButton, inputElement.nextSibling);
                    console.log(`SFCScript: Bouton Max ajouté pour ${resource.label} (${resource.inputId}).`);
                } else {
                    // If button exists, ensure our handler is active
                    existingMaxButton.onclick = (event) => {
                        event.preventDefault();
                        calculateAndSetCustomMax(resource.inputId, resource.paramName);
                    };
                    console.log(`SFCScript: [DEBUG] Gestionnaire onclick mis à jour pour le bouton existant ${resource.label}.`);
                }
            } else {
                console.warn(`SFCScript: [WARN] Élément d'entrée non trouvé pour le type de ressource: ${resource.inputId}`);
                foundAllInputs = false;
            }
        });

        if (!foundAllInputs && initializeRetryCount < MAX_INITIALIZE_RETRIES) {
            initializeRetryCount++;
            console.log(`SFCScript: Tentative ${initializeRetryCount}/${MAX_INITIALIZE_RETRIES} - Réessai dans ${RETRY_DELAY_MS}ms.`);
            setTimeout(initializeMaxButtons, RETRY_DELAY_MS);
        } else if (!foundAllInputs && initializeRetryCount >= MAX_INITIALIZE_RETRIES) {
            console.error("SFCScript: [ERROR] Échec de l'initialisation des boutons Max après plusieurs tentatives. Les éléments d'entrée n'ont pas pu être trouvés.");
        } else if (foundAllInputs) {
            initializeRetryCount = 0;
        }
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        let needsUpdate = false;

        if (mutationsList.some(m => m.type === 'childList' && m.addedNodes.length > 0)) {
            const relevantNodesAdded = Array.from(mutationsList)
                .flatMap(m => Array.from(m.addedNodes))
                .some(node => node.nodeType === 1 && (
                    node.id && node.id.startsWith('send_') ||
                    node.querySelector && node.querySelector('input[id^="send_"]')
                ));
            if (relevantNodesAdded) {
                needsUpdate = true;
            }
        }
        if (!needsUpdate && mutationsList.some(m => m.type === 'attributes' && m.target.id && m.target.id.startsWith('send_'))) {
            needsUpdate = true;
        }

        const currentInputs = document.querySelectorAll('input[id^="send_"]');
        const inputsWithoutButtons = Array.from(currentInputs).filter(input => {
            const nextSibling = input.nextElementSibling;
            return !(nextSibling && nextSibling.tagName === 'BUTTON' && nextSibling.id.startsWith('max_btn_'));
        });

        if (needsUpdate || (currentInputs.length === 3 && inputsWithoutButtons.length > 0)) {
            console.log("SFCScript: Changement DOM détecté ou boutons manquants. Réinitialisation des boutons Max.");
            initializeMaxButtons();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMaxButtons);
    } else {
        initializeMaxButtons();
    }
})();
