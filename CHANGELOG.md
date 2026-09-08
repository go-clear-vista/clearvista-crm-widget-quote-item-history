# Changelog

All notable changes to this widget will be documented in this file.

## [1.3.2] - 2026-09-08

### Changed
- The Client Script no longer refuses to open the popup when it cannot read an
  identifier from the page. That check hid the useful information: the widget
  accepts `EntityId` from `PageLoad` too, and when it can identify nothing it
  echoes the payload it received - the only way to see what a popup-launched
  widget is actually given. The popup now always opens and the widget reports.
- The on-screen diagnostic carries up to 900 characters of payload and wraps
  and selects properly, so it can be copied out without console access.

## [1.3.1] - 2026-09-08

### Fixed
- The Client Script could not identify the quote. The button sits on the
  **edit** layout, where `ZDK.Page.getRecord()` exposes the form's field values
  but no record id, so every id form came back empty.
  - The script now also reads the quote **number** from the form, which is
    present on both the edit and detail layouts, and passes both identifiers.
  - The widget resolves a quote number to a record id with
    `ZOHO.CRM.API.searchRecord` before calling the backend, so the Deluge
    function's contract stays a plain record id and needs no change.
  - Verified across four cases: id present, number only, number not found, and
    an unsaved quote with neither.

## [1.3.0] - 2026-09-08

### Fixed
- "No quote record ID was supplied" when opened from the Client Script. A
  widget opened by `openPopup` does not receive `PageLoad`'s `EntityId`, and
  the script's single attempt at reading the record id returned empty, so
  nothing reached the widget.
  - The script now tries every known ZDK form for the record id and logs which
    one worked, and refuses to open the popup with an empty id rather than
    opening a widget that cannot load.
  - The widget searches the payload for any of `EntityId`, `entity_id`,
    `quote_id`, `record_id`, `recordId` or `id` holding a long numeric value,
    at any nesting depth, instead of assuming a shape. Verified against six
    payload shapes.
  - When no id is found, the on-screen error quotes the payload CRM sent, so
    the shape can be diagnosed without console access.

## [1.2.1] - 2026-09-08

### Changed
- Sized for the Client Script popup, now the intended way to open this widget:
  the card fills up to 1560px (was 1320px) and the table takes up to 64vh/640px
  of the taller window. Verified at 1450x860 - the card fills 1426px with no
  horizontal scrolling - and still clean in the 880px widget modal.

## [1.2.0] - 2026-09-08

### Removed
- The Description column. It repeated the same boilerplate on every row for a
  given item and cost 18% of the table width. The text is still in the data and
  is now the tooltip on the item name.

### Changed
- Nine columns are redistributed to fill the popup, and the table's floor drops
  from 1000px to 820px - so it fits Zoho's fixed widget modal with no
  horizontal scrolling. Verified clean at 1500, 1120, 940 and 880px.

### Added
- `client-script/see_historical_prices.js`, which opens this widget through
  `ZDK.Client.openPopup()` at 1450x860 for a larger box than the fixed
  widget-action modal allows, modelled on the org's Distributor Search script.
- The record id is resolved from `PageLoad`'s `EntityId`, `data.quote_id` in an
  `openPopup` payload, or `?id=` on the URL, so the widget works under either
  button shape. The PageLoad payload is logged to aid diagnosis.

## [1.1.1] - 2026-09-08

### Changed
- The resize attempt now tries `ZOHO.CRM.UI.Resize()` as well as
  `ZOHO.CRM.UI.Popup.resize()`, and logs what each call did, since which one a
  button honours depends on how the button was configured.
- Status and document-type pills wrap instead of forcing `nowrap`, so a pill
  cannot spill out of a narrow column.

### Documentation
- Added a "Popup width" section: a `widget`-action button renders in a fixed
  Zoho modal, while a `cscript` button opens a popup whose dimensions the script
  sets. Records that a Client Script must open the registered widget rather than
  a bare URL, or the page loses the Embedded App SDK and cannot reach CRM.

## [1.1.0] - 2026-09-08

### Added
- The widget widens its own popup on load via `ZOHO.CRM.UI.Popup.resize()`,
  sized from the screen (1120-1560px wide), so the ten columns fit without the
  CRM button configuration having to be generous. Failure is silent.

### Changed
- The table uses `table-layout: fixed` with percentage column widths, so the
  columns divide the popup exactly and text wraps in place instead of widening
  the table. Trimmed the page, cell and header padding, and gave the table more
  vertical room now that the popup is larger.

### Fixed
- All ten columns are visible without horizontal scrolling. Header cells carry
  `.c-num` for alignment, which also brought `white-space: nowrap` with it, so
  "Price After Discount" could not wrap and its sort arrow overflowed the table
  by 142px - forcing a horizontal scrollbar however wide the popup was.

## [1.0.8] - 2026-09-08

### Fixed
- A COQL query that failed on authorisation looked like an empty result. The
  endpoint returns an error body with no `data` key, which the loops read as
  zero rows, so a scope problem surfaced as "this quote has no line items".
  All three queries now report CRM's actual reply in the banner when `data` is
  absent, and the empty-items warning names the quote id it queried.

### Documentation
- Recorded that the connection must carry **`ZohoCRM.coql.READ`** specifically.
  `ZohoCRM.modules.ALL` does not cover the COQL endpoint, and a connection with
  broad module access but no `coql.READ` fails with `OAUTH_SCOPE_MISMATCH`.

## [1.0.7] - 2026-09-08

### Fixed
- The widget reported "no line items with a linked product" on quotes that
  plainly have them. `zoho.crm.getRecordById` returns a quote's own fields but
  not its subform rows, so `Quoted_Items` came back empty. The line items are
  now read over COQL against the `Quoted_Items` module - the same path the
  history already used - and a failure there is reported in the banner rather
  than looking like an empty quote.

## [1.0.6] - 2026-09-08

### Added
- The widget explains `NOT_ACTIVE`, which CRM returns when the function exists
  but has REST API switched off, rather than falling through to a generic
  message. Comparing the function against the working `stage_update` shows the
  difference as `rest_api_mode: ["None"]` versus `["Oauth","ZAPI"]`.

### Documentation
- Setup covers enabling REST API on the function, and records that Zoho
  registers the argument as `quoteid` with the underscore stripped - the widget
  sends `quote_id` and CRM normalises them, as the Receive PO widget already
  relies on.

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
