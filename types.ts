export enum AppState {
  IDLE = 'IDLE',
  TIMER_SELECTION = 'TIMER_SELECTION',
  FOCUS = 'FOCUS',
  WARNING = 'WARNING',
  PHONE_JAIL = 'PHONE_JAIL',
  USER_AWAY = 'USER_AWAY',
  PAUSED = 'PAUSED',
  REST = 'REST',
  ONBOARDING = 'ONBOARDING', // New state for setting username
}

export interface Category {
  id: string;
  name: string;
  color: string; // Hex code
}

export interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  type: 'FOCUS' | 'DISTRACTION';
  date: string;
  categoryId?: string;
}

export interface Friend {
  id: string;
  username: string;
  avatarUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'FOCUSING';
}

export interface UserProfile {
  id: string;
  email: string; // Simulated from Google
  username: string;
  avatarUrl: string;
  friends: Friend[];
}

export interface UserStats {
  totalFocusTime: number;
  totalDistractionTime: number;
  sessions: Session[];
  categories: Category[];
  userProfile?: UserProfile; // Added profile to stats storage
}

export interface VisionResponse {
  phoneDetected: boolean;
  userPresent: boolean;
  confidence: number;
}