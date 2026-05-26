import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/map" className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-xl">👋</span>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight text-indigo-900">SignAcademy</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Профіль користувача</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/map" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Карта</Link>
            <Link to="/dashboard" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">Дашборд</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200 border border-white overflow-hidden">
          <div className="h-32 bg-indigo-600 relative">
            <div className="absolute -bottom-12 left-12 w-24 h-24 bg-yellow-400 rounded-3xl flex items-center justify-center text-4xl border-4 border-white shadow-lg">
              👤
            </div>
          </div>
          
          <div className="pt-16 pb-12 px-12">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900">{user.username}</h2>
                <p className="text-slate-500 font-bold">{user.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-sm hover:bg-red-100 transition-all border border-red-100"
              >
                ВИЙТИ З АКАУНТУ
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Статус навчання</p>
                <p className="text-lg font-bold text-slate-900 mb-4">Студент (Student)</p>
                <div className="flex items-center gap-2 text-indigo-600 font-black text-sm">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                  Активний користувач
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Дата реєстрації</p>
                <p className="text-lg font-bold text-slate-900 mb-4">Травень 2026</p>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                  🗓️ На платформі 1 день
                </div>
              </div>
            </div>

            <div className="mt-12">
              <h3 className="text-xl font-black text-slate-900 mb-6">Останні досягнення</h3>
              <div className="flex flex-wrap gap-4">
                <div className="px-6 py-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex items-center gap-4">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="text-xs font-black text-yellow-700 uppercase tracking-widest">Перші кроки</p>
                    <p className="text-sm font-bold text-slate-900">Зареєстровано акаунт</p>
                  </div>
                </div>
                <div className="px-6 py-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4 opacity-50">
                  <span className="text-2xl">🎓</span>
                  <div>
                    <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Відмінник</p>
                    <p className="text-sm font-bold text-slate-900">Пройдіть 5 літер без помилок</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
