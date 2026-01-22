import React, { useState } from 'react';
import { Lock, QrCode } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

const LoginScreen = ({ onLogin }) => {
  const [step, setStep] = useState('login'); // login | setup | verify
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState(''); // 2FA Code
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.status === 'setup_required') {
        // Need to set up 2FA
        setUserId(data.userId);
        await initiateSetup(data.userId);
      } else if (data.status === '2fa_required') {
        // Need to verify code
        setUserId(data.userId);
        setStep('verify');
      } else if (data.token) {
        // Regular login (fallback)
        onLogin(data);
      }
    } catch (err) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const initiateSetup = async (uid) => {
    try {
      const res = await fetch(`${API_BASE_URL}/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      const data = await res.json();
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep('setup');
    } catch(err) {
      setError("Failed to start 2FA setup");
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    const endpoint = step === 'setup' ? '/2fa/enable' : '/2fa/verify';
    const body = step === 'setup' 
      ? { userId, secret, token } 
      : { userId, token };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.token) {
        onLogin(data); // Success!
      } else {
        setError("Invalid Code");
      }
    } catch (err) {
      setError("Verification failed");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-100 font-sans text-slate-900">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border border-slate-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
            {step === 'login' ? <Lock className="w-6 h-6 text-indigo-600" /> : <QrCode className="w-6 h-6 text-indigo-600" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Majeng Life</h2>
          <p className="text-sm text-slate-500">
             {step === 'login' ? 'Core Admin System' : step === 'setup' ? 'Setup 2FA' : 'Verify Identity'}
          </p>
        </div>

        {/* STEP 1: LOGIN */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
              <input className="w-full border rounded p-2" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
              <input type="password" className="w-full border rounded p-2" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded text-center">{error}</div>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Checking...' : 'Next'}
            </button>
          </form>
        )}

        {/* STEP 2: SETUP QR (First Time) */}
        {step === 'setup' && (
          <form onSubmit={handleVerify2FA} className="space-y-4 text-center">
            <p className="text-xs text-slate-600">Scan this code with Google Authenticator:</p>
            <div className="flex justify-center my-2">
                <img src={qrCode} alt="Scan this QR" className="border p-2" />
            </div>
            <input className="w-full border rounded p-2 text-center tracking-widest text-lg" placeholder="000000" maxLength={6} value={token} onChange={e => setToken(e.target.value)} required />
            {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded">{error}</div>}
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Enable & Login</button>
          </form>
        )}

        {/* STEP 3: VERIFY (Returning) */}
        {step === 'verify' && (
           <form onSubmit={handleVerify2FA} className="space-y-4">
             <div className="text-center text-sm text-slate-600 mb-4">Enter the 6-digit code from your app.</div>
             <input className="w-full border rounded p-2 text-center tracking-widest text-lg" placeholder="000000" maxLength={6} value={token} onChange={e => setToken(e.target.value)} required />
             {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded">{error}</div>}
             <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Verify</button>
           </form>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;