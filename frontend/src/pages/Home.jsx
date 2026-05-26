import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-center text-white font-sans overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-400 opacity-20 blur-3xl rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400 opacity-30 blur-3xl rounded-full animate-pulse"></div>

      <div className="z-10 animate-fade-in-up max-w-4xl">
        <div className="w-40 h-40 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto mb-10 transform rotate-6 hover:rotate-0 transition-transform duration-500">
          <span className="text-7xl">👋</span>
        </div>
        <h1 className="text-7xl font-black tracking-tighter mb-6 leading-none">SignAcademy</h1>
        <p className="text-indigo-100 text-2xl font-bold mb-12 max-w-2xl mx-auto leading-relaxed">
          Ваш інтерактивний шлях до вивчення української жестової мови. Швидко, цікаво та ефективно.
        </p>
        
        {user ? (
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <Link 
                to="/map" 
                className="group bg-yellow-400 text-indigo-900 px-16 py-6 rounded-[2rem] font-black text-2xl shadow-[0_12px_0_#ca8a04] hover:shadow-[0_6px_0_#ca8a04] hover:translate-y-[6px] active:translate-y-[12px] active:shadow-none transition-all uppercase tracking-widest"
            >
                На карту
            </Link>
            <Link 
                to="/profile" 
                className="text-white border-4 border-white/20 hover:border-white/40 px-12 py-6 rounded-[2rem] font-black text-2xl transition-all"
            >
                Профіль
            </Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <Link 
                to="/login" 
                className="group bg-yellow-400 text-indigo-900 px-16 py-6 rounded-[2rem] font-black text-2xl shadow-[0_12px_0_#ca8a04] hover:shadow-[0_6px_0_#ca8a04] hover:translate-y-[6px] active:translate-y-[12px] active:shadow-none transition-all uppercase tracking-widest"
            >
                Увійти
            </Link>
            <Link 
                to="/register" 
                className="text-white border-4 border-white/20 hover:border-white/40 px-12 py-6 rounded-[2rem] font-black text-2xl transition-all"
            >
                Створити акаунт
            </Link>
          </div>
        )}
        
        <div className="mt-20 flex gap-6 justify-center opacity-40">
          <div className="w-4 h-4 bg-white rounded-full"></div>
          <div className="w-4 h-4 bg-white/30 rounded-full"></div>
          <div className="w-4 h-4 bg-white/30 rounded-full"></div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Home;
