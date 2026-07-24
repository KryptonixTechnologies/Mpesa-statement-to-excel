import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ComponentType,
  type RefAttributes,
} from "react";
import { StyleSheet, View } from "react-native";
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from "react-native-webview";
import type { PdfBridgeMessage } from "@/types/pdf";

export type PdfWebViewHandle = {
  open: (base64: string, password?: string) => void;
};

type Props = {
  onMessage: (message: PdfBridgeMessage) => void;
};

const bridgeHtml = `
<!doctype html>
<html>
  <head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body>
    <script>
      // pdf.js 6 uses the new Uint8Array Base64/Hex APIs. Android System
      // WebView versions that do not expose them yet need these equivalents.
      if (!Uint8Array.prototype.toHex) {
        Object.defineProperty(Uint8Array.prototype, "toHex", {
          value: function () {
            let output = "";
            for (const byte of this) output += byte.toString(16).padStart(2, "0");
            return output;
          },
        });
      }

      if (!Uint8Array.prototype.toBase64) {
        Object.defineProperty(Uint8Array.prototype, "toBase64", {
          value: function () {
            let binary = "";
            const chunkSize = 0x8000;
            for (let offset = 0; offset < this.length; offset += chunkSize) {
              binary += String.fromCharCode(...this.subarray(offset, offset + chunkSize));
            }
            return btoa(binary);
          },
        });
      }

      if (!Uint8Array.fromBase64) {
        Object.defineProperty(Uint8Array, "fromBase64", {
          value: function (value) {
            const binary = atob(value);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) {
              bytes[index] = binary.charCodeAt(index);
            }
            return bytes;
          },
        });
      }

      if (!Map.prototype.getOrInsertComputed) {
        Object.defineProperty(Map.prototype, "getOrInsertComputed", {
          value: function (key, callback) {
            if (this.has(key)) return this.get(key);
            const value = callback(key);
            this.set(key, value);
            return value;
          },
        });
      }

      if (!Promise.withResolvers) {
        Object.defineProperty(Promise, "withResolvers", {
          value: function () {
            let resolve;
            let reject;
            const promise = new Promise((resolvePromise, rejectPromise) => {
              resolve = resolvePromise;
              reject = rejectPromise;
            });
            return { promise, resolve, reject };
          },
        });
      }

      if (!Promise.try) {
        Object.defineProperty(Promise, "try", {
          value: function (callback, ...args) {
            return new Promise((resolve) => resolve(callback(...args)));
          },
        });
      }

      if (!Set.prototype.union) {
        Object.defineProperty(Set.prototype, "union", {
          value: function (other) {
            const result = new Set(this);
            for (const value of other) result.add(value);
            return result;
          },
        });
      }

      if (!Set.prototype.intersection) {
        Object.defineProperty(Set.prototype, "intersection", {
          value: function (other) {
            const result = new Set();
            for (const value of this) {
              if (other.has(value)) result.add(value);
            }
            return result;
          },
        });
      }

      // A dedicated worker has a separate JavaScript environment and would not
      // inherit the compatibility methods above. pdf.js automatically falls
      // back to its in-page worker when Worker construction is unavailable.
      Object.defineProperty(window, "Worker", {
        value: undefined,
        configurable: true,
      });
    </script>
    <script type="module">
      import * as pdfjsLib from "./pdf.mjs";
      pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";

      const send = (payload) =>
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));

      const decodeBase64 = (value) => {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
      };

      async function extract(base64, password) {
        let waitingForPassword = false;
        try {
          const loadingTask = pdfjsLib.getDocument({
            data: decodeBase64(base64),
            password: password || undefined,
          });

          loadingTask.onPassword = (updatePassword, reason) => {
            waitingForPassword = true;
            loadingTask.destroy();
            send({
              type: reason === 2 ? "PASSWORD_INCORRECT" : "PASSWORD_REQUIRED",
            });
          };

          const pdf = await loadingTask.promise;
          const pages = [];

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            send({ type: "PROGRESS", current: pageNumber, total: pdf.numPages });
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items
              .filter((item) => typeof item.str === "string" && item.str.trim())
              .map((item) => ({
                text: item.str,
                x: item.transform[4],
                y: item.transform[5],
                width: item.width || 0,
                page: pageNumber,
              })));
            page.cleanup();
          }

          send({ type: "EXTRACTED", pages, pageCount: pdf.numPages });
          await pdf.destroy();
        } catch (error) {
          if (waitingForPassword) return;
          const name = error?.name || "PdfError";
          if (name === "PasswordException") {
            send({ type: password ? "PASSWORD_INCORRECT" : "PASSWORD_REQUIRED" });
            return;
          }
          send({
            type: "ERROR",
            code: name,
            message: error?.message || "The PDF could not be read.",
          });
        }
      }

      const handleCommand = (event) => {
        try {
          const command = JSON.parse(event.data);
          if (command.type === "OPEN") extract(command.base64, command.password);
        } catch (error) {
          send({ type: "ERROR", code: "BRIDGE_ERROR", message: error.message });
        }
      };

      // react-native-webview dispatches messages on document on some Android
      // WebView versions and on window on others.
      window.addEventListener("message", handleCommand);
      document.addEventListener("message", handleCommand);

      send({ type: "READY" });
    </script>
  </body>
</html>`;

// react-native-webview 14 currently defaults its generic props parameter to
// undefined, which TypeScript 6 reduces to `never`. This preserves its real props.
const TypedWebView = WebView as unknown as ComponentType<
  WebViewProps & RefAttributes<WebView<Record<string, never>>>
>;

export const PdfWebView = forwardRef<PdfWebViewHandle, Props>(function PdfWebView(
  { onMessage },
  forwardedRef,
) {
  const webViewRef = useRef<WebView<Record<string, never>>>(null);

  useImperativeHandle(forwardedRef, () => ({
    open(base64, password = "") {
      webViewRef.current?.postMessage(JSON.stringify({ type: "OPEN", base64, password }));
    },
  }));

  function handleMessage(event: WebViewMessageEvent) {
    try {
      onMessage(JSON.parse(event.nativeEvent.data) as PdfBridgeMessage);
    } catch {
      onMessage({
        type: "ERROR",
        code: "INVALID_BRIDGE_MESSAGE",
        message: "The PDF reader returned an invalid response.",
      });
    }
  }

  return (
    <View pointerEvents="none" style={styles.hidden} accessibilityElementsHidden>
      <TypedWebView
        ref={webViewRef}
        source={{ html: bridgeHtml, baseUrl: "file:///android_asset/assets/pdfjs/" }}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
});

const styles = StyleSheet.create({
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
