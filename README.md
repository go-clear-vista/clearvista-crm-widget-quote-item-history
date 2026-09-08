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
| Item Notes | `Quoted_Items.Item_Notes` (CRM only - Books lines have no equivalent) |
| _(Description)_ | Not a column - it repeats on every row for a given item and cost 18% of the table width. Kept in the data and shown as a tooltip on the item name. |
| Doc Type | Sales Quote / Sales Order / Sales Invoice, with the document number beneath |
| Date | Quote `Date_created_on_document`, or the Books document `date` |
| Account Name | Quote `Account_Name`, or the Books `customer_name` |
| Stage / Status | Quote `Quote_Stage`, or the Books document `status` |
| Item Price | Per-unit list price (`List_Price` / Books `rate`) |
| Discount | Line discount amount, with the effective percentage beneath |
| Price After Discount | **Per-unit** price after discount |

### Popup width

A custom button can open this page two ways, and only one of them lets you
choose the popup size:

| Button `action` | Sizing |
| --- | --- |
| `widget` | Zoho renders the page in its own fixed modal (roughly 880px wide). `ZOHO.CRM.UI.Resize()` and `ZOHO.CRM.UI.Popup.resize()` are called on load but a widget-action modal may ignore both. |
| `cscript` | A Client Script opens the popup and passes explicit `height`/`width`, so the size is yours to set. |

This org drives the button from `client-script/see_historical_prices.js`, which
opens the registered widget through `ZDK.Client.openPopup()` at **1450 x 860** -
the approach the `Distributor_Search` button uses. The card fills the popup up
to a 1560px cap. The nine columns also fit the fixed ~880px widget modal (they
need 820px), so the widget works under either button shape.

To switch the button over: Setup → Customization → Modules and Fields → Quotes →
Links and Buttons → **See Historical Prices**, change the action from Widget to
Client Script, and paste in `client-script/see_historical_prices.js`.

Opening a bare URL instead of the registered widget loses the Embedded App SDK
context, and with it `ZOHO.CRM.API` and `ZOHO.CRM.FUNCTIONS` - the widget would
have no way to read the quote or call its backend. The `api_name` in the script
must therefore be the **widget's** API name from Setup → Developer Space →
Widgets, not the button's.

The widget takes its record id from `PageLoad`'s `EntityId`, and also accepts
`data.quote_id` from the `openPopup` payload or `?id=` on the URL, so it works
under either button shape.

### Table layout

The table uses `table-layout: fixed` with percentage column widths, so the nine
columns always divide the popup exactly and text wraps inside its column rather
than widening the table. Below a 1000px `min-width` floor the table scrolls
horizontally instead of crushing (the floor is 820px). Cells carry `.c-num` for right alignment; note
that header cells must override the `white-space: nowrap` that class brings,
otherwise "Price After Discount" cannot wrap and pushes past the table edge.

### Deluge notes

Deluge is not JavaScript, and two limits shape this function:

- **No `while` loop.** The COQL paging walks a fixed `pageOffsets` list instead,
  capping the CRM quote history at 10 pages x 200 rows = 2000 line items.
- **`connection:` on an `invokeurl` must be a literal**, not a variable - Deluge
  rejects a String with *"does not match the required data type 'CONNECTION
  LINKNAME'"*. The connection link name is therefore hard-coded in all three
  `invokeurl` blocks; rename the connection and you must edit each by hand.
- **`getRecordById` does not return subform rows.** It returns the quote's own
  fields, so the line items are read over COQL against the `Quoted_Items`
  module instead. A quote that visibly has items but reports none is the
  symptom of reading the subform off the parent record.
- **One function per definition, signature on line 1.** Everything is inlined
  into the single function rather than split into helpers.

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

Set Return Type with the pencil icon next to the function name. The widget
reads the function's output, so a `void` function returns it nothing.

#### The connection needs `ZohoCRM.coql.READ`

Every query this function makes goes through the COQL endpoint, which requires
the **`ZohoCRM.coql.READ`** scope specifically. `ZohoCRM.modules.ALL` does *not*
cover it - a connection with broad module access but no `coql.READ` returns
`OAUTH_SCOPE_MISMATCH`, which reads as an empty result rather than an error.

Check the connection's scopes in Setup → Developer Hub → Connections; if
`coql.READ` is absent, edit the connection to add it and re-authorise.

**Then enable REST API on the function**, or the widget's call is rejected with
`NOT_ACTIVE`. Open the function in Setup → Developer Hub → Functions and switch
REST API on (OAuth). You can confirm it took by comparing against the existing
`stage_update` function, which reports `rest_api_mode: ["Oauth","ZAPI"]`; a
function that has never been exposed reports `["None"]`.

Zoho registers the argument with underscores stripped (`quoteid`), which is
expected - the widget sends `quote_id` and CRM normalises the two, exactly as
the Receive PO widget does with `stage_update`.

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

| Setting | Where | Purpose |
| --- | --- | --- |
| Connection link name | the `connection:` line of all three `invokeurl` blocks | A CRM connection carrying **`ZohoCRM.coql.READ`** (Setup → Developer Hub → Connections). Must be a literal. |
| `BOOKS_ORG_ID` | near the top of the function | Zoho Books organization ID. Set it to `""` to launch with CRM quotes only; the widget will say so in its banner. |

### 3. Create the button

- Go to Setup → Customization → Modules and Fields → Quotes → Links and Buttons
- Create a button named **Item History**
- **Action**: Widget → the Pages URL above
- **Placement**: View Layout (quote detail page)
- Popup size: see **Popup width** below - a widget-action button renders in a
  fixed Zoho modal that the SDK resize calls may not honour
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
| "exists but is not exposed to the API" (`NOT_ACTIVE`) | REST API is off for the function - enable it (OAuth) in the function's settings |
| "Improper code format" when saving the function | The signature must be the first line and only one function may be defined |
| "no viable alternative at input 'string ...'" (Line 1 or 3) | The category word on line 1 does not match the function's configured Category |
| "no viable alternative at input 'try ... while ...'" | Deluge has no `while` loop; fixed in 1.0.4 - make sure you are pasting the current file |
| "'connections' value ... does not match ... 'CONNECTION LINKNAME'" | `connection:` was given a variable; it must be a quoted literal - fixed in 1.0.5 |
| "returned output that is not valid JSON" | A free-text value reached the response without passing through `quote_item_history_clean`; check the function log |
| Banner: "Sales quote history could not be loaded" | The connection named in the `invokeurl` blocks is missing, misnamed, or lacks the `ZohoCRM.coql.READ` scope |
| Banner: "Zoho Books sales orders and invoices are not included" | `BOOKS_ORG_ID` is empty in the function |
| Table shows quotes but no orders/invoices | The CRM SKU has no matching Books item, or the Books item has no documents in the selected timeframe |
| "No item history found" | None of this quote's products appear on any other document yet |
| Banner: "No line items with a linked product were found" | Usually the connection is missing `ZohoCRM.coql.READ` - the banner beside it quotes CRM's reply, look for `OAUTH_SCOPE_MISMATCH` |
| Banner: "... CRM replied: ... OAUTH_SCOPE_MISMATCH" | Add `ZohoCRM.coql.READ` to the connection and re-authorise |
| Widget shows sample data inside CRM | The Embedded App SDK could not load - check that `live.zwidgets.com` is reachable |
| Last columns cut off | Increase the widget popup width, or scroll the table horizontally |

## Browser compatibility

Chrome/Edge, Firefox, Safari (current versions) and mobile browsers. No build step
and no dependencies beyond the Zoho Embedded App SDK.

## License

Internal use only - ClearVista employees.

## Version

- **Version**: 1.2.1
- **Last Updated**: September 2026
- **Compatibility**: Zoho CRM (All Plans) + Zoho Books
