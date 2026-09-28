// Client Script: See Historical Sale Price
// Module:  Quotes
// Trigger: Custom Button "See Historical Prices"
//
// WHY THIS EXISTS
// A widget-action button renders in Zoho's fixed ~880px modal and the SDK
// resize calls do not widen it. Opening the registered widget from a Client
// Script lets openPopup set the dimensions - the Distributor Search approach.
//
// api_name must be the WIDGET's API name from Setup > Developer Space >
// Widgets ("See_Historical_Sale_Price"), not the button's, and it must be the
// registered widget rather than a bare URL, or the page loses the Embedded App
// SDK and with it ZOHO.CRM.API and ZOHO.CRM.FUNCTIONS.
//
// IDENTIFYING THE QUOTE - what was established by testing
//   * openPopup does NOT pass PageLoad's EntityId. The widget receives only
//     the data payload below, so the quote must be named in it.
//   * On this button's EDIT layout, ZDK.Page.getRecord() returns nothing -
//     it yielded no field values and no id.
//   * ZDK.Page.getSubform("Quoted_Items") DOES work on this layout; the
//     Distributor Search script writes rows through it.
// So the quote is identified from its subform rows: Parent_Id when the row
// exposes it, and the product ids either way, which is what the history is
// actually built from.

console.log("CS: See Historical Sale Price - opening Item History popup");

var LONG_ID = /^\d{8,}$/;

function readSubformRows() {
  var rows = [];
  var subform;
  try {
    subform = ZDK.Page.getSubform("Quoted_Items");
  } catch (err) {
    console.log("CS: getSubform('Quoted_Items') threw " + err);
    return rows;
  }
  if (!subform) {
    console.log("CS: getSubform('Quoted_Items') returned nothing");
    return rows;
  }

  for (var i = 0; i < 100; i++) {
    var values;
    try {
      var row = subform.getRow(i);
      if (!row) break;
      values = row.getValues ? row.getValues() : null;
    } catch (err) {
      break;
    }
    if (!values) break;
    rows.push(values);
  }
  console.log("CS: read " + rows.length + " subform row(s)");
  if (rows.length > 0) {
    console.log("CS: row 0 keys: " + Object.keys(rows[0]).join(","));
    console.log("CS: row 0 values: " + JSON.stringify(rows[0]));
  }
  return rows;
}

// Each subform row's own record id. These resolve back to the parent quote
// server-side, which is how the quote number and account are recovered on a
// layout that cannot read the quote record itself.
function collectRowIds(rows) {
  var ids = [];
  for (var i = 0; i < rows.length; i++) {
    var id = rows[i].id || rows[i].Id || rows[i].ID;
    if (id && LONG_ID.test(String(id))) ids.push(String(id));
  }
  console.log("CS: collected " + ids.length + " subform row id(s)");
  return ids;
}

// The quote's own id, if any row carries a reference back to the parent.
function findParentId(rows) {
  var keys = ["Parent_Id", "parent_id", "Parent_ID"];
  for (var i = 0; i < rows.length; i++) {
    for (var k = 0; k < keys.length; k++) {
      var value = rows[i][keys[k]];
      if (!value) continue;
      var candidate = value && value.id ? value.id : value;
      if (LONG_ID.test(String(candidate))) return String(candidate);
    }
  }
  return "";
}

// The products the history is built from - id is the CRM product record id.
function collectProducts(rows) {
  var products = [];
  var seen = {};
  for (var i = 0; i < rows.length; i++) {
    var product = rows[i].Product_Name;
    if (!product || !product.id) continue;
    var id = String(product.id);
    if (seen[id]) continue;
    seen[id] = true;
    products.push({ id: id, name: product.name ? String(product.name) : "" });
  }
  console.log("CS: collected " + products.length + " product(s): " + JSON.stringify(products));
  return products;
}

// The quote's own number ("SQ-101074"), read live from the form. getRecord()
// returns nothing on this layout, but a single field is often still readable.
function readQuoteNumber() {
  var names = ["CRM_Quote_Number", "Quote_Number"];
  for (var i = 0; i < names.length; i++) {
    try {
      var field = ZDK.Page.getField(names[i]);
      var value = field && field.getValue ? field.getValue() : "";
      if (value && /^SQ-/i.test(String(value).trim())) {
        console.log("CS: quote number from " + names[i] + ": " + value);
        return String(value).trim();
      }
    } catch (err) {
      console.log("CS: getField('" + names[i] + "') threw " + err);
    }
  }
  return "";
}

// The quote's record id from the CRM page URL, which is the one thing the
// layout always exposes: .../tab/Quotes/<id>/edit?layoutId=... An unsaved
// new quote or clone has no id in its URL, and correctly yields "".
var urlsSeen = "";

// Every route is tried and its outcome recorded, so the widget's banner can
// say exactly what this sandbox allowed instead of reporting nothing.
function readQuoteIdFromUrl() {
  var probes = [
    ["location", function () { return window.location.href; }],
    ["top", function () { return window.top.location.href; }],
    ["document", function () { return document.location.href; }],
    ["referrer", function () { return document.referrer; }],
  ];
  var notes = [];
  var found = "";
  for (var i = 0; i < probes.length; i++) {
    var value = "";
    try {
      value = String(probes[i][1]() || "");
      notes.push(probes[i][0] + "=" + (value ? value.slice(0, 90) : "empty"));
    } catch (err) {
      notes.push(probes[i][0] + "=blocked");
    }
    var match = /\/tab\/Quotes\/(\d{8,})/.exec(value);
    if (match && !found) found = match[1];
  }
  urlsSeen = notes.join(" ; ");
  console.log("CS: URL probes: " + urlsSeen + " -> quote id '" + found + "'");
  return found;
}

// Form fields the widget can fall back on when no quote id is available.
// What this layout's page API will actually give us - reported in the widget's
// banner so the next step is chosen from evidence, not guesses.
var fieldProbe = "";
function probePageApi() {
  var notes = [];
  var names = ["CRM_Quote_Number", "Quote_Number", "Subject", "Account_Name", "Deal_Name", "Quote_Stage"];
  for (var i = 0; i < names.length; i++) {
    try {
      var field = ZDK.Page.getField(names[i]);
      if (!field) { notes.push(names[i] + "=none"); continue; }
      var value = field.getValue ? field.getValue() : "(no getValue)";
      var text = value && typeof value === "object" ? JSON.stringify(value) : String(value);
      notes.push(names[i] + "=" + text.slice(0, 60));
    } catch (err) {
      notes.push(names[i] + "=threw " + String(err).slice(0, 50));
    }
  }
  var methods = ["getRecordId", "getEntityId", "getId", "getRecord", "getModule", "getUrl", "getMode"];
  for (var m = 0; m < methods.length; m++) {
    try {
      if (typeof ZDK.Page[methods[m]] === "function") {
        var result = ZDK.Page[methods[m]]();
        var out = result && typeof result === "object" ? JSON.stringify(result) : String(result);
        notes.push(methods[m] + "()=" + out.slice(0, 60));
      }
    } catch (err) {
      notes.push(methods[m] + "() threw");
    }
  }
  fieldProbe = notes.join(" ; ");
  console.log("CS: page API probe: " + fieldProbe);
}

// Plain values from the form, used to find the quote when no id is exposed.
function readFormValue(apiName, key) {
  try {
    var field = ZDK.Page.getField(apiName);
    var value = field && field.getValue ? field.getValue() : null;
    if (value && typeof value === "object") return value[key] ? String(value[key]) : "";
    return value ? String(value) : "";
  } catch (err) {
    return "";
  }
}

function readAccountName() {
  try {
    var field = ZDK.Page.getField("Account_Name");
    var value = field && field.getValue ? field.getValue() : null;
    if (value && value.name) return String(value.name);
    if (typeof value === "string") return value;
  } catch (err) {
    console.log("CS: getField('Account_Name') threw " + err);
  }
  return "";
}

try {
  var quoteNumber = readQuoteNumber();
  var accountName = readAccountName();
  probePageApi();
  var rows = readSubformRows();
  var products = collectProducts(rows);
  var rowIds = collectRowIds(rows);
  var quoteId = findParentId(rows) || readQuoteIdFromUrl();
  var rowKeys = rows.length > 0 ? Object.keys(rows[0]).join(",") : "";

  console.log("CS: quote id '" + quoteId + "', row ids " + rowIds.length + ", products " + products.length);

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
        row_ids: rowIds.join(","),
        products: products,
        // Diagnostics, echoed by the widget if it still cannot proceed.
        row_count: rows.length,
        row_keys: rowKeys,
        urls_seen: urlsSeen || "not probed (a subform row supplied the parent id)",
        account_name: accountName,
        field_probe: fieldProbe,
        subject: readFormValue("Subject", "name"),
        account_id: readFormValue("Account_Name", "id"),
      },
      wait: true,
    },
  );
  console.log("CS: Item History popup closed");
} catch (err) {
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
