// verify_audit_data.js
const testData = [
  // Page 1
  // Share Capital
  { name: "Share Capital Member Fund", opening: 488575.00, receipt: 500.00, payment: 100.00, closing: 488975.00, group: "Share Capital" },

  // Fund
  { name: "Reserve Fund", opening: 2464304.01, receipt: 0, payment: 0, closing: 2464304.01, group: "Fund" },
  { name: "Agri Dev Propaganda Fund", opening: 75317.38, receipt: 0, payment: 0, closing: 75317.38, group: "Fund" },
  { name: "Agri Implement Dev Propaganda Fund", opening: 149354.25, receipt: 0, payment: 0, closing: 149354.25, group: "Fund" },
  { name: "Onion Market Godown Depreciation Fund", opening: 1168711.40, receipt: 67505.00, payment: 0, closing: 1236216.40, group: "Fund" },
  { name: "Bad Debt Fund", opening: 243662.71, receipt: 0, payment: 0, closing: 243662.71, group: "Fund" },
  { name: "Office Building Depreciation Fund", opening: 274489.59, receipt: 0, payment: 0, closing: 274489.59, group: "Fund" },
  { name: "Building Fund", opening: 1169823.93, receipt: 0, payment: 0, closing: 1169823.93, group: "Fund" },
  { name: "Charity Fund", opening: 13.75, receipt: 0, payment: 0, closing: 13.75, group: "Fund" },
  { name: "Cold Storage Equipment & dev Propaganda Fund", opening: 22332.29, receipt: 2458.00, payment: 0, closing: 24790.29, group: "Fund" },
  { name: "Capital Reserve Fund (Tractor Sale)", opening: 189194.00, receipt: 0, payment: 0, closing: 189194.00, group: "Fund" },
  { name: "Cold Storage Building Depreciation Fund", opening: 1535058.22, receipt: 59747.00, payment: 0, closing: 1594805.22, group: "Fund" },
  { name: "Education Fund", opening: 18681.00, receipt: 0, payment: 0, closing: 18681.00, group: "Fund" },
  { name: "Cold Storage Dead Stock Depreciation Fund", opening: 4146.00, receipt: 327.00, payment: 0, closing: 4473.00, group: "Fund" },
  { name: "Cold Storage Machinery Depreciation Fund", opening: 1841422.08, receipt: 0, payment: 0, closing: 1841422.08, group: "Fund" },
  { name: "Cold Storage Varanda & New Office Depreciation Fund", opening: 113590.00, receipt: 0, payment: 0, closing: 113590.00, group: "Fund" },
  { name: "Cold Storage Generator Room Depreciation Fund", opening: 32947.88, receipt: 0, payment: 0, closing: 32947.88, group: "Fund" },
  { name: "Computer Depreciation Fund", opening: 53600.00, receipt: 0, payment: 0, closing: 53600.00, group: "Fund" },
  { name: "Dead Stock Depreciation", opening: 101979.45, receipt: 6438.00, payment: 0, closing: 108417.45, group: "Fund" },
  { name: "Electric Fitting Depreciation Fund", opening: 35641.00, receipt: 1908.00, payment: 0, closing: 37549.00, group: "Fund" },
  { name: "Golden Jubilee Fund", opening: 142567.61, receipt: 0, payment: 0, closing: 142567.61, group: "Fund" },
  { name: "Guest Fund", opening: 11487.06, receipt: 0, payment: 0, closing: 11487.06, group: "Fund" },
  { name: "Price Fluction Fund", opening: 120703.01, receipt: 0, payment: 0, closing: 120703.01, group: "Fund" },
  { name: "Provision for Unforeseen Losses Fund", opening: 16241.32, receipt: 0, payment: 0, closing: 16241.32, group: "Fund" },
  { name: "Shop cum Godown Depreciation Fund", opening: 719179.65, receipt: 101735.00, payment: 0, closing: 820914.65, group: "Fund" },
  { name: "Water Connection Depreciation Fund", opening: 52789.00, receipt: 0, payment: 0, closing: 52789.00, group: "Fund" },
  { name: "Gratuity Fund", opening: 226433.00, receipt: 0, payment: 95529.00, closing: 130904.00, group: "Fund" },
  { name: "Dividend Equalization Fund", opening: 2000.00, receipt: 0, payment: 0, closing: 2000.00, group: "Fund" },

  // Govt. Loan Subsidies
  { name: "Computer Purchase Subsidy", opening: 40000.00, receipt: 0, payment: 0, closing: 40000.00, group: "Govt. Loan Subsidies" },

  // Bank Loan
  { name: "The Belgaum Pioneer Bank CC Loan", opening: 354030.45, receipt: 3069251.88, payment: 3494453.00, closing: 71170.67, group: "Bank Loan" },
  { name: "The Belgaum Pioneer Bank Mortgage Loan", opening: 634483.00, receipt: 0, payment: 460465.00, closing: 174018.00, group: "Bank Loan" },

  // Deposit
  { name: "Sou. Laxmi Pigmy Deposit", opening: 3724915.00, receipt: 5970340.00, payment: 5516360.00, closing: 4178895.00, group: "Deposit" },
  { name: "Recurring Deposit", opening: 285.00, receipt: 0, payment: 0, closing: 285.00, group: "Deposit" },
  { name: "Fixed Deposite", opening: 1130089.00, receipt: 200900.00, payment: 273817.00, closing: 1057172.00, group: "Deposit" },

  // Other Liabilites (Payables)
  { name: "Audit Objection Under Protest", opening: 6357.95, receipt: 0, payment: 0, closing: 6357.95, group: "Other Liabilites (Payables)" },
  { name: "Deposit Unter Protest", opening: 319.00, receipt: 0, payment: 0, closing: 319.00, group: "Other Liabilites (Payables)" },
  { name: "Central Provident Fund", opening: 48308.80, receipt: 98792.00, payment: 113014.00, closing: 34086.80, group: "Other Liabilites (Payables)" },
  { name: "EMD", opening: 3750.00, receipt: 0, payment: 0, closing: 3750.00, group: "Other Liabilites (Payables)" },
  { name: "Election Deposit", opening: 7450.00, receipt: 0, payment: 0, closing: 7450.00, group: "Other Liabilites (Payables)" },
  { name: "Purchase A/c Prasad Mali", opening: 4.00, receipt: 0, payment: 0, closing: 4.00, group: "Other Liabilites (Payables)" },
  { name: "ESI A/c", opening: 9095.58, receipt: 16487.00, payment: 16864.00, closing: 8718.58, group: "Other Liabilites (Payables)" },
  { name: "Member Dividend", opening: 384301.35, receipt: 0, payment: 0, closing: 384301.35, group: "Other Liabilites (Payables)" },
  { name: "Sundry A/c", opening: 313938.18, receipt: 393490.00, payment: 376393.72, closing: 331034.46, group: "Other Liabilites (Payables)" },
  { name: "Punjab Potato Advance", opening: 770.00, receipt: 0, payment: 0, closing: 770.00, group: "Other Liabilites (Payables)" },
  { name: "Share Suspense A/c", opening: 2346.00, receipt: 0, payment: 0, closing: 2346.00, group: "Other Liabilites (Payables)" },
  { name: "Suspense A/c", opening: 3422.05, receipt: 0, payment: 0, closing: 3422.05, group: "Other Liabilites (Payables)" },
  { name: "Seller A/c", opening: 621648.04, receipt: 1054988.00, payment: 1354039.00, closing: 322597.04, group: "Other Liabilites (Payables)" },
  { name: "Provision for Kanda Market Corporation Tax", opening: 19452.00, receipt: 0, payment: 0, closing: 19452.00, group: "Other Liabilites (Payables)" },
  { name: "Govt Audit Fees (Provision)", opening: 650.00, receipt: 0, payment: 0, closing: 650.00, group: "Other Liabilites (Payables)" },
  { name: "Puchase (Ravi S. Chougule)", opening: 49000.00, receipt: 0, payment: 0, closing: 49000.00, group: "Other Liabilites (Payables)" },
  { name: "Security Deposit", opening: 737765.00, receipt: 100000.00, payment: 200000.00, closing: 637765.00, group: "Other Liabilites (Payables)" },

  // Fixed Assets
  { name: "Value of Onion Market Godown", opening: 2250199.98, receipt: 0, payment: 0, closing: 2250199.98, group: "Fixed Assets" },
  { name: "Value of Cold Storage New office Building", opening: 90794.00, receipt: 0, payment: 0, closing: 90794.00, group: "Fixed Assets" },
  { name: "Value of Cold Storage Generator Room", opening: 26335.88, receipt: 0, payment: 0, closing: 26335.88, group: "Fixed Assets" },
  { name: "Value of Office Building", opening: 207271.24, receipt: 0, payment: 0, closing: 207271.24, group: "Fixed Assets" },
  { name: "Value of Cold Storage Shop Godown & Shop", opening: 3391180.70, receipt: 0, payment: 0, closing: 3391180.70, group: "Fixed Assets" },
  { name: "Value of Cold Storage Building", opening: 1991589.89, receipt: 0, payment: 0, closing: 1991589.89, group: "Fixed Assets" },
  { name: "Jai kisan Wholesale New Vegetable Market Shop", opening: 2875000.00, receipt: 0, payment: 0, closing: 2875000.00, group: "Fixed Assets" },

  // Page 2 (Image 3)
  // Plant & Machinery
  { name: "Cold Storage Machinery", opening: 1607043.66, receipt: 0, payment: 0, closing: 1607043.66, group: "Plant & Machinery" },
  { name: "Cold Storage Equipment", opening: 49177.50, receipt: 0, payment: 0, closing: 49177.50, group: "Plant & Machinery" },

  // Fitting & Fixture
  { name: "Value of Electric Fitting", opening: 38164.70, receipt: 0, payment: 0, closing: 38164.70, group: "Fitting & Fixture" },
  { name: "Value of Water Connection", opening: 44330.00, receipt: 0, payment: 0, closing: 44330.00, group: "Fitting & Fixture" },

  // Fluctuation Accets
  { name: "Value of Library Book", opening: 2733.25, receipt: 0, payment: 0, closing: 2733.25, group: "Fluctuation Assets" },
  { name: "Value of Dead Stock", opening: 214632.72, receipt: 0, payment: 0, closing: 214632.72, group: "Fluctuation Assets" },
  { name: "Value of Cold Storage Dead Stock", opening: 10900.00, receipt: 0, payment: 0, closing: 10900.00, group: "Fluctuation Assets" },
  { name: "Value of Computer", opening: 53600.00, receipt: 0, payment: 0, closing: 53600.00, group: "Fluctuation Assets" },

  // Investment
  { name: "The Belgaum DCC Bank RFD-101", opening: 1069937.00, receipt: 0, payment: 0, closing: 1069937.00, group: "Investment" },
  { name: "The Belgaum DCC Bank FD", opening: 5000.00, receipt: 5000.00, payment: 0, closing: 0, group: "Investment" },
  { name: "The Belgaum DCC Bank Share", opening: 25000.00, receipt: 0, payment: 0, closing: 25000.00, group: "Investment" },
  { name: "Shree Bhagyalaxmi Sugar Factory Share Khanapur", opening: 1000.00, receipt: 0, payment: 0, closing: 1000.00, group: "Investment" },
  { name: "Co Op Printing Press", opening: 200.00, receipt: 0, payment: 0, closing: 200.00, group: "Investment" },
  { name: "Indian Farmer Fertilizer (IFFCO)", opening: 20000.00, receipt: 0, payment: 0, closing: 20000.00, group: "Investment" },
  { name: "The Marketndeya Co Op Sugar Factory Share", opening: 20000.00, receipt: 0, payment: 0, closing: 20000.00, group: "Investment" },
  { name: "MK Hubli Sugar Factory Share", opening: 10000.00, receipt: 0, payment: 0, closing: 10000.00, group: "Investment" },
  { name: "New Vegetable Market Share", opening: 1000.00, receipt: 0, payment: 0, closing: 1000.00, group: "Investment" },
  { name: "The Bgm PUC Bank Ltd FD", opening: 100000.00, receipt: 0, payment: 175900.00, closing: 275900.00, group: "Investment" },
  { name: "Sports Club Chandaragi", opening: 2500.00, receipt: 0, payment: 0, closing: 2500.00, group: "Investment" },
  { name: "National Co Op Consumer Marketing Federation", opening: 9600.00, receipt: 0, payment: 0, closing: 9600.00, group: "Investment" },
  { name: "The Belgaum Dist Co Op Consumer Wholesale", opening: 1000.00, receipt: 0, payment: 0, closing: 1000.00, group: "Investment" },
  { name: "The Belgaum Pioneer Bank", opening: 100.00, receipt: 0, payment: 0, closing: 100.00, group: "Investment" },
  { name: "The Karnataka State Marketing Federation", opening: 40000.00, receipt: 0, payment: 0, closing: 40000.00, group: "Investment" },
  { name: "The Belgaum Co Op Purchase & Sale Union", opening: 10.00, receipt: 0, payment: 0, closing: 10.00, group: "Investment" },
  { name: "The Belgaum Co Op Spining Mill Panth Balekundri", opening: 1000.00, receipt: 0, payment: 0, closing: 1000.00, group: "Investment" },
  { name: "The Belgaum PUC Bank Ltd Share", opening: 62000.00, receipt: 0, payment: 0, closing: 62000.00, group: "Investment" },

  // Member Loan
  { name: "Member Loan", opening: 143873.00, receipt: 0, payment: 0, closing: 143873.00, group: "Member Loan" },
  { name: "Member Kind Loan", opening: 60341.85, receipt: 0, payment: 0, closing: 60341.85, group: "Member Loan" },
  { name: "Sou Laxmi Pigmy Deposite Loan", opening: 174000.00, receipt: 307300.00, payment: 292800.00, closing: 159500.00, group: "Member Loan" },
  { name: "Ofice Staff Personal Loan", opening: 17166.00, receipt: 8630.00, payment: 0, closing: 8536.00, group: "Member Loan" },

  // Cash Balance
  { name: "Cash In Hand", opening: 321208.69, receipt: 321208.69, payment: 54329.00, closing: 54329.00, group: "Cash Balance" },

  // Bank Balance
  { name: "The belgaum DCC Bank SB-129", opening: 62451.35, receipt: 100000.00, payment: 84288.00, closing: 46739.35, group: "Bank Balance" },
  { name: "The belgaum DCC Bank SB-1004", opening: 1267.00, receipt: 1267.00, payment: 0, closing: 0, group: "Bank Balance" },
  { name: "The Karnataka Industrial Bank Ltd-13", opening: 691.00, receipt: 691.00, payment: 0, closing: 0, group: "Bank Balance" },
  { name: "The Belgaum Pioneer Urban Bank CD-212", opening: 1315.50, receipt: 1315.50, payment: 0, closing: 0, group: "Bank Balance" },
  { name: "The Belgaum Pioneer Urban Bank CA-0205230007720", opening: 555504.89, receipt: 2066044.96, payment: 1610383.00, closing: 99842.93, group: "Bank Balance" },
  { name: "Union Bank Of India 471501010043184", opening: 202600.53, receipt: 1785952.37, payment: 1837799.00, closing: 254447.16, group: "Bank Balance" },

  // Other Assets (Receivable)
  { name: "ABN Fees", opening: 6291.35, receipt: 0, payment: 0, closing: 6291.35, group: "Other Assets (Receivable)" },
  { name: "Cold Storage Advance", opening: 18594.13, receipt: 0, payment: 0, closing: 18594.13, group: "Other Assets (Receivable)" },
  { name: "Advance A/c", opening: 58618.37, receipt: 1980647.00, payment: 1783733.00, closing: 138295.63, group: "Other Assets (Receivable)" },
  { name: "Festival Advance", opening: 6180.00, receipt: 3200.00, payment: 0, closing: 2980.00, group: "Other Assets (Receivable)" },
  { name: "Legal Fees Advance", opening: 52830.00, receipt: 0, payment: 0, closing: 52830.00, group: "Other Assets (Receivable)" },
  { name: "KEB Deposit (KPTCL)", opening: 163930.30, receipt: 0, payment: 0, closing: 163930.30, group: "Other Assets (Receivable)" },
  { name: "Purchase( Suraj uttam Patil Receivable )", opening: 9637.00, receipt: 0, payment: 0, closing: 9637.00, group: "Other Assets (Receivable)" },
  { name: "Purchase A/c (old)", opening: 112491.28, receipt: 0, payment: 0, closing: 112491.28, group: "Other Assets (Receivable)" },
  { name: "Recovery Fee (Execution Fees)", opening: 7742.51, receipt: 0, payment: 0, closing: 7742.51, group: "Other Assets (Receivable)" },
  { name: "Purchase Advance", opening: 13000.00, receipt: 0, payment: 0, closing: 13000.00, group: "Other Assets (Receivable)" },
  { name: "Sundry Deposits (Individual Deposits)", opening: 14567.24, receipt: 0, payment: 0, closing: 14567.24, group: "Other Assets (Receivable)" },
  { name: "Telephone Deposit", opening: 13067.00, receipt: 0, payment: 0, closing: 13067.00, group: "Other Assets (Receivable)" },
  { name: "Vegetable Market Shop Construction Advance", opening: 51600.00, receipt: 0, payment: 0, closing: 51600.00, group: "Other Assets (Receivable)" },
  { name: "Cold Storage Shop meter Deposit KEB", opening: 40366.00, receipt: 0, payment: 0, closing: 40366.00, group: "Other Assets (Receivable)" },
  { name: "KEB Deposit Head Office", opening: 1030.00, receipt: 0, payment: 0, closing: 1030.00, group: "Other Assets (Receivable)" },
  { name: "APMC License & Bank Guarantee", opening: 10000.00, receipt: 0, payment: 0, closing: 10000.00, group: "Other Assets (Receivable)" },
  { name: "Purchase A/c Prasad C. Mali", opening: 0, receipt: 261968.00, payment: 263648.00, closing: 1680.00, group: "Other Assets (Receivable)" },
  { name: "Vegetable Cash Sale Sri. Ravi Shivaji Chougule Receivable From (1)", opening: 643521.00, receipt: 0, payment: 0, closing: 643521.00, group: "Other Assets (Receivable)" },
  { name: "Vegetable Cash Sale Sri. Ravi Shivaji Chougule Receivable From (2)", opening: 364312.50, receipt: 0, payment: 0, closing: 364312.50, group: "Other Assets (Receivable)" },

  // Page 3 (Image 2)
  { name: "Vegetable Cash Sale (Suraj Uttam Patil) Receivable", opening: 1545452.00, receipt: 0, payment: 0, closing: 1545452.00, group: "Other Assets (Receivable)" },
  { name: "Cold Storage New Shop Electric Deposite", opening: 4890.00, receipt: 0, payment: 0, closing: 4890.00, group: "Other Assets (Receivable)" },
  { name: "Vegetable Cash Sale (Prasad Mali)", opening: 0, receipt: 681850.00, payment: 874986.00, closing: 193136.00, group: "Trading / Operational" },
  { name: "Pesticides Purchases & Sales", opening: 0, receipt: 353608.20, payment: 318282.23, closing: 35325.97, group: "Trading / Operational" },
  { name: "Seeds Purchases & Sales", opening: 0, receipt: 124507.00, payment: 119880.00, closing: 4627.00, group: "Trading / Operational" },
  { name: "Seeds Pesticides, Motar Rent, Hamali", opening: 0, receipt: 0, payment: 3850.00, closing: 3850.00, group: "Expenses" },
  { name: "Administrative Charges", opening: 0, receipt: 0, payment: 6010.00, closing: 6010.00, group: "Expenses" },
  { name: "Annual General Meeting Expenses", opening: 0, receipt: 0, payment: 3820.00, closing: 3820.00, group: "Expenses" },
  { name: "Dividend on Shares", opening: 0, receipt: 11346.00, payment: 0, closing: 11346.00, group: "Income" },
  { name: "TDS A/c", opening: 0, receipt: 500.00, payment: 133136.00, closing: 132636.00, group: "Duties & Taxes" },
  { name: "Onion Market Godown Corporation Tax", opening: 0, receipt: 0, payment: 62118.00, closing: 62118.00, group: "Expenses" },
  { name: "Cold Storage Building Corporation Tax", opening: 0, receipt: 0, payment: 223319.00, closing: 223319.00, group: "Expenses" },
  { name: "Head office Building Corporation Tax", opening: 0, receipt: 0, payment: 58939.00, closing: 58939.00, group: "Expenses" },
  { name: "Commission of Sale of Vegetables", opening: 0, receipt: 270646.00, payment: 0, closing: 270646.00, group: "Income" },
  { name: "Contingency A/c", opening: 0, receipt: 0, payment: 17461.69, closing: 17461.69, group: "Expenses" },
  { name: "Staff Personal Interest", opening: 0, receipt: 377.00, payment: 0, closing: 377.00, group: "Income" },
  { name: "ESI & Other Contibution", opening: 0, receipt: 0, payment: 13383.00, closing: 13383.00, group: "Expenses" },
  { name: "Jai Kisan Wholesale New Vegetable Market Corporation Tax", opening: 0, receipt: 0, payment: 25000.00, closing: 25000.00, group: "Expenses" },
  { name: "Bank Interest", opening: 0, receipt: 0, payment: 1129.50, closing: 1129.50, group: "Expenses" },
  { name: "Electric Power", opening: 0, receipt: 8682.00, payment: 30704.00, closing: 22022.00, group: "Expenses" },
  { name: "Insurance", opening: 0, receipt: 0, payment: 21505.00, closing: 21505.00, group: "Expenses" },
  { name: "Honerium", opening: 0, receipt: 0, payment: 2400.00, closing: 2400.00, group: "Expenses" },
  { name: "Interest on CC Loan", opening: 0, receipt: 0, payment: 29817.00, closing: 29817.00, group: "Expenses" },
  { name: "Insurance Fund", opening: 0, receipt: 0, payment: 2109.00, closing: 2109.00, group: "Expenses" },
  { name: "Interest ON SB RFDDCC Bank", opening: 0, receipt: 81035.00, payment: 0, closing: 81035.00, group: "Income" },
  { name: "Legal Fees", opening: 0, receipt: 0, payment: 51915.00, closing: 51915.00, group: "Expenses" },
  { name: "Meeting Allowance", opening: 0, receipt: 0, payment: 15400.00, closing: 15400.00, group: "Expenses" },
  { name: "Monthly Allowance", opening: 0, receipt: 0, payment: 11000.00, closing: 11000.00, group: "Expenses" },
  { name: "Professional tax Renewal Fee", opening: 0, receipt: 0, payment: 3150.00, closing: 3150.00, group: "Expenses" },
  { name: "Head Office Building Rent", opening: 0, receipt: 180000.00, payment: 0, closing: 180000.00, group: "Income" },
  { name: "Onion Market Godown Rent", opening: 0, receipt: 437312.00, payment: 0, closing: 437312.00, group: "Income" },
  { name: "PF & Other Contibution", opening: 0, receipt: 0, payment: 49396.00, closing: 49396.00, group: "Expenses" },
  { name: "Postage A/c", opening: 0, receipt: 0, payment: 655.00, closing: 655.00, group: "Expenses" },
  { name: "Cold Storage Electric Expences", opening: 0, receipt: 0, payment: 3588.00, closing: 3588.00, group: "Expenses" },
  { name: "Printing & Stationery", opening: 0, receipt: 0, payment: 35364.00, closing: 35364.00, group: "Expenses" },
  { name: "Riksha Charges", opening: 0, receipt: 0, payment: 9846.00, closing: 9846.00, group: "Expenses" },
  { name: "Sou Laxmi Pigmy Deposit Loan Interest", opening: 0, receipt: 6430.00, payment: 36480.00, closing: 30050.00, group: "Financial" },
  { name: "Sou Laxmi Pigmy Deposit Commision", opening: 0, receipt: 16705.00, payment: 179105.00, closing: 162400.00, group: "Financial" },
  { name: "Audit Fee", opening: 0, receipt: 0, payment: 44000.00, closing: 44000.00, group: "Expenses" },
  { name: "Pesticides Discount", opening: 0, receipt: 2622.00, payment: 0, closing: 2622.25, group: "Income" },
  { name: "Under Godown Rent", opening: 0, receipt: 384000.00, payment: 0, closing: 384000.00, group: "Income" },
  { name: "GST Return Filing Fee", opening: 0, receipt: 0, payment: 25400.00, closing: 25400.00, group: "Expenses" },
  { name: "Depreciation A/c", opening: 0, receipt: 0, payment: 240118.00, closing: 240118.00, group: "Expenses" },
  { name: "Cold Storage Charges", opening: 0, receipt: 300000.00, payment: 0, closing: 300000.00, group: "Income" },
  { name: "Incharge Allowance", opening: 0, receipt: 0, payment: 10000.00, closing: 10000.00, group: "Expenses" },
  { name: "Seeds Section Plasstic Bags", opening: 0, receipt: 0, payment: 2190.00, closing: 2190.00, group: "Expenses" },
  { name: "Daily Wages Pay A/c", opening: 0, receipt: 0, payment: 168301.00, closing: 168301.00, group: "Expenses" },
  { name: "Mobile recharge", opening: 0, receipt: 0, payment: 2200.00, closing: 2200.00, group: "Expenses" },
  { name: "CGST 9%", opening: 0, receipt: 172196.00, payment: 31182.92, closing: 141013.44, group: "Duties & Taxes" },
  { name: "SGST 9%", opening: 0, receipt: 172196.36, payment: 31182.92, closing: 141013.44, group: "Duties & Taxes" },

  // Page 4 (Image 4)
  { name: "CGST 2.50%", opening: 0, receipt: 1029.54, payment: 856.73, closing: 172.81, group: "Duties & Taxes" },
  { name: "SGST 2.50%", opening: 0, receipt: 1029.54, payment: 856.73, closing: 172.81, group: "Duties & Taxes" },
  { name: "Damage Expiry leakage material", opening: 0, receipt: 12537.00, payment: 0, closing: 12537.00, group: "Income" },
  { name: "Bank Commission", opening: 0, receipt: 0, payment: 10754.21, closing: 10754.21, group: "Expenses" },
  { name: "Cold Storage Shutter repairy", opening: 0, receipt: 0, payment: 7750.00, closing: 7750.00, group: "Expenses" },
  { name: "Govt of india G.S.T. Paid", opening: 0, receipt: 0, payment: 135751.00, closing: 135750.50, group: "Duties & Taxes" },
  { name: "Govt of karnataka G.S.T. Paid", opening: 0, receipt: 0, payment: 135751.00, closing: 135750.50, group: "Duties & Taxes" },
  { name: "Cold Storage Building Shop Rent", opening: 0, receipt: 50000.00, payment: 0, closing: 50000.00, group: "Income" },
  { name: "Salary A/c", opening: 0, receipt: 0, payment: 415018.00, closing: 415018.00, group: "Expenses" },
  { name: "Cold Storage (Building Godown) Rent", opening: 0, receipt: 353480.00, payment: 0, closing: 353480.00, group: "Income" },
  { name: "Onion market Godown Expences", opening: 0, receipt: 0, payment: 1500.00, closing: 1500.00, group: "Expenses" },
  { name: "F.D. Interest", opening: 0, receipt: 9363.00, payment: 253706.00, closing: 244343.00, group: "Financial" },
  { name: "ESI, P.F. & GST Online Expenses", opening: 0, receipt: 0, payment: 3922.00, closing: 3922.00, group: "Expenses" },
  { name: "Mortgage Loan Interest", opening: 0, receipt: 0, payment: 51683.00, closing: 51683.00, group: "Expenses" },
  { name: "Income Tax Refund", opening: 0, receipt: 89110.00, payment: 0, closing: 89110.00, group: "Income" },
  { name: "Deepavali Pooja Expence", opening: 0, receipt: 0, payment: 1680.00, closing: 1680.00, group: "Expenses" },
  { name: "Cold Storage Board", opening: 0, receipt: 0, payment: 7530.00, closing: 7530.00, group: "Expenses" },
  { name: "Electric Fitting Expence", opening: 0, receipt: 0, payment: 550.00, closing: 550.00, group: "Expenses" },
  { name: "Pooja Expence", opening: 0, receipt: 0, payment: 3915.00, closing: 3915.00, group: "Expenses" },
  { name: "F.D. Interest Payable", opening: 0, receipt: 224807.00, payment: 0, closing: 224807.00, group: "Duties & Taxes" },
  { name: "CLOSING BALANCE", opening: 103996.89, receipt: 0, payment: 0, closing: 75727.63, group: "Closing Balance Adjustment" }
];

let totalOpening = 0;
let totalReceipt = 0;
let totalPayment = 0;
let totalClosing = 0;

for (const row of testData) {
  totalOpening += row.opening;
  totalReceipt += row.receipt;
  totalPayment += row.payment;
  totalClosing += row.closing;
}

console.log("Count:", testData.length);
console.log("Calculated Totals:");
console.log("Opening:", totalOpening.toFixed(2), "Expected: 38370462.89", "Diff:", (totalOpening - 38370462.89).toFixed(2));
console.log("Receipt:", totalReceipt.toFixed(2), "Expected: 21933460.65", "Diff:", (totalReceipt - 21933460.65).toFixed(2));
console.log("Payment:", totalPayment.toFixed(2), "Expected: 21933460.65", "Diff:", (totalPayment - 21933460.65).toFixed(2));
console.log("Closing:", totalClosing.toFixed(2), "Expected: 40383426.01", "Diff:", (totalClosing - 40383426.01).toFixed(2));
