# Architecture and Data Flow

## Design goals

Statement to Excel Kenya is frontend-only and offline-capable. Its main constraints
are:

1. Financial documents and passwords remain on the device.
2. Password-protected PDFs open without a server.
3. Large statements do not block the React Native interface unnecessarily.
4. Parsed totals are checked before export.
5. Workbooks contain real date and number cells.

## Runtime layers

### Routes

Expo Router files under `app/` are thin entry points:

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | `HomeScreen` | Explanation and PDF selection |
| `/processing` | `ProcessingScreen` | File read, password flow, extraction and parsing |
| `/preview` | `PreviewScreen` | Summary, accuracy warning and transaction review |
| `/success` | `SuccessScreen` | Share again or start another conversion |
| `/error` | `ErrorScreen` | Recoverable conversion/export failures |

`app/_layout.tsx` provides `ConversionProvider`, stack navigation, the status bar,
and a final React error boundary.

### Session state

`ConversionContext` stores only the current conversion:

- selected document metadata;
- normalized transactions;
- derived summary;
- reconciliation result;
- generated workbook URI;
- user-facing error.

The summary is memoized from transactions. `reset()` clears everything. There is no
database or persistent conversion history.

## Conversion pipeline

```text
Android picker -> validated cached PDF -> Base64 read
     -> hidden local WebView + bundled pdf.js worker
     -> compact page messages -> provider detection
     -> provider-specific incremental parser
     -> summary + official-total reconciliation
     -> virtualized preview -> lazy SheetJS export -> Android share sheet
```

### Selection and cleanup

`pickStatementPdf()` requests one `application/pdf`, copies it to cache, accepts a
`.pdf` extension fallback, and rejects files over 20 MB.

`removeTemporaryStatement()` deletes only URIs under `Paths.cache`; it cannot delete
the user's original document. The cached PDF is deleted after successful parsing.
A failed/interrupted conversion can remain in cache until Android clears it.

### PDF engine

`PdfWebView` loads a one-pixel, non-interactive local page from:

```text
file:///android_asset/assets/pdfjs/
```

`plugins/withPdfJs.js` packages `pdf.mjs`, `pdf.worker.mjs`, and a compatibility
worker assembled from `assets/pdfjs/worker-polyfills.js` plus the upstream worker.
No CDN is used.

Compatibility shims support Android WebViews missing newer APIs such as typed-array
Base64/hex helpers, `Map.getOrInsertComputed`, `Promise.withResolvers`,
`Promise.try`, and Set operations.

React Native sends an `OPEN` command containing Base64 PDF data and an optional
password. Typed response messages are defined in `src/types/pdf.ts`.

### Incremental extraction

The WebView:

1. decodes Base64 into bytes;
2. opens the document with `pdf.js`;
3. extracts each page sequentially;
4. removes empty text items;
5. rounds X/Y positions to two decimals;
6. posts compact `[text, x, y]` tuples for one page;
7. cleans each page immediately;
8. reports completion and destroys the PDF.

This avoids a single huge bridge payload and avoids retaining every raw page in
React Native memory.

### Provider registry

`src/features/statements/providers/` defines the common provider contract and
registry. Each provider has an ID, names, support status, detection function, and
an incremental parser factory when supported.

M-PESA is supported through an adapter around its proven parser. Absa has a
dedicated parser for Txn Date, Description, User Narrative, Money Out, Money In,
and Balance. Co-operative Bank has a parser for Trans Date, Transaction Details,
Reference No, Value Date, Debit, Credit, and Book Balance, including wrapped
details. Both bank parsers reconcile against their official debit/credit totals.
KCB, NCBA, and Equity currently have detection markers and `supported: false`. A
recognized unsupported statement gets a provider-specific “coming soon” message
rather than being parsed with the wrong layout.

`createStatementParser()` buffers early pages until a provider is detected, creates
the correct parser, and replays buffered pages. This keeps `ProcessingScreen`
provider-neutral.

### M-PESA parser

`mpesaParser.ts`:

- groups positioned text with a three-unit Y tolerance;
- detects Paid In, Withdrawn, and Balance X anchors from table headers;
- recognizes receipt numbers, supported dates, statuses, and money;
- joins wrapped descriptions until the next transaction;
- skips repeated headers;
- uses column boundaries to classify amounts;
- falls back to ordered numeric values when anchors are unavailable;
- keeps legitimate paired entries sharing a receipt;
- removes only exact duplicate rows;
- sorts transactions chronologically;
- extracts official `TOTAL:` Paid In/Paid Out values.

The incremental M-PESA parser retains normalized transactions, exact-row signatures, and
declared totals—not every page's raw text.

### Accuracy reconciliation

`summarizeTransactions()` calculates count, date range, paid in, and absolute
withdrawn. `reconcileStatementTotals()` compares calculated and declared totals:

- `matched`: no banner; export enabled;
- `mismatch`: warning; export blocked;
- `unavailable`: warning; export allowed because no contradictory total exists.

The matched banner is intentionally hidden to reduce visual noise.

### Preview performance

`FlatList` renders transaction windows rather than the entire statement:

- initial batch: 8;
- maximum batch: 8;
- batch interval: 50 ms;
- window size: 5;
- clipped subviews removed.

The fixed export footer stays visible while list padding keeps the final row
reachable.

### Excel export

SheetJS loads only after export is requested. One animation frame is yielded first
so the loading indicator can render.

The `<provider> Transactions` worksheet contains:

1. Reference
2. Completion Time
3. Details
4. Transaction Status
5. Paid In
6. Withdrawn
7. Balance

Dates and amounts use proper cell types/formats. Column widths, autofilter, workbook
metadata, compression, and filename are configured:

```text
Statement_Excel_Kenya_<provider>_<start-date>_to_<end-date>.xlsx
```

Old cache files are deleted only when their names match the app-generated workbook
convention. The new workbook is written as bytes and shared through Android with
the XLSX MIME type.

## Performance tracing

`PerformanceTrace` measures development-only stages including file read, WebView
startup, Base64 decoding, worker mode, document open, per-page extraction/bridge/
parsing, SheetJS load, serialization, file write, and sharing.

Metrics are printed only when `__DEV__` is true. They are neither persisted nor
transmitted and contain counts/timings rather than statement text or passwords.

## Failure behavior

Expected failures route to a recoverable error screen:

- file cannot be read;
- PDF reader does not begin progress within 20 seconds;
- no extractable text;
- no recognizable transaction;
- `pdf.js` failure;
- workbook generation/sharing failure.

Wrong passwords remain in the modal and can be retried without a limit. Android
hardware Back is suppressed during processing. Unexpected render failures use the
root error boundary.

## Trust boundaries

- The hidden WebView runs packaged HTML/JavaScript and packaged PDF assets only.
- File URL access is required; remote navigation must never be added to this
  WebView.
- Only app-cache URIs qualify for automatic deletion.
- Sharing exposes a workbook only to the user-selected destination.
