'use client';

import SourceBadge from './SourceBadge';
import TextToSpeech from './TextToSpeech';
import type { Source } from '../lib/types';
import { useStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';

interface ChatMessageProps {
  message: {
    id: string;
    speaker: 'learner' | 'parent' | 'ai' | 'counsellor' | string;
    content: string;
    citations?: Array<string | Source>;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { language } = useStore();
  const t = useTranslation(language);
  const isAI = message.speaker === 'ai';
  const isParent = message.speaker === 'parent';
  const isCounsellor = message.speaker === 'counsellor';

  return (
    <div className={`flex flex-col ${isAI ? 'items-start' : isCounsellor ? 'items-start' : 'items-end'}`}>
      <span className="text-[11px] font-bold text-slate-500 mb-1 px-2.5 capitalize flex items-center gap-1">
        {isAI ? `🤖 ${t('ai_advisor')}` : isParent ? `👨‍👩‍👦 ${t('parent')}` : isCounsellor ? `🤝 ${t('certified_counsellor')}` : `🧑‍🎓 ${t('learner')}`}
      </span>

      <div
        className={`relative max-w-[88%] rounded-2xl p-4 text-base leading-relaxed ${
          isAI
            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
            : isCounsellor
            ? 'bg-teal-50 border border-teal-200 text-teal-950 rounded-tl-none shadow-sm'
            : isParent
            ? 'bg-orange-600 text-white rounded-tr-none shadow-md'
            : 'bg-slate-900 text-white rounded-tr-none shadow-md'
        }`}
      >
        <p className="whitespace-pre-line">{message.content}</p>
      </div>
    </div>
  );
}
