import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { create } from 'zustand';
import axios from 'axios';

const useStore = create((set) => ({
  token: localStorage.getItem('token'),
  character: null,
  messages: [],
  isTyping: false,
  setToken: (token) => { localStorage.setItem('token', token); set({ token }); },
  setCharacter: (character) => set({ character }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTyping: (isTyping) => set({ isTyping }),
  logout: () => { localStorage.removeItem('token'); set({ token: null, character: null, messages: [] }); }
}));

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function Login() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isRegister, setIsRegister] = React.useState(false);
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { setToken } = useStore();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { email, password, name } : { email, password };
      const response = await api.post(endpoint, payload);
      setToken(response.data.access_token);
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px'}}>
      <div style={{background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px'}}>
        <h1 style={{textAlign: 'center'}}>💕 AI Companion</h1>
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          {isRegister && <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{padding: '15px', border: '2px solid #e0e0e0', borderRadius: '10px'}} required />}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{padding: '15px', border: '2px solid #e0e0e0', borderRadius: '10px'}} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{padding: '15px', border: '2px solid #e0e0e0', borderRadius: '10px'}} required />
          {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}
          <button type="submit" style={{padding: '15px', background: '#007AFF', color: 'white', border: 'none', borderRadius: '10px'}} disabled={loading}>
            {loading ? 'Loading...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
        <p style={{textAlign: 'center', marginTop: '20px'}}>
          <button onClick={() => setIsRegister(!isRegister)} style={{background: 'none', border: 'none', color: '#007AFF'}}>
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}

function CharacterList() {
  const [characters, setCharacters] = React.useState([]);
  const { setCharacter, logout } = useStore();
  
  React.useEffect(() => {
    api.get('/characters/').then(res => setCharacters(res.data)).catch(console.error);
  }, []);
  
  return (
    <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '30px'}}>
        <h1>My Companions</h1>
        <button onClick={logout} style={{padding: '8px 16px', background: '#ff3b30', color: 'white', border: 'none', borderRadius: '8px'}}>Logout</button>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px'}}>
        {characters.map((char) => (
          <div key={char.id} style={{background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center'}} onClick={() => { setCharacter(char); window.location.href = '/chat'; }}>
            <div style={{width: '80px', height: '80px', borderRadius: '50%', background: '#007AFF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 15px'}}>{char.name[0]}</div>
            <h3>{char.name}</h3>
            <p>{char.occupation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chat() {
  const [input, setInput] = React.useState('');
  const { character, messages, addMessage, isTyping, setTyping } = useStore();
  
  React.useEffect(() => {
    if (!character) window.location.href = '/';
  }, [character]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    addMessage({ id: Date.now(), content: input, sender: 'user', created_at: new Date().toISOString() });
    setInput('');
    setTyping(true);
    try {
      const response = await api.post('/chat/send', { message: input, character_id: character.id });
      addMessage({ id: response.data.message.id, content: response.data.message.content, sender: 'character', created_at: response.data.message.created_at });
    } catch (err) {
      addMessage({ id: Date.now() + 1, content: 'Error occurred', sender: 'system', created_at: new Date().toISOString() });
    } finally {
      setTyping(false);
    }
  };
  
  if (!character) return null;
  
  return (
    <div style={{height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5'}}>
      <div style={{background: 'white', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'}}>
        <h2>{character.name}</h2>
        <p>{isTyping ? 'typing...' : 'online'}</p>
      </div>
      <div style={{flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px'}}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            maxWidth: '70%', padding: '12px 16px', borderRadius: '20px',
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            background: msg.sender === 'user' ? '#007AFF' : 'white',
            color: msg.sender === 'user' ? 'white' : '#333'
          }}>
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <div style={{background: 'white', padding: '15px', display: 'flex', gap: '10px'}}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." style={{flex: 1, padding: '12px', border: '2px solid #e0e0e0', borderRadius: '25px'}} />
        <button onClick={sendMessage} style={{padding: '12px 24px', background: '#007AFF', color: 'white', border: 'none', borderRadius: '25px'}}>Send</button>
      </div>
    </div>
  );
}

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