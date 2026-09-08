// Client Script: See Historical Sale Price
// Module:  Quotes
// Trigger: Custom Button "See Historical Prices"
//
// WHY THIS EXISTS
// A custom button with action "widget" renders the page in Zoho's own fixed
// modal (roughly 880px wide), and neither ZOHO.CRM.UI.Resize() nor
// ZOHO.CRM.UI.Popup.resize() widens it. Opening the same registered widget
// from a Client Script lets openPopup set the dimensions, which is how the
// Distributor Search button gets a larger box.
//
// Set the button's action to this Client Script instead of the widget.
//
// IMPORTANT: api_name below must be the WIDGET's API name from
// Setup > Developer Space > Widgets - not the button's. If the popup opens
// empty or errors, that value is the first thing to check.
//
// It must be the registered widget rather than a bare URL: a URL popup has no
// Embedded App SDK, so no ZOHO.CRM.API or ZOHO.CRM.FUNCTIONS, and the widget
// could neither read the quote nor call quote_item_history.
//
// Sizing: 1450x860 fits all nine columns with room to spare. The widget also
// caps its card at 1560px, so a wider popup stays readable rather than
// stretching the table.

console.log("CS: See Historical Sale Price - opening Item History popup");

try {
  // The widget reads the record from PageLoad's EntityId, and also accepts
  // data.quote_id as a fallback, so the id is passed explicitly here too.
  var quoteId = null;
  try {
    var record = ZDK.Page.getRecord();
    if (record) {
      quoteId = record.get ? record.get("id") : (record.id || null);
    }
  } catch (idErr) {
    console.log("CS: Could not read the record id from the page: " + idErr);
  }
  console.log("CS: quote id resolved as " + quoteId);

  ZDK.Client.openPopup(
    {
      api_name: "See_Historical_Sale_Price",
      type: "widget",
      header: "See Historical Sale Price",
      animation_type: 1,
      close_icon: true,
      close_on_escape: true,
      height: "860px",
      width: "1450px",
      left: "center",
    },
    {
      data: {
        action: "item_history",
        quote_id: quoteId ? String(quoteId) : "",
      },
      wait: true,
    },
  );

  console.log("CS: Item History popup closed");
} catch (err) {
  // Closing the popup with the X rejects with widget_closed - not an error.
  if (err && err.toString().indexOf("widget_closed") !== -1) {
    console.log("CS: Item History closed by user");
  } else {
    console.error("CS: ERROR opening Item History popup: " + (err ? err.toString() : "unknown"));
    ZDK.Client.showMessage(
      "Could not open Item History: " + (err ? err.toString() : "unknown"),
      "error",
    );
  }
}
