import { useState, useEffect } from 'react';
import { UserProfile } from './types';

export interface ExtendedProfile extends Partial<UserProfile> {
  role?: string;
  selectedTradeId?: number;
  selectedTradeName?: string;
  consent?: boolean;
}

interface AppState {
  language: string;
  sessionId: string | null;
  profile: ExtendedProfile;
  isHydrated: boolean;
}

const defaultState: AppState = {
  language: 'en',
  sessionId: null,
  profile: {
    state: 'Telangana',
    district: 'Adilabad',
    classPassed: 'Class 10 Pass',
    income: '₹1 - 3 Lakhs',
    role: 'both',
    interests: [],
  },
  isHydrated: false,
};

let globalState: AppState = { ...defaultState };

if (typeof window !== 'undefined') {
  try {
    const saved = sessionStorage.getItem('parivar_path_state');
    if (saved) {
      globalState = { ...JSON.parse(saved), isHydrated: true };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
}

let listeners: Array<(state: AppState) => void> = [];

function setGlobalState(newState: Partial<AppState>) {
  globalState = { ...globalState, ...newState };
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('parivar_path_state', JSON.stringify({
      language: globalState.language,
      sessionId: globalState.sessionId,
      profile: globalState.profile,
    }));
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
      setGlobalState({ language: lang });
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
