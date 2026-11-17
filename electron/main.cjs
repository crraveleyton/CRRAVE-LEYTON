const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const os = require("os");

app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");

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

function wrapCopyAsStandaloneHtml(html) {
  if (!html || typeof html !== "string") return "";
  if (/<html[\s>]/i.test(html)) {
    return html;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt Print</title>
  <style>
    @page {
      margin: 0;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 80mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, Helvetica, sans-serif;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
}

async function printHtmlSilently(html, options = {}) {
  const standaloneHtml = wrapCopyAsStandaloneHtml(html);
  if (!standaloneHtml) {
    throw new Error("No HTML content provided for printing.");
  }

  const tempFileName = `crrave-receipt-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.html`;
  const tempFilePath = path.join(os.tmpdir(), tempFileName);

  fs.writeFileSync(tempFilePath, standaloneHtml, "utf8");

  return new Promise((resolve, reject) => {
    const printWin = new BrowserWindow({
      show: true,
      x: -20000,
      y: -20000,
      width: 302,
      height: 900,
      frame: false,
      skipTaskbar: true,
      focusable: false,
      enableLargerThanScreen: true,
      paintWhenInitiallyHidden: true,
      backgroundColor: "#ffffff",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        backgroundThrottling: false,
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
    }, 25000);

    printWin.webContents.once("did-fail-load", (_event, _code, desc) => {
      fail(new Error(`Failed to load receipt document: ${desc}`));
    });

    printWin.webContents.once("did-finish-load", async () => {
      try {
        if (settled || printWin.isDestroyed()) return;

        const metrics = await printWin.webContents.executeJavaScript(`
          (async () => {
            if (document.fonts && document.fonts.ready) {
              await document.fonts.ready;
            }
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            const body = document.body;
            const docEl = document.documentElement;
            const heightPx = Math.max(
              body ? body.scrollHeight : 0,
              body ? body.offsetHeight : 0,
              docEl ? docEl.scrollHeight : 0
            );
            return { heightPx };
          })()
        `);

        if (settled || printWin.isDestroyed()) return;

        const heightPx = Number(metrics?.heightPx || 450);
        // 1 CSS px = 25400 / 96 = 264.5833 microns; add 6mm bottom buffer
        const heightMicrons = Math.max(60000, Math.ceil(heightPx * 264.5833) + 6000);

        const printerName =
          typeof options.deviceName === "string"
            ? options.deviceName.trim()
            : typeof options.printerName === "string"
            ? options.printerName.trim()
            : "";

        const basePrintOptions = {
          silent: options.silent !== false,
          printBackground: true,
          color: false,
          margins: options.margins || { marginType: "none" },
        };

        if (printerName) {
          basePrintOptions.deviceName = printerName;
        }

        const primaryOptions = {
          ...basePrintOptions,
          pageSize: {
            width: 80000,
            height: heightMicrons,
          },
        };

        printWin.webContents.print(primaryOptions, (success, failureReason) => {
          if (success) {
            succeed({ success: true, deviceName: printerName || "default" });
            return;
          }

          // Fallback to Windows printer driver's default paper size if custom pageSize rejected
          if (settled || printWin.isDestroyed()) {
            fail(new Error(failureReason || "Printer rejected or cancelled the print job."));
            return;
          }

          const fallbackOptions = {
            ...basePrintOptions,
            usePrinterDefaultPageSize: true,
          };

          printWin.webContents.print(fallbackOptions, (fbSuccess, fbReason) => {
            if (!fbSuccess) {
              fail(new Error(fbReason || failureReason || "Printer rejected or cancelled the print job."));
              return;
            }
            succeed({ success: true, deviceName: printerName || "default" });
          });
        });
      } catch (err) {
        fail(err);
      }
    });

    printWin.loadFile(tempFilePath).catch(fail);
  });
}

function registerIpcHandlers() {
  ipcMain.handle("print-receipt", async (_event, payload = {}) => {
    const printerName = payload.printerName || payload.deviceName;
    const baseOpts = {
      silent: true,
      printBackground: true,
      deviceName: printerName,
      margins: { marginType: "none" },
    };

    if (payload.customerHtml && payload.kitchenHtml) {
      await printHtmlSilently(payload.customerHtml, baseOpts);
      return printHtmlSilently(payload.kitchenHtml, baseOpts);
    }

    const html =
      payload.combinedHtml ||
      payload.html ||
      payload.customerHtml ||
      payload.kitchenHtml;

    if (!html) {
      throw new Error("Receipt payload does not include printable HTML.");
    }

    return printHtmlSilently(html, baseOpts);
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
    if (!process.env.ELECTRON_START_URL && !serverUrl) {
      await startDistServer();
    }
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
