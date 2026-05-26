import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, login } = useAuth();

  React.useEffect(() => {
    if (user) navigate('/map');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (data.message === 'success') {
        login(data.token, data.user);
        navigate('/map');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-400 opacity-20 blur-3xl rounded-full"></div>
      
      <div className="z-10 w-full max-w-md animate-fade-in-up">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-indigo-900">
          <h2 className="text-4xl font-black tracking-tighter mb-8 text-center uppercase leading-none">Реєстрація</h2>
          
          {error && <div className="bg-red-100 text-red-600 p-4 rounded-2xl mb-6 font-bold text-center">{error}</div>}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-50">Логін</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-lg"
                placeholder="Вигадайте логін"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-50">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-lg"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-black uppercase tracking-widest mb-2 opacity-50">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-indigo-50 border-2 border-transparent focus:border-indigo-600 outline-none transition-all font-bold text-lg"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-yellow-400 text-indigo-900 py-5 rounded-2xl font-black text-xl shadow-[0_8px_0_#ca8a04] hover:shadow-[0_4px_0_#ca8a04] hover:translate-y-[4px] active:translate-y-[8px] active:shadow-none transition-all uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Створення...' : 'Зареєструватися'}
            </button>
          </form>
          
          <p className="mt-8 text-center font-bold opacity-60">
            Вже маєте акаунт? <Link to="/login" className="text-indigo-600 underline">Увійти</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Register;
