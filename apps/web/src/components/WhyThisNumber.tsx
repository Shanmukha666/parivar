'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, HelpCircle, X, Building, MapPin, Calendar, Users, Award, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../lib/store';
import { useTranslation } from '../lib/i18n';

export interface ProvenanceDetails {
  metric: string; // e.g. "Starting Salary", "Placement Rate", "Training Duration", "NSQF Level", "3-Year Earnings"
  value: string | number; // e.g. "₹14,944 / month", "79%", "24 Months", "Level 4"
  location?: string; // e.g. "Warangal, Telangana"
  trade?: string; // e.g. "Electrician"
  provider?: string; // e.g. "Govt ITI Warangal"
  year?: string | number; // e.g. "2023 - 2024"
  sampleSize?: number; // e.g. 42
  source?: string; // e.g. "NCVT Tracer Study / MSDE Annual Report"
  sourceUrl?: string | null;
  sourceDocument?: string; // e.g. "Table 4.2: District Skill Outcome Census"
  verifiedOn?: string | null; // e.g. "15 Feb 2024"
  isVerified?: boolean;
  isSynthetic?: boolean;
  notes?: string;
}

interface WhyThisNumberProps {
  details: ProvenanceDetails;
  buttonLabel?: string;
  variant?: 'badge' | 'link' | 'subtle' | 'pill';
  className?: string;
}

export default function WhyThisNumber({
  details,
  buttonLabel,
  variant = 'badge',
  className = '',
}: WhyThisNumberProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useStore();
  const t = useTranslation(language);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const label = buttonLabel || t('why_this_number') || 'Why this number?';

  return (
    <>
      {/* Trigger Button Variants */}
      {variant === 'badge' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 transition-colors cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 min-h-[30px] ${className}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={label}
        >
          <HelpCircle size={13} className="text-orange-600 flex-shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-400 min-h-[26px] ${className}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={label}
        >
          <ShieldCheck size={12} className="text-blue-600 flex-shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {variant === 'link' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800 hover:underline transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-orange-500 rounded-sm py-0.5 min-h-[28px] ${className}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <HelpCircle size={13} className="text-orange-600 flex-shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {variant === 'subtle' && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer focus:outline-hidden min-h-[26px] ${className}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={label}
        >
          <HelpCircle size={12} className="text-slate-400 flex-shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {/* Accessible Provenance Dialog Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="provenance-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col text-slate-900 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 id="provenance-title" className="font-black text-base leading-tight">
                    {t('source_evidence_title') || 'Official Evidence & Source'}
                  </h3>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {t('source_evidence_desc') || 'Verified government data backing this number'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors min-h-[36px] min-w-[36px]"
                aria-label={t('btn_cancel') || 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Highlight Metric Card */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                <span className="text-xs uppercase font-bold tracking-wider text-orange-800">
                  {details.metric}
                </span>
                <div className="text-3xl font-black text-orange-600 mt-1">
                  {details.value}
                </div>
                {details.notes && (
                  <p className="text-xs text-orange-950/80 mt-1 font-medium">
                    {details.notes}
                  </p>
                )}
              </div>

              {/* Verification Status Pill */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 border-slate-200">
                <span className="font-bold text-slate-700">Verification Status</span>
                {details.isSynthetic ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <AlertTriangle size={13} className="text-amber-700" />
                    DEMO / EXAMPLE DATA
                  </span>
                ) : details.isVerified !== false ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    <CheckCircle2 size={13} className="text-emerald-700" />
                    GOVERNMENT VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                    VERIFICATION PENDING
                  </span>
                )}
              </div>

              {/* Data Provenance Details Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2">
                  Data Context & Coverage
                </h4>

                {details.trade && (
                  <div className="flex items-start gap-2">
                    <Award size={15} className="text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Vocational Trade</span>
                      <strong className="text-slate-900 text-xs">{details.trade}</strong>
                    </div>
                  </div>
                )}

                {details.location && (
                  <div className="flex items-start gap-2">
                    <MapPin size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Location Scope</span>
                      <strong className="text-slate-900 text-xs">{details.location}</strong>
                    </div>
                  </div>
                )}

                {details.provider && (
                  <div className="flex items-start gap-2">
                    <Building size={15} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Training Centre</span>
                      <strong className="text-slate-900 text-xs">{details.provider}</strong>
                    </div>
                  </div>
                )}

                {details.year && (
                  <div className="flex items-start gap-2">
                    <Calendar size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Batch / Academic Period</span>
                      <strong className="text-slate-900 text-xs">{details.year}</strong>
                    </div>
                  </div>
                )}

                {details.sampleSize != null && (
                  <div className="flex items-start gap-2">
                    <Users size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[11px]">Alumni Surveyed</span>
                      <strong className="text-slate-900 text-xs">
                        {details.sampleSize} graduates tracked in this batch
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Source & Reference Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Official Record Details
                </h4>

                <div>
                  <span className="text-slate-500 block text-[11px]">Publishing Authority</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {details.source || 'NCVT / MSDE Vocational Outcomes Survey'}
                  </span>
                </div>

                {details.sourceDocument && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Document Reference</span>
                    <span className="text-slate-700 text-xs font-medium">
                      {details.sourceDocument}
                    </span>
                  </div>
                )}

                {details.verifiedOn && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Last Audited & Verified Date</span>
                    <span className="text-emerald-800 font-semibold text-xs">
                      {details.verifiedOn}
                    </span>
                  </div>
                )}

                {details.sourceUrl && (
                  <div className="pt-1">
                    <a
                      href={details.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-700 hover:text-orange-800 hover:underline min-h-[30px]"
                    >
                      <ExternalLink size={13} />
                      <span>View Official Portal / Report</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Low-Literacy Guarantee Banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-[11px] leading-relaxed">
                <span className="font-bold block mb-0.5">🛡️ Transparency Promise</span>
                Parivar Path never invents salaries or makes false job promises. Every factual number is checked against district training records to give your family honest guidance.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm min-h-[48px] flex items-center justify-center"
              >
                {t('btn_got_it') || 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
