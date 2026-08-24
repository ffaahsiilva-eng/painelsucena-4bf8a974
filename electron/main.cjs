const { app, BrowserWindow, ipcMain, session, shell, desktopCapturer } = require("electron");
const path = require("path");

const APP_URL = process.env.ELECTRON_APP_URL || "https://painelsucena.lovable.app";
const WINDOW_TITLE = "Painel Sucena";
const SESSION_PARTITION = "persist:painel-sucena-desktop";
const VERSION_CHECK_INTERVAL_MS = 2_000;
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Desktop-App": "electron",
};

let mainWindow = null;
let currentAssetPath = null;
let versionMonitor = null;
let sessionConfigured = false;

app.commandLine.appendSwitch("disable-http-cache");

function headersToString(headers) {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function buildPublishedUrl(reason = "startup") {
  const url = new URL(APP_URL);
  url.searchParams.set("desktop-shell", "electron");
  url.searchParams.set("desktop-reason", reason);
  url.searchParams.set("desktop-ts", `${Date.now()}`);
  return url.toString();
}

function extractAssetPath(html) {
  const assetMatch = html.match(/src="(\/assets\/[^\"]+\.js)"/i);
  return assetMatch ? assetMatch[1] : null;
}

async function fetchPublishedAssetPath() {
  const response = await fetch(buildPublishedUrl("version-probe"), {
    method: "GET",
    cache: "no-store",
    headers: NO_CACHE_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar versão publicada (${response.status})`);
  }

  const html = await response.text();
  return extractAssetPath(html);
}

async function clearDesktopCaches(targetSession) {
  await targetSession.clearCache();
  await targetSession.clearStorageData({
    storages: ["serviceworkers", "cachestorage"],
  });
}

function configureDesktopSession(targetSession) {
  if (sessionConfigured) return;
  sessionConfigured = true;

  targetSession.webRequest.onBeforeRequest((details, callback) => {
    const requestUrl = details.url.toLowerCase();
    const isServiceWorkerScript =
      requestUrl.includes("/app-runtime-sw.js") || requestUrl.endsWith("/sw.js") || requestUrl.includes("/app-sw.js");

    callback({ cancel: isServiceWorkerScript });
  });

  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestUrl = details.url.toLowerCase();
    const isBackendApi = requestUrl.includes(".supabase.co/") || requestUrl.includes("/functions/v1/");

    if (isBackendApi) {
      callback({ requestHeaders: details.requestHeaders });
      return;
    }

    callback({
      requestHeaders: {
        ...details.requestHeaders,
        ...NO_CACHE_HEADERS,
      },
    });
  });

  targetSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Cache-Control": [NO_CACHE_HEADERS["Cache-Control"]],
        Pragma: [NO_CACHE_HEADERS.Pragma],
        Expires: [NO_CACHE_HEADERS.Expires],
      },
    });
  });
}

async function loadLatestPublished(reason = "startup") {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  await mainWindow.loadURL(buildPublishedUrl(reason), {
    extraHeaders: headersToString(NO_CACHE_HEADERS),
  });
}

async function checkForPublishedUpdate(trigger = "interval") {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }

  try {
    const nextAssetPath = await fetchPublishedAssetPath();

    if (!nextAssetPath) {
      return;
    }

    if (!currentAssetPath) {
      currentAssetPath = nextAssetPath;
      return;
    }

    if (nextAssetPath !== currentAssetPath) {
      currentAssetPath = nextAssetPath;
      await clearDesktopCaches(mainWindow.webContents.session);
      await loadLatestPublished(`publish-detected-${trigger}`);
    }
  } catch (error) {
    console.error("Erro ao verificar atualização publicada:", error);
  }
}

function startVersionMonitor() {
  if (versionMonitor) {
    clearInterval(versionMonitor);
  }

  versionMonitor = setInterval(() => {
    void checkForPublishedUpdate("interval");
  }, VERSION_CHECK_INTERVAL_MS);
}

async function createMainWindow() {
  const desktopSession = session.fromPartition(SESSION_PARTITION);
  configureDesktopSession(desktopSession);
  await clearDesktopCaches(desktopSession);
  currentAssetPath = await fetchPublishedAssetPath().catch(() => null);

  // Permite que getDisplayMedia (compartilhamento de tela do Jitsi)
  // funcione no Electron retornando automaticamente a tela inteira.
  // Sem isso, o seletor de tela do Chromium fica preso em "carregando".
  desktopSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen", "window"] })
        .then((sources) => {
          if (sources.length === 0) {
            callback({});
            return;
          }
          // Seleciona a tela principal por padrão
          const screenSource = sources.find((s) => s.id.startsWith("screen:")) || sources[0];
          callback({ video: screenSource, audio: "loopback" });
        })
        .catch(() => callback({}));
    },
    { useSystemPicker: true },
  );

  // Concede permissões de mídia (camera/mic/display) sem prompt
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
      void clearDesktopCaches(mainWindow.webContents.session).then(() => loadLatestPublished("manual-refresh"));
    }
  });

  mainWindow.on("focus", () => {
    void checkForPublishedUpdate("focus");
  });

  mainWindow.on("show", () => {
    void checkForPublishedUpdate("show");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error("Falha ao carregar a aplicação desktop:", { errorCode, errorDescription, validatedURL });
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        void loadLatestPublished("retry");
      }
    }, 1500);
  });

  await loadLatestPublished("startup");
  startVersionMonitor();
}

ipcMain.handle("desktop:reload-latest", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  await clearDesktopCaches(mainWindow.webContents.session);
  await loadLatestPublished("renderer-request");
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

app.whenReady().then(async () => {
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (versionMonitor) {
    clearInterval(versionMonitor);
    versionMonitor = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});