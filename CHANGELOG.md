# Changelog

All notable changes to this widget will be documented in this file.

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
