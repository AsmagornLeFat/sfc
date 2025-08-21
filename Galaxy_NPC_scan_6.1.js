// ==UserScript==
// @name         Starfleet Commander Galaxy Scan Comparison (v6.1)
// @namespace    Starfleet Commander
// @version      6.1
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

    console.log("SFCScript: Galaxy Scan Comparison loaded (v6.1).");

    // ====================================================================
    //              USER CONFIGURATION VARIABLES
    // ====================================================================
    // Minimum time in hours to consider a target "valid"
    const MIN_TIME_DELTA_HOURS = 1;

    // Minimum difficulty level to consider (from -100 to 100)
    const MIN_NPC_DIFFICULTY = -100;

    // Maximum difficulty level to consider (from -100 to 100)
    const MAX_NPC_DIFFICULTY = 100;
    
    // NPC names to target (e.g., ["Enemy Fleet", "Alien Experiment"]).
    // Leave the list empty to scan all NPCs.
    const NPC_TARGET_NAMES = [];
    // ====================================================================
    // ====================================================================

    const STORAGE_KEY_PREFIX = 'sfc_galaxy_scan_';

    // Function to scrape NPC data from the currently displayed system
    function scrapeNpcData() {
        try {
            const coordsElement = document.querySelector(".coords");
            if (!coordsElement) {
                console.warn("SFCScript: Could not find system coordinates span.");
                return null;
            }
            const [galaxy, system] = coordsElement.textContent.split(':');
            if (!galaxy || !system) {
                console.warn("SFCScript: Could not parse system coordinates.");
                return null;
            }
            
            console.log(`SFCScript: Scanning system ${galaxy}:${system}...`);
            
            const npcData = {};
            // Select all rows whose id ends with 'e', as this uniquely identifies NPC planets/fleets.
            const npcRows = document.querySelectorAll('tr[id$="e"]');
            console.log(`SFCScript: Found ${npcRows.length} potential NPC rows.`);

            let npcsFound = 0;
            npcRows.forEach(row => {
                const fleetNameElement = row.querySelector('td.name > span');
                const playerElement = row.querySelector("td.player");
                
                if (fleetNameElement && playerElement) {
                    const difficultySpan = playerElement.querySelector('span');
                    let finalDifficulty;
                    
                    if (difficultySpan) {
                        const difficultyClass = difficultySpan.className;
                        switch (difficultyClass) {
                            case 'easy':
                                finalDifficulty = -25;
                                break;
                            case 'medium':
                                finalDifficulty = 25;
                                break;
                            case 'hard':
                                finalDifficulty = 75;
                                break;
                            default:
                                finalDifficulty = -25; // Default for old-style NPCs
                        }
                    } else {
                        // Default difficulty for new-style NPCs without a class
                        finalDifficulty = 0;
                        console.log(`SFCScript: New NPC type found with no difficulty class. Defaulting to ${finalDifficulty}.`);
                    }

                    const fleetName = fleetNameElement.textContent.trim();
                    const planetMatch = row.id.match(/planet_(.*)/);
                    
                    if (!planetMatch) {
                        console.warn("SFCScript: Could not find planet ID in row ID.");
                        return;
                    }
                    
                    const planet = planetMatch[1];
                    
                    const isDifficultyValid = finalDifficulty >= MIN_NPC_DIFFICULTY && finalDifficulty <= MAX_NPC_DIFFICULTY;
                    const isNameValid = NPC_TARGET_NAMES.length === 0 || NPC_TARGET_NAMES.includes(fleetName);

                    if (isDifficultyValid && isNameValid) {
                        const npcKey = `${galaxy}:${system}:${planet}_${fleetName}`;
                        console.log(`SFCScript: Found valid NPC: Name='${fleetName}', Difficulty=${finalDifficulty}, Coords='${galaxy}:${system}:${planet}'`);
                        npcData[npcKey] = {
                            name: fleetName,
                            coords: `${galaxy}:${system}:${planet}`,
                            difficulty: finalDifficulty
                        };
                        npcsFound++;
                    } else {
                        console.log(`SFCScript: NPC '${fleetName}' (Difficulty ${finalDifficulty}) ignored due to configuration.`);
                    }
                } else {
                    console.log(`SFCScript: A potential NPC row was found but one or more required elements were missing.`);
                }
            });

            console.log(`SFCScript: Scans for system ${galaxy}:${system} read. Found a total of ${npcsFound} valid NPCs.`);
            return {
                coords: `${galaxy}:${system}`,
                data: npcData,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error("SFCScript: Error while reading NPC data.", error);
            updateStatus('❌ Error: Could not read NPCs on this page.', 'red');
            return null;
        }
    }

    // Function to save scans
    function saveScans() {
        const scanData = scrapeNpcData();
        if (!scanData) {
            updateStatus('❌ Error: Unable to save. Check if you are on the Galaxy page and a system is selected.', 'red');
            return;
        }
        
        const storageKey = STORAGE_KEY_PREFIX + scanData.coords;
        let scans = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Handle legacy data format (single object instead of an array)
        if (!Array.isArray(scans)) {
            scans = [scans];
        }

        // Add new scan to the beginning of the array and keep only the last two
        scans.unshift(scanData);
        if (scans.length > 2) {
            scans = scans.slice(0, 2);
        }

        localStorage.setItem(storageKey, JSON.stringify(scans));
        
        let message = `✅ Scan for ${scanData.coords} saved.`;
        if (scans.length > 1) {
            const previousDate = new Date(scans[1].timestamp).toLocaleString();
            message += `\nPrevious scan was from ${previousDate}.`;
        }

        updateStatus(message, 'green');
    }
    
    // Function to delete the scan for this system
    function deleteCurrentScan() {
        const galaxyElement = document.getElementById("galaxy");
        const systemElement = document.getElementById("solar_system");
        
        if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
            updateStatus("❌ Error: Could not find system coordinates.", 'red');
            return;
        }
        
        const systemCoords = `${galaxyElement.value}:${systemElement.value}`;
        const storageKey = STORAGE_KEY_PREFIX + systemCoords;
        localStorage.removeItem(storageKey);
        updateStatus(`🗑️ Scan for ${systemCoords} deleted.`, 'orange');
    }
    
    // Function to delete only the last scan
    function deleteLastScan() {
        const galaxyElement = document.getElementById("galaxy");
        const systemElement = document.getElementById("solar_system");
        
        if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
            updateStatus("❌ Error: Could not find system coordinates.", 'red');
            return;
        }
        
        const systemCoords = `${galaxyElement.value}:${systemElement.value}`;
        const storageKey = STORAGE_KEY_PREFIX + systemCoords;
        let scans = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (scans.length > 0) {
            scans.shift(); // Remove the most recent scan
            localStorage.setItem(storageKey, JSON.stringify(scans));
            updateStatus(`🗑️ Last scan for ${systemCoords} deleted.`, 'orange');
        } else {
            updateStatus(`⚠️ No scans to delete for this system.`, 'orange');
        }
    }

    // Function to display the timestamp of the last scan
    function checkLastScan() {
        const galaxyElement = document.getElementById("galaxy");
        const systemElement = document.getElementById("solar_system");
        
        if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
            updateStatus("❌ Error: Could not find system coordinates.", 'red');
            return;
        }
        
        const storageKey = STORAGE_KEY_PREFIX + `${galaxyElement.value}:${systemElement.value}`;
        const scans = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        if (scans.length === 0) {
            updateStatus(`⚠️ No scans found for this system.`, 'orange');
            return;
        }
        
        const lastScanDate = new Date(scans[0].timestamp).toLocaleString();
        updateStatus(`The last scan for this system was saved on:\n${lastScanDate}`, '#007bff');
    }

    // Function to compare and display new targets
    function compareAndDisplayNewTargets() {
        const galaxyElement = document.getElementById("galaxy");
        const systemElement = document.getElementById("solar_system");
        
        if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
            updateStatus("❌ Error: Could not find system coordinates.", 'red');
            return;
        }
        
        const storageKey = STORAGE_KEY_PREFIX + `${galaxyElement.value}:${systemElement.value}`;
        const scans = JSON.parse(localStorage.getItem(storageKey) || '[]');

        if (scans.length < 2) {
            updateStatus(`⚠️ Not enough scans for this system. Please save at least two scans.`, 'orange');
            return;
        }

        const currentScan = scans[0];
        const previousScan = scans[1];
        
        const minTimeDeltaMs = MIN_TIME_DELTA_HOURS * 60 * 60 * 1000;
        const timeDeltaMs = currentScan.timestamp - previousScan.timestamp;
        
        if (timeDeltaMs < minTimeDeltaMs) {
            const displayedHours = (timeDeltaMs / (1000 * 60 * 60)).toFixed(1);
            updateStatus(`⚠️ Interval between scans is too short (${displayedHours}h). Minimum required: ${MIN_TIME_DELTA_HOURS}h.`, 'orange');
            return;
        }

        const newTargets = [];
        const changedTargets = [];
        for (const key in currentScan.data) {
            const currentTarget = currentScan.data[key];
            const previousTarget = previousScan.data[key];

            if (!previousTarget) {
                // This is a new target
                newTargets.push(currentTarget);
            } else if (currentTarget.difficulty !== previousTarget.difficulty) {
                // This is an existing target with a changed difficulty
                changedTargets.push({
                    target: currentTarget,
                    oldDifficulty: previousTarget.difficulty,
                    newDifficulty: currentTarget.difficulty
                });
            }
        }

        displayNewTargets(newTargets, changedTargets, currentScan.coords, previousScan.timestamp);
    }

    // Function to display new targets
    function displayNewTargets(newTargets, changedTargets, coords, previousTimestamp) {
        let displayArea = document.getElementById('sfc-new-targets-display');
        if (!displayArea) {
            displayArea = document.createElement('div');
            displayArea.id = 'sfc-new-targets-display';
            document.body.appendChild(displayArea);
        }

        const previousDate = new Date(previousTimestamp).toLocaleString();
        
        const newTargetsListHtml = newTargets.map(target =>
            `<li>New: ${target.name} (Difficulty ${target.difficulty}) - ${target.coords}</li>`
        ).join('');
        
        const changedTargetsListHtml = changedTargets.map(target =>
            `<li>Changed: ${target.target.name} (Old Difficulty ${target.oldDifficulty} -> New Difficulty ${target.target.difficulty}) - ${target.target.coords}</li>`
        ).join('');

        const totalTargetsFound = newTargets.length + changedTargets.length;
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
                <h3>${totalTargetsFound} targets found for ${coords} (Scanned after ${previousDate})</h3>
                <ul style="padding-left: 20px;">
                    ${newTargetsListHtml}
                    ${changedTargetsListHtml}
                    ${totalTargetsFound === 0 ? '<li>No new or changed targets found.</li>' : ''}
                </ul>
            </div>
        `;

        displayArea.innerHTML = content;
        displayArea.style.display = 'block';
        console.log(`SFCScript: ${newTargets.length} new targets and ${changedTargets.length} changed targets displayed for ${coords}.`);
    }

    // Interface and Observation Functions
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
            console.log("SFCScript: Floating panel already exists, skipping.");
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
        const checkButton = createButton('Check last scan', checkLastScan, '#5bc0de');
        const compareButton = createButton('Compare scans', compareAndDisplayNewTargets, '#28a745');
        const deleteLastButton = createButton('Delete last scan', deleteLastScan, '#dc3545');
        const deleteAllButton = createButton('Delete all current scans', deleteCurrentScan, '#dc3545');

        panel.appendChild(saveButton);
        panel.appendChild(checkButton);
        panel.appendChild(compareButton);
        panel.appendChild(deleteLastButton);
        panel.appendChild(deleteAllButton);
        
        document.body.appendChild(panel);
        console.log("SFCScript: Floating panel added successfully.");
    }
    
    // A simple, reliable polling mechanism to ensure the panel is added
    function pollForElements() {
        if (document.getElementById('galaxy') && document.getElementById('solar_system')) {
            console.log("SFCScript: Required DOM elements found. Adding floating panel.");
            addFloatingPanel();
        } else {
            console.log("SFCScript: Required DOM elements not yet found, re-checking in 100ms.");
            setTimeout(pollForElements, 100);
        }
    }

    // Start the process
    pollForElements();
})();