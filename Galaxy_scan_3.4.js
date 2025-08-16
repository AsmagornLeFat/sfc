// ==UserScript==
// @name         Starfleet Commander Galaxy Scan Comparison (v3.4)
// @namespace    Starfleet Commander
// @version      3.4
// @description  Adds a floating panel to the Galaxy page for saving, comparing, and deleting NPC scans with visual feedback.
// @match        https://playstarfleet.com/galaxy*
// @match        https://www.playstarfleet.com/galaxy*
// @match        https://playstarfleet.com/galaxy/show*
// @match        https://www.playstarfleet.com/galaxy/show*
// @match        https://stardriftempires.com/galaxy*
// @match        https://www.stardriftempires.com/galaxy*
// @match        https://stardriftempires.com/galaxy/show*
// @match        https://www.stardriftempires.com/galaxy/show*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log("SFCScript: Galaxy Scan Comparison chargé (v3.4).");

    // ====================================================================
    //              VARIABLES DE CONFIGURATION UTILISATEUR
    // ====================================================================
    // Délai minimum en heures pour qu'une cible soit considérée "valide"
    const MIN_TIME_DELTA_HOURS = 10;

    // Niveau de difficulté minimum à considérer (de -100 à 100)
    const MIN_NPC_DIFFICULTY = 0;

    // Niveau de difficulté maximum à considérer (de -100 à 100)
    const MAX_NPC_DIFFICULTY = 100;
    
    // Noms des PNJ à cibler (par exemple, ["Enemy Fleet", "Alien Experiment"]).
    // Laissez la liste vide pour scanner tous les PNJ.
    const NPC_TARGET_NAMES = [];
    // ====================================================================
    // ====================================================================

    const STORAGE_KEY_PREFIX = 'sfc_galaxy_scan_';

    // Fonction pour extraire les données PNJ du système affiché
    function scrapeNpcData() {
        try {
            const galaxyElement = document.getElementById("galaxy");
            const systemElement = document.getElementById("solar_system");
            
            if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
                console.warn("SFCScript: Impossible de trouver les champs Galaxie ou Système ou leurs valeurs.");
                return null;
            }
            
            const galaxy = galaxyElement.value;
            const system = systemElement.value;

            const npcData = {};
            const npcRows = document.querySelectorAll('.fleet_row.npc_fleet');

            npcRows.forEach(row => {
                const levelCell = row.querySelector('.level_display');
                const fleetNameElement = row.querySelector('.fleet_name');
                const playerElement = row.querySelector(".player");
                const planetLink = row.querySelector('a[href*="/galaxy/"]');

                if (levelCell && fleetNameElement && playerElement && planetLink) {
                    const color = window.getComputedStyle(playerElement).color;
                    const colors = color.match(/\d+/g).map(Number);
                    const red = colors[0] === 255;
                    const difficulty = Math.round((255 - colors[(red ? 1 : 0)]) / 255 * 100);
                    const finalDifficulty = red ? difficulty : -difficulty;

                    const fleetName = fleetNameElement.textContent.trim();
                    
                    const isDifficultyValid = finalDifficulty >= MIN_NPC_DIFFICULTY && finalDifficulty <= MAX_NPC_DIFFICULTY;
                    const isNameValid = NPC_TARGET_NAMES.length === 0 || NPC_TARGET_NAMES.includes(fleetName);

                    if (isDifficultyValid && isNameValid) {
                        const urlParts = planetLink.href.split('/');
                        const planet = urlParts.pop() || urlParts.pop();
                        
                        if (planet && !isNaN(planet)) {
                            // La clé de stockage ne dépend plus de la difficulté
                            const npcKey = `${galaxy}:${system}:${planet}_${fleetName}`;
                            npcData[npcKey] = {
                                name: fleetName,
                                coords: `${galaxy}:${system}:${planet}`,
                                difficulty: finalDifficulty
                            };
                        }
                    } else {
                        console.log(`SFCScript: PNJ '${fleetName}' (Difficulté ${finalDifficulty}) ignoré en raison de la configuration.`);
                    }
                }
            });

            console.log(`SFCScript: Scans pour le système ${galaxy}:${system} lus.`);
            return {
                coords: `${galaxy}:${system}`,
                data: npcData,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error("SFCScript: Erreur lors de la lecture des données PNJ.", error);
            updateStatus('❌ Erreur : Impossible de lire les PNJ sur cette page.', 'red');
            return null;
        }
    }

    // Fonction pour sauvegarder les scans
    function saveScans() {
        const scanData = scrapeNpcData();
        if (!scanData) {
            updateStatus('❌ Erreur : Impossible de sauvegarder. Vérifiez que vous êtes sur la page Galaxie et qu\'un système est sélectionné.', 'red');
            return;
        }
        
        const storageKey = STORAGE_KEY_PREFIX + scanData.coords;
        const previousScanJson = localStorage.getItem(storageKey);
        let message = `✅ Scans pour ${scanData.coords} sauvegardés.`;

        if (previousScanJson) {
            const previousScan = JSON.parse(previousScanJson);
            const previousDate = new Date(previousScan.timestamp).toLocaleString();
            message += `\nAncien scan de ${previousDate}.`;
        }

        localStorage.setItem(storageKey, JSON.stringify(scanData));
        updateStatus(message, 'green');
    }
    
    // Fonction pour effacer le scan du système actuel
    function deleteCurrentScan() {
        const galaxyElement = document.getElementById("galaxy");
        const systemElement = document.getElementById("solar_system");
        
        if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
            updateStatus("❌ Erreur : Impossible de trouver les coordonnées du système.", 'red');
            return;
        }
        
        const systemCoords = `${galaxyElement.value}:${systemElement.value}`;
        const storageKey = STORAGE_KEY_PREFIX + systemCoords;
        localStorage.removeItem(storageKey);
        updateStatus(`🗑️ Scan pour ${systemCoords} effacé.`, 'orange');
    }

    // Fonction pour comparer et afficher les nouvelles cibles
    function compareAndDisplayNewTargets() {
        const currentScan = scrapeNpcData();
        if (!currentScan) return;

        const storageKey = STORAGE_KEY_PREFIX + currentScan.coords;
        const previousScanJson = localStorage.getItem(storageKey);

        if (!previousScanJson) {
            updateStatus(`⚠️ Pas de scan précédent pour ${currentScan.coords}. Veuillez d'abord en sauvegarder un.`, 'orange');
            return;
        }

        const previousScan = JSON.parse(previousScanJson);
        const newTargets = [];
        const timeDeltaHours = (currentScan.timestamp - previousScan.timestamp) / (1000 * 60 * 60);

        if (timeDeltaHours < MIN_TIME_DELTA_HOURS) {
            updateStatus(`⚠️ Intervalle entre les scans trop court (${timeDeltaHours.toFixed(1)}h). Minimum requis : ${MIN_TIME_DELTA_HOURS}h.`, 'orange');
            return;
        }

        for (const key in currentScan.data) {
            if (!previousScan.data[key]) {
                newTargets.push(currentScan.data[key]);
            }
        }

        displayNewTargets(newTargets, currentScan.coords, previousScan.timestamp);
    }

    // Fonction pour afficher les nouvelles cibles
    function displayNewTargets(targets, coords, previousTimestamp) {
        let displayArea = document.getElementById('sfc-new-targets-display');
        if (!displayArea) {
            displayArea = document.createElement('div');
            displayArea.id = 'sfc-new-targets-display';
            document.body.appendChild(displayArea);
        }

        const previousDate = new Date(previousTimestamp).toLocaleString();
        const targetListHtml = targets.map(target =>
            `<li>${target.name} (Difficulté ${target.difficulty}) - ${target.coords}</li>`
        ).join('');

        const content = `
            <div style="
                position: fixed; top: 10%; left: 50%; transform: translateX(-50%);
                padding: 20px; background-color: #2e2e2e; border: 2px solid #555;
                z-index: 9999; max-height: 80vh; overflow-y: auto; color: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.5); font-family: sans-serif;
            ">
                <button onclick="document.getElementById('sfc-new-targets-display').style.display = 'none';" style="
                    position: absolute; top: 5px; right: 5px; cursor: pointer;
                    background: none; border: none; color: white; font-size: 20px;
                ">X</button>
                <h3>${targets.length} nouvelles cibles pour ${coords} (Scanné après ${previousDate})</h3>
                <ul style="padding-left: 20px;">
                    ${targets.length > 0 ? targetListHtml : '<li>Pas de nouvelles cibles trouvées.</li>'}
                </ul>
            </div>
        `;

        displayArea.innerHTML = content;
        displayArea.style.display = 'block';
        console.log(`SFCScript: ${targets.length} nouvelles cibles affichées pour ${coords}.`);
    }

    // Fonctions d'interface et d'observation
    function updateStatus(message, color) {
        let statusDiv = document.getElementById('sfc-status-message');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'sfc-status-message';
            statusDiv.style.cssText = `
                position: fixed; bottom: 20px; right: 20px;
                padding: 10px; background-color: #333; border: 1px solid #555;
                color: white; font-family: sans-serif; z-index: 10000;
                transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
                opacity: 0;
                white-space: pre-wrap;
            `;
            document.body.appendChild(statusDiv);
        }
        statusDiv.textContent = message;
        statusDiv.style.backgroundColor = color;
        statusDiv.style.opacity = '1';
        statusDiv.style.transform = 'translateY(0)';

        setTimeout(() => {
            statusDiv.style.opacity = '0';
            statusDiv.style.transform = 'translateY(100px)';
        }, 5000);
    }
    
    function createButton(text, onclickHandler, backgroundColor) {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onclickHandler;
        button.style.cssText = `
            display: block;
            width: 100%;
            padding: 8px;
            margin-bottom: 5px;
            font-weight: 600;
            text-align: center;
            border: 1px solid transparent;
            border-radius: 6px;
            color: #fff;
            background-color: ${backgroundColor};
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
        `;
        return button;
    }

    function addFloatingPanel() {
        if (document.getElementById('sfc-floating-panel')) {
            console.log("SFCScript: Le panneau flottant existe déjà, on ignore.");
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'sfc-floating-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            width: 180px;
            padding: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            border: 1px solid #555;
            border-radius: 8px;
            z-index: 9998;
            color: white;
            font-family: sans-serif;
            text-align: center;
        `;

        const title = document.createElement('h4');
        title.textContent = 'NPC Scan Tools';
        title.style.margin = '0 0 10px 0';

        panel.appendChild(title);

        const saveButton = createButton('Save this scan', saveScans, '#007bff');
        const compareButton = createButton('Compare scans', compareAndDisplayNewTargets, '#28a745');
        const deleteButton = createButton('Delete current scan', deleteCurrentScan, '#dc3545');

        panel.appendChild(saveButton);
        panel.appendChild(compareButton);
        panel.appendChild(deleteButton);
        
        document.body.appendChild(panel);
        console.log("SFCScript: Panneau flottant ajouté avec succès.");
    }
    
    // Un mécanisme simple et fiable pour s'assurer que le panneau est ajouté
    function pollForElements() {
        if (document.getElementById('galaxy') && document.getElementById('solar_system')) {
            console.log("SFCScript: Éléments DOM requis trouvés. Ajout du panneau flottant.");
            addFloatingPanel();
        } else {
            console.log("SFCScript: Éléments DOM requis pas encore trouvés, re-vérification dans 100ms.");
            setTimeout(pollForElements, 100);
        }
    }

    // Lancer le processus
    pollForElements();
})();