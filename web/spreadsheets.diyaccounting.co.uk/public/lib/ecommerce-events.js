/* SPDX-License-Identifier: AGPL-3.0-only */
/* Copyright (C) 2025-2026 DIY Accounting Ltd */

// GA4 ecommerce: view_item_list on the product catalogue page (index.html)
(function () {
  if (typeof gtag !== "function") return;

  gtag("event", "view_item_list", {
    item_list_name: "Products",
    items: [
      { item_id: "BasicSoleTrader", item_name: "Basic Sole Trader", price: 0, currency: "GBP" },
      { item_id: "SelfEmployed", item_name: "Self Employed", price: 0, currency: "GBP" },
      { item_id: "Company", item_name: "Company Accounts", price: 0, currency: "GBP" },
      { item_id: "TaxiDriver", item_name: "Taxi Driver (Cabsmart)", price: 0, currency: "GBP" },
      { item_id: "Payslip05", item_name: "Payslips", price: 0, currency: "GBP" },
    ],
  });
})();
