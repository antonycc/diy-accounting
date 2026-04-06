# Reconciliation Report: GB Accounts Company 2026-05-31 (May26) Excel 2007

Scenario: ltd-scenario-full
Status: RECONCILES (with warnings)

## Compliance Checks

| Check | Expected | Actual | Diff | Result |
|-------|----------|--------|------|--------|
| Total Sales | 341283 | 341283.333333333 | +0.3333333330228925 | PASS |
| P&L: Gross = Turnover - CoS | 323539.333333333 | 323539.333333333 | 0 | PASS |
| P&L: Operating = Gross - Admin | 276191.083333333 | 276191.083333333 | 0 | PASS |
| P&L: PBT = Operating + Interest | 276191.083333333 | 276191.083333333 | 0 | PASS |
| P&L: Admin lines sum = Total | 47348.25 | 47348.25 | 0 | PASS |
| Premises | 14400 | 14400 | 0 | PASS |
| Legal & Professional | 5310 | 5310 | 0 | PASS |
| Corporation Tax | 53046 | 53046.3058333333 | +0.3058333333028713 | PASS |
| CT: Chargeable >= Operating | 276191.083333333 | 279191.083333333 | +3000 | PASS |
| CT: Tax outstanding = CT | 53046.3058333333 | 53046.3058333333 | 0 | PASS |
| CT: Marginal relief expected (profit > £50K) | 69798 | 53046.3058333333 | -16751.694166666697 | **WARNING** |

## Business Details

| | Amount |
|---|------:|
| Company Name | Precision Code Ltd |
| Company Number | 12345678 |
| Address | 123 High Street, Manchester M1 1AA |
| UTR | 1234567890 |

## Profit & Loss Account

| | Amount |
|---|------:|
| &nbsp;&nbsp;&nbsp;&nbsp;Product A — Consultancy | 311,600 |
| &nbsp;&nbsp;&nbsp;&nbsp;Product B — Software | 13,600 |
| &nbsp;&nbsp;&nbsp;&nbsp;Product C — Training | 10,300 |
| &nbsp;&nbsp;&nbsp;&nbsp;Other Direct Income | 3,700 |
| &nbsp;&nbsp;&nbsp;&nbsp;Grants Received | 2,083.33 |
| **Sales Turnover** | 341,283.33 |
| &nbsp;&nbsp;&nbsp;&nbsp;Materials / Stock | 6,540 |
| &nbsp;&nbsp;&nbsp;&nbsp;Sub-Contractors | 8,000 |
| &nbsp;&nbsp;&nbsp;&nbsp;Other Direct Costs | 3,204 |
| Cost of Sales | 17,744 |
| **Gross Profit** | 323,539.33 |
| &nbsp;&nbsp;&nbsp;&nbsp;PAYE Wages + Non-PAYE Employee | 800 |
| &nbsp;&nbsp;&nbsp;&nbsp;Directors Non-PAYE (code d) | 5,000 |
| &nbsp;&nbsp;&nbsp;&nbsp;PAYE Employee Wages | 0 |
| &nbsp;&nbsp;&nbsp;&nbsp;Premises (code r) | 14,400 |
| &nbsp;&nbsp;&nbsp;&nbsp;Light, Heat, Power (code p) | 1,440 |
| &nbsp;&nbsp;&nbsp;&nbsp;Distribution (code t) | 960 |
| &nbsp;&nbsp;&nbsp;&nbsp;Equipment Hire (code q) | 1,620 |
| &nbsp;&nbsp;&nbsp;&nbsp;Repairs & Maintenance (code m) | 1,140 |
| &nbsp;&nbsp;&nbsp;&nbsp;Consumables (code u) | 1,578 |
| &nbsp;&nbsp;&nbsp;&nbsp;Advertising (code a) | 4,560 |
| &nbsp;&nbsp;&nbsp;&nbsp;General Admin (code g) | 1,962 |
| &nbsp;&nbsp;&nbsp;&nbsp;Travel & Hotel (code h) | 1,860 |
| &nbsp;&nbsp;&nbsp;&nbsp;Motor Vehicle (code v) | 7,598.25 |
| &nbsp;&nbsp;&nbsp;&nbsp;Insurance (code n) | 1,800 |
| &nbsp;&nbsp;&nbsp;&nbsp;Leasing (code f) | 720 |
| &nbsp;&nbsp;&nbsp;&nbsp;Legal & Professional (code l) | 5,310 |
| &nbsp;&nbsp;&nbsp;&nbsp;Bad Debts (from Sales) | -300 |
| &nbsp;&nbsp;&nbsp;&nbsp;Depreciation (bank) | 0 |
| &nbsp;&nbsp;&nbsp;&nbsp;Depreciation (combined) | -6,600 |
| &nbsp;&nbsp;&nbsp;&nbsp;Charitable Donations (code y) | 500 |
| &nbsp;&nbsp;&nbsp;&nbsp;Goodwill (code z) | 3,000 |
| &nbsp;&nbsp;&nbsp;&nbsp;Depreciation 2 | 0 |
| &nbsp;&nbsp;&nbsp;&nbsp;Depreciation 3 | 0 |
| Total Admin Expenses | 47,348.25 |
| **Operating Profit** | 276,191.08 |
| &nbsp;&nbsp;&nbsp;&nbsp;Interest Received | 0 |
| **Profit Before Tax** | 276,191.08 |

## Corporation Tax (CT600)

| | Amount |
|---|------:|
| Operating Profit | 276,191.08 |
| &nbsp;&nbsp;&nbsp;&nbsp;Add back: Depreciation | 279,191.08 |
| &nbsp;&nbsp;&nbsp;&nbsp;Less: Capital Allowances | 279,191.08 |
| **Profit Chargeable to CT** | 279,191.08 |
| **Corporation Tax** | 53,046.31 |
| Tax Outstanding | 53,046.31 |

## Published P&L

| | Amount |
|---|------:|
| &nbsp;&nbsp;&nbsp;&nbsp;Sales Turnover | 339,200 |
| &nbsp;&nbsp;&nbsp;&nbsp;Investment Grants | 2,083.33 |
| **Total Sales Turnover** | 341,283.33 |
| &nbsp;&nbsp;&nbsp;&nbsp;Cost of Sales | 17,744 |
| **Gross Profit** | 323,539.33 |

## Published Balance Sheet

| | Amount |
|---|------:|
| Fixed Assets (NBV) | 70,489 |
| &nbsp;&nbsp;&nbsp;&nbsp;Stock | 10,000 |
| Current Assets | 595,735 |
| &nbsp;&nbsp;&nbsp;&nbsp;Creditors < 1 year | 6,900 |
| **Net Current Assets** | 348,204.78 |
| **Total Assets less CL** | 418,693.78 |
| &nbsp;&nbsp;&nbsp;&nbsp;Other Creditors | 20,000 |
| &nbsp;&nbsp;&nbsp;&nbsp;Directors Loan | 1,906,145 |
| **Net Assets** | -1,487,451.22 |
| &nbsp;&nbsp;&nbsp;&nbsp;Share Capital | 100 |
| &nbsp;&nbsp;&nbsp;&nbsp;Retained Earnings | 268,846.78 |
| &nbsp;&nbsp;&nbsp;&nbsp;Capital Reserves | -0 |
| **Shareholders' Funds** | 268,946.78 |

## Stock

| | Amount |
|---|------:|
| Opening Stock | 10,000 |
| Closing Stock | 6,000 |

## Trial Balance

| | Amount |
|---|------:|
| Audit Accuracy Check | -1,756,398 |

---

## Appendix: Cell Values

### OpenAccounts

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| E2 | Company Name | Precision Code Ltd | entityInformation.organizationIdentifier |
| E3 | Company Number | 12345678 | diya-gl:companyNumber |
| E4 | Address | 123 High Street, Manchester M1 1AA | gl-bus:organizationAddress |
| E6 | UTR | 1234567890 | gl-taf:taxRegistrationNumber |

### MnthP&L

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| B4 | Product A — Consultancy | 311600 | accounts.sales.4000 |
| B5 | Product B — Software | 13600 | accounts.sales.4001 |
| B6 | Product C — Training | 10300 | accounts.sales.4002 |
| B7 | Other Direct Income | 3700 | accounts.sales.4003 |
| B8 | Grants Received | 2083.33333333333 | accounts.sales.4004 |
| B9 | **Sales Turnover** | 341283.333333333 | gl-cor:amount (salesTurnover) |
| B11 | Materials / Stock | 6540 | accounts.purchases.5000 |
| B12 | Sub-Contractors | 8000 | accounts.purchases.5001 |
| B13 | Other Direct Costs | 3204 | accounts.purchases.5002 |
| B14 | Cost of Sales | 17744 | gl-cor:amount (costOfSales) |
| B16 | **Gross Profit** | 323539.333333333 | gl-cor:amount (grossProfit) |
| B18 | PAYE Wages + Non-PAYE Employee | 800 | dpl:WagesAndSalaries (combined) |
| B19 | Directors Non-PAYE (code d) | 5000 | accounts.purchases.5100 |
| B20 | PAYE Employee Wages | 0 | dpl:WagesAndSalaries (PAYE) |
| B21 | Premises (code r) | 14400 | accounts.purchases.5200 |
| B22 | Light, Heat, Power (code p) | 1440 | accounts.purchases.5201 |
| B23 | Distribution (code t) | 960 | accounts.purchases.5300 |
| B24 | Equipment Hire (code q) | 1620 | accounts.purchases.5301 |
| B25 | Repairs & Maintenance (code m) | 1140 | accounts.purchases.5400 |
| B26 | Consumables (code u) | 1578 | accounts.purchases.5401 |
| B27 | Advertising (code a) | 4560 | accounts.purchases.5500 |
| B28 | General Admin (code g) | 1962 | accounts.purchases.5501 |
| B29 | Travel & Hotel (code h) | 1860 | accounts.purchases.5600 |
| B30 | Motor Vehicle (code v) | 7598.25 | accounts.purchases.5601 |
| B31 | Insurance (code n) | 1800 | accounts.purchases.5700 |
| B32 | Leasing (code f) | 720 | accounts.purchases.5701 |
| B33 | Legal & Professional (code l) | 5310 | accounts.purchases.5800 |
| B34 | Bad Debts (from Sales) | -300 | accounts.sales.4005 |
| B35 | Depreciation (bank) | 0 | gl-cor:amount (depreciation) |
| B36 | Depreciation (combined) | -6600 | gl-cor:amount (depreciation2) |
| B37 | Charitable Donations (code y) | 500 | accounts.purchases.5801 |
| B38 | Goodwill (code z) | 3000 | accounts.purchases.5802 |
| B39 | Depreciation 2 | 0 | gl-cor:amount (depreciation3) |
| B40 | Depreciation 3 | 0 | gl-cor:amount (depreciation4) |
| B41 | Total Admin Expenses | 47348.25 | gl-cor:amount (totalAdmin) |
| B43 | **Operating Profit** | 276191.083333333 | gl-cor:amount (operatingProfit) |
| B44 | Interest Received | 0 | gl-cor:amount (interestReceived) |
| B45 | **Profit Before Tax** | 276191.083333333 | gl-cor:amount (profitBeforeTax) |

### CorporationTax

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| K5 | Operating Profit | 276191.083333333 | gl-cor:amount (ct600.box145) |
| K12 | Add back: Depreciation | 279191.083333333 | gl-cor:amount (ct600.addBack) |
| K22 | Less: Capital Allowances | 279191.083333333 | tax.capitalAllowances (ct600) |
| K28 | **Profit Chargeable to CT** | 279191.083333333 | gl-cor:amount (ct600.box315) |
| K35 | **Corporation Tax** | 53046.3058333333 | gl-cor:taxAmount (ct600.box430) |
| K39 | Tax Outstanding | 53046.3058333333 | gl-cor:taxAmount (ct600.box515) |

### PubP&L

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| D7 | Sales Turnover | 339200 | gl-cor:amount (pubPL.salesTurnover) |
| D8 | Investment Grants | 2083.33333333333 | gl-cor:amount (pubPL.grants) |
| D9 | **Total Sales Turnover** | 341283.333333333 | gl-cor:amount (pubPL.totalTurnover) |
| D16 | Cost of Sales | 17744 | gl-cor:amount (pubPL.cos) |
| D18 | **Gross Profit** | 323539.333333333 | gl-cor:amount (pubPL.gross) |

### PubBalSht

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| D6 | Fixed Assets (NBV) | 70489 | gl-cor:amount (pubBS.fixedAssets) |
| D9 | Stock | 10000 | accounts.assets.1100 (pubBS) |
| D13 | Current Assets | 595735 | gl-cor:amount (pubBS.currentAssets) |
| D15 | Creditors < 1 year | 6900 | gl-cor:amount (pubBS.creditors) |
| D22 | **Net Current Assets** | 348204.7775 | gl-cor:amount (pubBS.netCurrent) |
| D26 | **Total Assets less CL** | 418693.7775 | gl-cor:amount (pubBS.totalAssetsLessCL) |
| D28 | Other Creditors | 20000 | gl-cor:amount (pubBS.otherCred) |
| D29 | Directors Loan | 1906145 | accounts.liabilities.2500 (pubBS) |
| F33 | **Net Assets** | -1487451.2225 | gl-cor:amount (pubBS.netAssets) |
| F36 | Share Capital | 100 | accounts.capital.3000 (pubBS) |
| F37 | Retained Earnings | 268846.7775 | accounts.capital.3100 (pubBS) |
| F38 | Capital Reserves | 0 | gl-cor:amount (pubBS.capitalReserves) |
| F39 | **Shareholders' Funds** | 268946.7775 | gl-cor:amount (pubBS.equity) |

### Stock

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| B5 | Opening Stock | 10000 | accounts.assets.1100 (opening) |
| B8 | Closing Stock | 6000 | accounts.assets.1100 (closing) |

### TrialBalance

| Cell | DIY Label | Value | diya-gl mapping |
|------|-----------|-------|-----------------|
| EJ91 | Audit Accuracy Check | -1756398 | gl-cor:amount (trialBalanceCheck) |
