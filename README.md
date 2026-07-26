# M-PESA Statement to Excel

A privacy-first Android application that converts original, text-based M-PESA PDF
statements into organized Excel workbooks. PDF decryption, transaction extraction,
accuracy checks, workbook creation, and temporary-file cleanup all run locally on
the device.

> This is an independent community utility. It is not affiliated with or endorsed
> by Safaricom PLC.

## Current status

Version `1.0.0` implements the complete Android conversion flow:

- Select one PDF, with file-type and 20 MB size validation.
- Open password-protected statements and retry incorrect passwords.
- Extract all pages with a bundled offline `pdf.js` worker.
- Parse known M-PESA detailed-statement columns defensively.
- Preserve legitimate paired rows that share a receipt number.
- Reconcile parsed money-in and money-out totals against the PDF summary.
- Preview hundreds of transactions with a virtualized list.
- Block export when declared and parsed totals disagree.
- Generate a formatted `.xlsx` workbook and open Android's share/save sheet.
- Remove successfully processed temporary PDFs and stale generated workbooks.
- Report unexpected React errors through an in-app error boundary.

The app has no backend, login, advertisements, analytics, or cloud sync. Android is
the supported platform. Expo Go and the browser are not supported conversion
targets.

## User flow

1. Tap **Choose M-PESA statement**.
2. Select an original M-PESA PDF statement.
3. Enter the PDF password if requested.
4. Wait while pages are read and transactions are organized.
5. Review the date range, totals, and parsed transaction rows.
6. Resolve any accuracy warning. Export is disabled when totals differ.
7. Tap **Create Excel file**.
8. Save or share the workbook using Android's native share sheet.

Scanned PDFs, screenshots, unrelated PDFs, unreadable files, and statements with no
recognized transaction rows produce a clear error instead of an empty export.

## Technology

- Expo SDK 57 and React Native 0.86
- React 19 and TypeScript 6 in strict mode
- Expo Router for file-based navigation
- `react-native-webview` and locally bundled `pdfjs-dist`
- `expo-document-picker` and `expo-file-system`
- SheetJS (`xlsx`) for workbook generation
- `expo-sharing` for Android's native share sheet
- Vitest for unit tests
- Hermes and React Native's New Architecture

## Requirements

- Linux, macOS, or Windows development computer
- Node.js 24 is the currently verified local version
- npm
- Android Studio with Android SDK Platform 36, Build-Tools 36.0.0,
  Platform-Tools, and Android Emulator
- JDK 21; Android Studio's bundled JBR is supported
- A physical Android device or x86_64 emulator

The Android application requires Android 7.0/API 24 or newer and currently targets
API 36.

## Install dependencies

```bash
npm install
```

Example environment configuration for the machine used during development:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/Downloads/android-studio-quail2-linux/android-studio/jbr"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Confirm the paths before adding equivalent lines to `~/.bashrc`:

```bash
java -version
adb version
adb devices
```

## Run the development app

Start an Android emulator first, then:

```bash
npm run android
```

This creates/installs the custom development build and starts Metro. Subsequent
sessions can normally use:

```bash
npm start
```

Press `a` in the Expo terminal to open Android and `r` to reload.

This project cannot use Expo Go because native Android assets contain the local
`pdf.js` engine and compatibility worker. `plugins/withPdfJs.js` packages those
assets during prebuild.

## Quality checks

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform android --dev --clear --output-dir /tmp/mpesa-export-check
```

The current suite covers parsing, duplicate handling, ISO-style dates, incremental
pages, compact bridge items, summary calculation, totals reconciliation, and
generated-workbook cache policy.

## Release artifacts

Build a local release APK:

```bash
cd android
NODE_ENV=production ./gradlew assembleRelease
```

Build only for a modern physical phone:

```bash
cd android
NODE_ENV=production ./gradlew assembleRelease \
  --no-daemon \
  --max-workers=1 \
  "-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=768m" \
  -PreactNativeArchitectures=arm64-v8a
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The local `release/` directory may contain generated APK/ZIP test artifacts. These
are build outputs, not source code.

The current release build uses the Android debug signing key. It is suitable only
for private testing and direct installation. Do not upload it to Google Play. A
permanent private upload key and signed Android App Bundle (`.aab`) are required
before store submission.

See [Android builds and distribution](docs/BUILD_AND_RELEASE.md) for architecture
selection, low-memory builds, verification, phone installation, ZIP sharing,
signing, and Google Play preparation.

## Project structure

```text
app/                         Expo Router route entry points
assets/pdfjs/                Worker compatibility polyfills
docs/                        Product and engineering documentation
plugins/withPdfJs.js         Packages pdf.js into Android assets
release/                     Local generated APK/ZIP artifacts (when present)
src/
  components/                Shared interface components
  features/
    conversion/
      components/            Password prompt
      pdf/                   Hidden WebView/pdf.js bridge
      screens/               Home, processing, and error screens
      services/              Document picker and M-PESA parser
    preview/
      components/            Summary, reconciliation, and transaction rows
      screens/               Virtualized transaction review
      services/              Summary and reconciliation logic
    export/
      screens/               Export success screen
      services/              Workbook generation, sharing, cache policy
  theme/                     Shared colors and spacing
  types/                     PDF bridge and transaction contracts
  utils/                     Local-only performance tracing
android/                     Generated/customized native Android project
product.md                   Original v1 product requirements
```

## Documentation

- [Product implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Testing and accuracy](docs/TESTING_AND_ACCURACY.md)
- [Android builds and distribution](docs/BUILD_AND_RELEASE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Privacy policy](docs/PRIVACY_POLICY.md)
- [Original product requirements](product.md)

## Privacy and security

- Statements and passwords are not transmitted by application code.
- The PDF engine is packaged with the application; no CDN is used.
- Passwords stay in component/WebView memory and are not persisted.
- Selected PDFs are copied into the app cache for processing.
- A successfully processed cached PDF is deleted immediately.
- A failed/interrupted conversion may leave a cache file until Android clears it.
- Generated workbooks live in app cache until the user chooses a destination.
- Old app-generated workbooks are removed before later exports.
- Development performance logs contain durations/counts, not statement content.

Although the generated Android manifest contains an internet permission inherited
from the Expo/React Native stack, the conversion pipeline has no remote API or
upload. Network behavior must be re-audited before each store release when
dependencies change.

Never commit real M-PESA statements, passwords, generated workbooks, signing keys,
or keystore passwords.

## Known limitations

- Android only.
- Original text-based M-PESA detailed statements only.
- Scanned/image-only statements are not OCRed.
- Future Safaricom layout changes may require parser updates.
- Transactions cannot be edited before export.
- Excel is the only export format.
- No persistent conversion history.
- No password recovery; the correct PDF password is required.
- A locally shared APK may trigger Android's unknown-app warning.

## License

Licensed under the [Apache License 2.0](LICENSE).
