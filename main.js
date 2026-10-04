const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#000000', autoHideMenuBar: true,
    title: 'Totally Legit Inc',
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // Open external links in the real browser instead of a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(() => {
  // Allow microphone (voice chat) and pointer lock.
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'pointerLock', 'fullscreen'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ['media', 'pointerLock', 'fullscreen'].includes(perm));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
