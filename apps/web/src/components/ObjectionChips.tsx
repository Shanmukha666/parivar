'use client';

import { useStore } from '../lib/store';

export default function ObjectionChips({ onSelect }: { onSelect: (objection: string) => void }) {
  const { language } = useStore();

  const chipsByLang: Record<string, Array<{ label: string; query: string }>> = {
    hi: [
      { label: '💰 कमाई कितनी होगी?', query: 'इस काम में शुरुआती और 3 साल बाद कमाई कितनी होगी?' },
      { label: '🛡️ क्या काम सुरक्षित है?', query: 'क्या यह काम सुरक्षित है? काम पर चोट लगने का खतरा तो नहीं?' },
      { label: '👥 समाज क्या कहेगा?', query: 'रिश्तेदार और समाज क्या कहेंगे? क्या इसमें सम्मान है?' },
      { label: '💼 पक्की नौकरी मिलेगी?', query: 'कोर्स के बाद नौकरी मिलने की क्या गारंटी है?' },
      { label: '🎓 कॉलेज डिग्री से बेहतर?', query: 'क्या बीए या डिग्री कॉलेज करना इससे बेहतर नहीं है?' },
      { label: '💵 खर्चा कितना होगा?', query: 'कोर्स की फीस कितनी है? क्या कोई छात्रवृत्ति या योजना है?' },
    ],
    te: [
      { label: '💰 సంపాదన ఎంత వస్తుంది?', query: 'ఈ కోర్సు చేసిన తర్వాత సంపాదన ఎంత ఉంటుంది?' },
      { label: '🛡️ పని సురక్షితమేనా?', query: 'ఈ పని సురక్షితమైనదేనా? ఏదైనా ప్రమాదం ఉంటుందా?' },
      { label: '👥 సమాజంలో గౌరవం ఉంటుందా?', query: 'సమాజంలో మరియు బంధువులలో దీనికి గౌరవం ఉంటుందా?' },
      { label: '💼 ఉద్యోగం ఖచ్చితంగా వస్తుందా?', query: 'శిక్షణ పూర్తయిన తర్వాత ఉద్యోగ అవకాశాలు ఎలా ఉంటాయి?' },
      { label: '🎓 డిగ్రీ కంటే ఎలా మేలు?', query: 'సాధారణ డిగ్రీ కంటే ఈ వృత్తి విద్యా కోర్సు ఎలా మేలు?' },
      { label: '💵 ఫీజు ఎంత అవుతుంది?', query: 'ఫీజులు ఎంత ఉంటాయి? ప్రభుత్వ ఉపకార వేతనాలు ఏమైనా ఉన్నాయా?' },
    ],
    en: [
      { label: '💰 How much will they earn?', query: 'How much can my child earn initially and after 3 years?' },
      { label: '🛡️ Is workplace safe?', query: 'Is this trade safe? What protective measures are followed?' },
      { label: '👥 Social respect & status?', query: 'Will relatives and society respect this vocational career?' },
      { label: '💼 Will they get a job?', query: 'What is the placement rate in our district after training?' },
      { label: '🎓 Isn’t a degree better?', query: 'Isn’t pursuing a regular college degree better for their future?' },
      { label: '💵 Training cost & fees?', query: 'What is the course fee? Are there scholarships or free schemes?' },
    ],
    ta: [
      { label: '💰 வருமானம் எவ்வளவு?', query: 'இந்த பயிற்சிக்குப் பிறகு வருமானம் எவ்வளவு இருக்கும்?' },
      { label: '🛡️ வேலை பாதுகாப்பானதா?', query: 'இந்த வேலை பாதுகாப்பானதா? பாதுகாப்பு நடவடிக்கைகள் என்ன?' },
      { label: '👥 சமூக மரியாதை இருக்குமா?', query: 'இந்த தொழிலுக்கு சமூகத்தில் மரியாதை இருக்குமா?' },
      { label: '💼 வேலை கிடைக்குமா?', query: 'பயிற்சிக்குப் பிறகு வேலை வாய்ப்புகள் எப்படி இருக்கும்?' },
      { label: '🎓 பட்டம் சிறந்ததல்லவா?', query: 'வழக்கமான பட்டப்படிப்பு சிறந்ததல்லவா?' },
      { label: '💵 கட்டணம் எவ்வளவு?', query: 'பயிற்சி கட்டணம் எவ்வளவு? உதவித்தொகை உள்ளதா?' },
    ],
  };

  const chips = chipsByLang[language] || chipsByLang.en;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
      {chips.map((chip, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(chip.query)}
          aria-label={`Ask: ${chip.query}`}
          className="whitespace-nowrap px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-full text-xs font-semibold shadow-sm transition-all min-h-[44px] flex items-center gap-1.5 active:scale-95"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
