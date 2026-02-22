#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 DIY Accounting Ltd

// scripts/stripe-spreadsheets-setup.js
//
// Idempotent Stripe setup for spreadsheets donation Payment Links.
// Creates a "Spreadsheet Donation" product, preset prices (£10, £20, £45),
// and Payment Links including one with custom_amount enabled (pence-level input).
//
// Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-spreadsheets-setup.js

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY environment variable is required");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const RETURN_URL = "https://spreadsheets.diyaccounting.co.uk/download.html?stripe=success";
const METADATA_KEY = "spreadsheetDonation";

async function findOrCreateProduct() {
  const products = await stripe.products.search({
    query: `metadata["${METADATA_KEY}"]:"true"`,
  });

  if (products.data.length > 0) {
    console.log("Product already exists:", products.data[0].id);
    return products.data[0];
  }

  const product = await stripe.products.create({
    name: "Spreadsheet Donation",
    description: "Voluntary donation to support DIY Accounting free spreadsheets",
    metadata: { [METADATA_KEY]: "true" },
  });
  console.log("Created product:", product.id);
  return product;
}

async function findOrCreatePrice(productId, amountPence, label) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "one_time",
  });

  const existing = prices.data.find((p) => p.unit_amount === amountPence && p.currency === "gbp");
  if (existing) {
    console.log(`Price ${label} already exists:`, existing.id);
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amountPence,
    currency: "gbp",
    metadata: { [METADATA_KEY]: "true", label },
  });
  console.log(`Created price ${label}:`, price.id);
  return price;
}

async function findOrCreateCustomPrice(productId) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "one_time",
  });

  const existing = prices.data.find((p) => p.custom_unit_amount && p.custom_unit_amount.enabled && p.currency === "gbp");
  if (existing) {
    console.log("Custom-amount price already exists:", existing.id);
    return existing;
  }

  const price = await stripe.prices.create({
    product: productId,
    currency: "gbp",
    custom_unit_amount: {
      enabled: true,
      minimum: 100, // £1.00 minimum
      preset: 1500, // £15.00 default
    },
    metadata: { [METADATA_KEY]: "true", label: "custom" },
  });
  console.log("Created custom-amount price:", price.id);
  return price;
}

async function findOrCreatePaymentLink(priceId, label) {
  // List existing payment links and check metadata
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const existing = links.data.find((l) => l.metadata && l.metadata[METADATA_KEY] === "true" && l.metadata.label === label);
  if (existing) {
    console.log(`Payment Link (${label}) already exists:`, existing.url);
    return existing;
  }

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: priceId, quantity: 1 }],
    after_completion: {
      type: "redirect",
      redirect: { url: RETURN_URL },
    },
    metadata: { [METADATA_KEY]: "true", label },
  });
  console.log(`Created Payment Link (${label}):`, link.url);
  return link;
}

async function main() {
  console.log("Setting up Stripe resources for spreadsheets donations...\n");

  const product = await findOrCreateProduct();

  // Preset fixed prices
  const price10 = await findOrCreatePrice(product.id, 1000, "£10");
  const price20 = await findOrCreatePrice(product.id, 2000, "£20");
  const price45 = await findOrCreatePrice(product.id, 4500, "£45");

  // Custom amount price (allows pence-level input)
  const priceCustom = await findOrCreateCustomPrice(product.id);

  // Payment Links
  const link10 = await findOrCreatePaymentLink(price10.id, "£10");
  const link20 = await findOrCreatePaymentLink(price20.id, "£20");
  const link45 = await findOrCreatePaymentLink(price45.id, "£45");
  const linkCustom = await findOrCreatePaymentLink(priceCustom.id, "custom");

  const mode = STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`\n=== Stripe Spreadsheets Donation Setup Complete (${mode} mode) ===`);
  console.log("Product ID:", product.id);
  console.log("\nPayment Links for donate.html:");
  console.log(`  £10:        ${link10.url}`);
  console.log(`  £20:        ${link20.url}`);
  console.log(`  £45:        ${link45.url}`);
  console.log(`  Any amount: ${linkCustom.url}`);
  console.log("\nUpdate web/spreadsheets.diyaccounting.co.uk/public/donate.html with these URLs.");
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
