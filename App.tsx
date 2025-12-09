import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeFrame, loadModel } from './services/geminiService';
import { getStats, saveSession, addCategory, removeCategory, createUserProfile, searchUsers, addFriend, removeFriend } from './services/storageService';
import { AppState, Session, UserStats, Category, Friend } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Constants ---
const CHECK_INTERVAL_MS = 1000;
const WARNING_GRACE_PERIOD_SEC = 5;
const DEFAULT_DURATION_MIN = 25;
const BREAK_DURATION_MIN = 5;

const CATEGORY_COLORS = ['#FF4500', '#1E90FF', '#32CD32', '#FFD700', '#9370DB'];

// --- Helper Components ---

const Header = ({ onLogin, userProfile, onOpenFriends }: { onLogin: () => void, userProfile?: any, onOpenFriends: () => void }) => (
  <header className="fixed top-0 left-0 w-full z-[70] mix-blend-difference text-white p-4 md:p-6 flex justify-between items-start pointer-events-none">
    <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase pointer-events-auto leading-none">
      Bold<br />Focus
    </h1>
    <div className="flex gap-4 items-center pointer-events-auto">
        {userProfile && (
             <button 
                onClick={onOpenFriends}
                className="bg-white text-black text-xs font-bold uppercase px-3 py-1 rounded-full hover:scale-105 transition-transform"
             >
                + Friends
             </button>
        )}
        <button 
          onClick={onLogin}
          className="transition-transform hover:scale-105"
          title={userProfile ? userProfile.username : "Login"}
        >
          {userProfile ? (
             <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white overflow-hidden bg-stone-800">
                <img 
                  src={userProfile.avatarUrl}
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
             </div>
          ) : (
            <span className="border-2 border-white px-4 py-1 md:px-6 md:py-2 rounded-full font-bold hover:bg-white hover:text-black transition-colors uppercase text-xs md:text-sm tracking-widest block">
              Login
            </span>
          )}
        </button>
    </div>
  </header>
);

const CategoryManager = ({ 
  categories, 
  selectedId, 
  onSelect, 
  onRemove,
  isAdding,
  setIsAdding,
  newName,
  setNewName,
  newColor,
  setNewColor
}: { 
  categories: Category[], 
  selectedId: string | null, 
  onSelect: (id: string) => void,
  onRemove: (id: string) => void,
  isAdding: boolean,
  setIsAdding: (v: boolean) => void,
  newName: string,
  setNewName: (v: string) => void,
  newColor: string,
  setNewColor: (v: string) => void
}) => {

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Available Categories</h3>
      
      {categories.length === 0 && <p className="text-sm italic opacity-50">No categories created yet.</p>}

      {categories.map(cat => (
        <div key={cat.id} className="relative w-full group">
          <button
            onClick={() => onSelect(cat.id)}
            style={{ 
              borderColor: cat.color,
              backgroundColor: selectedId === cat.id ? cat.color : 'transparent',
              color: selectedId === cat.id ? 'white' : 'black'
            }}
            className={`w-full text-left p-4 border-l-8 font-bold uppercase transition-all duration-200 flex justify-between items-center border border-t-0 border-r-0 border-b-0
              ${selectedId === cat.id ? 'pl-6 bg-opacity-100' : 'hover:pl-5 hover:bg-stone-100'}
            `}
          >
            <span>{cat.name}</span>
            {selectedId === cat.id && <span className="text-xs">ACTIVE</span>}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(cat.id); }}
            className="absolute -right-2 -top-2 bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            &times;
          </button>
        </div>
      ))}

      {categories.length < 2 && !isAdding && (
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full border-2 border-dashed border-gray-400 p-4 text-gray-500 font-bold uppercase hover:border-black hover:text-black transition-colors"
        >
          + Add Category
        </button>
      )}

      {isAdding && (
        <div className="w-full bg-white border-2 border-black p-4 shadow-xl">
          <input 
            type="text" 
            placeholder="CATEGORY NAME" 
            className="w-full bg-white text-black font-bold uppercase outline-none mb-4 border-b border-gray-300 focus:border-black p-2"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={12}
            autoFocus
          />
          <div className="flex justify-between mb-4">
            {CATEGORY_COLORS.map(c => (
              <button 
                key={c}
                onClick={() => setNewColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full ${newColor === c ? 'ring-2 ring-black ring-offset-2' : ''}`}
              />
            ))}
          </div>
          <div className="flex justify-end">
             <button onClick={() => setIsAdding(false)} className="text-xs font-bold uppercase text-red-500 hover:text-red-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

const FriendsManager = ({ onClose, currentFriends }: { onClose: () => void, currentFriends: Friend[] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    // Trigger update on parent
    const [friendsList, setFriendsList] = useState<Friend[]>(currentFriends);

    useEffect(() => {
        if (searchTerm.length > 1) {
            const results = searchUsers(searchTerm);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    const handleAdd = (id: string) => {
        const updatedStats = addFriend(id);
        if (updatedStats.userProfile) {
            setFriendsList(updatedStats.userProfile.friends);
        }
    };

    const handleRemove = (id: string) => {
        const updatedStats = removeFriend(id);
        if (updatedStats.userProfile) {
            setFriendsList(updatedStats.userProfile.friends);
        }
    };

    const isFriend = (id: string) => friendsList.some(f => f.id === id);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-stone-50 p-6 md:p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b-2 border-stone-200 pb-4">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Manage Friends</h3>
                    <button onClick={onClose} className="text-xl font-bold hover:text-red-500">&times;</button>
                </div>

                <div className="mb-6">
                    <input 
                        type="text" 
                        placeholder="Search username..." 
                        className="w-full bg-stone-100 border-2 border-transparent focus:border-black p-3 font-bold uppercase outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchResults.length > 0 && (
                        <div className="mt-2 bg-white border border-stone-200 shadow-lg p-2 max-h-40 overflow-y-auto">
                            {searchResults.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-stone-50">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatarUrl} className="w-8 h-8 rounded-full bg-stone-200" alt="av" />
                                        <span className="font-bold text-sm">{user.username}</span>
                                    </div>
                                    <button 
                                        onClick={() => isFriend(user.id) ? handleRemove(user.id) : handleAdd(user.id)}
                                        className={`text-xs px-3 py-1 font-bold uppercase ${isFriend(user.id) ? 'bg-stone-200 text-stone-500' : 'bg-black text-white'}`}
                                    >
                                        {isFriend(user.id) ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    <h4 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-4">Your Friends</h4>
                    {friendsList.length === 0 ? (
                        <p className="text-sm opacity-50 italic">No friends added yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {friendsList.map(friend => (
                                <div key={friend.id} className="flex items-center justify-between border-b border-stone-100 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={friend.avatarUrl} className="w-10 h-10 rounded-full bg-stone-200" alt="av" />
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${friend.status === 'FOCUSING' ? 'bg-purple-500' : friend.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        </div>
                                        <div>
                                            <span className="font-bold block leading-none">{friend.username}</span>
                                            <span className="text-[10px] font-bold uppercase opacity-50 tracking-wide">{friend.status}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemove(friend.id)} className="text-xs text-red-500 hover:text-red-700 font-bold uppercase">Remove</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatsOverlay = ({ stats, onClose }: { stats: UserStats, onClose: () => void }) => {
  const data = [
    { name: 'Focus', value: parseFloat((stats.totalFocusTime / 60).toFixed(2)) },
    { name: 'Distraction', value: parseFloat((stats.totalDistractionTime / 60).toFixed(2)) },
  ];
  
  const getCategoryName = (id?: string) => {
    if (!id) return null;
    return stats.categories.find(c => c.id === id)?.name;
  };

  const formatStatsDuration = (seconds: number) => {
    if (seconds < 60) {
        return <>{seconds}<span className="text-xl">s</span></>;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) {
        return <>{mins}<span className="text-xl">m</span> {secs > 0 && <span className="text-2xl opacity-60">{secs}s</span>}</>;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return <>{hours}<span className="text-xl">h</span> {remainingMins}<span className="text-xl">m</span></>;
  };

  return (
    <div className="fixed inset-0 bg-stone-950 text-stone-50 z-[100] flex flex-col p-6 md:p-12 overflow-y-auto">
      <div className="flex justify-between items-start mb-8 mt-12 md:mt-20">
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
          Your<br />Numbers
        </h2>
        <button onClick={onClose} className="text-xl md:text-2xl hover:text-red-500 font-bold">&times; CLOSE</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="h-64 md:h-80 border border-stone-800 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#555" tick={{fill: '#fff'}} />
              <YAxis stroke="#555" tick={{fill: '#fff'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => [`${value} min`, 'Duration']}
              />
              <Bar dataKey="value" fill="#fff">
                 {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center mt-4 font-mono text-sm uppercase">Minutes Spent</p>
        </div>

        <div className="flex flex-col gap-6">
            <div className="border-t-4 border-green-500 pt-4">
                <h3 className="text-stone-500 uppercase font-bold text-sm">Total Focus Time</h3>
                <p className="text-5xl md:text-6xl font-bold tabular-nums">
                    {formatStatsDuration(stats.totalFocusTime)}
                </p>
            </div>
            <div className="border-t-4 border-red-500 pt-4">
                <h3 className="text-stone-500 uppercase font-bold text-sm">Total Distraction Time</h3>
                <p className="text-5xl md:text-6xl font-bold tabular-nums">
                    {formatStatsDuration(stats.totalDistractionTime)}
                </p>
            </div>
            <div className="border-t-4 border-stone-500 pt-4">
                <h3 className="text-stone-500 uppercase font-bold text-sm">Sessions Completed</h3>
                <p className="text-5xl md:text-6xl font-bold tabular-nums">{stats.sessions.filter(s => s.type === 'FOCUS').length}</p>
            </div>
        </div>
      </div>

      <div className="border-t-4 border-stone-800 pt-8 pb-12">
        <h3 className="text-3xl font-black uppercase mb-6">Session History</h3>
        <div className="max-h-80 overflow-y-auto space-y-3 font-mono text-sm md:text-base">
            {stats.sessions.length === 0 && <p className="opacity-50">No sessions yet.</p>}
            {stats.sessions.slice().reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between border-b border-stone-800 pb-3 hover:bg-stone-900 px-2 transition-colors">
                    <div className="flex items-center gap-4">
                        <span className={`w-3 h-3 rounded-full ${s.type === 'FOCUS' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <div>
                            <span className="font-bold uppercase block leading-none">{s.type}</span>
                            {s.categoryId && <span className="text-xs opacity-50 uppercase">{getCategoryName(s.categoryId)}</span>}
                        </div>
                    </div>
                    <div className="flex gap-8">
                        <span className="opacity-60">{new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="font-bold w-20 text-right">{Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s</span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION_MIN);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION_MIN * 60);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [distractionTime, setDistractionTime] = useState(0);
  const distractionTimeRef = useRef(0);
  const [warningTime, setWarningTime] = useState(WARNING_GRACE_PERIOD_SEC);
  const [warningType, setWarningType] = useState<'PHONE' | 'AWAY' | null>(null);
  
  const [stats, setStats] = useState<UserStats>(getStats());
  const [showStats, setShowStats] = useState(false);
  const [showFriendsManager, setShowFriendsManager] = useState(false);

  // Category State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Category Adding State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);

  // Onboarding State
  const [usernameInput, setUsernameInput] = useState('');

  // Camera State
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const checkIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Animation Refs
  const animationRef = useRef<number | null>(null);
  const posRef = useRef({ x: window.innerWidth - 300, y: window.innerHeight - 300 });
  const velRef = useRef({ x: 1.5, y: -1.5 });

  const playBeep = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  useEffect(() => {
    const init = async () => {
      const loaded = await loadModel();
      setIsModelLoaded(loaded);
    };
    init();
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setIsCameraOn(false);
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (isCameraOn) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraOn]);

  useEffect(() => {
    if (appState === AppState.IDLE) {
      const animate = () => {
        if (!videoContainerRef.current) return;
        const { innerWidth, innerHeight } = window;
        const el = videoContainerRef.current;
        const rect = el.getBoundingClientRect();
        let { x, y } = posRef.current;
        let { x: vx, y: vy } = velRef.current;
        x += vx;
        y += vy;
        if (x <= 0 || x + rect.width >= innerWidth) {
          vx = -vx;
          x = Math.max(0, Math.min(x, innerWidth - rect.width));
        }
        if (y <= 0 || y + rect.height >= innerHeight) {
          vy = -vy;
          y = Math.max(0, Math.min(y, innerHeight - rect.height));
        }
        posRef.current = { x, y };
        velRef.current = { x: vx, y: vy };
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (videoContainerRef.current) videoContainerRef.current.style.transform = '';
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [appState, isCameraOn]);

  useEffect(() => {
    if (showStats) {
        const s = getStats();
        setStats(s);
    }
  }, [showStats]);
  
  useEffect(() => {
    const s = getStats();
    setStats(s);
    if (s.categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(s.categories[0].id);
    }
  }, []);

  const handleLogin = () => {
      if (stats.userProfile) return; // Already logged in
      // Simulated Google Login
      const win = window.open('', 'Google Login', 'width=500,height=600');
      if (win) {
          win.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100%;background:#eee;font-family:sans-serif;"><h1>Simulating Google Login...</h1></body></html>');
          setTimeout(() => {
            win.close();
            // Transition to Onboarding to set username
            setAppState(AppState.ONBOARDING);
          }, 1500);
      }
  };

  const handleCreateProfile = () => {
      if (!usernameInput.trim()) return;
      // Create user
      const updatedStats = createUserProfile(usernameInput.trim(), "user@example.com");
      setStats(updatedStats);
      setAppState(AppState.IDLE);
  };

  const handleAddCategory = (name: string, color: string) => {
    const newCat = { id: Date.now().toString(), name, color };
    const updatedStats = addCategory(newCat);
    setStats(updatedStats);
    setSelectedCategoryId(newCat.id);
  };

  const handleRemoveCategory = (id: string) => {
    const updatedStats = removeCategory(id);
    setStats(updatedStats);
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
  };

  const handleModalClose = () => {
    if (isAddingCategory && newCategoryName.trim()) {
        handleAddCategory(newCategoryName, newCategoryColor);
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
    setNewCategoryColor(CATEGORY_COLORS[0]);
    setShowCategoryModal(false);
  };

  useEffect(() => {
    if (appState === AppState.PHONE_JAIL || appState === AppState.USER_AWAY || appState === AppState.WARNING) {
      playBeep();
    }
  }, [appState, playBeep]);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = window.setInterval(() => {
      if (appState === AppState.PAUSED) return;
      
      if (appState === AppState.FOCUS) {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      } else if (appState === AppState.REST) {
        setRestTimeLeft((prev) => {
          return prev > 0 ? prev - 1 : 0;
        });
      } else if (appState === AppState.WARNING) {
        setWarningTime((prev) => {
          if (prev <= 0) {
            enterDistractionState();
            return 0;
          }
          return prev - 1;
        });
      } else if (appState === AppState.PHONE_JAIL || appState === AppState.USER_AWAY) {
        setDistractionTime((prev) => prev + 1);
        distractionTimeRef.current += 1;
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [appState, playBeep]);

  useEffect(() => {
    if (appState === AppState.REST && restTimeLeft <= 0) {
      playBeep();
      handleResume();
    }
  }, [appState, restTimeLeft, playBeep]);

  useEffect(() => {
    if (appState === AppState.IDLE || appState === AppState.TIMER_SELECTION || appState === AppState.PAUSED || appState === AppState.REST || appState === AppState.ONBOARDING || !isCameraOn || !isModelLoaded) return;

    const checkFrame = async () => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return;

      setIsScanning(true);
      const result = await analyzeFrame(video);
      setIsScanning(false);

      if (result.phoneDetected) {
        handleDistractionDetected('PHONE');
      } else if (!result.userPresent) {
         handleDistractionDetected('AWAY');
      } else {
        handleClearDistraction();
      }
    };

    checkIntervalRef.current = window.setInterval(checkFrame, CHECK_INTERVAL_MS);
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [appState, isCameraOn, isModelLoaded]);

  const handleDistractionDetected = (type: 'PHONE' | 'AWAY') => {
    setAppState((curr) => {
      if (curr === AppState.FOCUS) {
        setWarningType(type);
        setWarningTime(WARNING_GRACE_PERIOD_SEC);
        return AppState.WARNING;
      }
      if (curr === AppState.WARNING) {
        if (type === 'PHONE' && warningType === 'AWAY') {
            setWarningType('PHONE');
        }
        return curr;
      }
      return curr;
    });
  };

  const handleClearDistraction = () => {
    setAppState((curr) => {
      if (curr === AppState.WARNING) {
        setWarningTime(WARNING_GRACE_PERIOD_SEC);
        setWarningType(null);
        return AppState.FOCUS;
      }
      if (curr === AppState.PHONE_JAIL || curr === AppState.USER_AWAY) {
        saveSession({
          id: Date.now().toString(),
          startTime: Date.now() - (distractionTimeRef.current * 1000),
          durationSeconds: distractionTimeRef.current,
          type: 'DISTRACTION',
          date: new Date().toISOString(),
          categoryId: selectedCategoryId || undefined
        });
        setStats(getStats());
        setDistractionTime(0);
        distractionTimeRef.current = 0;
        return AppState.FOCUS;
      }
      return curr;
    });
  };

  const enterDistractionState = () => {
    if (warningType === 'PHONE') {
        setAppState(AppState.PHONE_JAIL);
    } else {
        setAppState(AppState.USER_AWAY);
    }
  };

  const handleStartClick = () => {
    if (!isModelLoaded) {
        alert("Please wait for the AI model to finish loading.");
        return;
    }
    setAppState(AppState.TIMER_SELECTION);
  };

  const confirmSessionStart = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (!isCameraOn) {
      setAppState(AppState.PAUSED);
    } else {
      setAppState(AppState.FOCUS);
    }
    setTimeLeft(selectedDuration * 60);
    setDistractionTime(0);
    distractionTimeRef.current = 0;
  };

  const handlePause = () => setAppState(AppState.PAUSED);

  const handleTakeBreak = () => {
    setRestTimeLeft(BREAK_DURATION_MIN * 60);
    setAppState(AppState.REST);
  };

  const handleResume = () => {
    if (!isCameraOn) setIsCameraOn(true);
    setAppState(AppState.FOCUS);
  };

  const handleToggleCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCameraOn(prev => {
        const nextState = !prev;
        if (!nextState && (appState === AppState.FOCUS || appState === AppState.WARNING)) {
            setAppState(AppState.PAUSED);
        }
        return nextState;
    });
  };

  const handleStopSession = () => {
    const totalSeconds = selectedDuration * 60;
    const elapsedSeconds = totalSeconds - timeLeft;
    
    if (elapsedSeconds > 0) {
      saveSession({
        id: Date.now().toString(),
        startTime: Date.now() - (elapsedSeconds * 1000),
        durationSeconds: elapsedSeconds,
        type: 'FOCUS',
        date: new Date().toISOString(),
        categoryId: selectedCategoryId || undefined
      });
      setStats(getStats());
    }
    
    setAppState(AppState.IDLE);
    setTimeLeft(selectedDuration * 60);
    setWarningType(null);
    setDistractionTime(0);
    distractionTimeRef.current = 0;
    setIsCameraOn(true);
  };

  const handleSessionComplete = () => {
    setAppState(AppState.IDLE);
    saveSession({
      id: Date.now().toString(),
      startTime: Date.now() - (selectedDuration * 60 * 1000),
      durationSeconds: selectedDuration * 60,
      type: 'FOCUS',
      date: new Date().toISOString(),
      categoryId: selectedCategoryId || undefined
    });
    setStats(getStats());
    setDistractionTime(0);
    distractionTimeRef.current = 0;
    alert("Session Complete! Great focus.");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBgClasses = () => {
    switch (appState) {
      case AppState.PAUSED: return "bg-stone-200";
      case AppState.REST: return "bg-cyan-300";
      case AppState.WARNING: return "bg-yellow-400";
      case AppState.PHONE_JAIL:
      case AppState.USER_AWAY: return "bg-red-600";
      case AppState.FOCUS: return "bg-emerald-500";
      case AppState.ONBOARDING: return "bg-stone-100";
      default: return "bg-stone-50";
    }
  };

  const getTextClasses = () => {
    switch (appState) {
      case AppState.PAUSED: return "text-stone-600";
      case AppState.REST: return "text-cyan-950";
      case AppState.WARNING: return "text-black";
      case AppState.PHONE_JAIL:
      case AppState.USER_AWAY: return "text-white";
      case AppState.FOCUS: return "text-black";
      default: return "text-black";
    }
  };

  const getVideoClasses = () => {
    const scanningClass = isScanning ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'border-black shadow-xl';
    
    if (appState === AppState.IDLE) {
      return `fixed top-0 left-0 w-40 h-40 md:w-64 md:h-64 rounded-full border-4 ${scanningClass} z-[60] overflow-hidden will-change-transform transition-colors duration-300`;
    }
    if (appState === AppState.TIMER_SELECTION || appState === AppState.ONBOARDING) {
        return `relative w-40 h-40 md:w-52 md:h-52 rounded-full border-4 ${scanningClass} z-[60] overflow-hidden transition-all duration-300 mb-6 shadow-xl flex-shrink-0 mx-auto`;
    }
    return `relative h-[40vh] md:h-[45vh] aspect-[3/2] max-w-full border-4 ${scanningClass} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-4 md:mb-8 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group bg-black shrink-1`;
  };

  const currentCategory = stats.categories.find(c => c.id === selectedCategoryId);

  return (
    <div className={`h-[100dvh] w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${getTextClasses()}`}>
      
      <div className={`absolute inset-0 z-0 transition-colors duration-500 ${getBgClasses()} ${(appState === AppState.PHONE_JAIL || appState === AppState.USER_AWAY) ? 'animate-pulse' : ''}`} />

      {/* Conditionally hide Header during onboarding for cleaner focus */}
      {appState !== AppState.ONBOARDING && (
        <Header 
            onLogin={handleLogin} 
            userProfile={stats.userProfile} 
            onOpenFriends={() => setShowFriendsManager(true)}
        />
      )}
      
      {(appState === AppState.IDLE || appState === AppState.TIMER_SELECTION) && (
        <div className="absolute top-24 right-4 md:top-28 md:right-8 z-[65] flex flex-col items-end gap-2">
            <button 
                onClick={handleToggleCamera}
                className="font-bold uppercase tracking-widest text-sm md:text-base flex items-center gap-2 hover:opacity-70 transition-opacity bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-transparent hover:border-black/20"
                title={isCameraOn ? "Disable Camera" : "Enable Camera"}
            >
                <div className={`w-3 h-3 rounded-full shadow-sm ${isCameraOn ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="hidden md:inline">{isCameraOn ? 'CAMERA ON' : 'CAMERA OFF'}</span>
            </button>
            {appState === AppState.TIMER_SELECTION && currentCategory && (
                 <div 
                  className="text-sm font-bold uppercase px-2 py-1 inline-block border-2 border-black shadow-sm"
                  style={{ backgroundColor: currentCategory.color, color: 'white', borderColor: 'black' }}
                >
                  {currentCategory.name}
                </div>
            )}
        </div>
      )}
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full min-h-0 overflow-y-auto overflow-x-hidden">
        
        {(isCameraOn || (appState !== AppState.IDLE && appState !== AppState.TIMER_SELECTION && appState !== AppState.ONBOARDING)) && (
          <div ref={videoContainerRef} className={getVideoClasses()}>
             {isCameraOn ? (
                 <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
             ) : (
                 <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-500">
                     <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          <p className="font-bold uppercase tracking-widest text-sm">Camera Disabled</p>
                     </div>
                 </div>
             )}
             
             {(appState !== AppState.IDLE && appState !== AppState.TIMER_SELECTION && appState !== AppState.ONBOARDING) && (
               <button 
                 onClick={handleToggleCamera}
                 className="absolute bottom-4 right-4 z-20 bg-black text-white p-2 rounded-full transition-opacity focus:opacity-100 opacity-0 group-hover:opacity-100"
               >
                  {isCameraOn ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
               </button>
             )}

             {appState === AppState.FOCUS && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                     <button 
                       onClick={handlePause}
                       className="bg-white text-black font-black uppercase tracking-widest py-3 px-8 rounded-full transform hover:scale-110 transition-transform shadow-xl"
                     >
                       Pause
                     </button>
                 </div>
             )}

             {appState === AppState.PAUSED && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-30">
                     <p className="text-white font-black uppercase tracking-widest text-xl mb-4">Session Paused</p>
                     <button 
                       onClick={handleResume}
                       className="bg-white text-black font-black uppercase tracking-widest py-3 px-8 rounded-full transform hover:scale-110 transition-transform shadow-xl"
                     >
                       Resume
                     </button>
                 </div>
             )}
          </div>
        )}
        
        {(appState !== AppState.IDLE && appState !== AppState.TIMER_SELECTION && appState !== AppState.ONBOARDING) && (
          <div className="absolute top-24 md:top-36 right-4 md:right-12 text-right pointer-events-none z-40">
             <div className={`inline-block px-3 py-1 font-mono text-sm uppercase tracking-widest mb-2 ${isCameraOn ? 'bg-black text-white' : 'bg-red-500 text-white'}`}>
                {isCameraOn ? 'Camera Active' : 'Camera Disabled'}
             </div>
             <div className="font-bold uppercase tracking-wide block">
                {appState === AppState.PAUSED ? 'Paused' : appState === AppState.REST ? 'Taking a Break' : 'Monitoring'}
             </div>
             {currentCategory && (
                <div 
                  className="mt-2 text-sm font-bold uppercase px-2 py-1 inline-block border-2 border-black"
                  style={{ backgroundColor: currentCategory.color, color: 'white', borderColor: 'black' }}
                >
                  {currentCategory.name}
                </div>
             )}
          </div>
        )}

        {/* Onboarding Screen */}
        {appState === AppState.ONBOARDING && (
            <div className="flex flex-col items-center justify-center w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8 text-center">Welcome</h2>
                <p className="text-xl font-medium mb-8 text-center opacity-70">Create your unique username to start tracking and sharing.</p>
                <div className="w-full bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <label className="block font-bold uppercase text-xs mb-2 opacity-60">Username</label>
                    <input 
                        type="text" 
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="e.g. DesignMaster"
                        className="w-full text-2xl font-bold border-b-2 border-stone-300 focus:border-black outline-none py-2 mb-8 bg-transparent"
                        autoFocus
                    />
                    <button 
                        onClick={handleCreateProfile}
                        disabled={!usernameInput.trim()}
                        className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:bg-stone-800 disabled:opacity-50"
                    >
                        Start Focus Journey
                    </button>
                </div>
            </div>
        )}

        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto relative space-y-4 md:space-y-8 flex-shrink-0">
            <h2 className="text-[15vw] md:text-[22vh] font-black tracking-tighter leading-[0.8] text-center mt-8 md:mt-0">
                DEEP<br/>WORK
            </h2>
            <p className="text-base md:text-xl max-w-md text-center font-medium opacity-80 px-4">
                Put your phone away. Stay in frame. If you leave or use your phone, the timer stops.
            </p>
            
            <div className="flex flex-col gap-4 md:gap-6 items-center pt-2 w-full px-4">
                <button 
                    onClick={handleStartClick}
                    disabled={!isModelLoaded}
                    className={`bg-black border-4 border-black text-white text-lg md:text-2xl px-10 py-5 md:px-12 md:py-6 font-bold uppercase tracking-wider shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-xs md:max-w-none transform transition-all ${isModelLoaded ? 'hover:bg-white hover:text-black active:translate-y-1 active:shadow-none' : 'opacity-50 cursor-not-allowed'}`}
                >
                    {isModelLoaded ? 'Start Session' : 'Loading AI Model...'}
                </button>

                {currentCategory ? (
                   <button 
                      onClick={() => setShowCategoryModal(true)}
                      className="w-full max-w-xs md:max-w-md text-left p-3 md:p-4 border-l-8 font-bold uppercase shadow-lg hover:scale-105 transition-transform flex justify-between items-center bg-white"
                      style={{ 
                          backgroundColor: currentCategory.color,
                          borderColor: currentCategory.color,
                          color: 'white'
                      }}
                   >
                      <span>{currentCategory.name}</span>
                      <span className="text-xs bg-black/20 px-2 py-1 rounded">CHANGE</span>
                   </button>
                ) : (
                    <button 
                        onClick={() => setShowCategoryModal(true)}
                        className="text-xs md:text-sm font-bold uppercase tracking-widest border-b-2 border-transparent hover:border-black pb-1 transition-all flex items-center gap-2 opacity-70 hover:opacity-100"
                    >
                        + Add Context / Category
                    </button>
                )}
            </div>
          </div>
        )}

        {appState === AppState.TIMER_SELECTION && (
             <div className="flex flex-col items-center justify-center w-full animate-in fade-in zoom-in duration-300">
                <h2 className="text-lg md:text-2xl font-black uppercase tracking-widest mb-8 md:mb-12 opacity-60">Set Duration</h2>
                
                <div className="flex items-center gap-4 md:gap-8 mb-8 md:mb-12">
                     <button 
                        onClick={() => setSelectedDuration(prev => Math.max(5, prev - 5))}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-black flex items-center justify-center text-2xl font-bold hover:bg-black hover:text-white transition-colors"
                     >
                         -
                     </button>
                     <div className="text-6xl md:text-[15vh] font-black tabular-nums leading-none tracking-tighter">
                         {selectedDuration}<span className="text-xl md:text-4xl align-top font-bold opacity-50 ml-2">min</span>
                     </div>
                     <button 
                        onClick={() => setSelectedDuration(prev => Math.min(180, prev + 5))}
                        className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-black flex items-center justify-center text-2xl font-bold hover:bg-black hover:text-white transition-colors"
                     >
                         +
                     </button>
                </div>

                <div className="flex gap-4 mb-12">
                    {[15, 25, 45, 60].map(mins => (
                        <button
                            key={mins}
                            onClick={() => setSelectedDuration(mins)}
                            className={`px-4 py-2 font-bold uppercase border-2 border-black rounded-full transition-all ${selectedDuration === mins ? 'bg-black text-white' : 'hover:bg-black/10'}`}
                        >
                            {mins}m
                        </button>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setAppState(AppState.IDLE)}
                        className="px-8 py-4 font-bold uppercase tracking-widest hover:bg-stone-200 transition-colors"
                    >
                        Back
                    </button>
                    <button 
                        onClick={confirmSessionStart}
                        className="bg-black text-white px-10 py-4 font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
                    >
                        Start Timer
                    </button>
                </div>
             </div>
        )}

        {(appState === AppState.FOCUS || appState === AppState.PAUSED) && (
            <div className="text-center w-full flex-shrink flex flex-col items-center justify-center min-h-0">
                <div className="flex flex-col items-center w-full">
                    <h2 className={`text-[12rem] md:text-[15vh] font-black tracking-tighter leading-none tabular-nums ${appState === AppState.PAUSED ? 'opacity-50' : ''}`}>
                        {formatTime(timeLeft)}
                    </h2>
                    <p className="text-xl md:text-2xl font-bold uppercase tracking-widest mt-2 md:mt-4">
                        {appState === AppState.PAUSED ? 'Paused' : 'Focusing'}
                    </p>
                    
                    <div className="flex flex-col gap-4 mt-6 md:mt-12 items-center w-full max-w-xs">
                         {appState === AppState.FOCUS && (
                            <button 
                                onClick={handleTakeBreak}
                                className="w-full border-4 border-stone-900 text-stone-900 text-lg md:text-xl px-6 py-2 md:px-8 md:py-3 font-bold hover:bg-stone-900 hover:text-white transition-colors uppercase tracking-wider flex-shrink-0"
                            >
                                Take a 5 min rest
                            </button>
                         )}
                         {appState === AppState.PAUSED && (
                             <button 
                                onClick={handleResume}
                                className="w-full bg-black text-white text-lg md:text-xl px-6 py-2 md:px-8 md:py-3 font-bold hover:bg-stone-800 transition-colors uppercase tracking-wider flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                             >
                                Resume Session
                            </button>
                         )}
                         <button 
                            onClick={handleStopSession}
                            className="w-full border-4 border-black text-black text-lg md:text-xl px-6 py-2 md:px-8 md:py-3 font-bold hover:bg-black hover:text-white transition-colors uppercase tracking-wider flex-shrink-0"
                        >
                            Stop Session
                        </button>
                    </div>
                </div>
            </div>
        )}

        {appState === AppState.REST && (
           <div className="text-center w-full flex-shrink flex flex-col items-center justify-center min-h-0">
               <div className="flex flex-col items-center w-full">
                   <h2 className="text-[12rem] md:text-[15vh] font-black tracking-tighter leading-none tabular-nums">
                       {formatTime(restTimeLeft)}
                   </h2>
                   <p className="text-xl md:text-2xl font-bold uppercase tracking-widest mt-2 md:mt-4">
                       Resting
                   </p>
                   
                   <div className="flex flex-col gap-4 mt-6 md:mt-12 items-center w-full max-w-xs">
                        <button 
                           onClick={handleResume}
                           className="w-full bg-black text-white text-lg md:text-xl px-6 py-2 md:px-8 md:py-3 font-bold hover:bg-stone-800 transition-colors uppercase tracking-wider flex-shrink-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]"
                        >
                           Skip Rest & Resume
                       </button>
                   </div>
               </div>
           </div>
       )}

        {appState === AppState.WARNING && (
            <div className="text-center w-full flex-shrink flex flex-col items-center justify-center min-h-0">
                <div className="bg-black text-white p-6 md:p-12 transform rotate-1 inline-block">
                    <h2 className="text-4xl md:text-8xl font-black uppercase leading-none mb-4">
                        {warningType === 'PHONE' ? 'Phone Detected' : 'User Missing'}
                    </h2>
                    <p className="text-2xl md:text-4xl font-mono text-yellow-500">
                        {warningType === 'PHONE' ? 'Drop it in' : 'Return in'} {warningTime}s
                    </p>
                </div>
            </div>
        )}

        {(appState === AppState.PHONE_JAIL || appState === AppState.USER_AWAY) && (
            <div className="text-center w-full flex-shrink flex flex-col items-center justify-center min-h-0">
                <h2 className="text-4xl md:text-9xl font-black uppercase leading-none mb-8">
                    {appState === AppState.PHONE_JAIL ? 'DISTRACTED' : 'ABSENT'}
                </h2>
                <div className="bg-black inline-block p-8">
                    <p className="text-white text-xl md:text-2xl uppercase tracking-widest mb-2">Wasted Time</p>
                    <p className="text-4xl md:text-6xl font-mono text-red-500 font-bold tabular-nums">
                        {formatTime(distractionTime)}
                    </p>
                </div>
                <p className="mt-8 text-lg md:text-xl font-bold uppercase">
                    {appState === AppState.PHONE_JAIL ? 'Put the phone down to resume.' : 'Come back to frame to resume.'}
                </p>
            </div>
        )}

      </main>

      {/* Footer */}
      {appState !== AppState.ONBOARDING && (
          <footer className="w-full p-4 md:p-8 flex justify-between items-end relative z-[70] flex-shrink-0 bg-transparent">
            <div className="flex flex-col gap-1 md:gap-2">
                <button 
                    onClick={() => setShowStats(true)}
                    className="text-base md:text-lg font-bold border-b-2 border-current hover:opacity-50 self-start"
                >
                    VIEW STATS
                </button>
                <div className="text-[10px] md:text-xs uppercase tracking-widest opacity-60">
                    Local Data Storage • v1.5
                </div>
            </div>
            
            {stats.userProfile && stats.userProfile.friends.length > 0 && (
                <div className="hidden md:block">
                    <p className="text-xs font-bold uppercase mb-2 opacity-60 text-right">Friends Focusing</p>
                    <div className="flex -space-x-4">
                        {stats.userProfile.friends.map(friend => (
                            <div key={friend.id} className="w-10 h-10 rounded-full border-2 border-current bg-stone-200 flex items-center justify-center overflow-hidden relative" title={friend.username}>
                                <img src={friend.avatarUrl} alt={friend.username} className="w-full h-full object-cover" />
                                {friend.status === 'FOCUSING' && <div className="absolute inset-0 border-2 border-green-500 rounded-full animate-pulse"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </footer>
      )}

      {showStats && <StatsOverlay stats={stats} onClose={() => setShowStats(false)} />}
      
      {showCategoryModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={handleModalClose}>
                <div className="bg-stone-50 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full relative" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6 border-b-2 border-stone-200 pb-4">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Session Context</h3>
                        <button onClick={handleModalClose} className="text-xl font-bold hover:text-red-500 w-8 h-8 flex items-center justify-center">&times;</button>
                    </div>
                    <CategoryManager 
                        categories={stats.categories}
                        selectedId={selectedCategoryId}
                        onSelect={handleCategorySelect}
                        onRemove={handleRemoveCategory}
                        isAdding={isAddingCategory}
                        setIsAdding={setIsAddingCategory}
                        newName={newCategoryName}
                        setNewName={setNewCategoryName}
                        newColor={newCategoryColor}
                        setNewColor={setNewCategoryColor}
                    />
                    <button 
                        onClick={handleModalClose}
                        className="mt-6 w-full bg-black text-white py-4 font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform"
                    >
                        OK
                    </button>
                </div>
            </div>
      )}

      {showFriendsManager && stats.userProfile && (
          <FriendsManager 
            onClose={() => setShowFriendsManager(false)}
            currentFriends={stats.userProfile.friends}
          />
      )}
    </div>
  );
};

export default App;