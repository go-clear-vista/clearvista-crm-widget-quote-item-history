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
// Setup > Developer Space > Widgets - not the button's. Opening a bare URL
// instead of the registered widget would lose the Embedded App SDK, and with
// it ZOHO.CRM.API and ZOHO.CRM.FUNCTIONS, so the widget could not read the
// quote or call quote_item_history.

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
