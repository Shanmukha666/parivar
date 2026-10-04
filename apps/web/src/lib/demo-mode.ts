export function hasSupabaseConfig(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

  if (!url || !key) return false;

  const placeholderPatterns = [
    /demo-project/i,
    /your-project/i,
    /demo-publishable-key/i,
    /your-supabase/i,
    /placeholder/i,
  ];

  return !placeholderPatterns.some((pattern) => pattern.test(url) || pattern.test(key));
}

export function demoSessionResponse(payload: Record<string, unknown>) {
  return {
    id: 'local-demo-session',
    owner_id: '00000000-0000-0000-0000-000000000001',
    lang: payload.lang ?? 'en',
    state: payload.state ?? 'Telangana',
    district: payload.district ?? 'Warangal',
    user_role: payload.user_role ?? 'both',
    learner_class: payload.learner_class ?? 'Class 10 Pass',
    income_bracket: payload.income_bracket ?? '₹1 - 3 Lakhs',
    selected_trade_id: payload.selected_trade_id ?? 1,
    consent: true,
    consent_version: payload.consent_version ?? 'v1',
    consented_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

export function demoOutcomeResponse() {
  const base = [
    {
      id: 1,
      trade_id: 1,
      state: 'Telangana',
      district: 'Warangal',
      metric_key: 'placement_rate',
      metric_value: '78.4',
      metric_text: '78.4%',
      unit: '%',
      sample_size: 42,
      year: 2024,
      verification_status: 'verified',
      is_synthetic: false,
      verification_date: '2024-12-01',
      data_sources: {
        publisher: 'NCVT',
        title: 'Tracer Study',
        source_url: 'https://example.com/demo-source',
        document_reference: 'NCVT Table 4.1',
      },
    },
    {
      id: 2,
      trade_id: 1,
      state: 'Telangana',
      district: 'Warangal',
      metric_key: 'starting_earnings',
      metric_value: '16500',
      metric_text: '₹16,500/month',
      unit: 'INR',
      sample_size: 42,
      year: 2024,
      verification_status: 'verified',
      is_synthetic: false,
      verification_date: '2024-12-01',
      data_sources: {
        publisher: 'NCVT',
        title: 'Tracer Study',
        source_url: 'https://example.com/demo-source',
        document_reference: 'NCVT Table 4.1',
      },
    },
  ];

  return base.map((metric) => ({
    ...metric,
    stale: false,
    source: {
      publisher: metric.data_sources.publisher,
      title: metric.data_sources.title,
      url: metric.data_sources.source_url,
      document_reference: metric.data_sources.document_reference,
    },
    data_sources: undefined,
  }));
}

export function demoChatReply(text: string, lang: string = 'en') {
  const normalized = text.toLowerCase();
  if (normalized.includes('salary') || normalized.includes('earn') || normalized.includes('wage')) {
    return {
      reply: lang === 'te'
        ? 'అధికారం ఆధారిత ధ్రువీకరించిన డేటా ప్రకారం, ప్రారంభ వేతనం రూ. 16,500/తేదీగా ఉండవచ్చు. నేను ఖచ్చితంగా తెలియని సంఖ్యను జోడించను; మీరు కోరితే మానవ counsellor సహాయం పొందవచ్చు.'
        : lang === 'hi'
          ? 'सत्यापित डेटा के अनुसार, शुरुआती कमाई लगभग ₹16,500/माह है। मैं बिना प्रमाण के कोई संख्या नहीं डालूँगा; अगर चाहें, मैं मानव counsellor से जोड़ सकता हूँ।'
          : lang === 'ta'
            ? 'சரிபார்க்கப்பட்ட தரவுகளின்படி, தொடக்க வருமானம் சுமார் ₹16,500/மாதம் ஆகும். I உறுதியாகச் சான்றில்லாத எண் சொல்ல மாட்டேன்; வேண்டுமெனில் மனித ஆலோசகருடன் இணைக்கிறேன்.'
            : 'Based on verified data, the starting earnings are approximately ₹16,500/month. I will not invent an unsupported number, and I can connect you with a human counsellor if needed.',
      citations: [],
      suggested_chips: ['Talk to a counsellor', 'Ask about placement'],
      escalate: true,
      escalate_reason: 'demo_mode',
    };
  }

  return {
    reply: lang === 'te'
      ? 'ఇది డెమో మోడ్. అంచనా మరియు ధ్రువీకరణకు బదులుగా, నేను మీకు verified evidence ఆధారంగా సమాచారం అందిస్తాను మరియు అవసరమైతే మానవ counsellorను ఆదేశిస్తాను.'
      : lang === 'hi'
        ? 'यह डेमो मोड है। अनुमान के बजाय, मैं सत्यापित evidence के आधार पर जानकारी दूँगा और जरूरत पड़ने पर मानव counsellor से जोड़ दूँगा।'
        : lang === 'ta'
          ? 'இது டெமோ பயன்முறை. கற்பனைக்குப் பதிலாக, நான் சரிபார்க்கப்பட்ட ஆதாரங்களின் அடிப்படையில் தகவலை வழங்குவேன்; தேவைப்பட்டால் மனித ஆலோசகருடன் இணைப்பேன்.'
          : 'This is demo mode. Instead of guessing, I can provide verified evidence-based guidance and connect you with a human counsellor if you need one.',
    citations: [],
    suggested_chips: ['Talk to a counsellor'],
    escalate: false,
  };
}
