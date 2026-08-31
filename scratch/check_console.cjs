const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[CONSOLE] ${message} (${sourceId}:${line})`);
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[LOAD ERROR] ${errorDescription} on ${validatedURL}`);
  });

  win.webContents.on('page-title-updated', (event, title) => {
    console.log(`[TITLE] ${title}`);
  });

  win.loadURL('https://painelsucena.lovable.app');

  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const html = await win.webContents.executeJavaScript(`
          document.body.innerHTML;
        `);
        fs.writeFileSync(path.join(__dirname, 'dom_dump.html'), html);
        console.log('[DOM] Saved to scratch/dom_dump.html');
        
        const image = await win.webContents.capturePage();
        fs.writeFileSync(path.join(__dirname, 'screenshot.png'), image.toPNG());
        console.log('[SCREENSHOT] Saved to scratch/screenshot.png');
      } catch (e) {
        console.error('[ERROR]', e);
      }
      app.quit();
    }, 5000);
  });
});
