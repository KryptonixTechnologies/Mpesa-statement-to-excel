# Testing and Accuracy

## Automated checks

```bash
npm run typecheck
npm test
npx expo export \
  --platform android \
  --dev \
  --clear \
  --output-dir /tmp/mpesa-export-check
```

Tests cover compact bridge tuples, parsing, repeated headers, exact duplicates,
paired same-receipt rows, unrelated PDFs, ISO dates, incremental pages, PDF totals,
summary calculations, reconciliation states, and workbook cache policy.

## Manual acceptance matrix

| Scenario | Expected result |
| --- | --- |
| Valid unprotected statement | Parse, reconcile, preview, export |
| Protected/correct password | Unlock and continue |
| Incorrect password repeatedly | Inline warning; unlimited retry |
| Cancel modal/picker | Return safely/no error |
| Non-PDF or over 20 MB | Clear rejection |
| Unrelated text PDF | No-transactions error |
| Scanned/image-only PDF | No-readable-text error |
| Large multi-page statement | Progress and responsive preview |
| Repeated header | Header excluded |
| Duplicate boundary row | Exact duplicate once |
| Paired same receipt | Both legitimate rows remain |
| Totals match | No banner; export enabled |
| Totals mismatch | Warning; export disabled |
| Totals unavailable | Warning; export allowed |
| Share cancelled/repeated | App remains stable |
| Convert another | Session resets |
| Airplane mode | Conversion/export work |

## Accuracy procedure

1. Record the official statement period and `TOTAL` Paid In/Paid Out.
2. Convert the PDF.
3. Compare preview count/date range with detailed rows.
4. Confirm preview totals match the PDF summary.
5. Spot-check first, middle, and final transactions.
6. Include paired Fuliza/overdraft receipts.
7. Open the workbook in Excel or LibreOffice.
8. Check all seven columns, ordering, types, filters, and filename.
9. Independently sum Paid In and Withdrawn.
10. Repeat on a physical ARM64 phone.

Differences are compared at cent precision using a tolerance below half a cent.
Only a proven mismatch blocks export; unavailable declared totals produce a warning.

## Safe parser fixtures

Never commit real statements or personal data. Use minimal synthetic
`PdfTextItem[]` with invented receipts, dates, descriptions, values, and
representative coordinates. Every layout fix should add a regression test.

## APK verification

```bash
APK=android/app/build/outputs/apk/release/app-release.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose --print-certs "$APK"
"$ANDROID_HOME/build-tools/36.0.0/aapt" dump badging "$APK"
unzip -Z1 "$APK" | sed -n 's#^lib/\\([^/]*\\)/.*#\\1#p' | sort -u
unzip -Z1 "$APK" | grep 'assets/index.android.bundle'
sha256sum "$APK"
```

Confirm package, version, SDKs, signer, intended ABI, bundled JavaScript, and
checksum before sharing.
