M-PESA Statement to Excel Converter — Product Requirements (v1)
1. Overview

A free, frontend-only React Native (Expo) mobile app that lets users convert their M-PESA PDF statements into clean Excel spreadsheets — entirely on-device, no backend, no login, no payment. Positioned as a community utility tool.

2. Problem & Goal

M-PESA statements come as password-protected PDFs that are hard to analyze, budget from, or import into accounting tools. Goal: let anyone go from "PDF in hand" to "usable Excel file" in under a minute, with zero data leaving their phone.

3. Core User Journey

Step 1 — Landing / Home Screen

Simple screen: app explainer, "Upload Statement" button, maybe a "How it works" 3-step visual.
No account, no onboarding friction.

Step 2 — Upload PDF

expo-document-picker opens native file picker, filtered to PDFs.
Basic validation: is it actually a PDF, is it under a reasonable size (M-PESA statements are usually small, but cap at e.g. 20MB).
On success, file is copied into app's local sandbox storage (expo-file-system).

Step 3 — Password Prompt

App attempts to open the PDF via the pdf.js engine (hidden WebView).
pdf.js detects encryption → app shows a modal: "This statement is password protected. Enter your M-PESA statement password."
Small helper text explaining the common password format (varies — often ID number or a PIN set when requesting the statement).
Show/hide password toggle. Loading spinner while decrypt is attempted.
Wrong password: clear inline error, no crash, retry allowed, no attempt limit (avoid locking user out — it's their own file).

Step 4 — Decryption & Parsing

On correct password, pdf.js decrypts the document in the WebView context.
Two extraction tasks happen:
Text/data extraction: pull all text items with coordinates from every page.
Optional visual render: render page 1 (or a thumbnail) to canvas for a "yes this is my file" confidence check.
Parser groups text items into rows (by Y-position) and maps into columns (by X-position ranges) matching M-PESA's known statement layout: Receipt No, Completion Time, Details, Transaction Status, Paid In, Withdrawn, Balance.
Handles multi-page statements — concatenate rows across pages, skip repeated headers/footers.

Step 5 — Preview Screen

Show parsed transactions in a scrollable table (FlatList-based) — receipt no, date, description, amount in/out, balance.
Show a summary strip: total transactions found, date range, total money in/out.
Let user visually sanity-check before committing to export. No editing needed for v1 (view-only).
If parsing fails or returns 0 rows, show a clear error state rather than an empty table ("We couldn't read this statement's format — see options below") with a retry/report option.

Step 6 — Export to Excel

"Download Excel" button.
xlsx (SheetJS) builds a workbook in-memory from the parsed data — formatted columns, header row bolded, date/amount formatted as proper Excel types (not just text).
File is written to local storage via expo-file-system, then expo-sharing opens the native share/save sheet (save to Files, share to WhatsApp/email, etc.).
Filename convention: MPESA_Statement_<date-range>.xlsx.

Step 7 — Done State

Confirmation screen/toast: "Your Excel file is ready." Options: share again, convert another statement, or done.
4. Screen List
Home / Landing
Upload (native picker, no custom screen needed — just a trigger)
Password Modal
Processing/Loading (decrypt + parse)
Preview Table
Export/Share sheet (native)
Success/Done state
Error state (bad password loop excluded — that's inline; this is for unparseable files)
5. Technical Architecture
Framework: Expo (managed workflow + expo-dev-client, since a hidden WebView with injected JS needs custom native config beyond Expo Go)
PDF engine: pdf.js running inside a hidden/off-screen react-native-webview, communicating via postMessage (JS injected into the WebView calls pdf.js APIs; results sent back to RN)
File handling: expo-document-picker, expo-file-system
Excel generation: xlsx (SheetJS), output as base64 → written to file system
Sharing/saving: expo-sharing
State management: local component state / lightweight context — no need for Redux at this scale
No backend, no analytics server, no cloud storage — everything stays on-device
6. Data Model (in-app, ephemeral — nothing persisted beyond the session unless user chooses to)
Transaction {
  receiptNo: string
  date: DateTime
  details: string
  status: string
  paidIn: number | null
  withdrawn: number | null
  balance: number
}
7. Edge Cases to Handle
Wrong password entered multiple times
Non-M-PESA PDF uploaded (garbage/no matching layout) → graceful error, not a crash
Statement format changes (Safaricom has tweaked layouts before) → parser should be defensive, not assume rigid column pixel positions
Very large statements (12+ months) → test performance, may need to show a progress indicator during parse
Scanned/image-based PDF (no extractable text layer) → pdf.js can't extract text from this; detect and show a clear "this PDF isn't text-based, we can't process it" message rather than failing silently
User cancels file picker or password modal mid-flow
8. Non-Functional Requirements
Privacy-first messaging: since there's no backend, explicitly tell users "Your statement never leaves your device" — this is a major trust/adoption lever for a finance app
Works offline once installed (no network calls needed at all)
Reasonably fast: sub-5-second parse for a typical 1-3 month statement
Accessible: readable font sizes, decent contrast, works on low-end Android devices (large chunk of the target market)
9. Explicitly Out of Scope (v1)
Accounts/login
Payments, subscriptions, ads
Cloud sync or backup
Editing transactions before export
CSV export (Excel only, per your spec)
iOS (unless you want it — Play Store implies Android-first)
Analytics/tracking of any kind (fits the "no data leaves device" promise)
10. Store Readiness Notes
Since this handles financial data, Play Store's Data Safety form should truthfully state "no data collected" — this is a strong differentiator in reviews/trust once live
Consider a short privacy policy page (still just static text, no backend) since Play Store requires a privacy policy link for apps handling financial documents, even if you collect nothing