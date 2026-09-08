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
// api_name must be the WIDGET's API name from Setup > Developer Space >
// Widgets ("See_Historical_Sale_Price"), not the button's. It must be the
// registered widget rather than a bare URL: a URL popup has no Embedded App
// SDK, so no ZOHO.CRM.API or ZOHO.CRM.FUNCTIONS, and the widget could neither
// read the quote nor call quote_item_history.
//
// Sizing: 1450x860 fits all nine columns with room to spare. The widget caps
// its card at 1560px, so a wider popup stays readable.

console.log("CS: See Historical Sale Price - opening Item History popup");

// A widget opened by openPopup does NOT receive the record through PageLoad's
// EntityId, so the id has to be passed in the data payload. ZDK exposes it
// differently across versions, so try each known form and log which one won -
// the widget shows an error naming this file if all of them come back empty.
function resolveQuoteId() {
  var attempts = [
    ["ZDK.Page.getRecord().get('id')", function () {
      var r = ZDK.Page.getRecord();
      return r && r.get ? r.get("id") : null;
    }],
    ["ZDK.Page.getRecord().getValues().id", function () {
      var r = ZDK.Page.getRecord();
      var v = r && r.getValues ? r.getValues() : null;
      return v ? v.id : null;
    }],
    ["ZDK.Page.getRecord().id", function () {
      var r = ZDK.Page.getRecord();
      return r ? r.id : null;
    }],
    ["ZDK.Page.getField('id').getValue()", function () {
      var f = ZDK.Page.getField ? ZDK.Page.getField("id") : null;
      return f && f.getValue ? f.getValue() : null;
    }],
    ["ZDK.Page.getRecordId()", function () {
      return ZDK.Page.getRecordId ? ZDK.Page.getRecordId() : null;
    }],
  ];

  for (var i = 0; i < attempts.length; i++) {
    try {
      var value = attempts[i][1]();
      console.log("CS: " + attempts[i][0] + " -> " + JSON.stringify(value));
      if (value) return String(value);
    } catch (err) {
      console.log("CS: " + attempts[i][0] + " threw " + err);
    }
  }
  return "";
}

try {
  var quoteId = resolveQuoteId();
  console.log("CS: quote id resolved as '" + quoteId + "'");

  if (!quoteId) {
    ZDK.Client.showMessage(
      "Could not read this quote's record id, so item history cannot be loaded. Save the quote first, then try again.",
      "error",
    );
  } else {
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
          quote_id: quoteId,
          record_id: quoteId,
          EntityId: quoteId,
        },
        wait: true,
      },
    );
    console.log("CS: Item History popup closed");
  }
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
