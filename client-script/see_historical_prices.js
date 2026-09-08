// Client Script: See Historical Sale Price
// Module:  Quotes
// Trigger: Custom Button "See Historical Prices"
//
// WHY THIS EXISTS
// A custom button with action "widget" renders the page in Zoho's own fixed
// modal (roughly 880px wide), and the SDK resize calls do not widen it.
// Opening the same registered widget from a Client Script lets openPopup set
// the dimensions, which is how the Distributor Search button gets a larger box.
//
// api_name must be the WIDGET's API name from Setup > Developer Space >
// Widgets ("See_Historical_Sale_Price"), not the button's. It must be the
// registered widget rather than a bare URL: a URL popup has no Embedded App
// SDK, so no ZOHO.CRM.API or ZOHO.CRM.FUNCTIONS.
//
// IDENTIFYING THE QUOTE
// A widget opened by openPopup does not receive PageLoad's EntityId, so the
// quote has to be named in the data payload. On the EDIT layout - where this
// button lives - ZDK.Page.getRecord() exposes the form's field values but no
// record id, so the id cascade below usually comes back empty. The quote
// NUMBER is on the form either way, and the widget resolves it to a record id
// itself, so that is the reliable identifier here.

console.log("CS: See Historical Sale Price - opening Item History popup");

function getFormValues() {
  try {
    var record = ZDK.Page.getRecord();
    if (record && record.getValues) return record.getValues();
  } catch (err) {
    console.log("CS: getRecord().getValues() threw " + err);
  }
  return null;
}

function getFieldValue(apiName) {
  try {
    var field = ZDK.Page.getField ? ZDK.Page.getField(apiName) : null;
    if (field && field.getValue) return field.getValue();
  } catch (err) {
    console.log("CS: getField('" + apiName + "') threw " + err);
  }
  return null;
}

// Works on the detail layout; usually empty on the edit layout.
function resolveQuoteId(values) {
  var attempts = [
    ["values.id", function () { return values ? values.id : null; }],
    ["ZDK.Page.getRecord().get('id')", function () {
      var r = ZDK.Page.getRecord();
      return r && r.get ? r.get("id") : null;
    }],
    ["ZDK.Page.getRecord().id", function () {
      var r = ZDK.Page.getRecord();
      return r ? r.id : null;
    }],
    ["ZDK.Page.getRecordId()", function () {
      return ZDK.Page.getRecordId ? ZDK.Page.getRecordId() : null;
    }],
    ["getField('id')", function () { return getFieldValue("id"); }],
  ];

  for (var i = 0; i < attempts.length; i++) {
    try {
      var value = attempts[i][1]();
      console.log("CS: " + attempts[i][0] + " -> " + JSON.stringify(value));
      if (value && /^\d{8,}$/.test(String(value))) return String(value);
    } catch (err) {
      console.log("CS: " + attempts[i][0] + " threw " + err);
    }
  }
  return "";
}

function resolveQuoteNumber(values) {
  var candidates = [
    values ? values.CRM_Quote_Number : null,
    values ? values.Quote_Number : null,
    getFieldValue("CRM_Quote_Number"),
    getFieldValue("Quote_Number"),
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (candidates[i]) return String(candidates[i]).trim();
  }
  return "";
}

try {
  var values = getFormValues();
  var formKeys = values ? Object.keys(values).join(",") : "";
  console.log("CS: form field keys: " + formKeys);

  var quoteId = resolveQuoteId(values);
  var quoteNumber = resolveQuoteNumber(values);
  console.log("CS: quote id '" + quoteId + "', quote number '" + quoteNumber + "'");

  // Open regardless of what could be read here. The widget accepts EntityId
  // from PageLoad as well as these values, and when it can identify nothing it
  // displays the payload it received - which is the only way to see what a
  // popup-launched widget is actually given. Blocking here would hide that.
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
        quote_number: quoteNumber,
        // Diagnostic: what the form exposed, echoed by the widget if it still
        // cannot identify the quote, so the console is not required.
        form_keys: formKeys,
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
