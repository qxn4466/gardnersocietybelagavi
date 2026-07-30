import { translateText } from '../api/client';

// ─── Comprehensive English-to-Marathi Society, Agriculture & Names Dictionary ──
export const MARATHI_DICTIONARY: Record<string, string> = {
  // Names & Common Marathi Words
  'Avinash': 'अविनाश',
  'Arun': 'अरुण',
  'Suregaonkar': 'सुरेगावकर',
  'Avinash Arun Suregaonkar': 'अविनाश अरुण सुरेगावकर',
  'Ramesh': 'रमेश',
  'Suresh': 'सुरेश',
  'Mahesh': 'महेश',
  'Ganesh': 'गणेश',
  'Prakash': 'प्रकाश',
  'Sachin': 'सचिन',
  'Patil': 'पाटील',
  'Pawar': 'पवार',
  'Deshmukh': 'देशमुख',
  'Kulkarni': 'कुलकर्णी',
  'Jadhav': 'जाधव',
  'Shinde': 'शिंदे',
  'Chavan': 'चव्हाण',
  'Gaekwad': 'गायकवाड',
  'Kadam': 'कदम',
  'Joshi': 'जोशी',
  'Mane': 'माने',
  'More': 'मोरे',
  'Belgaum': 'बेळगाव',
  'Belagavi': 'बेळगावी',
  'Belagavi Gardeners': 'बेळगावी गार्डनर्स',

  // Products & Dropdowns
  'Boric Acid': 'बोरीक ॲसिड',
  'Chlorpyrifos 20% EC': 'क्लोरोपायरीफॉस २०% ईसी',
  'Monocrotophos 36% SL': 'मोनोक्रोटोफॉस ३६% एसएल',
  'Mancozeb 75% WP': 'मॅनकोझेब ७५% डब्ल्यूपी',
  'Neem Oil 10000 PPM': 'कडुलिंब तेल १०००० पीपीएम',
  'Malathion 50% EC': 'मॅलाथिऑन ५०% ईसी',
  'Copper Oxychloride 50% WP': 'कॉपर ऑक्सिक्लोराईड ५०% डब्ल्यूपी',
  'Carbendazim 50% WP': 'कारबेन्डाझिम ५०% डब्ल्यूपी',
  'Imidacloprid 17.8% SL': 'इमिडाक्लोप्रिड १७.८% एसएल',
  'Cypermethrin 10% EC': 'सायपरमेथ्रिन १०% ईसी',
  'Spray Pump Battery Operated': 'स्प्रे पंप बॅटरी ऑपरेटेड',
  'Spray Pump Battery 16L': 'स्प्रे पंप बॅटरी १६ लि',
  'Brass Nozzle Set': 'ब्रास नोझल संच',

  // Rent Dropdown Items
  'Cold Storage Shop Rent': 'कोल्ड स्टोरेज दुकान भाडे',
  'Head Office Building Rent': 'हेड ऑफिस इमारत भाडे',
  'Cold Storage Godown Rent': 'कोल्ड स्टोरेज गोदाम भाडे',
  'Under Godown Rent': 'अंडर गोदाम भाडे',
  'Onion Market Godown Rent': 'कांदा मार्केट गोदाम भाडे',
  'New Shop Rent': 'नवीन दुकान भाडे',
  'Cold Storage Charges': 'कोल्ड स्टोरेज आकार',

  // Cashier Accounts & Dropdown Particulars
  'Advance a/c': 'ॲडव्हान्स खाते',
  'PF A/c': 'पीएफ खाते',
  'ESI a/c': 'ईएसआय खाते',
  'Staff Personal a/c': 'स्टाफ वैयक्तिक खाते',
  'Sundrey a/c (debit and credit)': 'सुंदरी खाते (नावे व जमा)',
  'Sundrey a/c (debit/credit)': 'सुंदरी खाते (नावे/जमा)',
  'pesticide sale': 'कीटकनाशक विक्री',
  'Pesticide sale': 'कीटकनाशक विक्री',
  'Seed sale': 'बियाणे विक्री',
  'Loan No': 'कर्ज क्रमांक',
  'Incharge allowance a/c': 'इंचार्ज भत्ता खाते',
  'Monthly allowance a/c': 'मासिक भत्ता खाते',
  'CC No': 'सीसी क्रमांक',
  'Daily wages pay': 'दैनिक मजुरी वेतन',
  'ESI': 'ईएसआय',
  'Legal Fee': 'कायदेशीर फी',
  'IT returning fee': 'आयटी रिटर्निंग फी',
  'Weight and measurement': 'वजन व मापे',
  'License renewal fee': 'परवाना नूतनीकरण फी',
  'A/C no': 'खाते क्रमांक',
  'CA NO': 'सीए क्रमांक',
  'ESI and Other contribution': 'ईएसआय व इतर योगदान',
  'Seeds purchase a/c': 'बियाणे खरेदी खाते',
  'Electric power a/c': 'वीज वीज खाते',
  'Pesticide purchase a/c': 'कीटकनाशक खरेदी खाते',
  'Meeting': 'सभा/बैठक',

  // Table Headers & Labels
  'Date': 'दिनांक',
  'Name': 'नाव',
  'Customer Name': 'ग्राहकाचे नाव',
  'Particulars': 'तपशील',
  'Qty': 'प्रमाण (Qty)',
  'Amount': 'रक्कम',
  'Rate': 'दर',
  'Base Amt (₹)': 'मूळ रक्कम (₹)',
  'SGST (₹)': 'एसजीएसटी (₹)',
  'CGST (₹)': 'सीजीएसटी (₹)',
  'HMall (₹)': 'हमाली (₹)',
  'Motor Rent (₹)': 'मोटर भाडे (₹)',
  'Total Amount': 'एकूण रक्कम',
  'Total (₹)': 'एकूण (₹)',
  'Net Rate': 'निव्वळ दर',
  'Selling Rate': 'विक्री दर',
  'Stock Book No.': 'स्टॉक बुक क्र.',
  'Sign': 'स्वाक्षरी',
  'Actions': 'कृती',
  'Invoice No': 'इनव्हॉईस क्र.',
  'Bill No': 'बिल क्र.',
  'HSN Code': 'एचएसएन कोड',
  'Batch / Source Ref': 'बॅच / संदर्भ',
  'Product Name': 'उत्पादनाचे नाव',
  'Share (%)': 'वाटा (%)',
  'Total Sales (₹)': 'एकूण विक्री (₹)',
  'Total Qty': 'एकूण प्रमाण',

  // General Terms
  'Signed': 'स्वाक्षरीत',
  'Seller Signed': 'विक्रेत्याची स्वाक्षरी',
  'Paid in cash': 'रोखीने दिले',
  'Received in cash': 'रोखीने मिळाले',
  'Cheque issued': 'धनादेश जारी केला',
  'Retail sale': 'किरकोळ विक्री',
  'Shopkeeper': 'दुकानदार',
  'Cashier': 'कॅशियर',
  'Accountant': 'लेखापाल',
  'Manager': 'व्यवस्थापक',
};

/**
 * Synchronously translate dictionary items (labels, dropdowns, headers)
 */
export const getMarathiItem = (text: string): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (MARATHI_DICTIONARY[trimmed]) return MARATHI_DICTIONARY[trimmed];
  const dictKey = Object.keys(MARATHI_DICTIONARY).find(k => k.toLowerCase() === trimmed.toLowerCase());
  if (dictKey) return MARATHI_DICTIONARY[dictKey];
  return text;
};

// ─── Syllable-Aware English to Devanagari Transliteration Algorithm ─────────
// Independent Vowels at word start
const INITIAL_VOWELS: [RegExp, string][] = [
  [/^aa/i, 'आ'], [/^ai/i, 'ऐ'], [/^au/i, 'औ'], [/^a/i, 'अ'],
  [/^ee/i, 'ई'], [/^i/i, 'इ'], [/^oo/i, 'ऊ'], [/^u/i, 'उ'],
  [/^e/i, 'ए'], [/^o/i, 'ओ'],
];

// Dependent Vowel Matras following consonants
const MATRAS: [RegExp, string][] = [
  [/^aa/i, 'ा'], [/^ai/i, 'ै'], [/^au/i, 'ौ'], [/^a/i, 'ा'], // 'a' inside names maps to 'ा' or inherent
  [/^ee/i, 'ी'], [/^i/i, 'ि'], [/^oo/i, 'ू'], [/^u/i, 'ु'],
  [/^e/i, 'े'], [/^o/i, 'ो'],
];

// Multi-letter & Single Consonants
const CONSONANT_MAP: [RegExp, string][] = [
  [/^sh/i, 'श'], [/^ch/i, 'च'], [/^th/i, 'थ'], [/^dh/i, 'ध'],
  [/^bh/i, 'भ'], [/^kh/i, 'ख'], [/^gh/i, 'घ'], [/^ph/i, 'फ'],
  [/^jh/i, 'झ'], [/^b/i, 'ब'], [/^c/i, 'क'], [/^d/i, 'द'],
  [/^f/i, 'फ'], [/^g/i, 'ग'], [/^h/i, 'ह'], [/^j/i, 'ज'],
  [/^k/i, 'क'], [/^l/i, 'ल'], [/^m/i, 'म'], [/^n/i, 'न'],
  [/^p/i, 'प'], [/^r/i, 'र'], [/^s/i, 'स'], [/^t/i, 'त'],
  [/^v/i, 'व'], [/^w/i, 'व'], [/^y/i, 'य'], [/^z/i, 'झ'],
];

export const phoneticTransliterate = (text: string): string => {
  if (!text || !text.trim()) return '';
  const words = text.trim().split(/\s+/);

  const transliteratedWords = words.map(word => {
    // 1. Direct dictionary match check
    const dictMatch = Object.keys(MARATHI_DICTIONARY).find(k => k.toLowerCase() === word.toLowerCase());
    if (dictMatch) return MARATHI_DICTIONARY[dictMatch];

    let remainder = word;
    let out = '';
    let isStart = true;
    let lastWasConsonant = false;

    while (remainder.length > 0) {
      if (isStart) {
        // Check initial independent vowels
        let matchedVowel = false;
        for (const [pattern, dev] of INITIAL_VOWELS) {
          const m = remainder.match(pattern);
          if (m) {
            out += dev;
            remainder = remainder.slice(m[0].length);
            matchedVowel = true;
            isStart = false;
            lastWasConsonant = false;
            break;
          }
        }
        if (matchedVowel) continue;
      }

      if (lastWasConsonant) {
        // Look for vowel matra
        let matchedMatra = false;
        for (const [pattern, matra] of MATRAS) {
          const m = remainder.match(pattern);
          if (m) {
            // 'a' at end of word is usually silent or implicit; inside word maps to 'ा'
            if (pattern.source === '^a' && remainder.length === 1) {
              // silent 'a' at end
            } else if (pattern.source === '^a') {
              out += 'ा';
            } else {
              out += matra;
            }
            remainder = remainder.slice(m[0].length);
            matchedMatra = true;
            lastWasConsonant = false;
            break;
          }
        }
        if (matchedMatra) continue;
      }

      // Look for consonants
      let matchedConsonant = false;
      for (const [pattern, dev] of CONSONANT_MAP) {
        const m = remainder.match(pattern);
        if (m) {
          out += dev;
          remainder = remainder.slice(m[0].length);
          matchedConsonant = true;
          lastWasConsonant = true;
          isStart = false;
          break;
        }
      }
      if (matchedConsonant) continue;

      // Unmatched character (digits, symbols, punctuation)
      out += remainder[0];
      remainder = remainder.slice(1);
      isStart = false;
      lastWasConsonant = false;
    }

    return out || word;
  });

  return transliteratedWords.join(' ');
};

/**
 * Smart Multi-Tier Marathi Translator:
 * 1. Checks static MARATHI_DICTIONARY (100% exact Marathi names/terms)
 * 2. Calls IndicTrans2 Microservice / Backend API
 * 3. Fallbacks to Syllable-Aware Phonetic Transliteration Algorithm
 */
export const translateToMarathi = async (text: string): Promise<string> => {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // Tier 1: Exact or case-insensitive Dictionary Match
  if (MARATHI_DICTIONARY[trimmed]) {
    return MARATHI_DICTIONARY[trimmed];
  }
  const dictKey = Object.keys(MARATHI_DICTIONARY).find(k => k.toLowerCase() === trimmed.toLowerCase());
  if (dictKey) {
    return MARATHI_DICTIONARY[dictKey];
  }

  // Check word-by-word dictionary match (e.g., "Avinash Arun Suregaonkar")
  const words = trimmed.split(/\s+/);
  const allWordsInDict = words.every(w =>
    Object.keys(MARATHI_DICTIONARY).some(k => k.toLowerCase() === w.toLowerCase())
  );
  if (allWordsInDict) {
    return words.map(w => {
      const k = Object.keys(MARATHI_DICTIONARY).find(key => key.toLowerCase() === w.toLowerCase());
      return k ? MARATHI_DICTIONARY[k] : w;
    }).join(' ');
  }

  // Tier 2: Call IndicTrans2 Microservice / Backend API
  try {
    const res = await translateText(trimmed, 'mar_Deva');
    if (res && res.translated_text && res.translated_text.trim() !== trimmed && !res.translated_text.includes('अ-व')) {
      return res.translated_text.trim();
    }
  } catch {
    // Fallthrough to Tier 3
  }

  // Tier 3: Syllable-Aware Phonetic Transliteration Algorithm
  return phoneticTransliterate(trimmed);
};
