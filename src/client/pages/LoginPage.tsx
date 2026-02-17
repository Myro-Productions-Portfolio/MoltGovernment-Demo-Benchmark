import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authContext';

export function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register(username, password, email || undefined);
      }
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-8 py-section">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-semibold text-stone mb-6 text-center">
          {tab === 'login' ? 'Sign In' : 'Create Account'}
        </h1>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-border">
          {(['login', 'register'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 text-sm font-medium uppercase tracking-wide border-b-2 transition-all ${tab === t ? 'text-gold border-gold' : 'text-text-muted border-transparent hover:text-text-secondary'}`}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              placeholder="your_username" required />
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email (optional)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
                placeholder="you@example.com" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50"
              placeholder="••••••••" required minLength={8} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 text-sm font-medium uppercase tracking-wide transition-all disabled:opacity-40">
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {tab === 'register' && (
          <p className="text-xs text-text-muted text-center mt-4">
            First account created automatically becomes admin.
          </p>
        )}
      </div>
    </div>
  );
}
