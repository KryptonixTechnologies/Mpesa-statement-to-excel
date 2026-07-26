// Compatibility layer for pdf.js 6 in Android System WebView workers.
// This file is prepended to pdf.worker.mjs by plugins/withPdfJs.js.
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
