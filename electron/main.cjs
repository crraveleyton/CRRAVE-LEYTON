const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const os = require("os");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

let mainWindow = null;
let staticServer = null;
let serverUrl = null;

function startDistServer() {
  return new Promise((resolve, reject) => {
    const distDir = path.join(__dirname, "..", "dist");
    if (!fs.existsSync(path.join(distDir, "index.html"))) {
      reject(
        new Error(
          `Built frontend not found at ${distDir}. Run "npm run build" before starting or packaging Electron.`
        )
      );
      return;
    }

    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
        let pathname = decodeURIComponent(reqUrl.pathname || "/");
        if (pathname === "/") {
          pathname = "/index.html";
        }

        const safePath = path
          .normalize(pathname.replace(/^[/\\]+/, ""))
          .replace(/^(\.\.[/\\])+/, "");
        let filePath = path.join(distDir, safePath);

        if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }

        let exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        if (!exists) {
          // SPA fallback for client routes
          if (!path.extname(safePath)) {
            filePath = path.join(distDir, "index.html");
            exists = fs.existsSync(filePath);
          }
        }

        if (!exists) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(500);
            res.end("Failed to read file");
            return;
          }
          res.writeHead(200, { "Content-Type": contentType });
          res.end(data);
        });
      } catch (err) {
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine static server port."));
        return;
      }
      staticServer = server;
      serverUrl = `http://127.0.0.1:${address.port}`;
      resolve(serverUrl);
    });
  });
}

async function printHtmlSilently(html, options = {}) {
  if (!html || typeof html !== "string") {
    throw new Error("No HTML content provided for printing.");
  }

  const tempFileName = `crrave-receipt-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.html`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  fs.writeFileSync(tempFilePath, html, "utf8");

  return new Promise((resolve, reject) => {
    const printWin = new BrowserWindow({
      show: false,
      width: 340,
      height: 800,
      backgroundColor: "#ffffff",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    let settled = false;
    const cleanup = () => {
      try {
        if (!printWin.isDestroyed()) {
          printWin.close();
        }
      } catch {
        // ignore close errors
      }
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch {
        // ignore temp cleanup errors
      }
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const succeed = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      cleanup();
      resolve(result);
    };

    const timeoutHandle = setTimeout(() => {
      fail(new Error("Thermal print timed out."));
    }, 20000);

    printWin.webContents.once("did-fail-load", (_event, _code, desc) => {
      fail(new Error(`Failed to load receipt document: ${desc}`));
    });

    printWin.webContents.once("did-finish-load", () => {
      setTimeout(() => {
        if (settled || printWin.isDestroyed()) return;

        const printOptions = {
          silent: options.silent !== false,
          printBackground: options.printBackground !== false,
          margins: options.margins || { marginType: "none" },
        };

        const printerName =
          typeof options.deviceName === "string"
            ? options.deviceName.trim()
            : typeof options.printerName === "string"
            ? options.printerName.trim()
            : "";

        if (printerName) {
          printOptions.deviceName = printerName;
        }

        printWin.webContents.print(printOptions, (success, failureReason) => {
          if (!success) {
            fail(new Error(failureReason || "Printer rejected or cancelled the print job."));
            return;
          }
          succeed({ success: true, deviceName: printerName || "default" });
        });
      }, 100);
    });

    printWin.loadFile(tempFilePath).catch(fail);
  });
}

function registerIpcHandlers() {
  ipcMain.handle("print-receipt", async (_event, payload = {}) => {
    const html =
      payload.combinedHtml ||
      payload.html ||
      payload.customerHtml ||
      payload.kitchenHtml;

    if (!html) {
      throw new Error("Receipt payload does not include printable HTML.");
    }

    return printHtmlSilently(html, {
      silent: true,
      printBackground: true,
      deviceName: payload.printerName || payload.deviceName,
      margins: { marginType: "none" },
    });
  });

  ipcMain.handle("print-html", async (_event, payload = {}) => {
    const html = typeof payload === "string" ? payload : payload.html;
    const options = typeof payload === "object" && payload ? payload.options || {} : {};
    return printHtmlSilently(html, options);
  });

  ipcMain.handle("get-printers", async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return [];
    return mainWindow.webContents.getPrintersAsync();
  });
}

async function createMainWindow() {
  const targetUrl = process.env.ELECTRON_START_URL || serverUrl || (await startDistServer());

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    title: "Crrave Leyton",
    icon: path.join(__dirname, "resources", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
      return { action: "allow" };
    }
    shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(targetUrl);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.setName("Crrave Leyton");
  if (process.platform === "win32") {
    app.setAppUserModelId("com.biznexttechnology.crraveleyton");
  }

  app.whenReady().then(async () => {
    registerIpcHandlers();
    await createMainWindow();

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (staticServer) {
    try {
      staticServer.close();
    } catch {
      // ignore
    }
    staticServer = null;
  }
});
