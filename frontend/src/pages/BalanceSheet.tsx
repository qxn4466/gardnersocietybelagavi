import React, { useState, useCallback, useEffect } from 'react';
import { Printer, RefreshCw, Globe, Save, FolderOpen } from 'lucide-react';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';
import type { User } from '../types';
import { saveAuditReport, listAuditReports, SavedAuditReport } from '../api/client';
import { getFinancialYear, getFiscalStartDate, getPreviousFinancialYear } from '../utils/auditReports';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface BSItem {
  id: string;
  prevAmount: string; // 2024-25
  particulars: string;
  particulars_mr: string;
  currAmount: string; // 2025-26
  isCategoryHeader?: boolean;
  categoryColor?: string;
  subTotal?: string;
}

export interface BSRowPair {
  id: string;
  liab: BSItem;
  asset: BSItem;
}

const formatAsAtDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(date).toUpperCase();
};

const parseNum = (value: string): number => {
  const parsed = Number.parseFloat((value || '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmtNum = (value: number): string => value.toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BalanceSheetProps {
  user?: User | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

// ─── Initial Default Data (Exact values from screenshot) ───────────────────
const buildDefaultRows = (): BSRowPair[] => [
  // ── Share Capital vs Cash Balance ──
  {
    id: 'bs_1',
    liab: { id: 'l_cat_share', prevAmount: '', particulars: 'Share Capital', particulars_mr: 'भागभांडवल (Share Capital)', currAmount: '', isCategoryHeader: true, subTotal: '4,88,975.00' },
    asset: { id: 'a_cat_cash', prevAmount: '', particulars: 'Cash Balance', particulars_mr: 'रोख शिल्लक (Cash Balance)', currAmount: '', isCategoryHeader: true, subTotal: '54,329.00' },
  },
  {
    id: 'bs_2',
    liab: { id: 'l_share_mem', prevAmount: '4,88,575', particulars: 'Share Capital Member Fund', particulars_mr: 'सभासद भागभांडवल निधी', currAmount: '4,88,975' },
    asset: { id: 'a_cash_hand', prevAmount: '3,21,209', particulars: 'Cash in Hand', particulars_mr: 'हातातील रोख', currAmount: '54,329.00' },
  },

  // ── Fund vs Bank Balance ──
  {
    id: 'bs_3',
    liab: { id: 'l_cat_fund', prevAmount: '', particulars: 'Fund', particulars_mr: 'निधी (Funds)', currAmount: '', isCategoryHeader: true, subTotal: '1,09,30,259.00' },
    asset: { id: 'a_cat_bank', prevAmount: '', particulars: 'Bank Balance', particulars_mr: 'बँक शिल्लक (Bank Balance)', currAmount: '', isCategoryHeader: true, subTotal: '4,72,200.00' },
  },
  {
    id: 'bs_4',
    liab: { id: 'l_res_fund', prevAmount: '24,64,304', particulars: 'Reserve Fund', particulars_mr: 'राखीव निधी', currAmount: '24,64,304' },
    asset: { id: 'a_bank_puc_cc', prevAmount: '', particulars: 'The Belgaum PUC Bank Ltd C.C.', particulars_mr: 'बेळगाव पीयूसी बँक चालू कर्ज', currAmount: '71,171.00' },
  },
  {
    id: 'bs_5',
    liab: { id: 'l_agri_dev', prevAmount: '75,317', particulars: 'Agri Dev Propaganda Fund', particulars_mr: 'कृषी विकास प्रचार निधी', currAmount: '75,317' },
    asset: { id: 'a_bank_dcc_129', prevAmount: '62,451', particulars: 'The Belgaum DCC Bank SB-129', particulars_mr: 'बेळगाव डीसीसी बँक एसबी-१२९', currAmount: '46,739.00' },
  },
  {
    id: 'bs_6',
    liab: { id: 'l_agri_impl', prevAmount: '1,49,354', particulars: 'Agri Implement Dev Propaganda Fund', particulars_mr: 'कृषी अवजारे विकास प्रचार निधी', currAmount: '1,49,354' },
    asset: { id: 'a_bank_puc_ca', prevAmount: '5,55,505', particulars: 'The PUC Bank Ltd C.A.', particulars_mr: 'द पीयूसी बँक लि. सी.ए.', currAmount: '99,843.00' },
  },
  {
    id: 'bs_7',
    liab: { id: 'l_onion_dep', prevAmount: '11,68,711', particulars: 'Onion Market Godown Depreciation Fund', particulars_mr: 'कांदा बाजार गोदाम घसारा निधी', currAmount: '12,36,216' },
    asset: { id: 'a_bank_union', prevAmount: '2,02,601', particulars: 'Union Bank Of India-471501010043184', particulars_mr: 'युनियन बँक ऑफ इंडिया ४७१५०१०१००४३१८४', currAmount: '2,54,447.00' },
  },
  {
    id: 'bs_8',
    liab: { id: 'l_bad_debt', prevAmount: '2,43,663', particulars: 'Bad Debt Fund', particulars_mr: 'बुडीत कर्ज निधी', currAmount: '2,43,663' },
    asset: { id: 'a_bank_dcc_1004', prevAmount: '1,267', particulars: 'The Belgaum DCC Bank No-1004', particulars_mr: 'बेळगाव डीसीसी बँक क्र-१००४', currAmount: '' },
  },
  {
    id: 'bs_9',
    liab: { id: 'l_off_bldg_dep', prevAmount: '2,74,490', particulars: 'Office Building Depreciation Fund', particulars_mr: 'कार्यालय इमारत घसारा निधी', currAmount: '2,74,490' },
    asset: { id: 'a_bank_kar_ind', prevAmount: '691', particulars: 'The Karnataka Industrial Bank No-613', particulars_mr: 'कर्नाटक औद्योगिक बँक क्र-६१३', currAmount: '' },
  },
  {
    id: 'bs_10',
    liab: { id: 'l_bldg_fund', prevAmount: '11,69,824', particulars: 'Building Fund', particulars_mr: 'इमारत निधी', currAmount: '11,69,824' },
    asset: { id: 'a_bank_puc_212', prevAmount: '1,316', particulars: 'The Belgaum PUC Bank No 212', particulars_mr: 'बेळगाव पीयूसी बँक क्र २१२', currAmount: '' },
  },
  {
    id: 'bs_11',
    liab: { id: 'l_charity', prevAmount: '14', particulars: 'Charity Fund', particulars_mr: 'दान निधी', currAmount: '14' },
    asset: { id: 'a_cat_inv', prevAmount: '', particulars: 'Investment', particulars_mr: 'गुंतवणूक (Investment)', currAmount: '', isCategoryHeader: true, subTotal: '15,39,247.00' },
  },
  {
    id: 'bs_12',
    liab: { id: 'l_cs_equip_prop', prevAmount: '22,332', particulars: 'Cold Storage Equipment & dev Propaganda Fund', particulars_mr: 'शीतगृह उपकरणे व विकास प्रचार निधी', currAmount: '24,790' },
    asset: { id: 'a_inv_dcc_rfd', prevAmount: '10,69,937', particulars: 'The Belgaum DCC Bank RFD-101', particulars_mr: 'बेळगाव डीसीसी बँक आरएफडी-१०१', currAmount: '10,69,937.00' },
  },
  {
    id: 'bs_13',
    liab: { id: 'l_cap_res_tractor', prevAmount: '1,89,194', particulars: 'Capital Reserve Fund (Tractor Sale)', particulars_mr: 'भांडवल राखीव निधी (ट्रॅक्टर विक्री)', currAmount: '1,89,194' },
    asset: { id: 'a_inv_dcc_share', prevAmount: '25,000', particulars: 'The Belgaum DCC Bank Share', particulars_mr: 'बेळगाव डीसीसी बँक समभाग', currAmount: '25,000.00' },
  },
  {
    id: 'bs_14',
    liab: { id: 'l_cs_bldg_dep', prevAmount: '15,35,058', particulars: 'Cold Storage Building Depreciation Fund', particulars_mr: 'शीतगृह इमारत घसारा निधी', currAmount: '15,94,805' },
    asset: { id: 'a_inv_sugar', prevAmount: '1,000', particulars: 'Shree Bhagyalaxmi Sugar Factory Share Khanapur', particulars_mr: 'श्री भाग्यलक्ष्मी साखर कारखाना समभाग', currAmount: '1,000.00' },
  },
  {
    id: 'bs_15',
    liab: { id: 'l_cs_dead_dep', prevAmount: '4,146', particulars: 'Cold Storage Dead Stock Depreciation Fund', particulars_mr: 'शीतगृह जुना साठा घसारा निधी', currAmount: '4,473' },
    asset: { id: 'a_inv_coop_print', prevAmount: '200', particulars: 'Co Op Printing Press', particulars_mr: 'को-ऑप छपाई केंद्र', currAmount: '200.00' },
  },
  {
    id: 'bs_16',
    liab: { id: 'l_cs_mach_dep', prevAmount: '18,41,422', particulars: 'Cold Storage Machinery Depreciation Fund', particulars_mr: 'शीतगृह यंत्रसामग्री घसारा निधी', currAmount: '18,41,422' },
    asset: { id: 'a_inv_iffco', prevAmount: '20,000', particulars: 'Indian Farmer Fertilizer (IFFCO)', particulars_mr: 'भारतीय शेतकरी खत (इफको)', currAmount: '20,000.00' },
  },
  {
    id: 'bs_17',
    liab: { id: 'l_cs_varanda_dep', prevAmount: '1,13,590', particulars: 'Cold Storage Varanda & New Office Depreciation Fund', particulars_mr: 'शीतगृह व्हरांडा व नवीन कार्यालय घसारा निधी', currAmount: '1,13,590' },
    asset: { id: 'a_inv_mkt_sugar', prevAmount: '20,000', particulars: 'The Marketndeya Co Op Sugar Factory Share', particulars_mr: 'मार्केटंदेव को-ऑप साखर कारखाना समभाग', currAmount: '20,000.00' },
  },
  {
    id: 'bs_18',
    liab: { id: 'l_cs_gen_dep', prevAmount: '32,948', particulars: 'Cold Storage Generator Room Depreciation Fund', particulars_mr: 'शीतगृह जनरेटर खोली घसारा निधी', currAmount: '32,948' },
    asset: { id: 'a_inv_mk_hubli', prevAmount: '10,000', particulars: 'MK Hubli Sugar Factory Share', particulars_mr: 'एमके हुबळी साखर कारखाना समभाग', currAmount: '10,000.00' },
  },
  {
    id: 'bs_19',
    liab: { id: 'l_comp_dep', prevAmount: '53,600', particulars: 'Computer Depreciation Fund', particulars_mr: 'संगणक घसारा निधी', currAmount: '53,600' },
    asset: { id: 'a_inv_veg_mkt', prevAmount: '1,000', particulars: 'New Vegetable Market Share', particulars_mr: 'नवीन भाजीपाला बाजार समभाग', currAmount: '1,000.00' },
  },
  {
    id: 'bs_20',
    liab: { id: 'l_dead_stock_dep', prevAmount: '1,01,979', particulars: 'Dead Stock Depreciation', particulars_mr: 'जुना साठा घसारा', currAmount: '1,08,417' },
    asset: { id: 'a_inv_dgm_fd', prevAmount: '1,00,000', particulars: 'The Dgm PUC Bank Ltd FD', particulars_mr: 'डीजीएम पीयूसी बँक लि. मुदत ठेव', currAmount: '2,75,900.00' },
  },
  {
    id: 'bs_21',
    liab: { id: 'l_div_eq_fund', prevAmount: '2,000', particulars: 'Dividend Equalization Fund', particulars_mr: 'लाभांश समकरण निधी', currAmount: '2,000' },
    asset: { id: 'a_inv_sports_club', prevAmount: '2,500', particulars: 'Sports Club Chandaragi', particulars_mr: 'स्पोर्ट्स क्लब चंदरागी', currAmount: '2,500.00' },
  },
  {
    id: 'bs_22',
    liab: { id: 'l_elec_fit_dep', prevAmount: '35,641', particulars: 'Electric Fitting Depreciation Fund', particulars_mr: 'विद्युत फिटिंग घसारा निधी', currAmount: '37,549' },
    asset: { id: 'a_inv_natl_coop', prevAmount: '9,600', particulars: 'National Co Op Consumer Marketing Federation', particulars_mr: 'राष्ट्रीय को-ऑप ग्राहक विपणन महासंघ', currAmount: '9,600.00' },
  },
  {
    id: 'bs_23',
    liab: { id: 'l_golden_jub', prevAmount: '1,42,567.61', particulars: 'Golden Jubilee Fund', particulars_mr: 'सुवर्ण महोत्सव निधी', currAmount: '1,42,567.61' },
    asset: { id: 'a_inv_pioneer_bank', prevAmount: '100', particulars: 'The Belgaum PUC Bank', particulars_mr: 'बेळगाव पीयूसी बँक समभाग', currAmount: '100.00' },
  },
  {
    id: 'bs_24',
    liab: { id: 'l_guest_fund', prevAmount: '11,487.06', particulars: 'Guest Fund', particulars_mr: 'अतिथी निधी', currAmount: '11,487.06' },
    asset: { id: 'a_inv_kar_mkt_fed', prevAmount: '40,000', particulars: 'The Karnataka State Marketing Federation', particulars_mr: 'कर्नाटक राज्य विपणन महासंघ', currAmount: '40,000.00' },
  },
  {
    id: 'bs_25',
    liab: { id: 'l_price_fluct', prevAmount: '1,20,703.01', particulars: 'Price Fluctuation Fund', particulars_mr: 'मूल्य चढउतार निधी', currAmount: '1,20,703.01' },
    asset: { id: 'a_inv_purchase_union', prevAmount: '10', particulars: 'The Belgaum Co Op Purchase & Sale Union', particulars_mr: 'बेळगाव को-ऑप खरेदी व विक्री संघ', currAmount: '10.00' },
  },
  {
    id: 'bs_26',
    liab: { id: 'l_unforeseen_loss', prevAmount: '16,241.32', particulars: 'Provision for Unforeseen Losses Fund', particulars_mr: 'अनपेक्षित नुकसान तरतूद निधी', currAmount: '16,241.32' },
    asset: { id: 'a_inv_spinning_mill', prevAmount: '1,000', particulars: 'The Belgaum Co Op Spinning Mill Panth Balekundri', particulars_mr: 'बेळगाव को-ऑप सूत गिरणी पंत बालेकुंद्री', currAmount: '1,000.00' },
  },
  {
    id: 'bs_27',
    liab: { id: 'l_shop_godown_dep', prevAmount: '7,19,179.65', particulars: 'Shop cum Godown Depreciation Fund', particulars_mr: 'दुकान-गोदाम घसारा निधी', currAmount: '8,20,914.65' },
    asset: { id: 'a_inv_puc_share', prevAmount: '62,000', particulars: 'The Belgaum PUC Bank Ltd Share', particulars_mr: 'बेळगाव पीयूसी बँक लि. समभाग', currAmount: '62,000.00' },
  },
  {
    id: 'bs_28',
    liab: { id: 'l_water_conn_dep', prevAmount: '52,789.00', particulars: 'Water Connection Depreciation Fund', particulars_mr: 'पाणी जोडणी घसारा निधी', currAmount: '52,789.00' },
    asset: { id: 'a_inv_wholesale', prevAmount: '1,000', particulars: 'The Belgaum District Co Op Consumer Wholesale', particulars_mr: 'बेळगाव जिल्हा को-ऑप ग्राहक घाऊक', currAmount: '1,000.00' },
  },
  {
    id: 'bs_29',
    liab: { id: 'l_gratuity_fund', prevAmount: '2,26,433.00', particulars: 'Gratuity Fund', particulars_mr: 'सेवानिवृत्ती लाभ निधी', currAmount: '1,30,904.00' },
    asset: { id: 'a_inv_dcc_dep', prevAmount: '5,000', particulars: 'Deposite D.C.C. Bank', particulars_mr: 'डीसीसी बँक ठेव', currAmount: '1,000.00' },
  },
  {
    id: 'bs_30',
    liab: { id: 'l_education_fund', prevAmount: '18,681.00', particulars: 'Education Fund', particulars_mr: 'शिक्षण निधी', currAmount: '18,681.00' },
    asset: { id: 'a_cat_mem_loan', prevAmount: '', particulars: 'Member Loan', particulars_mr: 'सभासद कर्ज (Member Loans)', currAmount: '', isCategoryHeader: true, subTotal: '3,72,250.85' },
  },

  // ── Govt Subsidies & Loans ──
  {
    id: 'bs_31',
    liab: { id: 'l_cat_govt_sub', prevAmount: '', particulars: 'Govt. Loan Subsidies', particulars_mr: 'शासकीय कर्ज अनुदान', currAmount: '', isCategoryHeader: true, subTotal: '40,000.00' },
    asset: { id: 'a_mem_loans', prevAmount: '1,43,873.00', particulars: 'Member Loans', particulars_mr: 'सभासद कर्ज', currAmount: '1,43,873.00' },
  },
  {
    id: 'bs_32',
    liab: { id: 'l_comp_subsidy', prevAmount: '40,000.00', particulars: 'Computer Purchase Subsidy', particulars_mr: 'संगणक खरेदी अनुदान', currAmount: '40,000.00' },
    asset: { id: 'a_mem_kind_loans', prevAmount: '60,341.85', particulars: 'Member Kind Loans', particulars_mr: 'सभासद वस्तू कर्ज', currAmount: '60,341.85' },
  },
  {
    id: 'bs_33',
    liab: { id: 'l_cat_bank_loan', prevAmount: '', particulars: 'Bank Loan', particulars_mr: 'बँक कर्ज (Bank Loan)', currAmount: '', isCategoryHeader: true, subTotal: '1,74,018.00' },
    asset: { id: 'a_laxmi_loans', prevAmount: '1,74,000.00', particulars: 'Sou. Laxmi Pigny Deposit Loans', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कर्ज', currAmount: '1,59,500.00' },
  },
  {
    id: 'bs_34',
    liab: { id: 'l_pioneer_mortgage', prevAmount: '6,34,483.00', particulars: 'The Belgaum Pioneer Bank Mortgage Loan', particulars_mr: 'बेळगाव पायोनियर बँक तारण कर्ज', currAmount: '1,74,018.00' },
    asset: { id: 'a_staff_loans', prevAmount: '17,166.00', particulars: 'Staff Personal Loans', particulars_mr: 'कर्मचारी वैयक्तिक कर्ज', currAmount: '8,536.00' },
  },
  {
    id: 'bs_35',
    liab: { id: 'l_pioneer_cc', prevAmount: '3,54,030.45', particulars: 'The Belgaum Pioneer Bank C.C.', particulars_mr: 'बेळगाव पायोनियर बँक चालू कर्ज', currAmount: '' },
    asset: { id: 'a_cat_fix_asset', prevAmount: '', particulars: 'Fix Asset', particulars_mr: 'स्थायी मालमत्ता (Fixed Assets)', currAmount: '', isCategoryHeader: true, subTotal: '1,08,32,371.69' },
  },

  // ── Deposit & Fixed Assets ──
  {
    id: 'bs_36',
    liab: { id: 'l_cat_deposit', prevAmount: '', particulars: 'Deposit', particulars_mr: 'ठेव (Deposits)', currAmount: '', isCategoryHeader: true, subTotal: '52,36,352.00' },
    asset: { id: 'a_fix_onion_godown', prevAmount: '22,50,199.98', particulars: 'Value of Onion Market Godown', particulars_mr: 'कांदा बाजार गोदामाचे मूल्य', currAmount: '22,50,199.98' },
  },
  {
    id: 'bs_37',
    liab: { id: 'l_dep_sou_laxmi', prevAmount: '37,24,915.00', particulars: 'Sou. Laxmi Pigmy Deposit', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव', currAmount: '41,78,895.00' },
    asset: { id: 'a_fix_cs_varanda', prevAmount: '90,794.00', particulars: 'Value of Cold Storage New Office Varanda', particulars_mr: 'शीतगृह नवीन कार्यालय व्हरांडा मूल्य', currAmount: '90,794.00' },
  },
  {
    id: 'bs_38',
    liab: { id: 'l_dep_recurring', prevAmount: '285.00', particulars: 'Recurring Deposit', particulars_mr: 'आवर्ती ठेव', currAmount: '285.00' },
    asset: { id: 'a_fix_cs_gen', prevAmount: '2,07,271.24', particulars: 'Value of Cold Storage Generator Room', particulars_mr: 'शीतगृह जनरेटर खोली मूल्य', currAmount: '2,07,271.24' },
  },
  {
    id: 'bs_39',
    liab: { id: 'l_dep_fixed', prevAmount: '11,30,089.00', particulars: 'Fixed Deposite', particulars_mr: 'मुदत ठेव', currAmount: '10,57,172.00' },
    asset: { id: 'a_fix_off_bldg', prevAmount: '26,335.88', particulars: 'Value of Office Building', particulars_mr: 'कार्यालय इमारत मूल्य', currAmount: '26,335.88' },
  },
  {
    id: 'bs_40',
    liab: { id: 'l_cat_other_liab', prevAmount: '', particulars: 'Other Liabilities (Payables)', particulars_mr: 'इतर दायित्वे (देणी)', currAmount: '', isCategoryHeader: true, subTotal: '21,75,126.86' },
    asset: { id: 'a_fix_cs_shop', prevAmount: '33,91,180.70', particulars: 'Value of Shop Cum Godown Cold St', particulars_mr: 'शीतगृह दुकान गोदाम मूल्य', currAmount: '33,91,180.70' },
  },
  {
    id: 'bs_41',
    liab: { id: 'l_audit_obj', prevAmount: '6,357.95', particulars: 'Audit Objection Under Protest', particulars_mr: 'निषेधाखाली लेखापरीक्षण आक्षेप', currAmount: '6,357.95' },
    asset: { id: 'a_fix_cs_bldg', prevAmount: '19,91,589.89', particulars: 'Value of Cold Storage Building', particulars_mr: 'शीतगृह इमारत मूल्य', currAmount: '19,91,589.89' },
  },
  {
    id: 'bs_42',
    liab: { id: 'l_dep_protest', prevAmount: '319.00', particulars: 'Deposit Under Protest', particulars_mr: 'निषेधाखाली ठेव', currAmount: '319.00' },
    asset: { id: 'a_fix_jai_kisan', prevAmount: '28,75,000.00', particulars: 'Jai Kisan Wholesale New Vegetable Market Shop', particulars_mr: 'जय किसान घाऊक नवीन भाजीपाला बाजार दुकान', currAmount: '28,75,000.00' },
  },

  // ── Plant & Machinery / Fitting & Fixture / Fluctuation ──
  {
    id: 'bs_43',
    liab: { id: 'l_cpf', prevAmount: '48,308.80', particulars: 'Central Provident Fund', particulars_mr: 'केंद्रीय भविष्य निर्वाह निधी', currAmount: '34,086.80' },
    asset: { id: 'a_cat_plant', prevAmount: '', particulars: 'Plant and Machinery', particulars_mr: 'यंत्रसामग्री (Plant & Machinery)', currAmount: '', isCategoryHeader: true, subTotal: '16,56,221.16' },
  },
  {
    id: 'bs_44',
    liab: { id: 'l_emd', prevAmount: '3,750.00', particulars: 'EMD', particulars_mr: 'बयाना ठेव', currAmount: '3,750.00' },
    asset: { id: 'a_plant_mach', prevAmount: '16,07,043.66', particulars: 'Value of Cold Storage Machinery', particulars_mr: 'शीतगृह यंत्रसामग्री मूल्य', currAmount: '16,07,043.66' },
  },
  {
    id: 'bs_45',
    liab: { id: 'l_election_dep', prevAmount: '7,450.00', particulars: 'Election Deposit', particulars_mr: 'निवडणूक ठेव', currAmount: '7,450.00' },
    asset: { id: 'a_plant_equip', prevAmount: '49,177.50', particulars: 'Value of Cold Storage Equipment', particulars_mr: 'शीतगृह उपकरणे मूल्य', currAmount: '49,177.50' },
  },
  {
    id: 'bs_46',
    liab: { id: 'l_esi', prevAmount: '9,095.58', particulars: 'ESI A/c', particulars_mr: 'ईएसआय खाते', currAmount: '8,718.58' },
    asset: { id: 'a_cat_fitting', prevAmount: '', particulars: 'Fitting & Fixture', particulars_mr: 'फिटिंग व फर्निचर (Fitting & Fixture)', currAmount: '', isCategoryHeader: true, subTotal: '82,494.70' },
  },
  {
    id: 'bs_47',
    liab: { id: 'l_member_div', prevAmount: '3,84,301.35', particulars: 'Member Dividend', particulars_mr: 'सभासद लाभांश', currAmount: '3,84,301.35' },
    asset: { id: 'a_fit_elec', prevAmount: '38,164.70', particulars: 'Value of Electric Fitting', particulars_mr: 'विद्युत फिटिंग मूल्य', currAmount: '38,164.70' },
  },
  {
    id: 'bs_48',
    liab: { id: 'l_sundry', prevAmount: '3,13,938.18', particulars: 'Sundry A/c', particulars_mr: 'विविध खाते', currAmount: '3,31,034.46' },
    asset: { id: 'a_fit_water', prevAmount: '44,330.00', particulars: 'Value of Water Connection', particulars_mr: 'पाणी जोडणी मूल्य', currAmount: '44,330.00' },
  },
  {
    id: 'bs_49',
    liab: { id: 'l_punjab_potato', prevAmount: '770.00', particulars: 'Punjab Potato Advance', particulars_mr: 'पंजाब बटाटा आगाऊ', currAmount: '770.00' },
    asset: { id: 'a_cat_fluct', prevAmount: '', particulars: 'Fluctuation Asset', particulars_mr: 'चढउतार मालमत्ता (Fluctuation Assets)', currAmount: '', isCategoryHeader: true, subTotal: '2,81,865.97' },
  },
  {
    id: 'bs_50',
    liab: { id: 'l_share_susp', prevAmount: '2,346.00', particulars: 'Share Suspense A/c', particulars_mr: 'भाग निलंबन खाते', currAmount: '2,346.00' },
    asset: { id: 'a_fluct_library', prevAmount: '2,733.25', particulars: 'Value of Library Book', particulars_mr: 'ग्रंथालय पुस्तक मूल्य', currAmount: '2,733.25' },
  },
  {
    id: 'bs_51',
    liab: { id: 'l_suspense', prevAmount: '3,422.05', particulars: 'Suspense A/c', particulars_mr: 'निलंबन खाते', currAmount: '3,422.05' },
    asset: { id: 'a_fluct_dead', prevAmount: '2,14,632.72', particulars: 'Value of Dead Stock', particulars_mr: 'जुना साठा मूल्य', currAmount: '2,14,632.72' },
  },
  {
    id: 'bs_52',
    liab: { id: 'l_seller', prevAmount: '6,21,648.04', particulars: 'Seller A/c', particulars_mr: 'विक्रेता खाते', currAmount: '3,22,597.04' },
    asset: { id: 'a_fluct_cs_dead', prevAmount: '10,900.00', particulars: 'Value of Cold Storage Dead Stock', particulars_mr: 'शीतगृह जुना साठा मूल्य', currAmount: '10,900.00' },
  },
  {
    id: 'bs_53',
    liab: { id: 'l_kanda_tax', prevAmount: '19,452.00', particulars: 'Provision for Kanda Market Corporation Tax', particulars_mr: 'कांदा बाजार महामंडळ कर तरतूद', currAmount: '19,452.00' },
    asset: { id: 'a_fluct_computer', prevAmount: '53,600.00', particulars: 'Value of Computer', particulars_mr: 'संगणक मूल्य', currAmount: '53,600.00' },
  },
  {
    id: 'bs_54',
    liab: { id: 'l_govt_audit', prevAmount: '650.00', particulars: 'Govt Audit Fees (Provision)', particulars_mr: 'शासकीय लेखापरीक्षण शुल्क (तरतूद)', currAmount: '650.00' },
    asset: { id: 'a_cat_other_assets', prevAmount: '', particulars: 'Other Assets (Receivable)', particulars_mr: 'इतर मालमत्ता (प्राप्य)', currAmount: '', isCategoryHeader: true, subTotal: '32,71,118.31' },
  },
  {
    id: 'bs_55',
    liab: { id: 'l_pur_chougule', prevAmount: '49,000.00', particulars: 'Purchase (Ravi S. Chougule)', particulars_mr: 'खरेदी (रवि एस. चौगुले)', currAmount: '49,000.00' },
    asset: { id: 'a_oth_abn', prevAmount: '6,291.35', particulars: 'ABN Fees', particulars_mr: 'एबीएन शुल्क', currAmount: '6,291.35' },
  },
  {
    id: 'bs_56',
    liab: { id: 'l_veg_prasad', prevAmount: '4.00', particulars: 'Vegetable Cash Sale (Prasad Mali)', particulars_mr: 'भाजीपाला रोख विक्री (प्रसाद माळी)', currAmount: '4.00' },
    asset: { id: 'a_oth_cs_adv', prevAmount: '18,594.13', particulars: 'Cold Storage Advance', particulars_mr: 'शीतगृह आगाऊ', currAmount: '18,594.13' },
  },
  {
    id: 'bs_57',
    liab: { id: 'l_sec_dep', prevAmount: '7,37,765.00', particulars: 'Security Deposit', particulars_mr: 'सुरक्षा ठेव', currAmount: '6,37,765.00' },
    asset: { id: 'a_oth_fest_adv', prevAmount: '6,180.00', particulars: 'Festival Advance', particulars_mr: 'उत्सव आगाऊ', currAmount: '2,980.00' },
  },
  {
    id: 'bs_58',
    liab: { id: 'l_advance_ac', prevAmount: '', particulars: 'Advance A/c', particulars_mr: 'आगाऊ खाते', currAmount: '1,38,295.63' },
    asset: { id: 'a_oth_legal_adv', prevAmount: '52,830.00', particulars: 'Legal Fees Advance', particulars_mr: 'कायदेशीर शुल्क आगाऊ', currAmount: '52,830.00' },
  },
  {
    id: 'bs_59',
    liab: { id: 'l_fd_int_pay', prevAmount: '', particulars: 'F.D. Interest Payable', particulars_mr: 'मुदत ठेव व्याज देय', currAmount: '2,24,807.00' },
    asset: { id: 'a_oth_keb_dep', prevAmount: '1,63,930.30', particulars: 'KEB Deposit (KPTCL)', particulars_mr: 'केईबी ठेव (केपीटीसीएल)', currAmount: '1,63,930.30' },
  },
  {
    id: 'bs_60',
    liab: { id: 'l_empty_pad1', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_pur_old', prevAmount: '1,12,491.28', particulars: 'Purchase A/c (Sundry Debtors)', particulars_mr: 'खरेदी खाते (जुने प्राप्य)', currAmount: '1,12,491.28' },
  },
  {
    id: 'bs_61',
    liab: { id: 'l_empty_pad2', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_recovery', prevAmount: '7,742.51', particulars: 'Recovery Fee (Execution Fees)', particulars_mr: 'वसुली शुल्क', currAmount: '7,742.51' },
  },
  {
    id: 'bs_62',
    liab: { id: 'l_empty_pad3', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_proc_adv', prevAmount: '13,000.00', particulars: 'Purchase Advance', particulars_mr: 'खरेदी आगाऊ', currAmount: '13,000.00' },
  },
  {
    id: 'bs_63',
    liab: { id: 'l_empty_pad4', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_sundry_dep', prevAmount: '14,567.24', particulars: 'Sundry Deposits (Individual Deposits)', particulars_mr: 'विविध ठेवी', currAmount: '14,567.24' },
  },
  {
    id: 'bs_64',
    liab: { id: 'l_empty_pad5', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_tel_dep', prevAmount: '13,067.00', particulars: 'Telephone Deposit', particulars_mr: 'दूरध्वनी ठेव', currAmount: '13,067.00' },
  },
  {
    id: 'bs_65',
    liab: { id: 'l_empty_pad6', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_veg_adv', prevAmount: '51,600.00', particulars: 'Vegetable Market Shop Construction Advance', particulars_mr: 'भाजीपाला बाजार दुकान बांधकाम आगाऊ', currAmount: '51,600.00' },
  },
  {
    id: 'bs_66',
    liab: { id: 'l_empty_pad7', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_keb_meter', prevAmount: '40,366.00', particulars: 'Cold Storage Shop Meter Deposit KEB', particulars_mr: 'शीतगृह दुकान मीटर ठेव', currAmount: '40,366.00' },
  },
  {
    id: 'bs_67',
    liab: { id: 'l_empty_pad8', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_keb_ho', prevAmount: '1,030.00', particulars: 'KEB Deposit Head Office', particulars_mr: 'केईबी ठेव मुख्य कार्यालय', currAmount: '1,030.00' },
  },
  {
    id: 'bs_68',
    liab: { id: 'l_empty_pad9', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_apmc', prevAmount: '10,000.00', particulars: 'APMC License & Bank Guarantee', particulars_mr: 'एपीएमसी परवाना व बँक हमी', currAmount: '10,000.00' },
  },
  {
    id: 'bs_69',
    liab: { id: 'l_empty_pad10', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_ravi1', prevAmount: '6,43,521.00', particulars: 'Vegetable Cash Sale Sri. Ravi Shivaji Chougule (1)', particulars_mr: 'भाजीपाला रोख विक्री (रवि एस. चौगुले)', currAmount: '6,43,521.00' },
  },
  {
    id: 'bs_70',
    liab: { id: 'l_empty_pad11', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_misapp1', prevAmount: '3,64,312.50', particulars: 'Misappropriation Receivable', particulars_mr: 'नुकसान भरपाई प्राप्य', currAmount: '3,64,312.50' },
  },
  {
    id: 'bs_71',
    liab: { id: 'l_empty_pad12', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_misapp2', prevAmount: '15,45,452.00', particulars: 'Misappropriation Receivable (Suraj Uttam Patil)', particulars_mr: 'नुकसान भरपाई प्राप्य (सुरज यू. पाटील)', currAmount: '15,45,452.00' },
  },
  {
    id: 'bs_72',
    liab: { id: 'l_empty_pad13', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_cs_meter', prevAmount: '4,890.00', particulars: 'Cold Storage New Shop Electric Deposite', particulars_mr: 'शीतगृह नवीन दुकान वीज ठेव', currAmount: '4,890.00' },
  },
  {
    id: 'bs_73',
    liab: { id: 'l_empty_pad14', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_prasad_mali', prevAmount: '', particulars: 'Vegetable Cash Sale (Prasad C. Mali) Receivable', particulars_mr: 'भाजीपाला रोख विक्री (प्रसाद सी. माळी) प्राप्य', currAmount: '1,93,136.00' },
  },
  {
    id: 'bs_74',
    liab: { id: 'l_empty_pad15', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_oth_pur_mali', prevAmount: '', particulars: 'Purchase A/c (Prasad C. Mali) Receivable', particulars_mr: 'खरेदी खाते (प्रसाद सी. माळी) प्राप्य', currAmount: '1,680.00' },
  },
  {
    id: 'bs_75',
    liab: { id: 'l_cat_net_profit', prevAmount: '', particulars: 'Net Profit Section', particulars_mr: 'निव्वळ नफा (Cumulative Net Profit)', currAmount: '', isCategoryHeader: true, subTotal: '4,38,140.38' },
    asset: { id: 'a_oth_suraj_patil', prevAmount: '9,637.00', particulars: 'Purchase A/c (Suraj uttam Patil)', particulars_mr: 'खरेदी खाते (सुरज यू. पाटील)', currAmount: '9,637.00' },
  },
  {
    id: 'bs_76',
    liab: { id: 'l_np_2023_24', prevAmount: '3,61,682.04', particulars: 'Net Profit 2023-2024', particulars_mr: 'निव्वळ नफा २०२३-२०२४', currAmount: '3,61,682.04' },
    asset: { id: 'a_oth_adv_ac', prevAmount: '58,618.37', particulars: 'Advance A/c', particulars_mr: 'आगाऊ खाते', currAmount: '' },
  },
  {
    id: 'bs_77',
    liab: { id: 'l_np_2024_25', prevAmount: '76,458.34', particulars: 'Net Profit 2024-2025', particulars_mr: 'निव्वळ नफा २०२४-२०२५', currAmount: '76,458.34' },
    asset: { id: 'a_cat_closing', prevAmount: '', particulars: 'Closing Stock', particulars_mr: 'अंतिम साठा (Closing Stock)', currAmount: '', isCategoryHeader: true, subTotal: '75,727.63' },
  },
  {
    id: 'bs_78',
    liab: { id: 'l_empty_pad16', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_cl_stock', prevAmount: '1,03,996.89', particulars: 'Closing Stock', particulars_mr: 'अंतिम साठा', currAmount: '75,727.63' },
  },
  {
    id: 'bs_79',
    liab: { id: 'l_empty_pad17', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_cat_loss_ac', prevAmount: '', particulars: 'Loss Account Section', particulars_mr: 'तोटा खाते (Cumulative Loss A/c)', currAmount: '', isCategoryHeader: true, subTotal: '8,45,044.41' },
  },
  {
    id: 'bs_80',
    liab: { id: 'l_empty_pad18', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_loss_2020_21', prevAmount: '', particulars: 'Net Loss for the Year 2020-21', particulars_mr: 'निव्वळ तोटा २०२०-२०२१', currAmount: '3,81,724.26' },
  },
  {
    id: 'bs_81',
    liab: { id: 'l_empty_pad19', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_loss_2021_22', prevAmount: '', particulars: 'Net Loss for the Year 2021-22', particulars_mr: 'निव्वळ तोटा २०२१-२०२२', currAmount: '1,01,835.89' },
  },
  {
    id: 'bs_82',
    liab: { id: 'l_empty_pad20', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_loss_2022_23', prevAmount: '', particulars: 'Net Loss for the Year 2022-23', particulars_mr: 'निव्वळ तोटा २०२२-२०२३', currAmount: '3,17,367.32' },
  },
  {
    id: 'bs_83',
    liab: { id: 'l_empty_pad21', prevAmount: '', particulars: '', particulars_mr: '', currAmount: '' },
    asset: { id: 'a_loss_2025_26', prevAmount: '', particulars: 'Net Loss for the Year 2025-26', particulars_mr: 'निव्वळ तोटा २०२५-२०२६', currAmount: '44,116.94' },
  },
];

const BalanceSheet: React.FC<BalanceSheetProps> = ({ user, onLogout, onToggleMobileMenu }) => {
  const { lang, setLang } = useTranslation();

  const [fromDate, setFromDate] = useState('2025-04-01');
  const [toDate, setToDate] = useState('2026-03-31');
  const [asAtDateText, setAsAtDateText] = useState('31 MARCH 2026');
  const [finYear, setFinYear] = useState('2025-26');

  const [savedReports, setSavedReports] = useState<SavedAuditReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const [rows, setRows] = useState<BSRowPair[]>(buildDefaultRows);

  // Grand totals override states (exact matching print document)
  const [totalLiabPrev, setTotalLiabPrev] = useState('1,98,04,765.37');
  const [totalLiabCurr, setTotalLiabCurr] = useState('1,94,82,870.83');
  const [totalAssetPrev, setTotalAssetPrev] = useState('1,98,04,765.37');
  const [totalAssetCurr, setTotalAssetCurr] = useState('1,94,82,870.83');

  const loadSavedReportsList = useCallback(async () => {
    try {
      setSavedReports(await listAuditReports('BALANCE_SHEET'));
    } catch {
      // The form remains usable if the saved-report list cannot be loaded.
    }
  }, []);

  useEffect(() => {
    loadSavedReportsList();
  }, [loadSavedReportsList]);

  const handleSaveReport = async () => {
    if (!finYear.trim() || !fromDate || !toDate || fromDate > toDate) {
      setSaveStatus(lang === 'mr' ? 'चुकीची तारीख' : 'Invalid date range');
      window.setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    try {
      setSaveStatus('Saving...');
      const saved = await saveAuditReport({
        report_type: 'BALANCE_SHEET',
        financial_year: finYear,
        from_date: fromDate,
        to_date: toDate,
        header_title_en: 'BALANCE SHEET',
        header_title_mr: 'ताळेबंद',
        header_period_text: asAtDateText,
        data_json: JSON.stringify({
          rows,
          totalLiabPrev: fmtNum(balancedTotalPrev),
          totalLiabCurr: fmtNum(balancedTotalCurr),
          totalAssetPrev: fmtNum(balancedTotalPrev),
          totalAssetCurr: fmtNum(balancedTotalCurr),
          prevProfitAdjustment: fmtNum(prevProfitAdjustment),
          currProfitAdjustment: fmtNum(currProfitAdjustment),
          prevLossAdjustment: fmtNum(prevLossAdjustment),
          currLossAdjustment: fmtNum(currLossAdjustment),
        }),
        created_by: user?.full_name || 'Accountant',
      });
      setSelectedReportId(String(saved.id));
      setSaveStatus('Saved!');
      await loadSavedReportsList();
    } catch {
      setSaveStatus('Save Failed');
    } finally {
      window.setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleLoadReport = (reportId: string) => {
    setSelectedReportId(reportId);
    const report = savedReports.find(item => item.id === Number(reportId));
    if (!report) return;

    try {
      const data = JSON.parse(report.data_json);
      if (data.rows) setRows(data.rows);
      if (data.totalLiabPrev) setTotalLiabPrev(data.totalLiabPrev);
      if (data.totalLiabCurr) setTotalLiabCurr(data.totalLiabCurr);
      if (data.totalAssetPrev) setTotalAssetPrev(data.totalAssetPrev);
      if (data.totalAssetCurr) setTotalAssetCurr(data.totalAssetCurr);
      setFromDate(report.from_date);
      setToDate(report.to_date);
      setAsAtDateText(report.header_period_text || formatAsAtDate(report.to_date));
      setFinYear(report.financial_year);
    } catch {
      window.alert('Could not parse report data.');
    }
  };

  const updateLiabCell = useCallback((rowId: string, field: 'prevAmount' | 'particulars' | 'currAmount' | 'subTotal', val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, liab: { ...r.liab, [field]: val } };
    }));
  }, []);

  const updateAssetCell = useCallback((rowId: string, field: 'prevAmount' | 'particulars' | 'currAmount' | 'subTotal', val: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, asset: { ...r.asset, [field]: val } };
    }));
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm(lang === 'mr'
      ? 'सर्व मूल्ये डिफॉल्टवर परत आणायचे आहेत का?'
      : 'Reset all values to screenshot defaults?')) return;
    setRows(buildDefaultRows());
    setTotalLiabPrev('1,98,04,765.37');
    setTotalLiabCurr('1,94,82,870.83');
    setTotalAssetPrev('1,98,04,765.37');
    setTotalAssetCurr('1,94,82,870.83');
  }, [lang]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const formatPeriodEn = () => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const f = new Intl.DateTimeFormat('en-IN', opts);
    return `AS AT ${f.format(new Date(toDate)).toUpperCase()}`;
  };

  const formatPeriodMr = () => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const f = new Intl.DateTimeFormat('mr-IN', opts);
    return `${f.format(new Date(toDate))} पर्यंतचे`;
  };

  const liabPrevSum = rows.reduce((sum, row) => sum + (row.liab.isCategoryHeader ? 0 : parseNum(row.liab.prevAmount)), 0);
  const liabCurrSum = rows.reduce((sum, row) => sum + (row.liab.isCategoryHeader ? 0 : parseNum(row.liab.currAmount)), 0);
  const assetPrevSum = rows.reduce((sum, row) => sum + (row.asset.isCategoryHeader ? 0 : parseNum(row.asset.prevAmount)), 0);
  const assetCurrSum = rows.reduce((sum, row) => sum + (row.asset.isCategoryHeader ? 0 : parseNum(row.asset.currAmount)), 0);
  const prevProfitAdjustment = Math.max(assetPrevSum - liabPrevSum, 0);
  const currProfitAdjustment = Math.max(assetCurrSum - liabCurrSum, 0);
  const prevLossAdjustment = Math.max(liabPrevSum - assetPrevSum, 0);
  const currLossAdjustment = Math.max(liabCurrSum - assetCurrSum, 0);
  const balancedTotalPrev = Math.max(liabPrevSum, assetPrevSum);
  const balancedTotalCurr = Math.max(liabCurrSum, assetCurrSum);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid transparent',
    background: 'transparent',
    fontFamily: 'inherit',
    fontSize: 11.5,
    padding: '2px 3px',
    boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        @media print {
          .bs-no-print { display: none !important; }
          .bs-print-area { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          body { background: white !important; }
          .main-content, .app-layout { background: white !important; }
          .bs-table-wrapper { box-shadow: none !important; border-radius: 0 !important; border: 1px solid #333 !important; }
          .bs-input { border: none !important; background: transparent !important; padding: 0 1px !important; font-size: 7.5pt !important; }
          .bs-table th, .bs-table td { padding: 2px 3px !important; font-size: 7.5pt !important; border: 1px solid #333 !important; }
          .bs-cat-header td { font-weight: 800 !important; background: #f1f5f9 !important; color: #000 !important; }
          @page { margin: 6mm; size: A4 landscape; }
        }
        .bs-input { transition: background 0.15s; cursor: text; }
        .bs-input:hover { background: rgba(99,102,241,0.08) !important; }
        .bs-input:focus { outline: 2px solid #6366f1; border-radius: 3px; background: rgba(238,242,255,0.9) !important; }
        .bs-data-row:hover td { background: rgba(99,102,241,0.03) !important; }
        .bs-data-row:nth-child(even) td { background: rgba(248,250,252,0.6) !important; }
      `}</style>

      {/* Screen Header */}
      <div className="bs-no-print">
        <Header
          title={lang === 'mr' ? 'ताळेबंद (Balance Sheet)' : 'Balance Sheet'}
          user={user}
          onLogout={onLogout}
          onToggleMobileMenu={onToggleMobileMenu}
        />
      </div>

      <div style={{
        padding: '20px 16px',
        paddingTop: 'calc(var(--header-h) + 32px)',
        maxWidth: 1320,
        margin: '0 auto',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }} className="audit-report-page bs-print-area">

        {/* Controls Bar */}
        <div className="bs-no-print" style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.06))',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'ताळेबंद दिनांक:' : 'As At Date:'}
            </label>
            <input type="date" value={toDate} onChange={e => {
              const val = e.target.value;
              setToDate(val);
              if (val) {
                const fiscalStart = getFiscalStartDate(val);
                setFromDate(fiscalStart);
                setFinYear(getFinancialYear(fiscalStart, val));
                setAsAtDateText(formatAsAtDate(val));
              }
            }} style={{
              border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 10px',
              fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
            }} />
            <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              {lang === 'mr' ? 'आर्थिक वर्ष:' : 'Financial Year:'}
            </label>
            <input value={finYear} onChange={e => setFinYear(e.target.value)} placeholder="2025-26" style={{
              width: 92, border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 8px',
              fontSize: 13, fontWeight: 700, color: '#1e293b', background: 'white',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                <FolderOpen size={15} style={{ color: '#4f46e5' }} />
                <select
                  value={selectedReportId}
                  onChange={e => handleLoadReport(e.target.value)}
                  disabled={savedReports.length === 0}
                  style={{
                    border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 8px',
                    fontSize: 12.5, fontWeight: 600, color: '#1e293b', background: 'white',
                  }}
                >
                  <option value="">{savedReports.length === 0
                    ? (lang === 'mr' ? 'सेव्ह केलेले अहवाल नाहीत' : 'No saved reports')
                    : (lang === 'mr' ? '-- मागील अहवाल निवडा --' : '-- Select Previous Year --')}</option>
                  {savedReports.map(report => (
                    <option key={report.id} value={report.id}>
                      {report.financial_year} (AS AT {report.to_date})
                    </option>
                  ))}
                </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={handleSaveReport} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}>
              <Save size={14} />
              {saveStatus || (lang === 'mr' ? 'सेव्ह करा' : 'Save Report')}
            </button>
            <button onClick={() => setLang(lang === 'mr' ? 'en' : 'mr')} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: '1.5px solid #6366f1', background: 'white',
              color: '#4f46e5', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              <Globe size={14} />
              {lang === 'mr' ? 'English' : 'मराठी'}
            </button>
            <button onClick={handleReset} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white',
              color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              <RefreshCw size={14} />
              {lang === 'mr' ? 'रीसेट' : 'Reset'}
            </button>
            <button onClick={handlePrint} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}>
              <Printer size={14} />
              {lang === 'mr' ? 'प्रिंट' : 'Print'}
            </button>
          </div>
        </div>

        {/* Form Title Banner */}
        <div style={{
          textAlign: 'center', marginBottom: 14,
          borderBottom: '2px solid #0f172a', paddingBottom: 10,
        }}>
          <div style={{
            fontFamily: "'Times New Roman', serif",
            fontSize: 18, fontWeight: 900, color: '#0f172a',
            textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3,
          }}>
            {lang === 'mr'
              ? 'बेळगाव बागायतदार सहकारी खरेदी-विक्री संस्था, बेळगाव'
              : 'THE GARDENER CO-OP SOCIETY BELAGAVI'}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 14, fontWeight: 800, color: '#1e40af',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 5, flexWrap: 'wrap'
          }}>
            <span>{lang === 'mr' ? 'ताळेबंद (BALANCE SHEET)' : 'BALANCE SHEET'}</span>
            <span>{lang === 'mr' ? 'दिनांक' : 'AS AT'}</span>
            <input
              type="text"
              className="bs-input"
              value={asAtDateText}
              onChange={e => setAsAtDateText(e.target.value)}
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#1e40af',
                borderBottom: '1.5px dashed #3b82f6',
                background: 'transparent',
                textAlign: 'center',
                width: '190px',
                fontFamily: 'inherit',
                letterSpacing: '0.05em',
                padding: '1px 4px',
              }}
              title={lang === 'mr' ? 'तारीख संपादित करण्यासाठी येथे क्लिक करा' : 'Click to edit date text'}
            />
          </div>
        </div>

        {/* Balance Sheet Table */}
        <div className="bs-table-wrapper" style={{
          background: 'white', borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1.5px solid #0f172a',
        }}>
          <table className="bs-table" style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: 11.5, fontFamily: "'Inter', 'Segoe UI', sans-serif",
            tableLayout: 'fixed',
          }}>
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#0f172a', color: 'white' }}>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {getPreviousFinancialYear(finYear)}
                </th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'देणी व भांडवल (LIABILITIES)' : 'LIABILITIES'}
                </th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderRight: '2px solid #38bdf8' }}>
                  {finYear}
                </th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 11, borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {getPreviousFinancialYear(finYear)}
                </th>
                <th style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'मालमत्ता व सोयी (ASSETS)' : 'ASSETS'}
                </th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>
                  {finYear}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const isLiabHeader = r.liab.isCategoryHeader;
                const isAssetHeader = r.asset.isCategoryHeader;

                return (
                  <tr key={r.id} className={`bs-data-row ${isLiabHeader || isAssetHeader ? 'bs-cat-header' : ''}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* LIABILITIES SIDE */}
                    {/* 2024-25 Prev Amount */}
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0', background: isLiabHeader ? '#f1f5f9' : 'transparent' }}>
                      {!isLiabHeader && r.liab.particulars && (
                        <input
                          className="bs-input"
                          value={r.liab.prevAmount}
                          onChange={e => updateLiabCell(r.id, 'prevAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#64748b' }}
                        />
                      )}
                    </td>
                    {/* LIABILITIES Particulars */}
                    <td style={{ padding: '2px 6px', borderRight: '1px solid #e2e8f0', background: isLiabHeader ? '#f1f5f9' : 'transparent' }}>
                      {r.liab.particulars && (
                        <input
                          className="bs-input"
                          value={lang === 'mr' ? r.liab.particulars_mr : r.liab.particulars}
                          onChange={e => updateLiabCell(r.id, 'particulars', e.target.value)}
                          style={{
                            ...inputStyle,
                            textAlign: 'left',
                            fontWeight: isLiabHeader ? 800 : 500,
                            color: isLiabHeader ? '#0f172a' : '#1e293b',
                            fontSize: isLiabHeader ? 12.5 : 11.5,
                          }}
                        />
                      )}
                    </td>
                    {/* LIABILITIES 2025-26 Curr Amount / Category Total */}
                    <td style={{ padding: '2px 4px', borderRight: '2px solid #0f172a', background: isLiabHeader ? '#f1f5f9' : 'transparent' }}>
                      {isLiabHeader ? (
                        <input
                          className="bs-input"
                          value={r.liab.subTotal || ''}
                          onChange={e => updateLiabCell(r.id, 'subTotal', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#1e40af', fontWeight: 800, fontSize: 12 }}
                        />
                      ) : r.liab.particulars ? (
                        <input
                          className="bs-input"
                          value={r.liab.currAmount}
                          onChange={e => updateLiabCell(r.id, 'currAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#1e293b', fontWeight: 500 }}
                        />
                      ) : null}
                    </td>

                    {/* ASSETS SIDE */}
                    {/* 2024-25 Prev Amount */}
                    <td style={{ padding: '2px 4px', borderRight: '1px solid #e2e8f0', background: isAssetHeader ? '#f1f5f9' : 'transparent' }}>
                      {!isAssetHeader && r.asset.particulars && (
                        <input
                          className="bs-input"
                          value={r.asset.prevAmount}
                          onChange={e => updateAssetCell(r.id, 'prevAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#64748b' }}
                        />
                      )}
                    </td>
                    {/* ASSETS Particulars */}
                    <td style={{ padding: '2px 6px', borderRight: '1px solid #e2e8f0', background: isAssetHeader ? '#f1f5f9' : 'transparent' }}>
                      {r.asset.particulars && (
                        <input
                          className="bs-input"
                          value={lang === 'mr' ? r.asset.particulars_mr : r.asset.particulars}
                          onChange={e => updateAssetCell(r.id, 'particulars', e.target.value)}
                          style={{
                            ...inputStyle,
                            textAlign: 'left',
                            fontWeight: isAssetHeader ? 800 : 500,
                            color: isAssetHeader ? '#0f172a' : '#1e293b',
                            fontSize: isAssetHeader ? 12.5 : 11.5,
                          }}
                        />
                      )}
                    </td>
                    {/* ASSETS 2025-26 Curr Amount / Category Total */}
                    <td style={{ padding: '2px 4px', background: isAssetHeader ? '#f1f5f9' : 'transparent' }}>
                      {isAssetHeader ? (
                        <input
                          className="bs-input"
                          value={r.asset.subTotal || ''}
                          onChange={e => updateAssetCell(r.id, 'subTotal', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#047857', fontWeight: 800, fontSize: 12 }}
                        />
                      ) : r.asset.particulars ? (
                        <input
                          className="bs-input"
                          value={r.asset.currAmount}
                          onChange={e => updateAssetCell(r.id, 'currAmount', e.target.value)}
                          style={{ ...inputStyle, textAlign: 'right', color: '#1e293b', fontWeight: 500 }}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {/* Automatic balancing figure: profit appears under liabilities, loss under assets. */}
              <tr style={{ background: '#fff7ed', borderTop: '2px solid #f59e0b', fontWeight: 800 }}>
                <td style={{ padding: '5px 4px', textAlign: 'right' }}>{prevProfitAdjustment ? fmtNum(prevProfitAdjustment) : ''}</td>
                <td style={{ padding: '5px 8px' }}>{(prevProfitAdjustment || currProfitAdjustment) ? (lang === 'mr' ? 'संतुलित नफा' : 'BALANCING PROFIT') : ''}</td>
                <td style={{ padding: '5px 4px', textAlign: 'right', borderRight: '2px solid #38bdf8' }}>{currProfitAdjustment ? fmtNum(currProfitAdjustment) : ''}</td>
                <td style={{ padding: '5px 4px', textAlign: 'right' }}>{prevLossAdjustment ? fmtNum(prevLossAdjustment) : ''}</td>
                <td style={{ padding: '5px 8px' }}>{(prevLossAdjustment || currLossAdjustment) ? (lang === 'mr' ? 'संतुलित तोटा' : 'BALANCING LOSS') : ''}</td>
                <td style={{ padding: '5px 4px', textAlign: 'right' }}>{currLossAdjustment ? fmtNum(currLossAdjustment) : ''}</td>
              </tr>

              {/* Grand TOTAL Row */}
              <tr style={{
                background: '#0f172a', color: 'white', fontWeight: 800,
                borderTop: '3px double #38bdf8', fontSize: 13,
              }}>
                <td style={{ padding: '8px 4px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <input
                    className="bs-input"
                    value={fmtNum(balancedTotalPrev)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: 'white', fontWeight: 800 }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'left', letterSpacing: '0.06em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'एकूण (TOTAL)' : 'TOTAL'}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right', borderRight: '2px solid #38bdf8' }}>
                  <input
                    className="bs-input"
                    value={fmtNum(balancedTotalCurr)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#38bdf8', fontWeight: 800 }}
                  />
                </td>

                <td style={{ padding: '8px 4px', textAlign: 'right', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  <input
                    className="bs-input"
                    value={fmtNum(balancedTotalPrev)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: 'white', fontWeight: 800 }}
                  />
                </td>
                <td style={{ padding: '8px 8px', textAlign: 'left', letterSpacing: '0.06em', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                  {lang === 'mr' ? 'एकूण (TOTAL)' : 'TOTAL'}
                </td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                  <input
                    className="bs-input"
                    value={fmtNum(balancedTotalCurr)}
                    readOnly
                    style={{ ...inputStyle, textAlign: 'right', color: '#38bdf8', fontWeight: 800 }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="bs-no-print" style={{ marginTop: 14, fontSize: 11.5, color: '#64748b', textAlign: 'center' }}>
          {lang === 'mr'
            ? '* सर्व रक्कम रुपयांमध्ये. सर्व मूल्ये थेट संपादनयोग्य आहेत आणि ताळेबंद ऑडिट पत्रकानुसार संतुलित होतात.'
            : '* All amounts in ₹. Interactive inputs matching exact paper statement records, fully editable and printable.'}
        </div>
      </div>
    </>
  );
};

export default BalanceSheet;
