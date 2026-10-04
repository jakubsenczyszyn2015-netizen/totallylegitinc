# Totally Legit Inc

Desktop (Windows .exe) build of the game using Electron. three.js and PeerJS are bundled, so the game itself runs offline; online multiplayer still needs internet (PeerJS matchmaking).

- Play from source: `npm install && npm start`
- Build the exe on Windows: `npm run dist:win` (outputs `dist/*.exe` — a portable exe and an installer)
- Or grab it from GitHub: **Actions → Build Windows exe → latest run → Artifacts**

Multiplayer: one player hosts and shares the 5-letter room code; others join with it. F11 toggles fullscreen.
