# Product Implementation Status

This maps the original `product.md` requirements to version `1.0.0`. The new
multi-provider direction is defined in `PRODUCT_V2.md`.

## Implemented

| Requirement | Implementation |
| --- | --- |
| Landing | Explanation, privacy copy, three-step flow, choose button |
| PDF picker | One PDF, cache copy, type and 20 MB checks |
| Password | Show/hide, retry, inline error, cancel |
| On-device decryption | Bundled offline `pdf.js` WebView |
| Multi-page extraction | Sequential page extraction with progress |
| M-PESA parser | Coordinates, anchors, wrapping, defensive fallback |
| Provider foundation | Registry, detection, common parser session and M-PESA adapter |
| Headers/duplicates | Repeated-header skipping and exact-row signatures |
| Preview | Summary plus virtualized transaction list |
| Accuracy | Parsed totals reconciled with official PDF totals |
| Excel | Typed dates/numbers, widths, formats, filter, metadata |
| Share/save | XLSX through Android native share sheet |
| Completion/errors | Success, retry, invalid/scan/runtime/export states |
| Privacy | No app backend, accounts, analytics, ads, or CDN |
| Cleanup | Successful PDF deletion and stale workbook cleanup |
| Performance | Worker, incremental bridge/parser, FlatList, lazy SheetJS |
| Resilience | Root React error boundary |
| Tests | Parser, bridge, summary, reconciliation, cache policy |
| Policy | Static privacy policy |

## Partial

| Area | Done | Remaining |
| --- | --- | --- |
| Accessibility | Roles, labels, readable sizing/contrast | Physical screen-reader/font-scale audit |
| Low-end performance | Major memory/list/bridge optimizations | Wider low-memory device benchmarks |
| Store readiness | Package/API/privacy docs/release build | Branding, signing, AAB, hosted policy/forms |
| Format resilience | Defensive parser/regression tests | More synthetic historical/future fixtures |
| Bank support | Absa and Co-op parsers/reconciliation; KCB, NCBA and Equity detection | Remaining provider parsers |

## Out of scope/not implemented

- Accounts, payments, ads, backend, cloud sync, analytics
- Editing, CSV, OCR, history, iOS
- Optional PDF page-one thumbnail from the PRD

The thumbnail was replaced by structured preview plus official-total
reconciliation, which checks exported data more directly.

## Release state

- Product name: Statement to Excel Kenya
- Package: `com.mpesa.statementtoexcel` (temporarily retained for tester compatibility)
- Version: `1.0.0` (`versionCode` 1)
- Minimum SDK: 24
- Target/compile SDK: 36
- ARM64 standalone APK: verified for private testing
- Signing: debug key; not Google Play ready
- Production signed `.aab`: pending

## Next milestones

1. Production branding and public support/privacy URLs.
2. Permanent upload key and secure backup.
3. Signed multi-ABI `.aab`.
4. Physical-device, accessibility, dependency and permission audits.
5. Google Play closed testing and declarations.
