# Troubleshooting

## SDK path missing or `adb ENOENT`

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
source ~/.bashrc
adb devices
```

## Java missing

```bash
export JAVA_HOME="$HOME/Downloads/android-studio-quail2-linux/android-studio/jbr"
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

Adjust paths to the actual installation.

## No development build installed

Start the emulator, confirm `adb devices`, then:

```bash
npm run android
```

`npm start` does not install the native development client.

## Unable to load script

The development build cannot find Metro:

```bash
npm start
```

Press `a` or reload. Release APKs do not use Metro.

## JavaScript API/runtime errors

Previously resolved examples include:

- `this.validatePath is not a function`;
- `hashOriginal.toHex is not a function`;
- `getOrInsertComputed is not a function`;
- `Cannot read property 'timeout' of undefined`.

The fixes include legacy Base64 file reading where required, WebView polyfills, a
compatibility PDF worker, correct `.mjs` bundling, and a root error boundary.

If errors return after upgrades:

1. perform a full native rebuild, not only fast refresh;
2. verify packaged `assets/pdfjs` inside the APK;
3. check Android System WebView;
4. inspect upstream `pdfjs-dist` requirements;
5. add a regression test/shim without logging document contents.

## Processing is slow

Progress should advance page by page. Before page progress begins, a 20-second
reader timeout applies. Confirm the PDF is original/text-based, the password is
correct, RAM is available, System WebView is current, and performance logs identify
the slow stage.

## Emulator/app not responding

- Allocate about 3–4 GB to the AVD on a 16 GB host.
- Close heavy programs.
- Enable hardware graphics acceleration.
- Cold boot/wipe a corrupt AVD.
- Close the emulator during local release builds.

The “suggested 16384 MiB” Android Studio warning refers to host RAM.

## Release build closes VS Code

Use one Gradle worker, one ABI, a 1 GB heap, 768 MB Metaspace, and the systemd
service documented in `BUILD_AND_RELEASE.md`.

`OutOfMemoryError: Metaspace` means Metaspace is too small. If
`compileReleaseArtProfile` fails after interrupted attempts, clear generated output:

```bash
cd android
./gradlew clean
```

Then rebuild.

## APK will not install

Check the ABI, Android 7/API 24 minimum, unknown-source permission, complete
download, and whether an installed copy has a different signature. For a precise
error:

```bash
adb install -r app-release.apk
```

## Drive cannot open the APK

Drive is attempting a document preview. Download a ZIP containing the APK, extract
it in the phone's Files app, and install the extracted APK.

## No readable text

The PDF is probably scanned/image-only. OCR is not included. Use the original
M-PESA PDF rather than a scan or screenshot.

## No transactions found

The PDF may be unrelated, summary-only, malformed, or use a changed layout. Do not
export guessed data. Reproduce the layout with anonymized synthetic test items and
update the parser defensively.

## Totals differ

Parsed Paid In/Withdrawn contradict the PDF's official total, so export is blocked.
Inspect missing/misclassified rows, paired Fuliza entries, boundaries, and anchors;
fix the parser and add a regression test.
