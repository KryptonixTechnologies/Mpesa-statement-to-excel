const { withDangerousMod } = require("expo/config-plugins");
const { copyFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

/**
 * Copies pdf.js into Android's packaged assets. The hidden WebView can then use
 * the engine without a CDN, preserving the app's offline/privacy guarantee.
 */
module.exports = function withPdfJs(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const sourceRoot = join(projectRoot, "node_modules", "pdfjs-dist", "build");
      const targetRoot = join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets",
        "assets",
        "pdfjs",
      );

      mkdirSync(targetRoot, { recursive: true });
      copyFileSync(join(sourceRoot, "pdf.mjs"), join(targetRoot, "pdf.mjs"));
      copyFileSync(join(sourceRoot, "pdf.worker.mjs"), join(targetRoot, "pdf.worker.mjs"));
      return modConfig;
    },
  ]);
};
