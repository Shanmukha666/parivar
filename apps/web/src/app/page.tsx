'use client';

import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';
import LanguageSelector from '../components/LanguageSelector';
import { ArrowUpRight, MoveUpRight, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { setLanguage } = useStore();

  const handleSelect = (lang: string) => {
    setLanguage(lang);
    router.push('/consent');
  };

  return (
    <div className="landing-shell min-h-screen overflow-hidden px-5 pb-6 pt-5 text-[#f5f3ea] md:px-10 md:pt-7">
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="brand-mark"><span>↗</span></div>
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Parivar Path</span>
        </div>
        <div className="hidden items-center gap-8 text-xs font-semibold text-white/60 md:flex">
          <span>Family guidance</span>
          <span>Verified pathways</span>
          <span className="flex items-center gap-1 text-[#d6f36a]"><Sparkles size={13} /> Demo 01</span>
        </div>
        <button className="landing-circle-button" aria-label="Open navigation"><MoveUpRight size={18} /></button>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 py-12 md:min-h-[calc(100vh-100px)] md:grid-cols-[1.05fr_0.95fr] md:py-0">
        <section className="max-w-2xl">
          <p className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#d6f36a]"><span className="h-2 w-2 rounded-full bg-[#d6f36a]" /> A family decision, made together</p>
          <h1 className="landing-title">A clearer path<br /><span>forward.</span></h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/60 md:text-lg">A calm, multilingual space where learners and parents can explore vocational futures with local evidence and a human counsellor when they need one.</p>

          <div className="mt-10 max-w-md">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">Start here</p>
                <h2 className="mt-1 text-lg font-bold">Choose your language</h2>
              </div>
              <ArrowUpRight size={18} className="text-[#d6f36a]" />
            </div>
            <div className="language-rail">
              <LanguageSelector lang="en" name="English" onSelect={() => handleSelect('en')} />
              <LanguageSelector lang="te" name="తెలుగు" onSelect={() => handleSelect('te')} />
              <LanguageSelector lang="hi" name="हिंदी" onSelect={() => handleSelect('hi')} />
            </div>
            <p className="mt-3 text-[11px] text-white/35">Hindi is available for the demo and pending native review.</p>
          </div>
        </section>

        <section className="landing-visual" aria-label="Illustration of a family career pathway">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="path-card path-card-back"><span>NSQF</span><strong>04</strong></div>
          <div className="path-card path-card-main">
            <div className="flex items-start justify-between"><span className="text-xs font-bold uppercase tracking-[0.18em] text-[#19231f]/60">Your next move</span><ArrowUpRight size={22} /></div>
            <div className="mt-20"><p className="text-sm font-semibold text-[#19231f]/60">Electrician pathway</p><p className="mt-1 text-4xl font-black">Step by step.</p></div>
            <div className="mt-8 flex items-center justify-between border-t border-[#19231f]/15 pt-4 text-xs font-bold"><span>Learn</span><span>Earn</span><span>Grow</span></div>
          </div>
          <div className="floating-note"><span className="note-dot" /> Local evidence<br /><strong>without guesswork</strong></div>
          <div className="visual-caption">01 / family-first<br /><span>Telangana demo</span></div>
        </section>
      </main>
    </div>
  );
}
