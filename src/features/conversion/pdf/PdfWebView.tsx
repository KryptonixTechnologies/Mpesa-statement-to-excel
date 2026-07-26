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

    </script>
    <script type="module">
      import * as pdfjsLib from "./pdf.mjs";
      pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.compat.mjs";

      const send = (payload) => {
        const serialized = JSON.stringify(payload);
        window.ReactNativeWebView.postMessage(serialized);
        return serialized.length;
      };

      send({
        type: "PERFORMANCE",
        stage: "worker.support",
        durationMs: 0,
        details: { available: typeof Worker === "function" },
      });

      const decodeBase64 = (value) => {
        const startedAt = performance.now();
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        send({
          type: "PERFORMANCE",
          stage: "base64.decode",
          durationMs: performance.now() - startedAt,
          details: { bytes: bytes.length },
        });
        return bytes;
      };

      async function extract(base64, password) {
        let waitingForPassword = false;
        const extractionStartedAt = performance.now();
        try {
          const openStartedAt = performance.now();
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
          send({
            type: "PERFORMANCE",
            stage: "worker.mode",
            durationMs: 0,
            details: {
              dedicated:
                typeof Worker === "function" &&
                loadingTask._worker?.port instanceof Worker,
            },
          });
          send({
            type: "PERFORMANCE",
            stage: "document.open",
            durationMs: performance.now() - openStartedAt,
            details: { pages: pdf.numPages, passwordProvided: Boolean(password) },
          });
          let totalItems = 0;

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const pageStartedAt = performance.now();
            send({ type: "PROGRESS", current: pageNumber, total: pdf.numPages });
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const items = content.items
              .filter((item) => typeof item.str === "string" && item.str.trim())
              .map((item) => [
                item.str.trim(),
                Math.round(item.transform[4] * 100) / 100,
                Math.round(item.transform[5] * 100) / 100,
              ]);
            totalItems += items.length;
            send({
              type: "PERFORMANCE",
              stage: "page.extract",
              durationMs: performance.now() - pageStartedAt,
              details: { page: pageNumber, items: items.length },
            });
            const bridgeCharacters = send({
              type: "PAGE_EXTRACTED",
              page: pageNumber,
              pageCount: pdf.numPages,
              items,
            });
            send({
              type: "PERFORMANCE",
              stage: "bridge.page",
              durationMs: 0,
              details: {
                page: pageNumber,
                characters: bridgeCharacters,
                items: items.length,
              },
            });
            page.cleanup();
            items.length = 0;
          }

          send({
            type: "PERFORMANCE",
            stage: "extraction.total",
            durationMs: performance.now() - extractionStartedAt,
            details: { pages: pdf.numPages },
          });
          send({
            type: "EXTRACTION_COMPLETE",
            pageCount: pdf.numPages,
            totalItems,
          });
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
