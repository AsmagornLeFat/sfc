// ==UserScript==
// @name         Starfleet Commander Galaxy Scan Comparison (v2.4)
// @namespace    Starfleet Commander
// @version      2.4
// @description  Adds a floating panel to the Galaxy page for saving, comparing, and deleting NPC scans with visual feedback, including last scan date, and filtering by NPC name.
// @match        https://playstarfleet*.com/galaxy*
// @match        https://*.playstarfleet*.com/galaxy*
// @match        https://*.stardriftempires.com/galaxy*
// @match        https://playstarfleet*.com/?*
// @match        https://*.playstarfleet*.com/?*
// @match        https://*.stardriftempires.com/?*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("SFCScript: Galaxy Scan Comparison script loaded (v2.4).");

    // ====================================================================
    //              USER CONFIGURATION VARIABLES
    // ====================================================================
    // Minimum time in hours to consider a target "valid"
    // e.g., 5 hours for a same-day scan interval
    const MIN_TIME_DELTA_HOURS = 6;

    // Minimum NPC level to consider (inclusive)
    const MIN_NPC_LEVEL = 1;

    // Maximum NPC level to consider (inclusive)
    const MAX_NPC_LEVEL = 999;
    
    // NPC names to target (leave the list empty to scan all NPCs)
    // For example: ['Enemy Fleet', 'Pirate Fleet']
    const NPC_TARGET_NAMES = []; // <-- Modify this line to target specific NPCs
    // ====================================================================
    // ====================================================================

    const STORAGE_KEY_PREFIX = 'sfc_galaxy_scan_';

    // Function to scrape NPC data from the currently displayed system
    function scrapeNpcData() {
        try {
            const galaxyElement = document.getElementById("galaxy");
            const systemElement = document.getElementById("solar_system");
            
            if (!galaxyElement || !systemElement || !galaxyElement.value || !systemElement.value) {
                console.warn("SFCScript: Could not find Galaxy or System fields or their values.");
                return null;
            }
            
            const galaxy = galaxyElement.value;
            const system = systemElement.value;

            const npcData = {};
            const npcRows = document.querySelectorAll('.fleet_row.npc_fleet');

            npcRows.forEach(row => {
                const levelCell = row.querySelector('.level_display');
                const fleetNameElement = row.querySelector('.fleet_name');
                const planetLink = row.querySelector('a[href*="/galaxy/"]');

                if (levelCell && fleetNameElement && planetLink) {
                    const levelMatch = levelCell.textContent.trim().match(/Level (\d+)/);
                    if (levelMatch) {
                        const level = parseInt(levelMatch[1], 10);
                        const fleetName = fleetNameElement.textContent.trim();
                        
                        const isLevelValid = level >= MIN_NPC_LEVEL && level <= MAX_NPC_LEVEL;
                        const isNameValid = NPC_TARGET_NAMES.length === 0 || NPC_TARGET_NAMES.includes(fleetName);

                        if (isLevelValid && isNameValid) {
                            const urlParts = planetLink.href.split('/');
                            const planet = urlParts.pop() || urlParts.pop();
                            
                            if (planet && !isNaN(planet)) {
                                const npcKey = `${galaxy}:${system}:${planet}_${fleetName}_${level}`;
                                npcData[npcKey] = {
                                    name: fleetName,
                                    coords: `${galaxy}:${system}:${planet}`,
                                    level: level
                                };
                            }
                        } else {
                            console.log(`SFCScript: NPC '${fleetName}' (Level ${level}) ignored.`);
                        }
                    }
                }
            });

            console.log(`SFCScript: Scans for system ${galaxy}:${system} read.`);
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
        const previousScanJson = localStorage.getItem(storageKey);
        let message = `✅ Scans for ${scanData.coords} saved.`;

        if (previousScanJson) {
            const previousScan = JSON.parse(previousScanJson);
            const previousDate = new Date(previousScan.timestamp).toLocaleString();
            message += `\nPrevious scan was from ${previousDate}.`;
        }

        localStorage.setItem(storageKey, JSON.stringify(scanData));
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

    // Function to compare and display new targets
    function compareAndDisplayNewTargets() {
        const currentScan = scrapeNpcData();
        if (!currentScan) return;

        const storageKey = STORAGE_KEY_PREFIX + currentScan.coords;
        const previousScanJson = localStorage.getItem(storageKey);

        if (!previousScanJson) {
            updateStatus(`⚠️ No previous scan for ${currentScan.coords}. Please save one first.`, 'orange');
            return;
        }

        const previousScan = JSON.parse(previousScanJson);
        const newTargets = [];
        const timeDeltaHours = (currentScan.timestamp - previousScan.timestamp) / (1000 * 60 * 60);

        if (timeDeltaHours < MIN_TIME_DELTA_HOURS) {
            updateStatus(`⚠️ Interval between scans is too short (${timeDeltaHours.toFixed(1)}h). Minimum required: ${MIN_TIME_DELTA_HOURS}h.`, 'orange');
            return;
        }

        for (const key in currentScan.data) {
            if (!previousScan.data[key]) {
                newTargets.push(currentScan.data[key]);
            }
        }

        displayNewTargets(newTargets, currentScan.coords, previousScan.timestamp);
    }

    // Function to display new targets
    function displayNewTargets(targets, coords, previousTimestamp) {
        let displayArea = document.getElementById('sfc-new-targets-display');
        if (!displayArea) {
            displayArea = document.createElement('div');
            displayArea.id = 'sfc-new-targets-display';
            document.body.appendChild(displayArea);
        }

        const previousDate = new Date(previousTimestamp).toLocaleString();
        const targetListHtml = targets.map(target =>
            `<li>${target.name} (Level ${target.level}) - ${target.coords}</li>`
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
                <h3>${targets.length} new targets for ${coords} (Scanned after ${previousDate})</h3>
                <ul style="padding-left: 20px;">
                    ${targets.length > 0 ? targetListHtml : '<li>No new targets found.</li>'}
                </ul>
            </div>
        `;

        displayArea.innerHTML = content;
        displayArea.style.display = 'block';
        console.log(`SFCScript: ${targets.length} new targets displayed for ${coords}.`);
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
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'sfc-floating-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
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

        const saveButton = createButton('Save Scan', saveScans, '#007bff');
        const compareButton = createButton('Compare Scans', compareAndDisplayNewTargets, '#28a745');
        const deleteButton = createButton('Delete Current Scan', deleteCurrentScan, '#dc3545');

        panel.appendChild(saveButton);
        panel.appendChild(compareButton);
        panel.appendChild(deleteButton);
        
        document.body.appendChild(panel);
        console.log("SFCScript: Floating panel added.");
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.getElementById('galaxy') && document.getElementById('solar_system')) {
            addFloatingPanel();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addFloatingPanel);
    } else {
        addFloatingPanel();
    }
})();