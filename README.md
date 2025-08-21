AddResTotal.2.5.Asma01.js :
  Sum up your ressources and show you how much carmanors you need to transport them.
  Who needs rhe other cargos anyway ?


StarfleetFleetMaxCargoFix.js :
  Makes the calc for you to fuel your fleet in the fleetscreen. It adds a New "Max" buttons at the right of the ressources to send, that is the one to use now.


StarfleetFleetsLisibility.js :
  For the fleets screen, moving fleets are now readable, and at the bottom you can now read in blue a formated version of the totals of each kind of ships.


StarfleetShipyardLisibility.js :
  For the shipyard screen, totals on the left, queued and ships under construction are now readable.

----------------------------
GalaxyScan_X.X.js :
  You set your delta in hours between 2 scans of a same system, the script will compare those 2 last scans and tell you in a popup how many targets are new and which ones, or if there is nothing valid as a target.
  
  Default variables in the head of the script to edit to your liking :
  - Minimum time in hours to consider a target "valid", change "1" to what you need :
    const MIN_TIME_DELTA_HOURS = 1;
  - Minimum difficulty level to consider (from -100 to 100)
    const MIN_NPC_DIFFICULTY = -100;
  - Maximum difficulty level to consider (from -100 to 100)
    const MAX_NPC_DIFFICULTY = 100;
  - NPC names to target (e.g., ["Enemy Fleet", "Alien Experiment"]).
    Leave the list empty to scan all NPCs.
    const NPC_TARGET_NAMES = [];
    
  It gives you 5 buttons :
    Save this scan              : Save the state of the current system in a temporary webbrowser file.
    Check last scan             : Check the date/time of your last Save state of the current system.
    Compare scans               : When you've done 2 scans and there is enough time (your delta) between them, create a popup informing you of new targets.
    Delete last scan            : Delete only the last scan you have done for the current system.
    Delete all current scans    : Delete all scans for the current system.
