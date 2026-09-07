import React, { useState, useCallback, useEffect } from 'react';
import { Printer, RefreshCw, Globe, Save, FolderOpen } from 'lucide-react';
import Header from '../components/Header';
import { useTranslation } from '../hooks/useTranslation';
import type { User } from '../types';
import { saveAuditReport, listAuditReports, SavedAuditReport } from '../api/client';
import { getFinancialYear } from '../utils/auditReports';

// ─── Types ───────────────────────────────────────────────────────────────────
interface RPRow {
    id: string;
    particulars: string;
    particulars_mr: string;
    opening: string;
    receipts: string;
    payments: string;
    closing: string;
    isSection?: boolean;
    sectionColor?: string;
}

interface ReceiptPaymentAccountProps {
    user?: User | null;
    onLogout?: () => void;
    onToggleMobileMenu?: () => void;
}

// ─── Helper: parse number from formatted string ────────────────────────────
const parseNum = (s: string): number => {
    const n = parseFloat(s.replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

const fmtNum = (n: number): string => {
    if (n === 0) return '';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Default Data (from Screenshots) ─────────────────────────────────────────
const buildDefaultRows = (): RPRow[] => [
    // Share Capital
    { id: 's_share_capital', particulars: 'Share Capital', particulars_mr: 'भागभांडवल', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_share_cap_member', particulars: 'Share Capital Member Fund', particulars_mr: 'सभासद भागभांडवल निधी', opening: '4,88,575.00', receipts: '500.00', payments: '100.00', closing: '' },

    // Fund
    { id: 's_fund', particulars: 'Fund', particulars_mr: 'निधी', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_reserve', particulars: 'Reserve Fund', particulars_mr: 'राखीव निधी', opening: '24,64,304.01', receipts: '', payments: '', closing: '' },
    { id: 'r_agri_dev', particulars: 'Agri Dev Propaganda Fund', particulars_mr: 'कृषी विकास प्रचार निधी', opening: '75,317.38', receipts: '', payments: '', closing: '' },
    { id: 'r_agri_impl', particulars: 'Agri Implement Dev Propaganda Fund', particulars_mr: 'कृषी अवजारे विकास प्रचार निधी', opening: '1,49,354.25', receipts: '', payments: '', closing: '' },
    { id: 'r_onion_dep', particulars: 'Onion Market Godown Depreciation Fund', particulars_mr: 'कांदा बाजार गोदाम घसारा निधी', opening: '11,68,711.40', receipts: '67,505.00', payments: '', closing: '' },
    { id: 'r_bad_debt', particulars: 'Bad Debt Fund', particulars_mr: 'बुडीत कर्ज निधी', opening: '23,662.71', receipts: '', payments: '', closing: '' },
    { id: 'r_office_bldg_dep', particulars: 'Office Building Depreciation Fund', particulars_mr: 'कार्यालय इमारत घसारा निधी', opening: '2,74,489.59', receipts: '', payments: '', closing: '' },
    { id: 'r_building', particulars: 'Building Fund', particulars_mr: 'इमारत निधी', opening: '11,69,823.93', receipts: '', payments: '', closing: '' },
    { id: 'r_charity', particulars: 'Charity Fund', particulars_mr: 'दान निधी', opening: '13.75', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_equip', particulars: 'Cold Storage Equipment & dev Propaganda Fund', particulars_mr: 'शीतगृह उपकरणे व विकास प्रचार निधी', opening: '22,332.29', receipts: '2,458.00', payments: '', closing: '' },
    { id: 'r_cap_reserve', particulars: 'Capital Reserve Fund (Tractor Sale)', particulars_mr: 'भांडवल राखीव निधी (ट्रॅक्टर विक्री)', opening: '1,89,194.00', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_bldg_dep', particulars: 'Cold Storage Building Depreciation Fund', particulars_mr: 'शीतगृह इमारत घसारा निधी', opening: '15,35,058.22', receipts: '59,747.00', payments: '', closing: '' },
    { id: 'r_education', particulars: 'Education Fund', particulars_mr: 'शिक्षण निधी', opening: '18,681.00', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_dead_stock', particulars: 'Cold Storage Dead Stock Depreciation Fund', particulars_mr: 'शीतगृह जुना साठा घसारा निधी', opening: '4,146.00', receipts: '327.00', payments: '', closing: '' },
    { id: 'r_cs_mach_dep', particulars: 'Cold Storage Machinery Depreciation Fund', particulars_mr: 'शीतगृह यंत्रसामग्री घसारा निधी', opening: '18,41,422.08', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_varanda', particulars: 'Cold Storage Varanda & New Office Depreciation Fund', particulars_mr: 'शीतगृह व्हरांडा व नवीन कार्यालय घसारा निधी', opening: '1,13,590.00', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_gen', particulars: 'Cold Storage Generator Room Depreciation Fund', particulars_mr: 'शीतगृह जनरेटर खोली घसारा निधी', opening: '32,947.88', receipts: '', payments: '', closing: '' },
    { id: 'r_computer_dep', particulars: 'Computer Depreciation Fund', particulars_mr: 'संगणक घसारा निधी', opening: '53,600.00', receipts: '', payments: '', closing: '' },
    { id: 'r_dead_stock', particulars: 'Dead Stock Depreciation', particulars_mr: 'जुना साठा घसारा', opening: '1,01,979.45', receipts: '6,438.00', payments: '', closing: '' },
    { id: 'r_elec_fit_dep', particulars: 'Electric Fitting Depreciation Fund', particulars_mr: 'विद्युत फिटिंग घसारा निधी', opening: '35,641.00', receipts: '1,908.00', payments: '', closing: '' },
    { id: 'r_golden_jub', particulars: 'Golden Jublee Fund', particulars_mr: 'सुवर्ण महोत्सव निधी', opening: '1,42,567.61', receipts: '', payments: '', closing: '' },
    { id: 'r_guest', particulars: 'Guest Fund', particulars_mr: 'अतिथी निधी', opening: '11,487.06', receipts: '', payments: '', closing: '' },
    { id: 'r_price_fluct', particulars: 'Price Flution Fund', particulars_mr: 'मूल्य चढउतार निधी', opening: '1,20,703.01', receipts: '', payments: '', closing: '' },
    { id: 'r_unforeseen', particulars: 'Provision for Unforeseen Losses Fund', particulars_mr: 'अनपेक्षित नुकसान तरतूद निधी', opening: '16,241.32', receipts: '', payments: '', closing: '' },
    { id: 'r_shop_godown', particulars: 'Shop cum Godown Depreciation Fund', particulars_mr: 'दुकान-गोदाम घसारा निधी', opening: '7,19,179.65', receipts: '1,01,735.00', payments: '', closing: '' },
    { id: 'r_water_conn', particulars: 'Water Connection Depreciation Fund', particulars_mr: 'पाणी जोडणी घसारा निधी', opening: '52,789.00', receipts: '', payments: '', closing: '' },
    { id: 'r_gratuity', particulars: 'Gratuity Fund', particulars_mr: 'सेवानिवृत्ती लाभ निधी', opening: '2,26,433.00', receipts: '', payments: '95,529', closing: '' },
    { id: 'r_div_equal', particulars: 'Dividend Equalization Fund', particulars_mr: 'लाभांश समकरण निधी', opening: '2,000.00', receipts: '', payments: '', closing: '' },

    // Govt Loan Subsidies
    { id: 's_govt', particulars: 'Govt. Loan Subsidies', particulars_mr: 'शासकीय कर्ज अनुदान', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_comp_subsidy', particulars: 'Computer Purchase Subsidy', particulars_mr: 'संगणक खरेदी अनुदान', opening: '40,000.00', receipts: '', payments: '', closing: '' },

    // Bank Loan
    { id: 's_bank_loan', particulars: 'Bank Loan', particulars_mr: 'बँक कर्ज', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_pioneer_cc', particulars: 'The Belgaum Pioneer Bank CC Loan', particulars_mr: 'बेळगाव पायोनियर बँक चालू खाते कर्ज', opening: '3,54,030.45', receipts: '30,69,251.88', payments: '34,94,453.00', closing: '' },
    { id: 'r_pioneer_mort', particulars: 'The Belgaum Pioneer Bank Mortgage Loan', particulars_mr: 'बेळगाव पायोनियर बँक तारण कर्ज', opening: '6,34,483.00', receipts: '', payments: '4,60,465.00', closing: '' },

    // Deposit
    { id: 's_deposit', particulars: 'Deposit', particulars_mr: 'ठेव', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_sou_laxmi', particulars: 'Sou. Laxmi Pigmy Deposit', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव', opening: '37,24,915.00', receipts: '39,70,340.00', payments: '55,16,360.00', closing: '' },
    { id: 'r_recurring', particulars: 'Recurring Deposit', particulars_mr: 'आवर्ती ठेव', opening: '285.00', receipts: '', payments: '', closing: '' },
    { id: 'r_fixed_dep', particulars: 'Fixed Deposite', particulars_mr: 'मुदत ठेव', opening: '11,30,089', receipts: '2,00,900.00', payments: '2,73,817.00', closing: '' },

    // Other Liabilities
    { id: 's_other_liab', particulars: 'Other Liabilites (Payables)', particulars_mr: 'इतर दायित्वे (देणी)', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_audit_obj', particulars: 'Audit Objection Under Protest', particulars_mr: 'निषेधाखाली लेखापरीक्षण आक्षेप', opening: '6,357.95', receipts: '', payments: '', closing: '' },
    { id: 'r_deposit_prot', particulars: 'Deposit Unter Protest', particulars_mr: 'निषेधाखाली ठेव', opening: '319.00', receipts: '', payments: '', closing: '' },
    { id: 'r_cpf', particulars: 'Central Provident Fund', particulars_mr: 'केंद्रीय भविष्य निर्वाह निधी', opening: '48,308.80', receipts: '98,792.00', payments: '1,13,014.00', closing: '' },
    { id: 'r_emd', particulars: 'EMD', particulars_mr: 'बयाना ठेव', opening: '3,750.00', receipts: '', payments: '', closing: '' },
    { id: 'r_election_dep', particulars: 'Election Deposit', particulars_mr: 'निवडणूक ठेव', opening: '7,450.00', receipts: '', payments: '', closing: '' },
    { id: 'r_purchase_prasad', particulars: 'Purchase A/c Prasad Mall', particulars_mr: 'खरेदी खाते प्रसाद मॉल', opening: '4', receipts: '', payments: '', closing: '' },
    { id: 'r_esi', particulars: 'ESI A/c', particulars_mr: 'ईएसआय खाते', opening: '9,095.58', receipts: '16,487.00', payments: '16,864.00', closing: '' },
    { id: 'r_member_div', particulars: 'Member Dividend', particulars_mr: 'सभासद लाभांश', opening: '3,84,301.35', receipts: '', payments: '', closing: '' },
    { id: 'r_sundry', particulars: 'Sundry A/c', particulars_mr: 'विविध खाते', opening: '3,13,938.18', receipts: '3,93,490.00', payments: '3,76,393.72', closing: '' },
    { id: 'r_punjab_potato', particulars: 'Punjab Potato Advance', particulars_mr: 'पंजाब बटाटा आगाऊ', opening: '770', receipts: '', payments: '', closing: '' },
    { id: 'r_share_susp', particulars: 'Share Suspense A/c', particulars_mr: 'भाग निलंबन खाते', opening: '2346', receipts: '', payments: '', closing: '' },
    { id: 'r_suspense', particulars: 'Suspense A/c', particulars_mr: 'निलंबन खाते', opening: '3422.05', receipts: '', payments: '', closing: '' },
    { id: 'r_seller', particulars: 'Seller A/c', particulars_mr: 'विक्रेता खाते', opening: '6,21,648.04', receipts: '10,54,988.00', payments: '13,54,039.00', closing: '' },
    { id: 'r_kanda_tax', particulars: 'Provision for Kanda Market Corporation Tax', particulars_mr: 'कांदा बाजार महामंडळ कर तरतूद', opening: '19,452', receipts: '', payments: '', closing: '' },
    { id: 'r_govt_audit', particulars: 'Govt Audit Fees (Provision)', particulars_mr: 'शासकीय लेखापरीक्षण शुल्क (तरतूद)', opening: '650', receipts: '', payments: '', closing: '' },
    { id: 'r_purchase_chougule', particulars: 'Puchase (Ravi S. Chougule)', particulars_mr: 'खरेदी (रवि एस. चौगुले)', opening: '49,000', receipts: '', payments: '', closing: '' },
    { id: 'r_security_dep', particulars: 'Security Deposit', particulars_mr: 'सुरक्षा ठेव', opening: '7,37,765', receipts: '1,00,000.00', payments: '2,00,000.00', closing: '' },

    // Fixed Assets
    { id: 's_fixed_assets', particulars: 'Fixed Assets', particulars_mr: 'स्थायी मालमत्ता', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_onion_godown', particulars: 'Value of Onion Market Godown', particulars_mr: 'कांदा बाजार गोदामाचे मूल्य', opening: '22,50,199.98', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_new_office', particulars: 'Value of Cold Storage New office Building', particulars_mr: 'शीतगृह नवीन कार्यालय इमारत मूल्य', opening: '90,794', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_gen_room', particulars: 'Value of Cold Storage Generator Room', particulars_mr: 'शीतगृह जनरेटर खोली मूल्य', opening: '2,07,271.24', receipts: '', payments: '', closing: '' },
    { id: 'r_office_bldg', particulars: 'Value of Office Building', particulars_mr: 'कार्यालय इमारत मूल्य', opening: '26,335.88', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_shop_godown', particulars: 'Value of Cold Storage Shop Godown & Shop', particulars_mr: 'शीतगृह दुकान गोदाम व दुकान मूल्य', opening: '33,91,180.70', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_storage', particulars: 'Value of Cold Storage Building', particulars_mr: 'शीतगृह इमारत मूल्य', opening: '19,91,589.89', receipts: '', payments: '', closing: '' },
    { id: 'r_jai_kisan_ws', particulars: 'Jai kisan Wholesale New Vegetable Market Shop', particulars_mr: 'जय किसान घाऊक नवीन भाजीपाला बाजार दुकान', opening: '2,87,500', receipts: '', payments: '', closing: '' },
    { id: 'r_veg_cash_sale_recv', particulars: 'Vegetable Cash Sale (Suraj Uttam Patil) Receivable', particulars_mr: 'भाजीपाला रोख विक्री (सुरज उत्तम पाटील) प्राप्त', opening: '15,45,452', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_new_shop_elec', particulars: 'Cold Storage New Shop Electric Deposite', particulars_mr: 'शीतगृह नवीन दुकान वीज ठेव', opening: '4890', receipts: '', payments: '', closing: '' },
    { id: 'r_veg_cash_prasad', particulars: 'Vegetable Cash Sale (Prasad Mali)', particulars_mr: 'भाजीपाला रोख विक्री (प्रसाद माळी)', opening: '', receipts: '6,81,850', payments: '8,74,986', closing: '' },
    { id: 'r_pesticides', particulars: 'Pesticides Purchases & Sales', particulars_mr: 'कीटकनाशके खरेदी व विक्री', opening: '', receipts: '3,53,608.20', payments: '3,18,282.23', closing: '' },
    { id: 'r_seeds_pur', particulars: 'Seeds Purchases & Sales', particulars_mr: 'बियाणे खरेदी व विक्री', opening: '', receipts: '1,24,507.00', payments: '1,19,880.00', closing: '' },
    { id: 'r_seeds_pest_motor', particulars: 'Seeds Pestnicides, Motar Rent, Hamali', particulars_mr: 'बियाणे, कीटकनाशके, मोटर भाडे, हमाली', opening: '', receipts: '', payments: '3,850.00', closing: '' },
    { id: 'r_admin', particulars: 'Administrative Charges', particulars_mr: 'प्रशासकीय शुल्क', opening: '', receipts: '', payments: '6,010.00', closing: '' },
    { id: 'r_agm', particulars: 'Annual General Meeting Expenses', particulars_mr: 'वार्षिक सर्वसाधारण सभा खर्च', opening: '', receipts: '', payments: '3,820.00', closing: '' },
    { id: 'r_dividend_shares', particulars: 'Dividend on Shares', particulars_mr: 'समभागांवरील लाभांश', opening: '11,346.00', receipts: '500', payments: '', closing: '' },
    { id: 'r_tds', particulars: 'TDS A/c', particulars_mr: 'टीडीएस खाते', opening: '', receipts: '1,33,136.00', payments: '', closing: '' },
    { id: 'r_onion_corp_tax', particulars: 'Onion Market Godown Corporation Tax', particulars_mr: 'कांदा बाजार गोदाम महामंडळ कर', opening: '', receipts: '', payments: '62,118.00', closing: '' },
    { id: 'r_cs_bldg_corp', particulars: 'Cold Storage Building Corporation Tax', particulars_mr: 'शीतगृह इमारत महामंडळ कर', opening: '', receipts: '2,23,319.00', payments: '', closing: '' },
    { id: 'r_ho_bldg_corp', particulars: 'Head office Building Corporation Tax', particulars_mr: 'मुख्य कार्यालय इमारत महामंडळ कर', opening: '', receipts: '', payments: '58,939.00', closing: '' },
    { id: 'r_commission_veg', particulars: 'Commission of Sale of Vegetables', particulars_mr: 'भाजीपाला विक्री कमिशन', opening: '', receipts: '2,70,646.00', payments: '', closing: '' },
    { id: 'r_contingency', particulars: 'Contingency A/c', particulars_mr: 'आकस्मिक खाते', opening: '', receipts: '', payments: '17,461.69', closing: '' },
    { id: 'r_staff_interest', particulars: 'Staff Personal Interest', particulars_mr: 'कर्मचारी वैयक्तिक व्याज', opening: '', receipts: '377.00', payments: '', closing: '' },
    { id: 'r_esi_contrib', particulars: 'ESI & Other Contibution', particulars_mr: 'ईएसआय व इतर योगदान', opening: '', receipts: '', payments: '13,383.00', closing: '' },
    { id: 'r_jai_kisan_corp', particulars: 'Jai Kisan New Vegetable Market Corporation Tax', particulars_mr: 'जय किसान नवीन भाजीपाला बाजार महामंडळ कर', opening: '', receipts: '', payments: '25,000.00', closing: '' },
    { id: 'r_bank_interest', particulars: 'Bank Interest', particulars_mr: 'बँक व्याज', opening: '', receipts: '', payments: '1,129.50', closing: '' },
    { id: 'r_elec_power', particulars: 'Electric Power', particulars_mr: 'विद्युत शक्ती', opening: '', receipts: '8,682', payments: '30,704.00', closing: '' },
    { id: 'r_insurance', particulars: 'Insurance', particulars_mr: 'विमा', opening: '', receipts: '', payments: '21,505.00', closing: '' },
    { id: 'r_honorium', particulars: 'Honeriam', particulars_mr: 'मानधन', opening: '', receipts: '', payments: '2,400.00', closing: '' },
    { id: 'r_interest_cc', particulars: 'Interest on CC Loan', particulars_mr: 'चालू खाते कर्जावरील व्याज', opening: '', receipts: '', payments: '29,817.00', closing: '' },
    { id: 'r_insurance_fund', particulars: 'Insurance Fund', particulars_mr: 'विमा निधी', opening: '', receipts: '', payments: '2,109.00', closing: '' },
    { id: 'r_interest_rfddcc', particulars: 'Interest ON SB RFDDCC Bank', particulars_mr: 'एसबी आरएफडीसीसी बँक व्याज', opening: '', receipts: '81,035', payments: '', closing: '' },
    { id: 'r_legal', particulars: 'Legal Fees', particulars_mr: 'कायदेशीर शुल्क', opening: '', receipts: '', payments: '51,915.00', closing: '' },
    { id: 'r_meeting_allow', particulars: 'Meeting Allowance', particulars_mr: 'सभा भत्ता', opening: '', receipts: '', payments: '15,400.00', closing: '' },
    { id: 'r_monthly_allow', particulars: 'Monthly Allowance', particulars_mr: 'मासिक भत्ता', opening: '', receipts: '', payments: '11,000.00', closing: '' },
    { id: 'r_prof_tax_renew', particulars: 'Proffessional tax Renewal Fee', particulars_mr: 'व्यावसायिक कर नूतनीकरण शुल्क', opening: '', receipts: '', payments: '3,150.00', closing: '' },
    { id: 'r_ho_rent', particulars: 'Head Office Building Rent', particulars_mr: 'मुख्य कार्यालय इमारत भाडे', opening: '', receipts: '1,80,000', payments: '', closing: '' },
    { id: 'r_onion_godown_rent', particulars: 'Onion Market Godown Rent', particulars_mr: 'कांदा बाजार गोदाम भाडे', opening: '', receipts: '4,37,312', payments: '', closing: '' },
    { id: 'r_pf_contrib', particulars: 'PF & Other Contibution', particulars_mr: 'पीएफ व इतर योगदान', opening: '', receipts: '', payments: '49,396.00', closing: '' },
    { id: 'r_postage', particulars: 'Postage A/c', particulars_mr: 'टपाल खाते', opening: '', receipts: '', payments: '655.00', closing: '' },
    { id: 'r_cs_elec', particulars: 'Cold Storage Electric Expences', particulars_mr: 'शीतगृह वीज खर्च', opening: '', receipts: '', payments: '3,588.00', closing: '' },
    { id: 'r_print_stat', particulars: 'Printing & Stationery', particulars_mr: 'मुद्रण व लेखन सामग्री', opening: '', receipts: '', payments: '35,364.00', closing: '' },
    { id: 'r_riksha', particulars: 'Riksha Charges', particulars_mr: 'रिक्षा शुल्क', opening: '', receipts: '', payments: '9,846.00', closing: '' },
    { id: 'r_sou_laxmi_int', particulars: 'Sou Laxmi Pigmy Deposit Loan Interest', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कर्ज व्याज', opening: '', receipts: '6,430.00', payments: '36,480.00', closing: '' },
    { id: 'r_sou_laxmi_comm', particulars: 'Sou Laxmi Pigmy Deposit Commision', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कमिशन', opening: '', receipts: '16,705', payments: '1,79,105.00', closing: '' },
    { id: 'r_audit', particulars: 'Audit Fee', particulars_mr: 'लेखापरीक्षण शुल्क', opening: '', receipts: '', payments: '44,000.00', closing: '' },
    { id: 'r_pest_discount', particulars: 'Pesticides Discount', particulars_mr: 'कीटकनाशके सवलत', opening: '', receipts: '2,622', payments: '', closing: '' },
    { id: 'r_godown_rent', particulars: 'Godown Rent', particulars_mr: 'गोदाम भाडे', opening: '', receipts: '3,84,000.00', payments: '', closing: '' },
    { id: 'r_gst_return', particulars: 'GST Return Filing Fee', particulars_mr: 'जीएसटी परतावा दाखल शुल्क', opening: '', receipts: '', payments: '25,400.00', closing: '' },
    { id: 'r_depreciation', particulars: 'Depreciation A/c', particulars_mr: 'घसारा खाते', opening: '', receipts: '', payments: '2,40,118.00', closing: '' },
    { id: 'r_cs_charges', particulars: 'Cold Storage Charges', particulars_mr: 'शीतगृह शुल्क', opening: '', receipts: '3,90,000', payments: '', closing: '' },
    { id: 'r_incharge_allow', particulars: 'Incharge Allowance', particulars_mr: 'प्रभारी भत्ता', opening: '', receipts: '', payments: '10,000.00', closing: '' },
    { id: 'r_seeds_plastic', particulars: 'Seeds Section Plaastic Bags', particulars_mr: 'बियाणे विभाग प्लास्टिक पिशव्या', opening: '', receipts: '', payments: '2,190.00', closing: '' },
    { id: 'r_daily_wages', particulars: 'Daily Wages Pay A/c', particulars_mr: 'दैनिक मजुरी वेतन खाते', opening: '', receipts: '', payments: '1,68,301.00', closing: '' },
    { id: 'r_mobile_rech', particulars: 'Mobile recharge', particulars_mr: 'मोबाईल रिचार्ज', opening: '', receipts: '', payments: '2,200.00', closing: '' },
    { id: 'r_cgst_9', particulars: 'CGST 9%', particulars_mr: 'सीजीएसटी ९%', opening: '', receipts: '1,72,196', payments: '31,182.92', closing: '' },
    { id: 'r_sgst_9', particulars: 'SGST 9%', particulars_mr: 'एसजीएसटी ९%', opening: '', receipts: '1,72,196.36', payments: '31,182.92', closing: '' },

    // Plant & Machinery
    { id: 's_plant', particulars: 'Plant & Machinery', particulars_mr: 'यंत्रसामग्री', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_cs_machinery', particulars: 'Cold Storage Machinery', particulars_mr: 'शीतगृह यंत्रसामग्री', opening: '16,07,043.66', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_equipment', particulars: 'Cold Storage Equipment', particulars_mr: 'शीतगृह उपकरणे', opening: '49,177.50', receipts: '', payments: '', closing: '' },

    // Fitting & Fixture
    { id: 's_fitting', particulars: 'Fitting & Fixture', particulars_mr: 'फिटिंग व फर्निचर', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_elec_fitting', particulars: 'Value of Electric Fitting', particulars_mr: 'विद्युत फिटिंग मूल्य', opening: '38,164.70', receipts: '', payments: '', closing: '' },
    { id: 'r_water_conn_val', particulars: 'Value of Water Connection', particulars_mr: 'पाणी जोडणी मूल्य', opening: '44,330', receipts: '', payments: '', closing: '' },

    // Fluctuation Assets
    { id: 's_fluct', particulars: 'Fluctuation Accets', particulars_mr: 'चढउतार मालमत्ता', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_library', particulars: 'Value of Library Book', particulars_mr: 'ग्रंथालय पुस्तक मूल्य', opening: '2,733.25', receipts: '', payments: '', closing: '' },
    { id: 'r_dead_stock_val', particulars: 'Value of Dead Stock', particulars_mr: 'जुना साठा मूल्य', opening: '2,14,632.72', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_dead_stock_val', particulars: 'Value of Cold Storage Dead Stock', particulars_mr: 'शीतगृह जुना साठा मूल्य', opening: '10,900', receipts: '', payments: '', closing: '' },
    { id: 'r_computer_val', particulars: 'Value of Computer', particulars_mr: 'संगणक मूल्य', opening: '53,600', receipts: '', payments: '', closing: '' },

    // Investment
    { id: 's_investment', particulars: 'Investment', particulars_mr: 'गुंतवणूक', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_dcc_rfd', particulars: 'The Belgaum DCC Bank RFD-101', particulars_mr: 'बेळगाव डीसीसी बँक आरएफडी-१०१', opening: '10,69,937', receipts: '', payments: '', closing: '' },
    { id: 'r_dcc_fd', particulars: 'The Belgaum DCC Bank FD', particulars_mr: 'बेळगाव डीसीसी बँक मुदत ठेव', opening: '5,000', receipts: '5,000', payments: '', closing: '' },
    { id: 'r_dcc_share', particulars: 'The Belgaum DCC Bank Share', particulars_mr: 'बेळगाव डीसीसी बँक समभाग', opening: '25,000', receipts: '', payments: '', closing: '' },
    { id: 'r_bhagyalaxmi', particulars: 'Shree Bhagyalaxmi Sugar Factory Share Khanapur', particulars_mr: 'श्री भाग्यलक्ष्मी साखर कारखाना समभाग खानापूर', opening: '1,000', receipts: '', payments: '', closing: '' },
    { id: 'r_coop_print', particulars: 'Co Op Printing Press', particulars_mr: 'को-ऑप छपाई केंद्र', opening: '200', receipts: '', payments: '', closing: '' },
    { id: 'r_iffco', particulars: 'Indian Farmer Fertilizer (IFFCO)', particulars_mr: 'भारतीय शेतकरी खत (इफको)', opening: '20,000', receipts: '', payments: '', closing: '' },
    { id: 'r_marketfed', particulars: 'The Marketndeva Co Op Sugar Factory Share', particulars_mr: 'मार्केटंदेव को-ऑप साखर कारखाना समभाग', opening: '20,000', receipts: '', payments: '', closing: '' },
    { id: 'r_mk_hubli', particulars: 'MK Hubli Sugar Factory Share', particulars_mr: 'एमके हुबळी साखर कारखाना समभाग', opening: '10,000', receipts: '', payments: '', closing: '' },
    { id: 'r_new_veg_market', particulars: 'New Vegetable Market Share', particulars_mr: 'नवीन भाजीपाला बाजार समभाग', opening: '1,000', receipts: '', payments: '', closing: '' },
    { id: 'r_dgm_fd', particulars: 'The Dgm PUC Bank Ltd FD', particulars_mr: 'डीजीएम पीयूसी बँक लि. मुदत ठेव', opening: '1,00,000', receipts: '', payments: '1,75,900', closing: '' },
    { id: 'r_sports_club', particulars: 'Sports Club Chandaragi', particulars_mr: 'स्पोर्ट्स क्लब चंदरागी', opening: '', receipts: '', payments: '', closing: '' },
    { id: 'r_natl_coop', particulars: 'National Co Op Consumer Marketing Federation', particulars_mr: 'राष्ट्रीय को-ऑप ग्राहक विपणन महासंघ', opening: '9,600', receipts: '', payments: '', closing: '' },
    { id: 'r_belgaum_dist', particulars: 'The Belgaum Dist Co Op Consumer Wholesale', particulars_mr: 'बेळगाव जिल्हा को-ऑप ग्राहक घाऊक', opening: '1,000', receipts: '', payments: '', closing: '' },
    { id: 'r_pioneer_bank', particulars: 'The Belgaum Pioneer Bank', particulars_mr: 'बेळगाव पायोनियर बँक', opening: '100', receipts: '', payments: '', closing: '' },
    { id: 'r_karnataka_mkfed', particulars: 'The Karnataka State Marketing Federation', particulars_mr: 'कर्नाटक राज्य विपणन महासंघ', opening: '40,000', receipts: '', payments: '', closing: '' },
    { id: 'r_belgaum_purchase', particulars: 'The Belgaum Co Op Purchase & Sale Union', particulars_mr: 'बेळगाव को-ऑप खरेदी व विक्री संघ', opening: '10', receipts: '', payments: '', closing: '' },
    { id: 'r_spinning_mill', particulars: 'The Belgaum Co Op Spining Mill Panth Balekundri', particulars_mr: 'बेळगाव को-ऑप सूत गिरणी पंत बालेकुंद्री', opening: '1,000', receipts: '', payments: '', closing: '' },
    { id: 'r_puc_bank_share', particulars: 'The Belgaum PUC Bank Ltd Share', particulars_mr: 'बेळगाव पीयूसी बँक लि. समभाग', opening: '62,000', receipts: '', payments: '', closing: '' },

    // Member Loan
    { id: 's_member_loan', particulars: 'Member Loan', particulars_mr: 'सभासद कर्ज', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_member_loan', particulars: 'Member Loan', particulars_mr: 'सभासद कर्ज', opening: '1,43,873', receipts: '', payments: '', closing: '' },
    { id: 'r_member_kind', particulars: 'Member Kind Loan', particulars_mr: 'सभासद वस्तू कर्ज', opening: '60,341.85', receipts: '', payments: '', closing: '' },
    { id: 'r_sou_laxmi_loan', particulars: 'Sou Laxmi Pigmy Deposite Loan', particulars_mr: 'सौ. लक्ष्मी पिगमी ठेव कर्ज', opening: '1,74,000', receipts: '3,07,300.00', payments: '2,92,800.00', closing: '' },
    { id: 'r_office_staff_loan', particulars: 'Ofice Staff Personal Loan', particulars_mr: 'कार्यालय कर्मचारी वैयक्तिक कर्ज', opening: '17,166', receipts: '8,630.00', payments: '', closing: '' },

    // Cash Balance
    { id: 's_cash_bal', particulars: 'Cash Balance', particulars_mr: 'रोख शिल्लक', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_cash_hand', particulars: 'Cash in Hand', particulars_mr: 'हातातील रोख', opening: '3,21,208.69', receipts: '3,21,208.69', payments: '54,329.00', closing: '' },

    // Bank Balance
    { id: 's_bank_bal', particulars: 'Bank Balance', particulars_mr: 'बँक शिल्लक', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_dcc_sb129', particulars: 'The belgaum DCC Bank SB-129', particulars_mr: 'बेळगाव डीसीसी बँक एसबी-१२९', opening: '62,451.35', receipts: '1,00,000.00', payments: '84,288.00', closing: '' },
    { id: 'r_dcc_sb1004', particulars: 'The belgaum DCC Bank SB-1004', particulars_mr: 'बेळगाव डीसीसी बँक एसबी-१००४', opening: '1,267', receipts: '1,267', payments: '', closing: '' },
    { id: 'r_karnataka_ind', particulars: 'The Karnataka Industrial Bank Ltd-13', particulars_mr: 'कर्नाटक औद्योगिक बँक लि.-१३', opening: '691', receipts: '691', payments: '', closing: '' },
    { id: 'r_pioneer_cd212', particulars: 'The Belgaum Pioneer Urban Bank CD-212', particulars_mr: 'बेळगाव पायोनियर अर्बन बँक सीडी-२१२', opening: '1,315.50', receipts: '1,315.50', payments: '', closing: '' },
    { id: 'r_pioneer_ca', particulars: 'The Belgaum Pioneer Urban Bank CA-0205230007720', particulars_mr: 'बेळगाव पायोनियर अर्बन बँक सीए-०२०५२३०००७७२०', opening: '5,55,504.89', receipts: '20,66,044.96', payments: '16,10,383.00', closing: '' },
    { id: 'r_union_bank', particulars: 'Union Bank Of India 471501010043184', particulars_mr: 'युनियन बँक ऑफ इंडिया ४७१५०१०१००४३१८४', opening: '2,02,600.53', receipts: '17,85,952.37', payments: '18,37,799.00', closing: '' },

    // Other Assets
    { id: 's_other_assets', particulars: 'Other Assets (Receivable)', particulars_mr: 'इतर मालमत्ता (प्राप्य)', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#1e293b' },
    { id: 'r_abn', particulars: 'ABN Fees', particulars_mr: 'एबीएन शुल्क', opening: '6,291.35', receipts: '', payments: '', closing: '' },
    { id: 'r_cs_adv', particulars: 'Cold Storage Advance', particulars_mr: 'शीतगृह आगाऊ', opening: '18,594.13', receipts: '', payments: '', closing: '' },
    { id: 'r_advance_ac', particulars: 'Advance A/c', particulars_mr: 'आगाऊ खाते', opening: '58,618.37', receipts: '19,80,647.00', payments: '17,83,733.00', closing: '' },
    { id: 'r_festival_adv', particulars: 'Festival Advance', particulars_mr: 'उत्सव आगाऊ', opening: '6,180', receipts: '3,200.00', payments: '', closing: '' },
    { id: 'r_legal_adv', particulars: 'Legal Fees Advance', particulars_mr: 'कायदेशीर शुल्क आगाऊ', opening: '52,830', receipts: '', payments: '', closing: '' },
    { id: 'r_keb_deposit', particulars: 'KEB Deposit (KPTCL)', particulars_mr: 'केईबी ठेव (केपीटीसीएल)', opening: '1,63,930.30', receipts: '', payments: '', closing: '' },
    { id: 'r_suraj_recv', particulars: 'Purchasel Suraj uttam Patil Receivable', particulars_mr: 'खरेदी सुरज उत्तम पाटील प्राप्य', opening: '9,637', receipts: '', payments: '', closing: '' },
    { id: 'r_purchase_old', particulars: 'Purchase A/c (old)', particulars_mr: 'खरेदी खाते (जुने)', opening: '1,12,491.28', receipts: '', payments: '', closing: '' },
    { id: 'r_recovery_fee', particulars: 'Recovery Fee (Execution Fees)', particulars_mr: 'वसुली शुल्क (अंमलबजावणी शुल्क)', opening: '7,742.51', receipts: '', payments: '', closing: '' },
    { id: 'r_proc_adv', particulars: 'Purchase Advance', particulars_mr: 'खरेदी आगाऊ', opening: '13,000', receipts: '', payments: '', closing: '' },
    { id: 'r_sundry_dep', particulars: 'Sundry Deposits (Individual Deposits)', particulars_mr: 'विविध ठेवी (वैयक्तिक ठेवी)', opening: '14,567.24', receipts: '', payments: '', closing: '' },
    { id: 'r_telephone_dep', particulars: 'Telephone Deposit', particulars_mr: 'दूरध्वनी ठेव', opening: '13,067', receipts: '', payments: '', closing: '' },
    { id: 'r_veg_market_shop', particulars: 'Vegetable Market Shop Construction Advance', particulars_mr: 'भाजीपाला बाजार दुकान बांधकाम आगाऊ', opening: '51,600', receipts: '', payments: '', closing: '' },
    { id: 'r_keb_meter', particulars: 'Cold Storage Shop meter Deposit KEB', particulars_mr: 'शीतगृह दुकान मीटर ठेव केईबी', opening: '40,366', receipts: '', payments: '', closing: '' },
    { id: 'r_keb_ho', particulars: 'KEB Deposit Head Office', particulars_mr: 'केईबी ठेव मुख्य कार्यालय', opening: '1,030', receipts: '', payments: '', closing: '' },
    { id: 'r_apmc', particulars: 'APMC License & Bank Guarantee', particulars_mr: 'एपीएमसी परवाना व बँक हमी', opening: '10,000', receipts: '', payments: '', closing: '' },
    { id: 'r_prasad_mali', particulars: 'Purchaes A/c Prasad C. Mali', particulars_mr: 'खरेदी खाते प्रसाद सी. माळी', opening: '', receipts: '2,61,968', payments: '2,63,648', closing: '' },
    { id: 'r_veg_ravi1', particulars: 'Vegetable Cash Sale Sri. Ravi Shivaji Chougule Receivable From (1)', particulars_mr: 'भाजीपाला रोख विक्री श्री. रवि शिवाजी चौगुले प्राप्य (१)', opening: '6,43,521', receipts: '', payments: '', closing: '' },
    { id: 'r_veg_ravi2', particulars: 'Vegetable Cash Sale Sri. Ravi Shivaji Chougule Receivable From (2)', particulars_mr: 'भाजीपाला रोख विक्री श्री. रवि शिवाजी चौगुले प्राप्य (२)', opening: '3,64,312.50', receipts: '', payments: '', closing: '' },
    { id: 'r_cgst_2_5', particulars: 'CGST 2.50%', particulars_mr: 'सीजीएसटी २.५०%', opening: '', receipts: '1,029.54', payments: '856.73', closing: '' },
    { id: 'r_sgst_2_5', particulars: 'SGST 2.50%', particulars_mr: 'एसजीएसटी २.५०%', opening: '', receipts: '1,029.54', payments: '856.73', closing: '' },
    { id: 'r_damage_exp', particulars: 'Damage Expiry leakage material', particulars_mr: 'नुकसान मुदतबाह्य गळती साहित्य', opening: '12,537', receipts: '', payments: '', closing: '' },
    { id: 'r_bank_comm', particulars: 'Bank Commission', particulars_mr: 'बँक कमिशन', opening: '', receipts: '', payments: '10,754.21', closing: '' },
    { id: 'r_shutter_repair', particulars: 'Cold Storage Shutter repairy', particulars_mr: 'शीतगृह शटर दुरुस्ती', opening: '', receipts: '', payments: '7,750.00', closing: '' },
    { id: 'r_india_gst', particulars: 'Govt of india G.S.T. Paid', particulars_mr: 'भारत सरकार जीएसटी भरलेले', opening: '', receipts: '', payments: '1,35,751', closing: '' },
    { id: 'r_karnataka_gst', particulars: 'Govt of karnataka G.S.T. Paid', particulars_mr: 'कर्नाटक सरकार जीएसटी भरलेले', opening: '', receipts: '', payments: '1,35,751', closing: '' },
    { id: 'r_cs_shop_rent', particulars: 'Cold Storage Building Shop Rent', particulars_mr: 'शीतगृह इमारत दुकान भाडे', opening: '', receipts: '50,000.00', payments: '', closing: '' },
    { id: 'r_salary', particulars: 'Salary A/c', particulars_mr: 'पगार खाते', opening: '', receipts: '', payments: '4,15,018', closing: '' },
    { id: 'r_cs_godown_rent', particulars: 'Cold Storage (Building Godown) Rent', particulars_mr: 'शीतगृह (इमारत गोदाम) भाडे', opening: '', receipts: '3,53,480', payments: '', closing: '' },
    { id: 'r_onion_godown_exp', particulars: 'Onion market Godown Expences', particulars_mr: 'कांदा बाजार गोदाम खर्च', opening: '', receipts: '', payments: '1,500', closing: '' },
    { id: 'r_fd_interest', particulars: 'F.D. interest', particulars_mr: 'मुदत ठेव व्याज', opening: '', receipts: '9,363', payments: '2,53,706', closing: '' },
    { id: 'r_esi_pf_gst', particulars: 'ESI, P.F. & GST Online Expenses', particulars_mr: 'ईएसआय, पीएफ व जीएसटी ऑनलाईन खर्च', opening: '', receipts: '', payments: '3,922', closing: '' },
    { id: 'r_mortgage_int', particulars: 'Mortgage Loan Interest', particulars_mr: 'तारण कर्ज व्याज', opening: '', receipts: '', payments: '51,683', closing: '' },
    { id: 'r_income_tax_refund', particulars: 'Income Tax Refund', particulars_mr: 'आयकर परतावा', opening: '', receipts: '89,110', payments: '', closing: '' },
    { id: 'r_deepavali', particulars: 'Deepavali Pooia Expence', particulars_mr: 'दीपावली पूजा खर्च', opening: '', receipts: '', payments: '1,680', closing: '' },
    { id: 'r_cs_board', particulars: 'Cold Storage Board', particulars_mr: 'शीतगृह बोर्ड', opening: '', receipts: '', payments: '7,530', closing: '' },
    { id: 'r_elec_fit_exp', particulars: 'Electric Fitting Expence', particulars_mr: 'विद्युत फिटिंग खर्च', opening: '', receipts: '', payments: '550', closing: '' },
    { id: 'r_pooja', particulars: 'Pooja Expence', particulars_mr: 'पूजा खर्च', opening: '', receipts: '', payments: '3,915', closing: '' },
    { id: 'r_fd_int_payable', particulars: 'F.D. Interest Payable', particulars_mr: 'मुदत ठेव व्याज देय', opening: '', receipts: '2,24,807', payments: '', closing: '' },

    // Closing Balance
    { id: 's_closing', particulars: 'CLOSING BALANCE', particulars_mr: 'अंतिम शिल्लक', opening: '', receipts: '', payments: '', closing: '', isSection: true, sectionColor: '#7c3aed' },
    { id: 'r_closing_bal', particulars: 'Closing Balance', particulars_mr: 'अंतिम शिल्लक', opening: '1,03,996.89', receipts: '', payments: '', closing: '' },
];

// ─── Compute Closing for a row ─────────────────────────────────────────────
const computeClosing = (row: RPRow): string => {
    const op = parseNum(row.opening);
    const rec = parseNum(row.receipts);
    const pay = parseNum(row.payments);
    const result = op + rec - pay;
    if (result === 0) return '';
    return fmtNum(result);
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ReceiptPaymentAccount: React.FC<ReceiptPaymentAccountProps> = ({
    user, onLogout, onToggleMobileMenu
}) => {
    const { lang, setLang } = useTranslation();

    const [fromDate, setFromDate] = useState('2025-04-01');
    const [toDate, setToDate] = useState('2026-03-31');
    const [periodDateText, setPeriodDateText] = useState('FROM 01 APRIL 2025 TO 31 MARCH 2026');
    const [finYear, setFinYear] = useState('2025-26');

    const [savedReports, setSavedReports] = useState<SavedAuditReport[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<string>('');

    const loadSavedReportsList = useCallback(async () => {
        try {
            const list = await listAuditReports('RECEIPT_PAYMENT');
            setSavedReports(list);
        } catch {
            // Suppress error
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
                report_type: 'RECEIPT_PAYMENT',
                financial_year: finYear,
                from_date: fromDate,
                to_date: toDate,
                header_title_en: 'RECEIPTS AND PAYMENTS ACCOUNT',
                header_title_mr: 'जमा आणि खर्च खाते',
                header_period_text: periodDateText,
                data_json: JSON.stringify(rows),
                created_by: user?.full_name || 'Accountant',
            });
            setSelectedReportId(String(saved.id));
            setSaveStatus('Saved!');
            loadSavedReportsList();
            setTimeout(() => setSaveStatus(''), 3000);
        } catch {
            setSaveStatus('Save Failed');
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    const handleLoadReport = (reportIdStr: string) => {
        setSelectedReportId(reportIdStr);
        if (!reportIdStr) return;
        const report = savedReports.find(r => r.id === parseInt(reportIdStr, 10));
        if (report) {
            try {
                const parsed = JSON.parse(report.data_json);
                setRows(parsed);
                setFromDate(report.from_date);
                setToDate(report.to_date);
                if (report.header_period_text) setPeriodDateText(report.header_period_text);
                if (report.financial_year) setFinYear(report.financial_year);
            } catch {
                alert('Could not parse report data.');
            }
        }
    };

    const [rows, setRows] = useState<RPRow[]>(() => {
        const defaults = buildDefaultRows();
        return defaults.map(r => ({
            ...r,
            closing: r.isSection ? '' : computeClosing(r),
        }));
    });

    const updateCell = useCallback((id: string, field: 'opening' | 'receipts' | 'payments' | 'closing', value: string) => {
        setRows(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updated = { ...row, [field]: value };
            if (field === 'opening' || field === 'receipts' || field === 'payments') {
                updated.closing = computeClosing(updated);
            }
            return updated;
        }));
    }, []);

    const grandOpening = rows.reduce((sum, row) => sum + (row.isSection ? 0 : parseNum(row.opening)), 0);
    const grandReceipts = rows.reduce((sum, row) => sum + (row.isSection ? 0 : parseNum(row.receipts)), 0);
    const grandPayments = rows.reduce((sum, row) => sum + (row.isSection ? 0 : parseNum(row.payments)), 0);
    const grandClosing = grandOpening + grandReceipts - grandPayments;
    const grandTotals = [grandOpening, grandReceipts, grandPayments, grandClosing].map(fmtNum);

    const handleReset = useCallback(() => {
        if (!window.confirm(lang === 'mr'
            ? 'सर्व मूल्ये डिफॉल्ट वर परत आणायचे आहेत का?'
            : 'Reset all values to defaults?')) return;
        const defaults = buildDefaultRows();
        setRows(defaults.map(r => ({
            ...r,
            closing: r.isSection ? '' : computeClosing(r),
        })));
    }, [lang]);

    const handlePrint = useCallback(() => { window.print(); }, []);

    const formatPeriodEn = () => {
        const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
        const f = new Intl.DateTimeFormat('en-IN', opts);
        return `FROM ${f.format(new Date(fromDate)).toUpperCase()} TO ${f.format(new Date(toDate)).toUpperCase()}`;
    };

    const formatPeriodMr = () => {
        const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
        const f = new Intl.DateTimeFormat('mr-IN', opts);
        return `${f.format(new Date(fromDate))} ते ${f.format(new Date(toDate))}`;
    };

    const colLabels = lang === 'mr'
        ? { particulars: 'तपशील', opening: 'प्रारंभिक', receipts: 'जमा', payments: 'खर्च', closing: 'अंतिम' }
        : { particulars: 'Particulars', opening: 'Openings', receipts: 'Receipts', payments: 'Payments', closing: 'Closing' };

    const inputBaseStyle: React.CSSProperties = {
        width: '100%',
        textAlign: 'right',
        border: '1px solid transparent',
        background: 'transparent',
        fontFamily: 'inherit',
        fontSize: 12.5,
        padding: '2px 4px',
        boxSizing: 'border-box',
    };

    return (
        <>
            <style>{`
        @media print {
          .rpa-no-print { display: none !important; }
          .rpa-print-area { padding: 0 !important; }
          body { background: white !important; }
          .main-content, .app-layout { background: white !important; }
          .rpa-table-wrapper { box-shadow: none !important; border-radius: 0 !important; border: 1px solid #ccc !important; }
          .rpa-input { border: none !important; background: transparent !important; padding: 0 2px !important; font-size: 9pt !important; }
          .rpa-table th, .rpa-table td { padding: 2px 5px !important; font-size: 9pt !important; border: 1px solid #ccc !important; }
          .rpa-section-row td { font-size: 9.5pt !important; font-weight: 700 !important; page-break-after: avoid !important; }
          @page { margin: 8mm; size: A4 portrait; }
        }
        .rpa-input { transition: background 0.15s; cursor: text; }
        .rpa-input:hover { background: rgba(99,102,241,0.08) !important; }
        .rpa-input:focus { outline: 2px solid #6366f1; border-radius: 3px; background: rgba(238,242,255,0.8) !important; }
        .rpa-data-row:hover td { background: rgba(99,102,241,0.03) !important; }
        .rpa-data-row:nth-child(even) td { background: rgba(248,250,252,0.6) !important; }
      `}</style>

            {/* Screen header */}
            <div className="rpa-no-print">
                <Header
                    title={lang === 'mr' ? 'जमा-खर्च खाते अहवाल' : 'Receipt & Payment Account'}
                    user={user}
                    onLogout={onLogout}
                    onToggleMobileMenu={onToggleMobileMenu}
                />
            </div>

            <div style={{
                padding: '20px 16px',
                paddingTop: 'calc(var(--header-h) + 32px)',
                maxWidth: 1180,
                margin: '0 auto',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
            }} className="audit-report-page rpa-print-area">

                {/* Controls */}
                <div className="rpa-no-print" style={{
                    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06))',
                    border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, padding: '12px 16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            {lang === 'mr' ? 'दिनांक पासून:' : 'From:'}
                        </label>
                        <input type="date" value={fromDate} onChange={e => {
                            const val = e.target.value;
                            setFromDate(val);
                            if (val && toDate) setFinYear(getFinancialYear(val, toDate));
                            if (val && toDate) {
                                const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                                setPeriodDateText(`FROM ${f.format(new Date(val)).toUpperCase()} TO ${f.format(new Date(toDate)).toUpperCase()}`);
                            }
                        }} style={{
                            border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 10px',
                            fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
                        }} />
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            {lang === 'mr' ? 'पर्यंत:' : 'To:'}
                        </label>
                        <input type="date" value={toDate} onChange={e => {
                            const val = e.target.value;
                            setToDate(val);
                            if (fromDate && val) setFinYear(getFinancialYear(fromDate, val));
                            if (fromDate && val) {
                                const f = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
                                setPeriodDateText(`FROM ${f.format(new Date(fromDate)).toUpperCase()} TO ${f.format(new Date(val)).toUpperCase()}`);
                            }
                        }} style={{
                            border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 10px',
                            fontSize: 13, fontWeight: 500, color: '#1e293b', background: 'white',
                        }} />
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                            {lang === 'mr' ? 'आर्थिक वर्ष:' : 'Financial Year:'}
                        </label>
                        <input value={finYear} onChange={e => setFinYear(e.target.value)} placeholder="2025-26" style={{
                            width: 92, border: '1.5px solid #c7d2fe', borderRadius: 7, padding: '5px 8px',
                            fontSize: 13, fontWeight: 700, color: '#1e293b', background: 'white',
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                            <FolderOpen size={15} style={{ color: '#6366f1' }} />
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
                                {savedReports.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.financial_year} ({r.from_date} ~ {r.to_date})
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
                            color: '#6366f1', fontWeight: 600, fontSize: 13, cursor: 'pointer',
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
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                        }}>
                            <Printer size={14} />
                            {lang === 'mr' ? 'प्रिंट' : 'Print'}
                        </button>
                    </div>
                </div>

                {/* Document header (always visible incl. print) */}
                <div style={{
                    textAlign: 'center', marginBottom: 12,
                    borderBottom: '2px solid #0f172a', paddingBottom: 10,
                }}>
                    <div style={{
                        fontFamily: "'Times New Roman', serif",
                        fontSize: 17, fontWeight: 900, color: '#0f172a',
                        textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3,
                    }}>
                        {lang === 'mr'
                            ? 'बेळगाव बागायतदार सहकारी खरेदी-विक्री संस्था, बेळगाव'
                            : 'THE BELAGAVI GARDENER CO-OP SOCIETY NI, BELAGAVI'}
                    </div>
                    <div style={{
                        fontSize: 13, fontWeight: 800, color: '#1e40af',
                        letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 5,
                    }}>
                        {lang === 'mr' ? 'जमा आणि खर्च खाते' : 'RECEIPTS AND PAYMENTS ACCOUNT'}
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        fontSize: 11.5, fontWeight: 600, color: '#475569', marginTop: 4
                    }}>
                        <input
                            type="text"
                            className="rpa-input"
                            value={periodDateText}
                            onChange={e => setPeriodDateText(e.target.value)}
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#1e293b',
                                borderBottom: '1.5px dashed #6366f1',
                                background: 'transparent',
                                textAlign: 'center',
                                width: '380px',
                                fontFamily: 'inherit',
                                letterSpacing: '0.04em',
                                padding: '1px 4px',
                            }}
                            title={lang === 'mr' ? 'तारीख मथळा संपादित करण्यासाठी येथे क्लिक करा' : 'Click to edit header date text'}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="rpa-table-wrapper" style={{
                    background: 'white', borderRadius: 10, overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
                }}>
                    <table className="rpa-table" style={{
                        width: '100%', borderCollapse: 'collapse',
                        fontSize: 12.5, fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    }}>
                        <colgroup>
                            <col style={{ width: '38%' }} />
                            <col style={{ width: '15.5%' }} />
                            <col style={{ width: '15.5%' }} />
                            <col style={{ width: '15.5%' }} />
                            <col style={{ width: '15.5%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ background: '#1e293b', color: 'white' }}>
                                {(['particulars', 'opening', 'receipts', 'payments', 'closing'] as const).map(col => (
                                    <th key={col} style={{
                                        padding: '10px 12px',
                                        textAlign: col === 'particulars' ? 'left' : 'right',
                                        fontWeight: 700, fontSize: 11.5, letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        borderRight: '1px solid rgba(255,255,255,0.1)',
                                    }}>
                                        {colLabels[col]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                if (row.isSection) {
                                    return (
                                        <tr key={row.id} className="rpa-section-row" style={{
                                            background: row.sectionColor || '#1e293b',
                                        }}>
                                            <td colSpan={5} style={{
                                                padding: '6px 12px',
                                                fontWeight: 800, fontSize: 12, color: 'white',
                                                letterSpacing: '0.05em', textTransform: 'uppercase',
                                            }}>
                                                {lang === 'mr' ? row.particulars_mr : row.particulars}
                                            </td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={row.id} className="rpa-data-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{
                                            padding: '3px 12px', color: '#1e293b',
                                            fontWeight: 500, borderRight: '1px solid #f1f5f9',
                                            fontSize: 12,
                                        }}>
                                            {lang === 'mr' ? row.particulars_mr : row.particulars}
                                        </td>
                                        <td style={{ padding: '2px 4px', borderRight: '1px solid #f1f5f9' }}>
                                            <input
                                                className="rpa-input"
                                                value={row.opening}
                                                onChange={e => updateCell(row.id, 'opening', e.target.value)}
                                                style={{ ...inputBaseStyle, color: '#1e293b' }}
                                            />
                                        </td>
                                        <td style={{ padding: '2px 4px', borderRight: '1px solid #f1f5f9' }}>
                                            <input
                                                className="rpa-input"
                                                value={row.receipts}
                                                onChange={e => updateCell(row.id, 'receipts', e.target.value)}
                                                style={{ ...inputBaseStyle, color: '#047857' }}
                                            />
                                        </td>
                                        <td style={{ padding: '2px 4px', borderRight: '1px solid #f1f5f9' }}>
                                            <input
                                                className="rpa-input"
                                                value={row.payments}
                                                onChange={e => updateCell(row.id, 'payments', e.target.value)}
                                                style={{ ...inputBaseStyle, color: '#dc2626' }}
                                            />
                                        </td>
                                        <td style={{ padding: '2px 4px' }}>
                                            <input
                                                className="rpa-input"
                                                value={row.closing}
                                                onChange={e => {
                                                    setRows(prev => prev.map(r => r.id === row.id ? { ...r, closing: e.target.value } : r));
                                                }}
                                                style={{ ...inputBaseStyle, color: '#1e40af', fontWeight: 600 }}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Grand Total */}
                            <tr style={{
                                background: '#0f172a', color: 'white',
                                fontWeight: 800, borderTop: '3px double #6366f1',
                            }}>
                                <td style={{ padding: '10px 12px', fontSize: 13 }}>
                                    {lang === 'mr' ? 'एकूण' : 'Total'}
                                </td>
                                {grandTotals.map((v, i) => (
                                    <td key={i} style={{
                                        padding: '10px 12px', textAlign: 'right',
                                        fontSize: 12.5, borderLeft: '1px solid rgba(255,255,255,0.12)',
                                    }}>
                                        {v}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="rpa-no-print" style={{ marginTop: 14, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                    {lang === 'mr'
                        ? '* सर्व रक्कम रुपयांमध्ये. बंद स्तंभ स्वयंचलित गणना (प्रारंभिक + जमा − खर्च) दर्शवितो, परंतु संपादनयोग्य आहे.'
                        : '* All amounts in ₹. Closing column auto-calculates (Opening + Receipts − Payments) but remains editable.'}
                </div>
            </div>
        </>
    );
};

export default ReceiptPaymentAccount;
