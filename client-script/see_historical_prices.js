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

try {
  var rows = readSubformRows();
  var products = collectProducts(rows);
  var quoteId = findParentId(rows);
  var rowKeys = rows.length > 0 ? Object.keys(rows[0]).join(",") : "";

  console.log("CS: quote id '" + quoteId + "', products " + products.length);

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
        products: products,
        // Diagnostics, echoed by the widget if it still cannot proceed.
        row_count: rows.length,
        row_keys: rowKeys,
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
