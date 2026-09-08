# Changelog

All notable changes to this widget will be documented in this file.

## [1.0.5] - 2026-09-08

### Fixed
- The backend would not compile: `connection:` on an `invokeurl` was given the
  `CRM_CONNECTION` String variable, and Deluge requires a literal, rejecting it
  with "The 'connections' value of the 'invokeUrl' task is of type 'STRING'
  which does not match the required data type 'CONNECTION LINKNAME'". The
  connection link name is now a quoted literal in both `invokeurl` blocks and
  the unused variable is gone.

### Changed
- `BOOKS_ORG_ID` ships with this org's Books organization ID rather than blank,
  so the pasted function needs no edits to return Books data.

## [1.0.4] - 2026-09-08

### Fixed
- The backend would not compile: Deluge has no `while` loop, so the editor
  rejected the COQL paging block with "no viable alternative at input
  'try ... while ...'". Paging now walks a fixed `pageOffsets` list and stops
  early once `more_records` is false, which caps the CRM quote history at
  10 pages x 200 rows = 2000 line items. `MAX_HISTORY_PAGES` is gone.

### Documentation
- Added a "Deluge notes" section recording the language limits that shape this
  function, so they are not rediscovered the hard way.
- Corrected the troubleshooting entry for "no viable alternative at input
  'string ...'": that error is a category mismatch on line 1, not a `void`
  return type.

## [1.0.3] - 2026-09-08

### Changed
- The backend uses `automation` as its category on line 1, matching how the
  function is created in this org, and documents that this one word must match
  the function's configured Category.
- All `/* ... */` block comments became `//` line comments and the header
  comment was condensed, to keep the syntax the editor has to parse minimal.

### Documentation
- Setup and troubleshooting now call out that leaving Return Type as `void`
  makes the editor reject line 1 with "no viable alternative at input
  'string ...'", since it validates the declared return type against that
  setting.

## [1.0.2] - 2026-09-07

### Fixed
- The backend would not save in Zoho's function editor, which rejected it with
  "Improper code format". The editor accepts exactly one function per
  definition and requires the signature to be its first line, but the file
  shipped three functions behind a leading block comment. `quote_item_history`
  is now a single self-contained function with its signature on line 1: the
  quote-header lookup is inlined as a batched loop, and the JSON sanitising is
  a single pass over the assembled rows rather than a helper called per field.

### Changed
- Setup instructions now spell out the editor configuration that the signature
  is validated against - Return Type **String** (not the default `void`) and a
  `quote_id` String argument - and cover the "Improper code format" error.

## [1.0.1] - 2026-09-06

### Fixed
- Actionable errors when the backend call fails. CRM answers a failed
  `FUNCTIONS.execute` with its own error envelope, so a missing function
  surfaced in the widget as the bare API text "invalid data". The widget now
  recognises `INVALID_DATA`, `NOT_FOUND`, `NO_PERMISSION` and `INTERNAL_ERROR`
  and says what to do about each, and logs the raw response to the console.
- Invalid JSON from the backend. The response is assembled with
  `Map.toString()`, which does not escape characters that are structural in
  JSON - inch marks in product names and quote subjects (65" display, Sony 98"
  Panels) and hard line breaks in the multi-line Description field would each
  produce output the widget could not parse. Free-text values now pass through
  a `quote_item_history_clean` helper, and the widget reports unparseable
  output explicitly instead of failing obscurely.

## [1.0.0] - 2026-09-06

### Added
- Initial Item History widget, launched from a sales quote
- Item Name filter as a checklist of every item on the current quote, with
  Select all / Clear all
- Document Type filter as a checklist: Sales Quote (CRM), Sales Order (Books),
  Sales Invoice (Books)
- Timeframe filter: All, Last 3 months, Last 6 months, Last 12 months
- Live table with item name, description, item notes, doc type, date, account
  name, stage/status, item price, discount and price after discount
- Sortable columns, defaulting to newest document first
- Colour-coded document type and stage/status pills, reusing the colour map from
  the Receive PO and Quote Closed Won widgets
- Quote reference line at the bottom naming the sales quote being referenced
- Close button
- `quote_item_history` Deluge backend: COQL over the `Quoted_Items` subform
  module for CRM quote history, plus Zoho Books Sales Orders and Invoices
  resolved by `item_id`
- Standalone preview mode with sample data when opened outside Zoho CRM

### Technical
- Per-unit pricing convention: `Price After Discount` is derived as
  `Total_After_Discount / Quantity` rather than trusting a stored unit price
- Single backend call per launch; all filtering is client-side so the table is live
- Non-fatal degradation - the CRM quote history still renders if the Books
  configuration or the COQL connection is missing, with the reason surfaced in a banner
