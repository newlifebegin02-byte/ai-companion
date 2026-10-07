import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import axios from 'axios';

// ============ STATE MANAGEMENT ============
const useStore = create((set) => ({
  token: localStorage.getItem('token'),
  character: null,
  messages: [],
  isTyping: false,
  conversations: [],
  
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  
  setCharacter: (character) => set({ character, messages: [] }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setTyping: (isTyping) => set({ isTyping }),
  setConversations: (conversations) => set({ conversations }),
  
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, character: null, messages: [], conversations: [] });
  }
}));

// API Client
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ============ COMPONENTS ============

// Login Component
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { email, password, name } : { email, password };
      const response = await api.post(endpoint, payload);
      setToken(response.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <h1 style={styles.title}>💕 AI Companion</h1>
        <p style={styles.subtitle}>Your emotional support partner</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          
          {error && <p style={styles.error}>{error}</p>}
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Loading...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
        
        <p style={styles.switchText}>
          {isRegister ? 'Already have account?' : "Don't have account?"}{' '}
          <button 
            onClick={() => setIsRegister(!isRegister)}
            style={styles.linkButton}
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

// Character List Component
function CharacterList() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { setCharacter, logout } = useStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    loadCharacters();
  }, []);
  
  const loadCharacters = async () => {
    try {
      const response = await api.get('/characters/');
      setCharacters(response.data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load characters');
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectCharacter = (char) => {
    setCharacter(char);
    navigate('/chat');
  };
  
  if (loading) return (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <p>Loading companions...</p>
    </div>
  );
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>My Companions</h1>
        <button onClick={logout} style={styles.logoutButton}>Logout</button>
      </div>
      
      {error && <p style={styles.error}>{error}</p>}
      
      <div style={styles.characterGrid}>
        {characters.map((char) => (
          <div 
            key={char.id} 
            style={styles.characterCard}
            onClick={() => handleSelectCharacter(char)}
          >
            <div style={styles.avatar}>
              {char.name[0].toUpperCase()}
            </div>
            <h3 style={styles.characterName}>{char.name}</h3>
            <p style={styles.characterOccupation}>{char.occupation}</p>
            <div style={styles.stats}>
              <span style={styles.stat}>❤️ {Math.round(char.affection_level * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
      
      {characters.length === 0 && !error && (
        <div style={styles.empty}>
          <p>No companions yet.</p>
          <p>Create one via API docs!</p>
        </div>
      )}
    </div>
  );
}

// Chat Component
function Chat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { character, messages, addMessage, isTyping, setTyping, logout } = useStore();
  
  useEffect(() => {
    if (!character) {
      navigate('/');
    }
  }, [character, navigate]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const sendMessage = async () => {
    if (!input.trim() || !character) return;
    
    const userMessage = {
      id: Date.now(),
      content: input,
      sender: 'user',
      created_at: new Date().toISOString()
    };
    
    addMessage(userMessage);
    setInput('');
    setTyping(true);
    
    try {
      const response = await api.post('/chat/send', {
        message: input,
        character_id: character.id
      });
      
      addMessage({
        id: response.data.message.id,
        content: response.data.message.content,
        sender: 'character',
        created_at: response.data.message.created_at
      });
    } catch (err) {
      console.error(err);
      addMessage({
        id: Date.now() + 1,
        content: 'Sorry, something went wrong. Please try again.',
        sender: 'system',
        created_at: new Date().toISOString()
      });
    } finally {
      setTyping(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  if (!character) return null;
  
  return (
    <div style={styles.chatContainer}>
      <div style={styles.chatHeader}>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.headerInfo}>
          <h2 style={styles.headerName}>{character.name}</h2>
          <p style={styles.headerStatus}>
            {isTyping ? 'typing...' : 'online'}
          </p>
        </div>
      </div>
      
      <div style={styles.messagesContainer}>
        {messages.length === 0 && (
          <div style={styles.welcomeMessage}>
            <p>👋 Hi! I'm {character.name}.</p>
            <p>Start a conversation!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.sender === 'user' ? styles.userMessage : styles.aiMessage)
            }}
          >
            <p style={styles.messageText}>{msg.content}</p>
            <span style={styles.timestamp}>
              {new Date(msg.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        ))}
        
        {isTyping && (
          <div style={{...styles.message, ...styles.aiMessage}}>
            <div style={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={styles.chatInput}
          disabled={isTyping}
        />
        <button 
          onClick={sendMessage} 
          style={{
            ...styles.sendButton,
            opacity: input.trim() && !isTyping ? 1 : 0.5
          }}
          disabled={!input.trim() || isTyping}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ============ STYLES ============
const styles = {
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  authCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '10px',
    fontSize: '28px'
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '30px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    padding: '15px',
    border: '2px solid #e0e0e0',
    borderRadius: '10px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  button: {
    padding: '15px',
    background: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  error: {
    color: '#ff3b30',
    textAlign: 'center',
    margin: 0,
    fontSize: '14px'
  },
  switchText: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#666'
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#007AFF',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  logoutButton: {
    padding: '10px 20px',
    background: '#ff3b30',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  characterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px'
  },
  characterCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#007AFF',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '0 auto 15px'
  },
  characterName: {
    margin: '0 0 5px 0',
    color: '#333'
  },
  characterOccupation: {
    margin: '0 0 10px 0',
    color: '#666',
    fontSize: '14px'
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px'
  },
  stat: {
    fontSize: '14px',
    color: '#888'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    color: '#666'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  chatContainer: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5'
  },
  chatHeader: {
    background: 'white',
    padding: '15px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#007AFF',
    padding: '8px 12px'
  },
  headerInfo: {
    flex: 1
  },
  headerName: {
    margin: 0,
    color: '#333'
  },
  headerStatus: {
    margin: 0,
    fontSize: '12px',
    color: '#4CD964'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  welcomeMessage: {
    textAlign: 'center',
    color: '#999',
    marginTop: '50px'
  },
  message: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: '20px',
    position: 'relative',
    animation: 'fadeIn 0.3s ease'
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: '#007AFF',
    color: 'white',
    borderBottomRightRadius: '5px'
  },
  aiMessage: {
    alignSelf: 'flex-start',
    background: 'white',
    color: '#333',
    borderBottomLeftRadius: '5px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  messageText: {
    margin: 0,
    lineHeight: '1.5',
    wordWrap: 'break-word'
  },
  timestamp: {
    fontSize: '10px',
    opacity: 0.7,
    display: 'block',
    marginTop: '5px',
    textAlign: 'right'
  },
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '5px 0'
  },
  inputContainer: {
    background: 'white',
    padding: '15px 20px',
    display: 'flex',
    gap: '10px',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
  },
  chatInput: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '25px',
    fontSize: '16px',
    outline: 'none'
  },
  sendButton: {
    padding: '12px 24px',
    background: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  }
};

// Add CSS animations
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .characterCard:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  }
`;
document.head.appendChild(styleSheet);

// ============ APP ============
function App() {
  const { token } = useStore();
  
  return (
    <Router>
      <Routes>
        <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <CharacterList /> : <Navigate to="/login" />} />
        <Route path="/chat" element={token ? <Chat /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;