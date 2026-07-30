import { translateText } from '../api/client';

// ─── Comprehensive English-to-Marathi Society & Agriculture Dictionary ────────
const MARATHI_DICTIONARY: Record<string, string> = {
  // Products
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
  'Brass Nozzle Set': 'ब्रास नोझल संच',

  // Rent Items
  'Cold Storage Shop Rent': 'कोल्ड स्टोरेज दुकान भाडे',
  'Head Office Building Rent': 'हेड ऑफिस इमारत भाडे',
  'Cold Storage Godown Rent': 'कोल्ड स्टोरेज गोदाम भाडे',
  'Under Godown Rent': 'अंडर गोदाम भाडे',
  'Onion Market Godown Rent': 'कांदा मार्केट गोदाम भाडे',
  'New Shop Rent': 'नवीन दुकान भाडे',
  'Cold Storage Charges': 'कोल्ड स्टोरेज आकार',

  // Cashier Accounts & Particulars
  'Advance a/c': 'ॲडव्हान्स खाते',
  'PF A/c': 'पीएफ खाते',
  'ESI a/c': 'ईएसआय खाते',
  'Staff Personal a/c': 'स्टाफ वैयक्तिक खाते',
  'Sundrey a/c (debit and credit)': 'सुंदरी खाते (नावे व जमा)',
  'Sundrey a/c (debit/credit)': 'सुंदरी खाते (नावे/जमा)',
  'pesticide sale': 'कीटकनाशक विक्री',
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
  'Belgaum': 'बेळगाव',
  'Belagavi': 'बेळगावी',
};

// ─── Simple Phonetic English to Devanagari Transliteration Fallback ───────────
const VOWELS: Record<string, string> = {
  a: 'अ', aa: 'आ', i: 'इ', ee: 'ई', u: 'उ', oo: 'ऊ', e: 'ए', ai: 'ऐ', o: 'ओ', au: 'औ',
};

const CONSONANTS: Record<string, string> = {
  b: 'ब', bh: 'भ', ch: 'च', d: 'द', dh: 'ध', f: 'फ', g: 'ग', gh: 'घ', h: 'ह',
  j: 'ज', jh: 'झ', k: 'क', kh: 'ख', l: 'ल', m: 'म', n: 'न', p: 'प', ph: 'फ',
  r: 'र', s: 'स', sh: 'श', t: 'त', th: 'थ', v: 'व', w: 'व', y: 'य', z: 'झ',
};

export const phoneticTransliterate = (text: string): string => {
  if (!text) return '';
  let result = text.toLowerCase();

  // Simple token replacements for common words
  const words = result.split(' ');
  const transliteratedWords = words.map(w => {
    // Check if in dictionary (case-insensitive)
    const foundKey = Object.keys(MARATHI_DICTIONARY).find(k => k.toLowerCase() === w);
    if (foundKey) return MARATHI_DICTIONARY[foundKey];

    let out = '';
    let i = 0;
    while (i < w.length) {
      const two = w.slice(i, i + 2);
      if (CONSONANTS[two]) {
        out += CONSONANTS[two];
        i += 2;
      } else if (VOWELS[two]) {
        out += VOWELS[two];
        i += 2;
      } else if (CONSONANTS[w[i]]) {
        out += CONSONANTS[w[i]];
        i += 1;
      } else if (VOWELS[w[i]]) {
        out += VOWELS[w[i]];
        i += 1;
      } else {
        out += w[i];
        i += 1;
      }
    }
    return out || w;
  });

  return transliteratedWords.join(' ');
};

/**
 * Smart Multi-Tier Marathi Translator:
 * 1. Checks static MARATHI_DICTIONARY
 * 2. Calls IndicTrans2 API
 * 3. Fallbacks to Phonetic Transliteration
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

  // Tier 2: Call IndicTrans2 Microservice / Backend API
  try {
    const res = await translateText(trimmed, 'mar_Deva');
    if (res && res.translated_text && res.translated_text.trim() !== trimmed) {
      return res.translated_text.trim();
    }
  } catch {
    // Fallthrough to Tier 3
  }

  // Tier 3: Phonetic Transliteration Engine
  return phoneticTransliterate(trimmed);
};
