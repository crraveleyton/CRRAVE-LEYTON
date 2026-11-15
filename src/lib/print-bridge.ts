export type PrintMode = "rawbt" | "electron";

const PRINT_MODE_KEY = "crrave_print_mode";
const ELECTRON_BRIDGE_URL_KEY = "crrave_electron_bridge_url";
const ELECTRON_PRINTER_NAME_KEY = "crrave_electron_printer_name";

declare global {
  interface Window {
    electronAPI?: {
      printReceipt?: (payload: any) => Promise<any> | void;
      printHTML?: (html: string, options?: any) => Promise<any> | void;
      printHtml?: (html: string, options?: any) => Promise<any> | void;
      printRaw?: (base64: string, options?: any) => Promise<any> | void;
      print?: (payload: any) => Promise<any> | void;
      send?: (channel: string, payload: any) => void;
    };
    electron?: {
      ipcRenderer?: {
        send?: (channel: string, payload: any) => void;
        invoke?: (channel: string, payload: any) => Promise<any>;
      };
      printReceipt?: (payload: any) => Promise<any> | void;
      printHTML?: (html: string, options?: any) => Promise<any> | void;
    };
    posPrinter?: {
      print?: (payload: any) => Promise<any> | void;
      printHTML?: (html: string, options?: any) => Promise<any> | void;
      printRaw?: (base64: string, options?: any) => Promise<any> | void;
    };
  }
}

export function isElectronEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return (
    ua.includes("Electron") ||
    Boolean(window.electronAPI) ||
    Boolean(window.electron) ||
    Boolean(window.posPrinter)
  );
}

export function getStoredPrintMode(): PrintMode {
  try {
    const saved = localStorage.getItem(PRINT_MODE_KEY);
    if (saved === "rawbt" || saved === "electron") return saved;
  } catch {
    // ignore storage errors
  }
  return isElectronEnvironment() ? "electron" : "rawbt";
}

export function setStoredPrintMode(mode: PrintMode): void {
  try {
    localStorage.setItem(PRINT_MODE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function getElectronBridgeUrl(): string {
  try {
    return localStorage.getItem(ELECTRON_BRIDGE_URL_KEY) || "";
  } catch {
    return "";
  }
}

export function setElectronBridgeUrl(url: string): void {
  try {
    localStorage.setItem(ELECTRON_BRIDGE_URL_KEY, url.trim());
  } catch {
    // ignore storage errors
  }
}

export function getElectronPrinterName(): string {
  try {
    return localStorage.getItem(ELECTRON_PRINTER_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setElectronPrinterName(name: string): void {
  try {
    localStorage.setItem(ELECTRON_PRINTER_NAME_KEY, name.trim());
  } catch {
    // ignore storage errors
  }
}

export function uint8ArrayToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return window.btoa(binary);
}

export function wrapStandalonePrintDocument(sectionsHtml: string[]): string {
  const joined = sectionsHtml
    .map(
      (section, idx) =>
        `<div class="print-copy-page${idx < sectionsHtml.length - 1 ? " with-cut-break" : ""}">${section}</div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt Print</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 80mm;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-copy-page {
      width: 80mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
    }
    .with-cut-break {
      page-break-after: always;
      break-after: page;
    }
    @media screen {
      html, body {
        margin: 0 auto;
      }
      .with-cut-break {
        border-bottom: 2px dashed #999999;
        margin-bottom: 8mm;
        padding-bottom: 4mm;
      }
    }
  </style>
</head>
<body>
  ${joined}
</body>
</html>`;
}

export function dispatchRawBtPrint(bytes: Uint8Array): void {
  const b64 = uint8ArrayToBase64(bytes);
  window.location.href = `rawbt:base64,${b64}`;
}

export interface DirectPrintPayload {
  combinedHtml: string;
  customerHtml?: string;
  kitchenHtml?: string;
  escposBase64?: string;
  customerEscPosB64?: string;
  kitchenEscPosB64?: string;
  orderId?: string;
  order?: any;
}

function printViaHiddenIframe(fullHtml: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const existing = document.getElementById("crrave-direct-print-frame");
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      const iframe = document.createElement("iframe");
      iframe.id = "crrave-direct-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "80mm";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc || !iframe.contentWindow) {
        reject(new Error("Could not initialize direct print frame."));
        return;
      }

      doc.open();
      doc.write(fullHtml);
      doc.close();

      let printed = false;
      const triggerPrint = () => {
        if (printed) return;
        printed = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 5000);
        }
      };

      iframe.onload = () => setTimeout(triggerPrint, 120);
      setTimeout(triggerPrint, 350);
    } catch (err) {
      reject(err);
    }
  });
}

export async function dispatchDirectElectronPrint(
  payload: DirectPrintPayload,
): Promise<{ method: "electron-ipc" | "electron-bridge" | "system-print" }> {
  const printerName = getElectronPrinterName();
  const bridgeUrl = getElectronBridgeUrl();

  // 1. Electron Preload / IPC Bridge (when running inside Electron .exe wrapper)
  const api = window.electronAPI;
  const elec = window.electron;
  const posPrinter = window.posPrinter;

  if (api?.printReceipt) {
    await api.printReceipt({ ...payload, printerName: printerName || undefined });
    return { method: "electron-ipc" };
  }
  if (api?.printHTML) {
    await api.printHTML(payload.combinedHtml, {
      silent: true,
      printBackground: true,
      deviceName: printerName || undefined,
      margins: { marginType: "none" },
    });
    return { method: "electron-ipc" };
  }
  if (api?.printHtml) {
    await api.printHtml(payload.combinedHtml, {
      silent: true,
      printBackground: true,
      deviceName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (api?.printRaw && payload.escposBase64) {
    await api.printRaw(payload.escposBase64, {
      printerName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (api?.print) {
    await api.print({
      ...payload,
      silent: true,
      printerName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (elec?.printReceipt) {
    await elec.printReceipt({ ...payload, printerName: printerName || undefined });
    return { method: "electron-ipc" };
  }
  if (elec?.printHTML) {
    await elec.printHTML(payload.combinedHtml, {
      silent: true,
      deviceName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (elec?.ipcRenderer?.invoke) {
    await elec.ipcRenderer.invoke("print-receipt", {
      ...payload,
      printerName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (elec?.ipcRenderer?.send) {
    elec.ipcRenderer.send("print-receipt", {
      ...payload,
      printerName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (posPrinter?.print) {
    await posPrinter.print({ ...payload, printerName: printerName || undefined });
    return { method: "electron-ipc" };
  }
  if (posPrinter?.printHTML) {
    await posPrinter.printHTML(payload.combinedHtml, {
      printerName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }
  if (posPrinter?.printRaw && payload.escposBase64) {
    await posPrinter.printRaw(payload.escposBase64, {
      printerName: printerName || undefined,
    });
    return { method: "electron-ipc" };
  }

  // 2. Local Electron Helper App HTTP Bridge (when running in PC browser alongside an Electron .exe print agent)
  if (bridgeUrl) {
    try {
      const res = await fetch(bridgeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: payload.combinedHtml,
          customerHtml: payload.customerHtml,
          kitchenHtml: payload.kitchenHtml,
          escposBase64: payload.escposBase64,
          customerEscPosB64: payload.customerEscPosB64,
          kitchenEscPosB64: payload.kitchenEscPosB64,
          printerName: printerName || undefined,
          orderId: payload.orderId,
        }),
      });
      if (res.ok) {
        return { method: "electron-bridge" };
      }
      console.warn("Electron local bridge returned non-OK:", res.status);
    } catch (err) {
      console.warn("Electron local bridge unreachable, falling back to direct print frame:", err);
    }
  }

  // 3. Direct System / Electron Silent Print via hidden 80mm iframe
  await printViaHiddenIframe(payload.combinedHtml);
  return { method: "system-print" };
}
