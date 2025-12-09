import { UserStats, Session, Category, UserProfile, Friend } from "../types";

const STORAGE_KEY = "bold_focus_stats";

const DEFAULT_STATS: UserStats = {
  totalFocusTime: 0,
  totalDistractionTime: 0,
  sessions: [],
  categories: [],
  userProfile: undefined,
};

// Mock database of potential friends to search for
const MOCK_USERS_DB: Friend[] = [
    { id: 'u1', username: 'design_guru', avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix', status: 'FOCUSING' },
    { id: 'u2', username: 'code_ninja', avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Aneka', status: 'ONLINE' },
    { id: 'u3', username: 'minimalist', avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Jude', status: 'OFFLINE' },
    { id: 'u4', username: 'swiss_style', avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Milo', status: 'FOCUSING' },
    { id: 'u5', username: 'typography_fan', avatarUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Sara', status: 'ONLINE' },
];

export const getStats = (): UserStats => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Merge with default to ensure new fields like 'categories' exist for old users
    const stats = stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : DEFAULT_STATS;
    
    // Recalculate totals from sessions to ensure data consistency
    const calculatedTotals = stats.sessions.reduce((acc: { focus: number, distraction: number }, session: Session) => {
        if (session.type === 'FOCUS') {
            acc.focus += session.durationSeconds;
        } else {
            acc.distraction += session.durationSeconds;
        }
        return acc;
    }, { focus: 0, distraction: 0 });

    stats.totalFocusTime = calculatedTotals.focus;
    stats.totalDistractionTime = calculatedTotals.distraction;

    return stats;
  } catch (e) {
    return DEFAULT_STATS;
  }
};

export const saveSession = (session: Session) => {
  const stats = getStats();
  stats.sessions.push(session);
  
  // Update totals (re-calculation happens in getStats, but good to keep consistent here)
  if (session.type === 'FOCUS') {
    stats.totalFocusTime += session.durationSeconds;
  } else {
    stats.totalDistractionTime += session.durationSeconds;
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
};

export const addCategory = (category: Category) => {
  const stats = getStats();
  // Limit to 2 categories as per requirement
  if (stats.categories.length >= 2) return stats;
  
  stats.categories.push(category);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
};

export const removeCategory = (id: string) => {
  const stats = getStats();
  stats.categories = stats.categories.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export const clearStats = () => {
    localStorage.removeItem(STORAGE_KEY);
}

// --- Social Features ---

export const createUserProfile = (username: string, email: string): UserStats => {
    const stats = getStats();
    stats.userProfile = {
        id: 'user_' + Date.now(),
        username,
        email,
        avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}`,
        friends: []
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    return stats;
};

export const searchUsers = (query: string): Friend[] => {
    if (!query) return [];
    return MOCK_USERS_DB.filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
};

export const addFriend = (friendId: string): UserStats => {
    const stats = getStats();
    if (!stats.userProfile) return stats;

    const friendToAdd = MOCK_USERS_DB.find(u => u.id === friendId);
    if (friendToAdd && !stats.userProfile.friends.find(f => f.id === friendId)) {
        stats.userProfile.friends.push(friendToAdd);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }
    return stats;
};

export const removeFriend = (friendId: string): UserStats => {
    const stats = getStats();
    if (!stats.userProfile) return stats;
    
    stats.userProfile.friends = stats.userProfile.friends.filter(f => f.id !== friendId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    return stats;
};