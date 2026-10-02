export interface UserProfile {
  state: string;
  district: string;
  classPassed: string;
  income: string;
  interests: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  speaker: 'learner' | 'parent' | 'counsellor' | 'ai';
  content: string;
  sources?: Source[];
}

export interface Source {
  name: string;
  year: string;
  verified: boolean;
}

export interface Trade {
  id: string;
  name: string;
  description: string;
  duration: string;
  salary: string;
  icon: string;
}
