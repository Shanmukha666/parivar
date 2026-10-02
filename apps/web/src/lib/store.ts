import { useState, useEffect } from 'react';
import { UserProfile } from './types';

export interface ExtendedProfile extends Partial<UserProfile> {
  role?: string;
  selectedTradeId?: number;
  selectedTradeName?: string;
}

interface AppState {
  language: string;
  sessionId: string | null;
  profile: ExtendedProfile;
}

let globalState: AppState = {
  language: 'en',
  sessionId: null,
  profile: {
    state: 'Telangana',
    district: 'Warangal',
    classPassed: 'Class 10 Pass',
    income: '₹1 - 3 Lakhs',
    role: 'both',
    interests: ['electrical', 'mechanical'],
    selectedTradeId: 1,
    selectedTradeName: 'Electrician'
  }
};

let listeners: Array<(state: AppState) => void> = [];

export function useStore() {
  const [state, setState] = useState<AppState>(globalState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);

  return {
    ...state,
    setLanguage: (lang: string) => {
      globalState = { ...globalState, language: lang };
      listeners.forEach(l => l(globalState));
    },
    setSessionId: (id: string) => {
      globalState = { ...globalState, sessionId: id };
      listeners.forEach(l => l(globalState));
    },
    updateProfile: (updates: Partial<ExtendedProfile>) => {
      globalState = { ...globalState, profile: { ...globalState.profile, ...updates } };
      listeners.forEach(l => l(globalState));
    },
    setSelectedTrade: (id: number, name: string) => {
      globalState = {
        ...globalState,
        profile: { ...globalState.profile, selectedTradeId: id, selectedTradeName: name }
      };
      listeners.forEach(l => l(globalState));
    }
  };
}
