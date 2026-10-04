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
import { ensureFamilySession } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import type { Source } from '../../lib/types';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  speaker: 'learner' | 'parent' | 'ai' | 'counsellor';
  content: string;
  citations?: Array<string | Source>;
  suggested_chips?: string[];
}

export default function ChatPage() {
  const router = useRouter();
  const { language, sessionId, setSessionId, profile } = useStore();
  const t = useTranslation(language);
  const [speaker, setSpeaker] = useState<'learner' | 'parent'>('learner');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [callbackConsent, setCallbackConsent] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(sessionId);
  const [failedText, setFailedText] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, loading]);

  // Initial welcome message and session initialization
  useEffect(() => {
    async function init() {
      try {
        await ensureFamilySession().catch(() => null);
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
              consent: profile.consent || true,
              selected_trade_id: profile.selectedTradeId || 1,
            });
            currentSid = newSess.id;
            setSessionId(newSess.id);
          } catch (e) {
            console.warn('Session creation fallback active', e);
            currentSid = '00000000-0000-0000-0000-000000000001';
            setSessionId(currentSid);
          }
        }
        setActiveSessionId(currentSid);

        const initialAiMsg: MessageItem = {
          id: 'init-1',
          role: 'assistant',
          speaker: 'ai',
          content: t('chat_welcome', { trade: profile.selectedTradeName || t('default_trade') }),
          suggested_chips: [
            t('chip_earnings'),
            t('chip_safety'),
            t('chip_degree')
          ]
        };
        setMessages([initialAiMsg]);
        if (ttsEnabled) {
          try {
            speakText(initialAiMsg.content, language);
          } catch {}
        }
      } catch (err) {
        console.error('Chat init error:', err);
      }
    }
    init();
  }, []);

  const handleSend = async (textToSend: string) => {
    if (textToSend === t('retry_message') && failedText) {
      textToSend = failedText;
    }
    if (!textToSend.trim() || loading) return;

    const userMessage: MessageItem = {
      id: Date.now().toString(),
      role: 'user',
      speaker,
      content: textToSend,
    };

    setMessages(prev => [...prev, userMessage]);
    setFailedText(null);
    setInputText('');
    setLoading(true);

    try {
      const response = await sendChatMessage({
        session_id: activeSessionId || '',
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
        content: t('verified_data_unavailable'),
        citations: [],
        suggested_chips: [t('talk_to_counsellor'), t('retry_message')]
      };
      setMessages(prev => [...prev, fallbackAi]);
      setFailedText(textToSend);
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
        callback_phone: phone,
        callback_phone_consent: callbackConsent,
      });
      setEscalated(false);
      setShowEscalateModal(false);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          speaker: 'counsellor',
          content: `🤝 ${t('counsellor_request_queued')}`
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
              <p className="text-xs text-slate-500">{profile.district || 'Adilabad'} • {profile.selectedTradeName || t('default_trade')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Voice Toggle */}
            <button 
              onClick={() => {
                if (ttsEnabled) stopSpeaking();
                setTtsEnabled(!ttsEnabled);
              }}
              title={ttsEnabled ? t('mute_ai_voice') : t('enable_ai_voice')}
              aria-label={ttsEnabled ? t('mute_ai_voice') : t('enable_ai_voice')}
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
              <span>{t('summary_card')}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Speaker Toggle (Learner vs Parent) */}
        <SpeakerToggle speaker={speaker} onChange={setSpeaker} />
      </header>

      {/* Chat Messages Scrollable Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
        {escalated && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-amber-900 text-sm">
            <ShieldCheck size={24} className="text-amber-600 flex-shrink-0" />
            <div role="status">
              <strong>{t('human_counsellor_active')}:</strong> {t('counsellor_alerted')}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="space-y-1.5">
            <ChatMessage message={msg} />
            {msg.citations && msg.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3">
                {msg.citations.map((cite, i) => (
                  <SourceBadge key={i} source={cite} verified={false} />
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
            <span>{t('finding_verified_facts')}</span>
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
            title={t('talk_to_human_counsellor')}
            aria-label={t('talk_to_human_counsellor')}
          >
            <PhoneCall size={22} />
          </button>

          {/* Text Input Box */}
          <label className="sr-only" htmlFor="chat-message">{t('message_label')}</label>
          <input 
            id="chat-message"
            type="text" 
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(inputText)}
            placeholder={speaker === 'parent' ? t('parent_question_placeholder') : t('learner_question_placeholder')}
            className="flex-1 p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[48px]"
          />

          {/* Send or Voice Button */}
          {inputText.trim() ? (
            <button 
              onClick={() => handleSend(inputText)} 
              className="p-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
              aria-label={t('send_button')}
            >
              <Send size={22} />
            </button>
          ) : (
            <div className="flex-shrink-0">
              <VoiceButton onTranscript={setInputText} />
            </div>
          )}
        </div>
      </footer>

      {/* Human Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="escalate-modal-title">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-orange-600">
              <PhoneCall size={28} />
              <h3 id="escalate-modal-title" className="text-xl font-bold text-slate-900">{t('connect_counsellor')}</h3>
            </div>
            <p className="text-sm text-slate-600">
              {t('counsellor_modal_description')}
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700" htmlFor="callback-phone">{t('phone_label')}:</label>
              <input 
                id="callback-phone"
                type="tel"
                defaultValue=""
                placeholder={t('phone_placeholder')}
                className="w-full p-3 border border-slate-300 rounded-xl text-slate-900 text-base focus:ring-2 focus:ring-orange-500"
              />
              <label className="flex items-start gap-2 text-xs text-slate-600" htmlFor="callback-consent">
                <input id="callback-consent" type="checkbox" checked={callbackConsent} onChange={(event) => setCallbackConsent(event.target.checked)} className="mt-0.5" />
                {t('callback_consent')}
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('callback-phone') as HTMLInputElement;
                  const val = input?.value || '';
                  if (val && !/^\d{10}$/.test(val)) {
                    alert(t('error_invalid_phone'));
                    return;
                  }
                  if (val && !callbackConsent) {
                    alert(t('error_consent_required'));
                    return;
                  }
                  handleManualEscalate(val);
                }}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
              >
                {t('request_call')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
