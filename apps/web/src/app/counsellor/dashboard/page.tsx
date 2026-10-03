'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchCounsellorQueue, acceptTicket, resolveTicket, fetchSessionMessages, sendCounsellorMessage } from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { CheckCircle2, Phone, AlertCircle, Clock, Send, User, MapPin } from 'lucide-react';

interface QueueItem {
  id: number;
  session_id: string;
  reason: string;
  summary: string;
  status: string;
  created_at: string;
  callback_phone?: string;
  family_profile?: {
    district?: string;
    state?: string;
    role?: string;
    learner_class?: string;
    income_bracket?: string;
    trade_name?: string;
  };
}

interface ChatMessage {
  speaker: string;
  text: string;
  timestamp?: string;
}

export default function CounsellorDashboard() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<QueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load live queue
  const loadQueue = async () => {
    try {
      const data = await fetchCounsellorQueue();
      setQueue(data);
      if (!selectedTicket && data.length > 0) {
        setSelectedTicket(data[0]);
      }
    } catch (e) {
      setQueue([]);
      setSelectedTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load live messages and subscribe via Supabase Realtime
  useEffect(() => {
    if (!selectedTicket?.session_id) return;

    // 1. Initial fetch of session messages
    fetchSessionMessages(selectedTicket.session_id)
      .then((msgs) => {
        if (Array.isArray(msgs)) {
          setChatMessages(msgs.map((m: { speaker: string; text: string; created_at: string }) => ({
            speaker: m.speaker,
            text: m.text,
            timestamp: m.created_at,
          })));
        }
      })
      .catch(() => {});

    // 2. Realtime channel subscription
    let channel: any = null; // Left as any because RealtimeChannel import might not be available easily without knowing Supabase version
    try {
      if (supabase) {
        channel = supabase
          .channel(`session-${selectedTicket.session_id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `session_id=eq.${selectedTicket.session_id}`,
            },
            (payload) => {
              const newMsg = payload.new as { speaker: string; text: string; created_at: string };
              setChatMessages((prev) => {
                if (prev.some((m) => m.text === newMsg.text && m.speaker === newMsg.speaker)) {
                  return prev;
                }
                return [...prev, { speaker: newMsg.speaker, text: newMsg.text, timestamp: newMsg.created_at }];
              });
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.error('Realtime subscription error:', e);
    }

    // 3. Fallback polling interval every 5 seconds
    const pollInterval = setInterval(() => {
      fetchSessionMessages(selectedTicket.session_id)
        .then((msgs) => {
          if (Array.isArray(msgs)) {
            setChatMessages(msgs.map((m: { speaker: string; text: string; created_at: string }) => ({
              speaker: m.speaker,
              text: m.text,
              timestamp: m.created_at,
            })));
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedTicket?.session_id]);

  const handleAccept = async (id: number) => {
    try {
      await acceptTicket(id);
      loadQueue();
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: 'assigned' });
      }
    } catch (e) {
      if (selectedTicket) setSelectedTicket({ ...selectedTicket, status: 'assigned' });
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await resolveTicket(selectedTicket.id, resolveNote || 'Resolved via phone counseling');
      setShowResolveModal(false);
      setResolveNote('');
      loadQueue();
    } catch (e) {
      setShowResolveModal(false);
    }
  };

  const sendLiveMessage = async () => {
    if (!chatInput.trim() || !selectedTicket) return;
    const textToSend = chatInput.trim();
    setChatInput('');

    const optimisticMsg: ChatMessage = {
      speaker: 'counsellor',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendCounsellorMessage(selectedTicket.session_id, textToSend);
    } catch (e) {
      console.error('Failed to send counsellor message', e);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar: Escalation Queue */}
      <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h1 className="font-bold text-lg">Counsellor Console</h1>
            <p className="text-xs text-slate-400">Escalated Families Queue</p>
          </div>
          <span className="bg-orange-500 text-white font-bold text-xs px-2.5 py-1 rounded-full">
            {queue.filter((q) => q.status !== 'resolved').length} Active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {queue.map((ticket) => {
            const isSelected = selectedTicket?.id === ticket.id;
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? 'bg-orange-50/80 border-l-4 border-orange-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-900 text-sm">
                    Ticket #{ticket.id} • {ticket.family_profile?.district || 'District'}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      ticket.status === 'active'
                        ? 'bg-amber-100 text-amber-800'
                        : ticket.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">{ticket.reason}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User size={12} /> {ticket.family_profile?.trade_name || 'Trade'}
                  </span>
                  {ticket.callback_phone && (
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <Phone size={12} /> {ticket.callback_phone}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedTicket ? (
          <>
            {/* Ticket Header Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>Family Case #{selectedTicket.id}</span>
                  <span className="text-sm font-normal text-slate-500">
                    ({selectedTicket.family_profile?.district}, {selectedTicket.family_profile?.state})
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trade: <strong>{selectedTicket.family_profile?.trade_name}</strong> • Class: {selectedTicket.family_profile?.learner_class} • Income: {selectedTicket.family_profile?.income_bracket}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {selectedTicket.callback_phone && (
                  <a
                    href={`tel:${selectedTicket.callback_phone}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <Phone size={16} /> Call Parent
                  </a>
                )}
                {selectedTicket.status === 'queued' && (
                  <button
                    onClick={() => handleAccept(selectedTicket.id)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm"
                  >
                    Accept Ticket
                  </button>
                )}
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 size={16} /> Mark Resolved
                  </button>
                )}
              </div>
            </div>

            {/* Split View: Summary & Live Chat */}
            <div className="flex-1 p-6 overflow-hidden flex gap-6">
              {/* Left Column: AI Case Summary & Profile */}
              <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-y-auto space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    AI Auto-Summary & Trigger Context
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedTicket.summary || selectedTicket.reason}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Recommended Counsellor Action
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1.5">
                    <p>• <strong>Emphasize progression:</strong> Explain how ITI graduates enter polytechnic diploma laterally without repeating 11th/12th.</p>
                    <p>• <strong>Share local proof:</strong> Open the source card shown to the family and repeat only its displayed figures and demo/verification label.</p>
                    <p>• <strong>Financial reassurance:</strong> Remind them that PMKVY/ITI courses have zero tuition fee for low-income brackets.</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Chat Interface */}
              <div className="w-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center text-sm font-bold">
                  <span>Live Family Chat</span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-normal">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Connected
                  </span>
                </div>

                {/* Message Log */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-sm">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        msg.speaker === 'counsellor' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 font-semibold mb-0.5 capitalize">
                        {msg.speaker}
                      </span>
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] ${
                          msg.speaker === 'counsellor'
                            ? 'bg-slate-900 text-white rounded-br-none'
                            : msg.speaker === 'parent'
                            ? 'bg-orange-100 text-orange-950 border border-orange-200 rounded-bl-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendLiveMessage()}
                    placeholder="Reply to family as Counsellor..."
                    className="flex-1 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    onClick={sendLiveMessage}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a ticket from the queue to view details.
          </div>
        )}
      </main>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Resolve Case #{selectedTicket?.id}</h3>
            <p className="text-xs text-slate-600">
              Summarize how the family's hesitation was addressed for administrative analytics.
            </p>
            <textarea
              rows={3}
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="e.g. Addressed status concerns, shared lateral entry pathways, family agreed to visit district ITI next Monday."
              className="w-full p-3 border border-slate-300 rounded-xl text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
