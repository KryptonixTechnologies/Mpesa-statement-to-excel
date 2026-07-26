# Android Builds and Distribution

## Build types

Development build:

```bash
npm run android
```

It requires Metro and is not a standalone shareable app.

Local release APK:

```bash
cd android
NODE_ENV=production ./gradlew assembleRelease
```

It includes the JavaScript bundle and runs without Metro.

Google Play bundle:

```bash
cd android
NODE_ENV=production ./gradlew bundleRelease
```

An `.aab` is the store format, but it must not be submitted until permanent release
signing is configured.

## Architectures

| ABI | Target |
| --- | --- |
| `arm64-v8a` | Most modern physical Android phones |
| `armeabi-v7a` | Older 32-bit phones |
| `x86_64` | Standard desktop emulators |
| `x86` | Older emulators |

Modern-phone build:

```bash
cd android
NODE_ENV=production ./gradlew assembleRelease \
  --no-daemon \
  --max-workers=1 \
  "-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=768m" \
  -PreactNativeArchitectures=arm64-v8a
```

Use `x86_64` for the emulator. Omit the ABI override to build every configured ABI;
that takes longer and uses more memory.

## Stable builds on a 16 GB laptop

Close the emulator and unnecessary programs before release builds. One worker,
1 GB heap, and 768 MB Metaspace completed locally. A 384 MB Metaspace limit failed
during release lint.

If VS Code repeatedly closes, Linux/systemd users can detach the build:

```bash
systemd-run --user \
  --unit=statement-excel-phone-release \
  --collect \
  --working-directory="$PWD/android" \
  --setenv=NODE_ENV=production \
  --setenv=JAVA_HOME="$JAVA_HOME" \
  --setenv=ANDROID_HOME="$ANDROID_HOME" \
  --setenv=PATH="$PATH" \
  "$PWD/android/gradlew" \
  assembleRelease \
  --no-daemon \
  --max-workers=1 \
  "-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=768m" \
  -PreactNativeArchitectures=arm64-v8a
```

Monitor:

```bash
systemctl --user status statement-excel-phone-release.service
journalctl --user -u statement-excel-phone-release.service -f
```

Use a different unit name or wait for the collected unit to disappear before
starting it again.

## Outputs

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

## Verify and install

```bash
APK=android/app/build/outputs/apk/release/app-release.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs "$APK"
"$ANDROID_HOME/build-tools/36.0.0/aapt" dump badging "$APK" | head
unzip -Z1 "$APK" | sed -n 's#^lib/\\([^/]*\\)/.*#\\1#p' | sort -u
unzip -Z1 "$APK" | grep 'assets/index.android.bundle'
sha256sum "$APK"

adb devices
adb install -r "$APK"
adb shell monkey -p com.mpesa.statementtoexcel 1
```

An ARM64-only APK cannot install on an x86_64 emulator.

## Private sharing

The current debug-signed release APK is suitable for trusted private testers and
does not need Metro. Some cloud apps attempt to preview APKs and report “Unable to
open document.” ZIP it:

```bash
zip -9 Statement-to-Excel-Kenya-v1.0.0-arm64.zip \
  Statement-to-Excel-Kenya-v1.0.0-arm64.apk
unzip -t Statement-to-Excel-Kenya-v1.0.0-arm64.zip
```

The tester downloads the ZIP, extracts it in Files/Downloads, taps the APK, permits
installation from that source, and installs. Android may display unknown-source or
Play Protect warnings for an app distributed outside Google Play.

## Signing warning

`android/app/build.gradle` currently assigns `signingConfigs.debug` to release.
Therefore the signer is `CN=Android Debug`, suitable for private tests but not Play.

Before public distribution:

1. create a permanent upload keystore;
2. store and back it up outside Git;
3. expose credentials through uncommitted properties or protected CI secrets;
4. configure release signing;
5. increment `versionCode` for every upload;
6. build and verify a signed `.aab`;
7. enroll in Google Play App Signing.

Never commit keystores or their passwords.

## Google Play checklist

- Confirm package `com.mpesa.statementtoexcel`.
- Complete production icon, adaptive icon, and splash assets.
- Update version name/code.
- Configure/back up permanent signing.
- Build a signed physical-device `.aab`.
- Pass automated and physical-phone acceptance testing.
- Host the privacy policy at a public HTTPS URL.
- Complete current Data Safety and financial-feature declarations.
- Prepare description, screenshots, contact email, and support URL.
- Audit dependencies and final manifest permissions.
- Ensure no statements, passwords, logs, keys, or personal data are included.
- Complete closed testing before production.

Play requirements change; verify current Play Console instructions at submission.
