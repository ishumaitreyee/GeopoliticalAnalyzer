import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { LogOut, Send, BrainCircuit, Menu, User, Edit, Trash2, MoreVertical, Share2, Pin, ExternalLink } from 'lucide-react';
import removeMarkdown from 'remove-markdown';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};


let auth, db, initializationError = null;

try {
  const missingKeys = Object.keys(firebaseConfig).filter(key => !firebaseConfig[key]);
  if (missingKeys.length > 0) {
    const missingVars = missingKeys.map(key => `REACT_APP_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
    throw new Error(`The following environment variables are missing: ${missingVars.join(', ')}. Please check your root .env file.`);
  }
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase Initialization Error:", e);
  initializationError = e.message;
}


const LoadingSpinner = () => (
    <svg className="spinner" style={{ height: '20px', width: '20px', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TypingIndicator = () => (
    <div className="typing-indicator">
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
      <div className="typing-dot"></div>
    </div>
);

const Message = ({ sender, text, sources }) => {
  const cleanText = sender === 'bot' && text ? removeMarkdown(text) : text;

  return (
      <div className={`message ${sender} chat-message-animation`}>
        <div className={`avatar ${sender}-avatar`}>
          {sender === 'bot' ? <BrainCircuit size={20} /> : <User size={20} />}
        </div>
        <div className="message-content">
          <p className="message-sender">{sender === 'bot' ? 'Geopolitical Analyzer' : 'You'}</p>
          <div className="message-text">
            {cleanText ? <p>{cleanText}</p> : <TypingIndicator />}
          </div>

          {/* Sources Section - Only for bot messages with sources */}
          {sender === 'bot' && sources && sources.length > 0 && (
              <div className="sources-section">
                <p className="sources-title">Sources</p>
                <div className="sources-list">
                  {sources.map((source, index) => (
                      <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link"
                      >
                        <ExternalLink size={12} style={{ marginRight: '4px' }} />
                        {source.title}
                      </a>
                  ))}
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="login-screen">
        <div className="login-logo-container">
          <BrainCircuit size={48} className="login-logo-icon" />
          <h1 className="login-logo-text">Geopolitical Analyzer</h1>
        </div>
        <p>Harness AI-driven insights. Sign in to begin your analysis.</p>

        <form onSubmit={handleAuthAction} className="login-form">
          {error && <p className="auth-error">{error}</p>}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="form-input" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="form-input" required />
          <button type="submit" className="form-button" disabled={loading}>
            {loading ? <LoadingSpinner /> : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <button onClick={() => setIsSignUp(!isSignUp)} className="toggle-auth-btn">
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
        <div className="divider">OR</div>
        <button onClick={handleGoogleSignIn} className="google-signin-btn" disabled={loading}>
          <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
          Sign in with Google
        </button>
      </div>
  );
};

const generateSessionTitle = (userInput) => {
  if (!userInput || userInput.trim() === '') {
    return "New Analysis";
  }

  const cleanInput = userInput.trim();

  const sentences = cleanInput.split(/[.!?]/);
  let firstSentence = sentences[0] || cleanInput;


  firstSentence = firstSentence.replace(/^(what|who|when|where|why|how|explain|describe|analyze|discuss)\s+/i, '');
  firstSentence = firstSentence.replace(/\?/g, '');

  if (firstSentence.length <= 40) {
    return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
  }

  return firstSentence.substring(0, 37).trim() + '...';
};

function ChatApplication() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [activeOptions, setActiveOptions] = useState(null);
  const [renamingSessionId, setRenamingSessionId] = useState(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");

  const chatEndRef = useRef(null);
  const profileMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const optionsMenuRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthReady(true);
      // Reset to new chat when user logs in or returns
      setCurrentSessionId(null);
      setMessages([]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setIsProfileMenuOpen(false);
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target)) setActiveOptions(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSessionId(null);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionsData);
    }, (err) => {
      console.error("Error loading sessions:", err);
      setError("Failed to load chat sessions");
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!currentSessionId || !user) {
      setMessages([]);
      return;
    }

    const q = query(
        collection(db, 'users', user.uid, 'sessions', currentSessionId, 'messages'),
        orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => doc.data());
      setMessages(messagesData);
    }, (err) => {
      console.error("Error loading messages:", err);
      setError("Failed to load messages for this session.");
    });

    return () => unsubscribe();
  }, [currentSessionId, user]);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userInput]);


  const createNewSession = async () => {
    if (!user) return;

    try {
      const ref = await addDoc(collection(db, 'users', user.uid, 'sessions'), {
        title: "New Analysis",
        createdAt: serverTimestamp(),
        isPinned: false
      });

      setCurrentSessionId(ref.id);
      setMessages([]);
      setUserInput('');
      setError('');
    } catch (error) {
      console.error("Error creating session:", error);
      setError("Failed to create new chat session");
    }
  };

  const deleteSession = async (sessionIdToDelete) => {
    if (!user) return;

    try {
      if (currentSessionId === sessionIdToDelete) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionIdToDelete));
    } catch (error) {
      console.error("Error deleting session:", error);
      setError("Failed to delete chat session");
    }
    setActiveOptions(null);
  };

  const handleRename = (session) => {
    setRenamingSessionId(session.id);
    setNewSessionTitle(session.title);
    setActiveOptions(null);
  };

  const handleRenameSubmit = async (e, sessionId) => {
    e.preventDefault();
    if (!user || !newSessionTitle.trim()) {
      setRenamingSessionId(null);
      return;
    }

    try {
      const sessionRef = doc(db, 'users', user.uid, 'sessions', sessionId);
      await updateDoc(sessionRef, { title: newSessionTitle.trim() });
      setRenamingSessionId(null);
    } catch (error) {
      console.error("Error renaming session:", error);
      setError("Failed to rename chat session");
    }
  };

  const handleTogglePin = async (session) => {
    if (!user) return;
    try {
      const sessionRef = doc(db, 'users', user.uid, 'sessions', session.id);
      await updateDoc(sessionRef, { isPinned: !session.isPinned });
      setActiveOptions(null);
    } catch (error) {
      console.error("Error toggling pin:", error);
      setError("Failed to update chat session");
    }
  };

  const handleShare = (sessionId) => {
    navigator.clipboard.writeText(`${window.location.origin}/chat/${sessionId}`);
    alert("Shareable link copied to clipboard!");
    setActiveOptions(null);
  };

  const getAnalysis = async (queryText, sessionId, isNewSession = false) => {
    if (!user || !sessionId) return;
    setIsLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'users', user.uid, 'sessions', sessionId, 'messages'), {
        sender: 'user', text: queryText, createdAt: serverTimestamp()
      });

      const chatHistoryForBackend = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          chat_history: chatHistoryForBackend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `An API error occurred: ${response.status}`);
      }

      const data = await response.json();

      const cleanAnswer = removeMarkdown(data.answer);


      await addDoc(collection(db, 'users', user.uid, 'sessions', sessionId, 'messages'), {
        sender: 'bot',
        text: cleanAnswer,
        sources: data.sources, // Store sources with the message
        createdAt: serverTimestamp()
      });

      if (isNewSession || messages.length === 0) {
        const newTitle = generateSessionTitle(queryText);
        await updateDoc(doc(db, 'users', user.uid, 'sessions', sessionId), { title: newTitle });
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      const errorMsg = `Sorry, the analysis failed: ${err.message}`;
      setError(errorMsg);
      try {
        await addDoc(collection(db, 'users', user.uid, 'sessions', sessionId, 'messages'), {
          sender: 'bot', text: errorMsg, createdAt: serverTimestamp()
        });
      } catch (firestoreError) {
        console.error("Failed to save error message:", firestoreError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    let activeSessionId = currentSessionId;
    let isNewSession = false;

    if (!activeSessionId) {
      isNewSession = true;
      try {
        const initialTitle = generateSessionTitle(userInput);
        const ref = await addDoc(collection(db, 'users', user.uid, 'sessions'), {
          title: initialTitle,
          createdAt: serverTimestamp(),
          isPinned: false
        });
        setCurrentSessionId(ref.id);
        activeSessionId = ref.id;
      } catch (error) {
        console.error("Error creating session:", error);
        setError("Failed to create new chat session");
        return;
      }
    }

    getAnalysis(userInput, activeSessionId, isNewSession);
    setUserInput('');
  };

  const UserInitial = ({ user }) => {
    if (user.photoURL) return <img src={user.photoURL} alt="Profile" className="profile-btn-icon" />;
    const initial = user.displayName ? user.displayName[0] : user.email[0];
    return <div className="profile-btn-icon">{initial.toUpperCase()}</div>;
  };

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
  });

  if (!authReady) return <div className="full-screen-center"><LoadingSpinner /></div>;
  if (!user) return <div className="full-screen-center"><LoginScreen /></div>;

  return (
      <div className="app-container">
        <aside
            className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
            onMouseEnter={() => setIsSidebarOpen(true)}
            onMouseLeave={() => setIsSidebarOpen(false)}
        >
          <div className="sidebar-header">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="sidebar-icon-btn menu-btn" title="Toggle Menu">
              <Menu size={20} />
            </button>
          </div>
          <button onClick={createNewSession} className="new-chat-btn">
            <Edit size={18} />
            <span>New chat</span>
          </button>
          <div className="sessions-list custom-scrollbar">
            <p className="sessions-title">Recent</p>
            {sortedSessions.length === 0 ? (
                <p className="no-sessions">Start a new conversation!</p>
            ) : (
                sortedSessions.map(session => (
                    <div key={session.id} onClick={() => renamingSessionId !== session.id && setCurrentSessionId(session.id)} className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}>
                      {session.isPinned && <Pin size={14} className="pin-icon" />}
                      {renamingSessionId === session.id ? (
                          <form onSubmit={(e) => handleRenameSubmit(e, session.id)} className="rename-form">
                            <input
                                type="text"
                                value={newSessionTitle}
                                onChange={(e) => setNewSessionTitle(e.target.value)}
                                onBlur={(e) => handleRenameSubmit(e, session.id)}
                                autoFocus
                                className="rename-input"
                            />
                          </form>
                      ) : (
                          <span className="session-item-title">{session.title}</span>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); setActiveOptions(activeOptions === session.id ? null : session.id)}} className="session-options-btn">
                        <MoreVertical size={16} />
                      </button>

                      {activeOptions === session.id && (
                          <div className="session-options-menu" ref={optionsMenuRef}>
                            <button onClick={(e) => {e.stopPropagation(); handleShare(session.id)}} className="session-options-item"><Share2 size={14}/><span>Share</span></button>
                            <button onClick={(e) => {e.stopPropagation(); handleTogglePin(session)}} className="session-options-item"><Pin size={14}/><span>{session.isPinned ? 'Unpin' : 'Pin'}</span></button>
                            <button onClick={(e) => {e.stopPropagation(); handleRename(session)}} className="session-options-item"><Edit size={14}/><span>Rename</span></button>
                            <button onClick={(e) => {e.stopPropagation(); deleteSession(session.id)}} className="session-options-item delete"><Trash2 size={14}/><span>Delete</span></button>
                          </div>
                      )}
                    </div>
                ))
            )}
          </div>

        </aside>

        <main className="main-content">
          <header className="main-header">
            <div className="header-title">Geopolitical Analyzer</div>
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="profile-btn" title="Account">
                <UserInitial user={user} />
              </button>
              {isProfileMenuOpen && (
                  <div className="profile-menu">
                    <div className="profile-menu-info">
                      <p className="username">{user.displayName || 'User'}</p>
                      <p className="email">{user.email}</p>
                    </div>
                    <button onClick={() => signOut(auth)} className="profile-menu-btn logout-btn">
                      <LogOut size={16} /><span>Logout</span>
                    </button>
                  </div>
              )}
            </div>
          </header>

          <div className="chat-area">
            {currentSessionId ? (
                <div className="chat-window custom-scrollbar">
                  {messages.length === 0 && !isLoading ? (
                      <div className="welcome-screen">
                        <div className="welcome-logo-container">
                          <BrainCircuit size={60} className="welcome-logo-icon"/>
                          <h1>Conversation started</h1>
                          <p>Ask me anything about geopolitics to get started.</p>
                        </div>
                      </div>
                  ) : (
                      <>
                        {messages.map((msg, index) => (
                            <Message
                                key={index}
                                sender={msg.sender}
                                text={msg.text}
                                sources={msg.sources} // Pass sources to Message component
                            />
                        ))}
                        {isLoading && <Message sender="bot" text={null} />}
                      </>
                  )}
                  <div ref={chatEndRef} />
                </div>
            ) : (
                <div className="welcome-screen">
                  <div className="welcome-logo-container">
                    <BrainCircuit size={60} className="welcome-logo-icon"/>
                    <h1>How can I help you today?</h1>
                    <p>Select a chat from the sidebar or start a new one</p>
                  </div>
                </div>
            )}
          </div>

          <div className="chat-form-container">
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit} className="chat-form">
              <textarea
                  ref={textareaRef}
                  value={userInput}
                  onChange={e => {setUserInput(e.target.value); setError('')}}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder="Enter a prompt here"
                  className="chat-input"
                  disabled={isLoading}
                  rows={1}
              />
              <button type="submit" className="send-button" disabled={isLoading || !userInput.trim()}>
                {isLoading ? <LoadingSpinner /> : <Send size={20} />}
              </button>
            </form>
            <p className="disclaimer">
              Geopolitical Analyzer may display inaccurate info, including about people, so double-check its responses.
            </p>
          </div>
        </main>
      </div>
  );
}

function App() {
  if (initializationError) {
    return (
        <div className="error-screen">
          <h1>Application Error</h1>
          <p>{initializationError}</p>
          <p className="error-hint">
            This is likely due to an issue with your <strong>.env</strong> file. Please ensure the file exists in your project's root directory and that you have <strong>restarted the development server</strong> after creating or changing it.
          </p>
        </div>
    );
  }
  return <ChatApplication />;
}

export default App;