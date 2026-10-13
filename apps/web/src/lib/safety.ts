// Distress detection and the crisis reply.
//
// The original check had 5 English phrases and one Hindi word and no Telugu at all, even though
// Telugu is the primary language. It also answered in English only, called its own crisis text
// "a placeholder", and filed the ticket with a 24-hour deadline.
//
// IMPORTANT: the Telugu and Hindi phrase lists below are a starting point written without a native
// reviewer. Have a Telugu and a Hindi speaker extend and sign them off before real use, and keep
// the test cases in __tests__/safety.test.ts in step with the list.
export type Lang = 'en' | 'te' | 'hi' | 'ta';

// Tele-MANAS: free, 24x7 national helpline run under the Ministry of Health and Family Welfare.
export const TELE_MANAS = { short: '14416', tollFree: '1800-891-4416', site: 'https://telemanas.mohfw.gov.in' };

const PHRASES: Record<Lang | 'romanised', string[]> = {
  en: [
    'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die', 'wanna die', 'better off dead',
    'self harm', 'self-harm', 'hurt myself', 'cut myself', "don't want to live", 'do not want to live',
    'no reason to live', 'take my own life',
    'ending my life', 'end it all', 'ending it all', 'take my life', 'taking my life', 'want to be dead', 'wish i was dead', 'wish i were dead',
  ],
  hi: [
    'आत्महत्या', 'खुदकुशी', 'ख़ुदकुशी', 'मरना चाहता', 'मरना चाहती', 'मर जाना चाहता', 'मर जाना चाहती',
    'जीना नहीं चाहता', 'जीना नहीं चाहती', 'जान दे दूं', 'जान दे दूँ', 'अपनी जान', 'खुद को खत्म', 'खुद को मार',
  ],
  te: [
    'చచ్చిపోవాల', 'చనిపోవాల', 'చచ్చిపోతాను', 'చనిపోతాను', 'ప్రాణం తీసుకో', 'ప్రాణాలు తీసుకో', 'ఆత్మహత్య చేసుకో',
    'ఆత్మహత్య', 'చనిపోవాలని', 'చచ్చిపోవాలని', 'చనిపోవాలి', 'చచ్చిపోవాలి', 'బతకాలని లేదు', 'బ్రతకాలని లేదు',
    'జీవించాలని లేదు', 'నన్ను నేను చంపుకు', 'ప్రాణం తీసుకు', 'చావాలని ఉంది', 'చావాలనిపిస్తోంది',
    'నా ప్రాణం పోవాలి', 'ప్రాణం విడవాలని', 'ఆత్మహత్యాయత్నం', 'జీవితం ముగియాలి', 'చనిపోతా', 'చచ్చిపోతా',
  ],
  ta: [
    'தற்கொலை', 'சாக வேண்டும்', 'சாகணும்', 'சாகப் போகிறேன்', 'இறக்க வேண்டும்', 'இறந்துவிட வேண்டும்',
    'வாழ விருப்பம் இல்லை', 'வாழ பிடிக்கவில்லை', 'உயிரை மாய்த்து', 'என்னை நானே கொல்ல',
    'வாழவே பிடிக்கல', 'சாகனும் போல இருக்கு', 'உயிரை விடணும்', 'தற்கொலை முயற்சி', 'செத்துடலாம்',
  ],
  romanised: [
    'aatmahatya', 'atmahatya', 'khudkushi', 'marna chahta', 'marna chahti', 'jeena nahi chahta', 'jeena nahi chahti',
    'chanipovali', 'chachipovali', 'chavalani undi', 'bathakalani ledu', 'chachipotha', 'chanipotha',
    'thatkolai', 'saganum', 'saga vendum', 'seththudalam',
  ],
};

const ALL = Object.values(PHRASES).flat().map(p => p.normalize('NFC').toLowerCase());

function normalise(text: string) {
  return text.normalize('NFC').toLowerCase().replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ');
}

export function hasDistressSignal(text: string): boolean {
  const t = normalise(text);
  return ALL.some(p => t.includes(p));
}

export function crisisReply(lang: Lang, counsellorNotified = false): string {
  const { short, tollFree } = TELE_MANAS;
  const counsellorText = {
    te: counsellorNotified ? ' మీ అభ్యర్థనను అత్యవసరంగా కౌన్సెలర్‌కు పంపాను.' : '',
    hi: counsellorNotified ? ' मैंने आपका अनुरोध तुरंत काउंसलर को भेज दिया है।' : '',
    ta: counsellorNotified ? ' உங்கள் கோரிக்கையை அவசரமாக ஆலோசகருக்கு அனுப்பியுள்ளேன்.' : '',
    en: counsellorNotified ? ' I have marked your request as urgent for a counsellor.' : '',
  };

  if (lang === 'te') {
    return `మీరు ఇంత బాధలో ఉన్నందుకు నాకు చాలా బాధగా ఉంది. మీరు ఒంటరి కాదు. ఇప్పుడే ${short} (లేదా ${tollFree}) కి కాల్ చేయండి. ఇది ఉచితం, 24 గంటలూ పనిచేస్తుంది, తెలుగులో మాట్లాడవచ్చు. మీ దగ్గర ఉన్న నమ్మకమైన వ్యక్తిని పిలిచి మీ దగ్గరే ఉండమని చెప్పండి.${counsellorText.te}`;
  }
  if (lang === 'hi') {
    return `आप इतने दुख में हैं, यह सुनकर मुझे बहुत चिंता हो रही है। आप अकेले नहीं हैं। अभी ${short} (या ${tollFree}) पर कॉल करें। यह मुफ़्त है, 24 घंटे चालू रहता है और आप अपनी भाषा में बात कर सकते हैं। किसी भरोसेमंद व्यक्ति को अपने पास बुला लें।${counsellorText.hi}`;
  }
  if (lang === 'ta') {
    return `நீங்கள் இவ்வளவு வேதனையில் இருப்பதைக் கேட்டு எனக்கு மிகவும் கவலையாக இருக்கிறது. நீங்கள் தனியாக இல்லை. இப்போதே ${short} (அல்லது ${tollFree}) எண்ணை அழையுங்கள். இது இலவசம், 24 மணி நேரமும் செயல்படும், உங்கள் மொழியில் பேசலாம். நம்பகமான ஒருவரை உங்களுடன் இருக்கச் சொல்லுங்கள்.${counsellorText.ta}`;
  }
  return `I'm really sorry you're in this much pain, and I'm glad you told me. You are not alone. Please call ${short} (or ${tollFree}) now. It is free, open 24 hours, and you can speak in your own language. If you can, ask someone you trust to stay with you.${counsellorText.en}`;
}

