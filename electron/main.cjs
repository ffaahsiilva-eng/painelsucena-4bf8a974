const { app, BrowserWindow, ipcMain, session, shell, desktopCapturer } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

const WINDOW_TITLE = "Painel Sucena";
const SESSION_PARTITION = "persist:painel-sucena-desktop";

let mainWindow = null;

function startLocalServer() {
  return new Promise((resolve) => {
    const distPath = path.join(__dirname, "../dist");
    
    const server = http.createServer((req, res) => {
      const reqUrl = req.url.split('?')[0];
      let filePath = path.join(distPath, reqUrl);
      
      if (!filePath.startsWith(distPath)) {
        res.writeHead(403);
        return res.end();
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          filePath = path.join(distPath, "index.html");
        }
        
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404);
            return res.end("Not found");
          }
          
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.webp': 'image/webp',
            '.woff2': 'font/woff2'
          };
          
          res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
          res.end(data);
        });
      });
    });

    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

async function createMainWindow() {
  const desktopSession = session.fromPartition(SESSION_PARTITION);

  desktopSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen", "window"] })
        .then((sources) => {
          if (sources.length === 0) {
            callback({});
            return;
          }
          const screenSource = sources.find((s) => s.id.startsWith("screen:")) || sources[0];
          callback({ video: screenSource, audio: "loopback" });
        })
        .catch(() => callback({}));
    },
    { useSystemPicker: true },
  );

  desktopSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "display-capture", "camera", "microphone", "fullscreen"];
    callback(allowed.includes(permission));
  });

  mainWindow = new BrowserWindow({
    title: WINDOW_TITLE,
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0f0f23",
    webPreferences: {
      partition: SESSION_PARTITION,
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.webContents.setUserAgent(`${mainWindow.webContents.getUserAgent()} PainelSucenaDesktop`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = input.key.toLowerCase();
    if (key === "f5" || (input.control && key === "r")) {
      event.preventDefault();
      mainWindow.reload();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL("https://sucena.shop/");
}

ipcMain.handle("desktop:reload-latest", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.reload();
  return true;
});

ipcMain.handle("desktop:list-screen-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 640, height: 360 },
    fetchWindowIcons: true,
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    display_id: source.display_id,
    appIcon: source.appIcon?.toDataURL?.() ?? null,
    thumbnail: source.thumbnail?.toDataURL?.() ?? null,
  }));
});

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});