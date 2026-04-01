# UK Tax Data Sources

Authoritative references for the rates and thresholds used in `app/data/*.toml`.

## Income Tax

| Source | URL |
|--------|-----|
| Income tax rates and bands | https://www.gov.uk/income-tax-rates |
| Personal allowance | https://www.gov.uk/income-tax-rates |
| Scottish income tax rates (if needed) | https://www.gov.uk/scottish-income-tax |

## National Insurance

| Source | URL |
|--------|-----|
| NI rates and thresholds (current year) | https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 |
| NI rates and thresholds (previous year) | https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026 |
| Self-employed NI (Class 2 and Class 4) | https://www.gov.uk/self-employed-national-insurance-rates |

## Capital Allowances

| Source | URL |
|--------|-----|
| Annual Investment Allowance | https://www.gov.uk/capital-allowances/annual-investment-allowance |
| Writing down allowances | https://www.gov.uk/capital-allowances/writing-down-allowances |
| Cars and vehicles | https://www.gov.uk/capital-allowances/business-cars |

## Mileage Allowances

| Source | URL |
|--------|-----|
| Approved mileage rates | https://www.gov.uk/expenses-and-benefits-business-travel-mileage/rules-for-tax |

## VAT

| Source | URL |
|--------|-----|
| VAT registration threshold | https://www.gov.uk/vat-registration/when-to-register |
| VAT rates | https://www.gov.uk/vat-rates |

## Depreciation

Depreciation rates are not HMRC-mandated — they are conventional accounting rates chosen by the business. The rates in `app/data/*.toml` reflect typical UK small business practice:

| Asset class | Rate | Basis |
|-------------|------|-------|
| Land & Property | 0% | Not depreciated (revalued) |
| Plant & Machinery | 10% | Reducing balance |
| Fixtures & Fittings | 20% | Reducing balance |
| Computer Equipment | 33% | Reducing balance (~3 year life) |
| Motor Vehicles | 25% | Reducing balance |

## Corporation Tax (for Company product)

| Source | URL |
|--------|-----|
| Corporation tax rates | https://www.gov.uk/corporation-tax-rates |
| Marginal relief | https://www.gov.uk/guidance/corporation-tax-marginal-relief |

## Student Loans and Pensions (for Payslip products)

| Source | URL |
|--------|-----|
| Student loan repayment thresholds | https://www.gov.uk/repaying-your-student-loan/what-you-pay |
| Workplace pensions (auto-enrolment) | https://www.gov.uk/workplace-pensions/what-you-your-employer-and-the-government-pay |
