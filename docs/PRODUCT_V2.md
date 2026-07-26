# Statement to Excel Kenya — Multi-Provider Product Direction

## Vision

Statement to Excel Kenya is a privacy-first Android utility that converts supported
Kenyan mobile-money and bank PDF statements into normalized Excel workbooks without
uploading financial data.

## Provider roadmap

| Provider | Product status | Engineering status |
| --- | --- | --- |
| M-PESA | Available | Parser, totals reconciliation, preview and export complete |
| KCB Bank | Planned | Provider detection registered; parser needs samples |
| Co-operative Bank | Available | Parser, wrapped rows and total-value reconciliation verified |
| Absa Bank Kenya | Available | Parser and debit/credit reconciliation verified |
| NCBA Bank | Planned | Provider detection registered; parser needs samples |
| Equity Bank | Planned | Provider detection registered; parser needs samples |

“NCBK” from the initial feedback has been interpreted as **NCBA Bank**. Confirm this
with users before treating it as final research scope.

## Product principles

1. On-device processing remains non-negotiable.
2. A provider is never marked supported before accuracy fixtures pass.
3. The app must detect a known unsupported bank and explain that support is coming.
4. Export is blocked when parsed values contradict official statement totals or
   balances.
5. Provider-specific parsing is isolated behind a common interface.
6. No real customer statement or password enters source control.

## Normalized model

The current transaction contract remains compatible with M-PESA:

- reference/receipt number;
- completion date/time;
- description;
- status;
- paid in/credit;
- withdrawn/debit;
- running balance.

Before the first bank parser is finalized, extend the model carefully for:

- provider ID;
- account/currency metadata;
- optional value date versus posting date;
- bank-specific transaction code;
- opening/closing balance evidence.

Avoid provider-specific columns in the shared core unless they are optional or can
be represented in a metadata structure.

## Provider interface

Each provider supplies:

- stable ID and display/short names;
- detection logic based on statement text;
- support status;
- an incremental parser when supported;
- declared-total or balance evidence when its format provides it.

The registry owns provider ordering. Strong signatures should appear before generic
bank-name matches to prevent transaction descriptions from causing false detection.

## Adding a bank

For each provider:

1. Collect several authorized statements from different periods/account types.
2. Anonymize fixtures; never commit originals.
3. Document password behavior and layout versions.
4. Define strong provider detection markers.
5. Implement an incremental parser adapter.
6. Normalize credits, debits, dates, references and balances.
7. Extract opening/closing balances and declared totals where possible.
8. Add unit fixtures for wrapping, fees, reversals, and page headers.
9. Test small and long statements on a physical phone.
10. Mark the provider supported only after reconciliation is reliable.

## Recommended implementation order

1. Stabilize the common provider architecture with M-PESA.
2. KCB Bank.
3. Equity Bank.
4. Co-operative Bank.
5. Absa Bank Kenya.
6. NCBA Bank.

The order can change based on sample availability and user demand. One accurate bank
parser is more valuable than five partially correct parsers.

## Sample requirements

Prefer at least three anonymizable originals per bank:

- protected and unprotected where available;
- short and long periods;
- different account types/layout versions;
- credits, debits, fees, reversals, interest, and multi-line descriptions;
- clear opening/closing balance or summary evidence.

Samples remain local during development. Synthetic coordinate fixtures derived from
the layouts—not the statements themselves—belong in automated tests.

## Rebranding compatibility

The visible name, Expo slug, and URL scheme have changed to Statement to Excel
Kenya. The Android application ID remains `com.mpesa.statementtoexcel` temporarily
to preserve installation/update continuity for existing testers. Decide whether to
adopt a new package ID before the first Google Play release; it cannot be changed
after publication without creating a separate Play Store app.
