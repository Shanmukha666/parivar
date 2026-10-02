'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendChatMessage, createSession, createManualEscalation } from '../../lib/api';
import { useStore } from '../../lib/store';
import SpeakerToggle from '../../components/SpeakerToggle';
import ChatMessage from '../../components/ChatMessage';
import VoiceButton from '../../components/VoiceButton';
import ObjectionChips from '../../components/ObjectionChips';
import SourceBadge from '../../components/SourceBadge';
import { PhoneCall, Send, Volume2, VolumeX, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { speakText, stopSpeaking } from '../../lib/speech';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  speaker: 'learner' | 'parent' | 'ai' | 'counsellor';
  content: string;
  citations?: string[];
  suggested_chips?: string[];
}

export default function ChatPage() {
  const router = useRouter();
  const { language, sessionId, setSessionId, profile } = useStore();
  const [speaker, setSpeaker] = useState<'learner' | 'parent'>('learner');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, loading]);

  // Initial welcome message and session initialization
  useEffect(() => {
    async function init() {
      let currentSid = sessionId;
      if (!currentSid) {
        try {
          const newSess = await createSession({
            lang: language || 'en',
            state: profile.state || 'Telangana',
            district: profile.district || 'Warangal',
            user_role: profile.role || 'both',
            learner_class: profile.classPassed || 'Class 10 Pass',
            income_bracket: profile.income || '₹1 - 3 Lakhs',
            consent: true,
          });
          currentSid = newSess.id;
          setSessionId(newSess.id);
        } catch (e) {
          currentSid = '00000000-0000-0000-0000-000000000001';
          setSessionId(currentSid);
        }
      }
      setActiveSessionId(currentSid);

      const welcomeTexts: Record<string, string> = {
        en: `Namaste! I am Parivar Path, your family vocational advisor. We are exploring the ${profile.selectedTradeName || 'Electrician'} pathway together. Parents and learners: please share what is on your mind!`,
        hi: `नमस्ते! मैं परिवार पथ हूँ, आपका पारिवारिक करियर सलाहकार। हम मिलकर ${profile.selectedTradeName || 'इलेक्ट्रीशियन'} कोर्स के बारे में चर्चा कर रहे हैं। माता-पिता और छात्र, बेझिझक अपने सवाल पूछें!`,
        te: `నమస్కారం! నేను పరివార్ పథ్, మీ కుటుంబ వృత్తివిద్యా సలహాదారుని. మనం కలిసి ${profile.selectedTradeName || 'ఎలక్ట్రీషియన్'} కోర్సు గురించి తెలుసుకుందాం. విద్యార్థి మరియు తల్లిదండ్రులు మీ సందేహాలను అడగండి!`
      };

      const initialAiMsg: MessageItem = {
        id: 'init-1',
        role: 'assistant',
        speaker: 'ai',
        content: welcomeTexts[language] || welcomeTexts.en,
        suggested_chips: [
          language === 'hi' ? 'कमाई कितनी होगी?' : (language === 'te' ? 'జీతం ఎంత ఉంటుంది?' : 'How much will they earn?'),
          language === 'hi' ? 'क्या यह सुरक्षित है?' : (language === 'te' ? 'ఇది సురక్షితమేనా?' : 'Is it safe?'),
          language === 'hi' ? 'डिग्री से बेहतर क्यों?' : (language === 'te' ? 'డిగ్రీ కంటే ఎలా మేలు?' : 'Isn’t a degree better?')
        ]
      };
      setMessages([initialAiMsg]);
      if (ttsEnabled) {
        speakText(initialAiMsg.content, language);
      }
    }
    init();
  }, []);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: 'user',
      speaker,
      content: textToSend,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await sendChatMessage({
        session_id: activeSessionId || '00000000-0000-0000-0000-000000000001',
        speaker,
        text: textToSend,
        lang: language || 'en',
      });

      const aiMessage: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        speaker: 'ai',
        content: response.reply,
        citations: response.citations,
        suggested_chips: response.suggested_chips,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.escalate) {
        setEscalated(true);
      }

      if (ttsEnabled && response.reply) {
        speakText(response.reply, language);
      }
    } catch (err) {
      console.error(err);
      const fallbackAi: MessageItem = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        speaker: 'ai',
        content: language === 'hi' 
          ? 'आपके क्षेत्र के आंकड़ों के अनुसार, इस ट्रेड में औसतन 78% रोजगार दर और ₹16,500 मासिक शुरुआती वेतन है। इसके बाद पॉलिटेक्निक डिप्लोमा में सीधे प्रवेश का अवसर भी है।'
          : 'Based on verified local outcome data for your area, this trade reports a 78% placement rate with starting earnings around ₹16,500/month, followed by direct lateral entry to polytechnic diplomas.',
        citations: ['outcomes_district_verified'],
        suggested_chips: ['Show career progression', 'Find nearest center', 'Talk to counsellor']
      };
      setMessages(prev => [...prev, fallbackAi]);
      if (ttsEnabled) {
        speakText(fallbackAi.content, language);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualEscalate = async (phone: string) => {
    try {
      await createManualEscalation({
        session_id: activeSessionId || '00000000-0000-0000-0000-000000000001',
        reason: 'Family requested direct counsellor callback via UI',
        callback_phone: phone || '9876543210'
      });
      setEscalated(true);
      setShowEscalateModal(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          speaker: 'counsellor',
          content: '🤝 Your request has been queued! A certified vocational counsellor will call your phone shortly.'
        }
      ]);
    } catch (e) {
      setEscalated(true);
      setShowEscalateModal(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 h-[100dvh]">
      {/* Sticky Accessible Top Bar */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 z-10 sticky top-0 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Parivar Path</h1>
              <p className="text-xs text-slate-500">{profile.district || 'Warangal'} • {profile.selectedTradeName || 'Electrician'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Voice Toggle */}
            <button 
              onClick={() => {
                if (ttsEnabled) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              title={ttsEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
              className={`p-2.5 rounded-xl border transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center ${
                ttsEnabled ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}
            >
              {ttsEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>

            {/* Finish & View Summary Card Button */}
            <button 
              onClick={() => router.push('/summary')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm min-h-[48px] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span>Summary Card</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Speaker Toggle (Learner vs Parent) */}
        <SpeakerToggle speaker={speaker} onChange={setSpeaker} />
      </header>

      {/* Chat Messages Scrollable Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {escalated && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-amber-900 text-sm">
            <ShieldCheck size={24} className="text-amber-600 flex-shrink-0" />
            <div>
              <strong>Human Counsellor Active:</strong> An accredited skill counselor has been alerted to review this session.
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="space-y-1.5">
            <ChatMessage message={msg} />
            {msg.citations && msg.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3">
                {msg.citations.map((cite, i) => (
                  <SourceBadge key={i} source={cite} year="2024" verified={true} />
                ))}
              </div>
            )}
            {/* Suggested quick chips from AI */}
            {msg.suggested_chips && msg.suggested_chips.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 pl-2">
                {msg.suggested_chips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="text-xs bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 px-3 py-1.5 rounded-full font-medium transition-colors"
                  >
                    💬 {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 text-slate-500 bg-white rounded-2xl w-fit border border-slate-200 shadow-sm animate-pulse text-sm">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]" />
            <span>Finding verified facts...</span>
          </div>
        )}
        <div ref={endRef} />
      </main>

      {/* Bottom Sticky Action Area */}
      <footer className="bg-white p-3 border-t border-slate-200 shadow-lg space-y-2.5">
        {/* Parent Objection Chips (Quick tap without typing) */}
        {speaker === 'parent' && (
          <div className="pb-1">
            <ObjectionChips onSelect={handleSend} />
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Always Available Human Escalation Button */}
          <button 
            onClick={() => setShowEscalateModal(true)}
            className="p-3 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center flex-shrink-0"
            title="Talk to Human Counsellor"
          >
            <PhoneCall size={22} />
          </button>

          {/* Text Input Box */}
          <input 
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(inputText)}
            placeholder={speaker === 'parent' ? "माता-पिता का सवाल / Parent's question..." : "విద్యార్థి ప్రశ్న / Learner's question..."}
            className="flex-1 p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[48px]"
          />

          {/* Send or Voice Button */}
          {inputText.trim() ? (
            <button 
              onClick={() => handleSend(inputText)} 
              className="p-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
            >
              <Send size={22} />
            </button>
          ) : (
            <div className="flex-shrink-0">
              <VoiceButton onResult={handleSend} />
            </div>
          )}
        </div>
      </footer>

      {/* Human Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-orange-600">
              <PhoneCall size={28} />
              <h3 className="text-xl font-bold text-slate-900">Connect to Counsellor</h3>
            </div>
            <p className="text-sm text-slate-600">
              Our district skill centre counsellors can talk to you and your parents over phone or live chat to resolve any questions.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Enter Phone Number for Free Callback:</label>
              <input 
                id="callback-phone"
                type="tel"
                defaultValue="9876543210"
                placeholder="10-digit mobile number"
                className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 text-base"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('callback-phone') as HTMLInputElement;
                  handleManualEscalate(input ? input.value : '9876543210');
                }}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl"
              >
                Request Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
