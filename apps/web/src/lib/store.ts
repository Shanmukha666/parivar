import { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { isSupportedLanguage, type Language } from './i18n';

export interface ExtendedProfile extends Partial<UserProfile> {
  role?: string;
  selectedTradeId?: number;
  selectedTradeName?: string;
  consent?: boolean;
}

interface AppState {
  language: Language;
  sessionId: string | null;
  profile: ExtendedProfile;
  isHydrated: boolean;
}

const defaultState: AppState = {
  language: 'en',
  sessionId: null,
  profile: {
    state: 'Telangana',
    district: 'Warangal',
    classPassed: 'Class 10 Pass',
    income: '₹1 - 3 Lakhs',
    role: 'both',
    consent: true,
    selectedTradeId: 1,
    selectedTradeName: 'Electrician',
    interests: ['electrical', 'mechanical'],
  },
  isHydrated: false,
};

let globalState: AppState = { ...defaultState };

if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('parivar_path_state') || sessionStorage.getItem('parivar_path_state');
    if (saved) {
      globalState = { ...defaultState, ...JSON.parse(saved), isHydrated: true };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
}

let listeners: Array<(state: AppState) => void> = [];

function setGlobalState(newState: Partial<AppState>) {
  globalState = { ...globalState, ...newState };
  if (typeof window !== 'undefined') {
    const payload = JSON.stringify({
      language: globalState.language,
      sessionId: globalState.sessionId,
      profile: globalState.profile,
    });
    try {
      localStorage.setItem('parivar_path_state', payload);
      sessionStorage.setItem('parivar_path_state', payload);
    } catch {}
  }
  listeners.forEach(l => l(globalState));
}

export function useStore() {
  const [state, setState] = useState<AppState>(globalState);

  useEffect(() => {
    listeners.push(setState);
    if (!globalState.isHydrated) {
      setGlobalState({ isHydrated: true });
    }
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);

  return {
    ...state,
    setLanguage: (lang: string) => {
      if (isSupportedLanguage(lang)) setGlobalState({ language: lang });
    },
    setSessionId: (id: string) => {
      setGlobalState({ sessionId: id });
    },
    updateProfile: (updates: Partial<ExtendedProfile>) => {
      setGlobalState({ profile: { ...globalState.profile, ...updates } });
    },
    setSelectedTrade: (id: number, name: string) => {
      setGlobalState({
        profile: { ...globalState.profile, selectedTradeId: id, selectedTradeName: name }
      });
    },
    resetStore: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('parivar_path_state');
      }
      setGlobalState(defaultState);
    }
  };
}
