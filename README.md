# ClearVista CRM Widget - Quote Item History

A custom Zoho CRM widget, launched from a sales quote, that shows the purchase and
pricing history for the items on that quote across **CRM sales quotes**, **Zoho Books
sales orders** and **Zoho Books sales invoices**.

Built to match the look and feel of the other ClearVista CRM widgets
(`clearvista-crm-widget-receive-po`, `clearvista-crm-widget-quote-closed-won`).

## Features

- **Item Name filter** - a checklist of every item on the current quote; toggle each
  item on/off, with Select all / Clear all shortcuts
- **Document Type filter** - a checklist for Sales Quote (CRM), Sales Order (Books)
  and Sales Invoice (Books)
- **Timeframe filter** - All, Last 3 months, Last 6 months, Last 12 months
- **Live table** - re-filters and re-sorts instantly as the filters change; no reload
- **Sortable columns** - click any column header to sort; defaults to newest first
- **Colour-coded pills** - document type and stage/status use the same colour map as
  the other ClearVista widgets, extended with Books statuses
- **Quote reference line** - states which sales quote number is being referenced
- **Close button** - closes the widget popup

## Table columns

| Column | Source |
| --- | --- |
| Item Name | `Quoted_Items.Product_Name` (CRM) / line item SKU (Books) |
| Description | `Quoted_Items.Description` / Books line `description` |
| Item Notes | `Quoted_Items.Item_Notes` (CRM only - Books lines have no equivalent) |
| Doc Type | Sales Quote / Sales Order / Sales Invoice, with the document number beneath |
| Date | Quote `Date_created_on_document`, or the Books document `date` |
| Account Name | Quote `Account_Name`, or the Books `customer_name` |
| Stage / Status | Quote `Quote_Stage`, or the Books document `status` |
| Item Price | Per-unit list price (`List_Price` / Books `rate`) |
| Discount | Line discount amount, with the effective percentage beneath |
| Price After Discount | **Per-unit** price after discount |

### Pricing convention

`Item Price` and `Price After Discount` are both **per unit**, so prices are directly
comparable across documents. Per the costing convention in the CRM repo's `CLAUDE.md`,
the per-unit discounted price is derived as `Total_After_Discount / Quantity` rather
than trusting a stored unit price, because `Item Price` is sometimes a pre-discount
list price. The `Discount` column shows the amount as stored on the line, with the
effective percentage of the gross line total beneath it.

## Architecture

```
index.html                      # Widget UI (HTML + CSS + vanilla JS, no build step)
functions/quote_item_history.dg # Deluge backend that gathers the history
```

The widget reads the launching quote with `ZOHO.CRM.API.getRecord` for the quote
number, then calls the `quote_item_history` Deluge function once via
`ZOHO.CRM.FUNCTIONS.execute`. That single call returns the whole dataset, and all
three filters are then applied client-side - which is what makes the table live.

The backend gathers data from two places:

1. **CRM sales quotes** - a COQL query against the `Quoted_Items` subform module for
   every product on the current quote, then a second COQL query for the parent quote
   headers (number, account, stage, document date).
2. **Zoho Books** - the Books `Items` endpoint resolves each CRM SKU to a Books
   `item_id`, then the Sales Orders and Invoices list endpoints are filtered by that
   `item_id` so only relevant documents are read in detail for line-level pricing.

Failures are non-fatal and surfaced in a "Heads up" banner: if the Books side is not
configured yet, the CRM sales quote history still renders.

## Installation in Zoho CRM

### 1. Deploy the widget

Enable GitHub Pages on this repository (Settings → Pages → Deploy from a branch →
`main` / root). The widget URL is then:

```
https://go-clear-vista.github.io/clearvista-crm-widget-quote-item-history/
```

### 2. Deploy the backend function

**This step is required - the widget cannot load anything without it.** If the
function is missing, the widget reports that the function was not found.

Go to Setup → Developer Hub → Functions → New Function and configure it
**before** pasting any code, because Zoho validates the signature against these
settings:

| Setting | Value |
| --- | --- |
| Function Name / API Name | `quote_item_history` |
| Category | `automation` (must match the category word on line 1 of the code) |
| Return Type | **String** - not the default `void` |
| Argument | `quote_id`, type **String** |

The Return Type is the one that bites: if it is left as `void`, the editor
rejects line 1 with *"no viable alternative at input 'string ...'"*, because it
validates the declared return type against this setting. Change it with the
pencil icon next to the function name.

Then replace the editor's contents with **all** of `functions/quote_item_history.dg`
and save. The file is one single function whose signature is its first line,
which is the format the editor requires:

```
string automation.quote_item_history(String quote_id)
{ ... }
```

The category word must match the function's configured Category - `automation`
for a function created this way, `standalone` for older ones such as
`stage_update`. Only that one word changes.

> **If you see "Improper code format":** the editor accepts exactly one function
> per definition and the signature must be the first thing in it. Make sure you
> pasted the whole file (starting at `string standalone.quote_item_history`),
> that nothing precedes that line, and that Return Type is set to String.

Then set the two configuration constants at the top of `quote_item_history`:

| Constant | Purpose |
| --- | --- |
| `CRM_CONNECTION` | Name of a CRM connection with the `ZohoCRM.coql.READ` scope (Setup → Developer Hub → Connections). Required for the sales quote history. |
| `BOOKS_ORG_ID` | Your Zoho Books organization ID. Leave blank to launch with CRM quotes only; the widget will say so in its banner. |

### 3. Create the button

- Go to Setup → Customization → Modules and Fields → Quotes → Links and Buttons
- Create a button named **Item History**
- **Action**: Widget → the Pages URL above
- **Placement**: View Layout (quote detail page)
- Recommended popup size: **1350 × 720** so all ten columns are visible without
  horizontal scrolling (the table scrolls horizontally in narrower popups)
- Assign the profiles and Quote layouts that should see the button

## API requirements

- Read: `Quotes` and the `Quoted_Items` subform module
- Read: `Products` (via the quote's product lookups)
- COQL read access via the configured CRM connection
- Zoho Books read access to Items, Sales Orders and Invoices

The widget performs **no writes** - it is read-only.

## Testing

### Standalone preview

Open `index.html` directly in a browser. The Zoho SDK never fires `PageLoad` outside
CRM, so after a short delay the widget renders representative sample data and says so
in its banner. Useful for reviewing layout and filter behaviour without a CRM record.

### In CRM

1. Open a quote that has line items with linked products
2. Click the **Item History** button
3. Confirm the reference line at the bottom shows the correct sales quote number
4. Toggle items, document types and timeframes and confirm the table updates instantly
5. Confirm Books rows appear once `BOOKS_ORG_ID` is set

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "The quote_item_history function was not found in CRM" | The Deluge function has not been created yet - see step 2. This is what CRM's raw `INVALID_DATA` response means. |
| "Improper code format" when saving the function | The signature must be the first line and only one function may be defined |
| "no viable alternative at input 'string ...'" | Return Type is still `void` - set it to String in the function settings |
| "returned output that is not valid JSON" | A free-text value reached the response without passing through `quote_item_history_clean`; check the function log |
| Banner: "Sales quote history could not be loaded" | `CRM_CONNECTION` is missing, misnamed, or lacks the `ZohoCRM.coql.READ` scope |
| Banner: "Zoho Books sales orders and invoices are not included" | `BOOKS_ORG_ID` is still blank in the function |
| Table shows quotes but no orders/invoices | The CRM SKU has no matching Books item, or the Books item has no documents in the selected timeframe |
| "No item history found" | None of this quote's products appear on any other document yet |
| Widget shows sample data inside CRM | The Embedded App SDK could not load - check that `live.zwidgets.com` is reachable |
| Last columns cut off | Increase the widget popup width, or scroll the table horizontally |

## Browser compatibility

Chrome/Edge, Firefox, Safari (current versions) and mobile browsers. No build step
and no dependencies beyond the Zoho Embedded App SDK.

## License

Internal use only - ClearVista employees.

## Version

- **Version**: 1.0.3
- **Last Updated**: September 2026
- **Compatibility**: Zoho CRM (All Plans) + Zoho Books
