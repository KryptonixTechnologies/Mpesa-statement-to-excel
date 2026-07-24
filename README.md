# M-PESA Statement to Excel

A privacy-first Android app that converts password-protected M-PESA PDF statements
into organized Excel workbooks. Files are decrypted, parsed, and exported entirely
on the user's device.

## What is included

- Native PDF selection and 20 MB validation
- Offline encrypted-PDF reading with a hidden `pdf.js` WebView
- Password retry and clear error states
- Defensive multi-page M-PESA transaction parsing
- Transaction totals and a virtualized preview list
- `.xlsx` generation with real date and number cells
- Native Android save/share sheet
- No accounts, backend, analytics, or network calls

## Project structure

```text
app/                         Expo Router routes
plugins/                     Expo native build plugins
src/
  components/                Shared interface components
  features/
    conversion/
      components/            Password and conversion UI
      pdf/                   Hidden pdf.js bridge
      screens/               Home, processing, and error screens
      services/              File selection and M-PESA parser
    preview/
      components/            Summary and transaction rows
      screens/               Statement preview
      services/              Summary calculations
    export/
      screens/               Completion screen
      services/              Excel creation and sharing
  theme/                     Colors and spacing
  types/                     Shared data contracts
```

## Run locally

Requirements: Node.js, Android Studio/SDK, and an Android emulator or device.

```bash
npm install
npm run android
```

This app uses a custom native build because its bundled `pdf.js` files must be
available to the Android WebView. Expo Go is therefore not supported. The
`withPdfJs` config plugin automatically packages the reader during prebuild.

## Verification

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform android
```

## Privacy

The app does not send statements, passwords, transactions, or usage information
anywhere. Selected files remain in the app's temporary local storage, and exported
workbooks are shared only through the destination chosen by the user.

## Current scope

Version 1 targets Android and text-based M-PESA PDF statements. Image-only or
scanned PDFs are detected and rejected with a helpful message. Transaction editing,
CSV export, accounts, cloud sync, advertising, and analytics are intentionally out
of scope.
