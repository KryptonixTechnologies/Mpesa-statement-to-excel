# Development Guide

## Setup

Install Node.js/npm and Android Studio. In SDK Manager install:

- Android SDK Platform 36;
- Build-Tools 36.0.0;
- Platform-Tools;
- Android Emulator;
- an x86_64 API 36 emulator image.

Example environment configuration:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/Downloads/android-studio-quail2-linux/android-studio/jbr"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Paths vary by installation. Validate them before editing `~/.bashrc`:

```bash
test -d "$ANDROID_HOME"
test -x "$JAVA_HOME/bin/java"
java -version
adb version
```

Install packages:

```bash
npm install
```

## Emulator

A Pixel 5 class x86_64/API 36 device is adequate. Use hardware graphics
acceleration and Quick Boot. On a 16 GB host, allocate about 3–4 GB to the virtual
phone. A 1 GB AVD can become unresponsive with a large statement.

Android Studio's “suggested 16384 MiB” warning refers to laptop/host RAM, not the
virtual phone RAM field.

Start the emulator and check:

```bash
adb devices
```

## Running

First native build or after native changes:

```bash
npm run android
```

Later JavaScript sessions:

```bash
npm start
```

Expo terminal controls:

- `a`: open Android;
- `r`: reload;
- `?`: commands;
- `Ctrl+C`: stop Metro.

If no development build is installed, run `npm run android`. If the development app
says “Unable to load script,” start Metro and reload. A release APK is standalone.

## Put a statement on the emulator

```bash
adb push "/absolute/path/to/statement.pdf" /sdcard/Download/
```

Select it from Downloads. Never commit the PDF or password.

## Native PDF assets

`plugins/withPdfJs.js` packages `pdfjs-dist` during prebuild. After changing the
plugin, worker polyfills, `pdfjs-dist`, or native Expo dependencies:

```bash
npx expo prebuild --platform android
npm run android
```

Review generated native changes before committing.

## Code organization

- Keep route files thin and feature screens under `src/features`.
- Keep shared contracts under `src/types`.
- Put parser/reconciliation/export logic in testable services.
- Prefer the `@/` import alias.
- Preserve strict TypeScript.
- Never log passwords or statement contents.
- Add a regression test for every parser-format correction.

## Commands

```bash
npm run typecheck
npm test
npm start
npm run android
npx expo install --check
npx expo export --platform android --dev --clear --output-dir /tmp/mpesa-export-check
```

Use `npx expo install <package>` for Expo packages. After dependency changes, check
versions, rebuild native assets when required, run tests/bundling, and verify a
release APK.

`pdfjs-dist` upgrades need special Android System WebView testing because new
JavaScript APIs may require compatibility shims in both bridge and worker.

## Performance debugging

Development logs identify stages:

```text
[performance] conversion.parser.page {"durationMs":...}
[performance] export.workbook.serialize {"durationMs":...}
```

Do not add transaction content to metric details. For Android memory/ANR checks:

```bash
adb shell dumpsys meminfo com.mpesa.statementtoexcel
adb shell dumpsys activity processes
```
