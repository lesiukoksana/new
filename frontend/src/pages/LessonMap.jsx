import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

import { fetchModules } from '../utils/api';

const LessonMap = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchModules(user.id)
        .then(result => {
          if (result.message === 'success') {
            setModules(result.data);
          } else {
            setError(result.error);
          }
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [user]);

  const totalGestures = modules.reduce((sum, m) => sum + m.gestures.length, 0);
  const learnedGestures = modules.reduce((sum, m) => sum + m.gestures.filter(g => g.is_done).length, 0);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-yellow-400 mb-4"></div>
        <p className="text-slate-900 font-bold animate-pulse">Завантаження карти знань...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl text-center border-2 border-red-100 max-w-sm">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <p className="text-red-600 font-black text-xl mb-2">Помилка завантаження</p>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
          Спробувати ще раз
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Desktop Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <span className="text-xl">👋</span>
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight text-indigo-900">SignAcademy</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ukrainian Sign Language</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end">
                <div className="text-xs font-bold text-slate-500 mb-1">ВАШ ПРОГРЕС</div>
                <div className="flex items-center gap-3">
                    <div className="w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-1000" 
                            style={{ width: `${(learnedGestures / totalGestures) * 100}%` }}
                        ></div>
                    </div>
                    <span className="text-sm font-black text-indigo-600">{learnedGestures}/{totalGestures}</span>
                </div>
            </div>
            <Link to="/dashboard" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Дашборд
            </Link>
            <Link to="/profile" className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors border border-indigo-100">
              <span className="text-lg">👤</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
            <h2 className="text-4xl font-black text-slate-900 mb-2">Карта навчання</h2>
            <p className="text-slate-500 font-medium">Пройдіть усі модулі, щоб вільно спілкуватися мовою жестів.</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 gap-12">
          {modules.map((module, mIdx) => (
            <section key={module.id} className="relative">
              {/* Module Header */}
              <div className="flex items-center gap-6 mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl border-2 border-indigo-200">
                    {mIdx + 1}
                </div>
                <div>
                    <h3 className="text-2xl font-black text-slate-900">{module.title}</h3>
                    <p className="text-slate-500 text-sm font-bold">{module.description}</p>
                </div>
                <div className="h-px bg-slate-200 flex-1 ml-4"></div>
              </div>

              {/* Letters Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
                {module.gestures.map((gesture) => (
                  <Link 
                    to={`/learn/${gesture.id}`} 
                    key={gesture.id}
                    className={`
                      relative aspect-square rounded-[2rem] flex flex-col items-center justify-center 
                      transition-all duration-300 transform hover:-translate-y-2 group
                      ${gesture.is_done 
                        ? 'bg-white border-b-[8px] border-indigo-600 shadow-xl shadow-indigo-100' 
                        : 'bg-slate-100 border-b-[8px] border-slate-200 hover:bg-white hover:border-indigo-400 hover:shadow-2xl'}
                    `}
                  >
                    <div className={`
                        text-5xl font-black mb-1
                        ${gesture.is_done ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400'}
                    `}>
                        {gesture.character}
                    </div>
                    
                    <div className={`
                        text-[10px] font-black uppercase tracking-widest
                        ${gesture.is_done ? 'text-indigo-300' : 'text-slate-300'}
                    `}>
                        {gesture.is_done ? 'Вивчено' : 'Почати'}
                    </div>

                    {/* Completion Status */}
                    {gesture.is_done && (
                      <div className="absolute top-4 right-4 bg-green-500 p-1.5 rounded-full shadow-lg border-2 border-white">
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Hover Glow */}
                    <div className="absolute inset-0 rounded-[2rem] ring-4 ring-indigo-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer/Summary Card */}
        <div className="mt-20 bg-indigo-900 rounded-[3rem] p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 opacity-10 blur-3xl rounded-full -mr-32 -mt-32"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                <div>
                    <h2 className="text-3xl font-black mb-2">Готові до виклику?</h2>
                    <p className="text-indigo-200 font-medium max-w-md">Спробуйте зібрати слова за допомогою вивчених жестів у нашій новій грі.</p>
                </div>
                <Link to="/game" className="bg-yellow-400 text-indigo-900 px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl shadow-yellow-400/20">
                    ГРАТИ "ЗБЕРИ СЛОВО"
                </Link>
            </div>
        </div>
      </main>
    </div>
  );
};

export default LessonMap;
