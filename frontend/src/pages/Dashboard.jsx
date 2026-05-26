import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { fetchStats, fetchActivityStats, fetchDifficultStats, fetchTimeStats } from '../utils/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ learned_count: 0, total_count: 0, avg_accuracy: 0 });
  const [activity, setActivity] = useState([]);
  const [difficult, setDifficult] = useState([]);
  const [timeStats, setTimeStats] = useState({ total_seconds: 0, last_session: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchStats(user.id),
        fetchActivityStats(user.id),
        fetchDifficultStats(user.id),
        fetchTimeStats(user.id)
      ]).then(([statsRes, activityRes, difficultRes, timeRes]) => {
        if (statsRes.message === 'success') setStats(statsRes.data);
        if (activityRes.message === 'success') setActivity(activityRes.data);
        if (difficultRes.message === 'success') setDifficult(difficultRes.data);
        if (timeRes.message === 'success') setTimeStats(timeRes.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  // Map activity data to chart format
  const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  
  // Create a 7-day array of activity
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day_index: d.getDay().toString(),
      label: dayNames[d.getDay()],
      date: d.toISOString().split('T')[0]
    };
  });

  const chartLabels = last7Days.map(d => d.label);
  const chartValues = last7Days.map(d => {
    const dayData = activity.find(a => a.day_index === d.day_index || a.date === d.date);
    return dayData ? Math.round(dayData.accuracy) : 0;
  });

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Точність (%)',
        data: chartValues,
        fill: true,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 4,
        tension: 0.4,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: true,
          color: '#f1f5f9',
        },
        ticks: {
          font: { weight: 'bold' },
          callback: (value) => `${value}%`
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { weight: 'bold' }
        }
      }
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0 хв';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}.${Math.round(mins / 6)} год`;
    return `${mins} хв`;
  };

  const formatLastSession = (dateStr) => {
    if (!dateStr) return 'Немає даних';
    const date = new Date(dateStr);
    return date.toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/map" className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Дашборд</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Аналітика вашого прогресу</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Останнє заняття</p>
                <p className="text-sm font-bold text-slate-900">{formatLastSession(timeStats.last_session)}</p>
            </div>
            <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-transform">
                ЗАВАНТАЖИТИ ЗВІТ
            </button>
            <Link to="/profile" className="w-12 h-12 bg-white rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm border border-slate-100">
                <span className="text-xl">👤</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Stat Card 1 */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-white flex flex-col justify-between">
                <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Загальний прогрес</p>
                    <h2 className="text-5xl font-black text-slate-900 mb-2">{stats.learned_count}<span className="text-2xl text-slate-300 ml-2">/ {stats.total_count || '--'}</span></h2>
                    <p className="text-slate-500 font-bold">Жестів вивчено</p>
                </div>
                <div className="mt-8">
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-1000" 
                            style={{ width: `${stats.total_count ? (stats.learned_count / stats.total_count) * 100 : 0}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 text-right">{stats.total_count ? Math.round((stats.learned_count / stats.total_count) * 100) : 0}% ВИКОНАНО</p>
                </div>
            </div>

            {/* Stat Card 2 */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-white">
                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-4">Середня точність</p>
                <h2 className="text-5xl font-black text-slate-900 mb-2">{Math.round(stats.avg_accuracy || 0)}%</h2>
                <p className="text-slate-500 font-bold">За весь час</p>
                <div className="mt-6 flex items-center gap-2 text-green-500 font-black text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    Прогрес зростає
                </div>
            </div>

            {/* Stat Card 3 */}
            <div className="bg-indigo-900 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16"></div>
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">Час у навчанні</p>
                <h2 className="text-5xl font-black mb-2">{formatTime(timeStats.total_seconds).split(' ')[0]}<span className="text-2xl text-indigo-300 ml-2">{formatTime(timeStats.total_seconds).split(' ')[1]}</span></h2>
                <p className="text-indigo-200 font-bold">Загальний час практики</p>
                <div className="mt-6 flex items-center gap-2 text-indigo-300 font-black text-sm uppercase tracking-widest">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span> Ви зараз вчитеся
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-white">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-slate-900">Динаміка успішності</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button className="px-4 py-2 bg-white rounded-lg text-xs font-black shadow-sm">ОСТАННІ 7 ДНІВ</button>
                </div>
            </div>
            <div className="h-[400px]">
                <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Difficult Gestures */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200 border border-white">
            <h3 className="text-xl font-black text-slate-900 mb-8">Потребує уваги</h3>
            <div className="space-y-6">
              {difficult.length > 0 ? difficult.map((item) => (
                <div key={item.character} className={`flex items-center p-5 ${item.accuracy < 50 ? 'bg-rose-50' : 'bg-orange-50'} rounded-[2rem] border border-white shadow-sm hover:scale-[1.02] transition-transform`}>
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl font-black text-slate-900 shadow-sm mr-6 border-b-4 border-slate-100">
                    {item.character}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-black text-slate-900 text-lg">{Math.round(item.accuracy)}%</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${item.accuracy < 50 ? 'text-rose-600' : 'text-orange-600'}`}>
                        {item.accuracy < 50 ? 'Потрібна практика' : 'Майже добре'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-400">{item.attempts} спроб всього</p>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-[2rem]">
                    Поки немає даних для аналізу
                </div>
              )}
            </div>
            {difficult.length > 0 && (
                <div className="mt-10 p-6 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-100">
                    <p className="text-xs font-bold text-indigo-900 leading-relaxed">
                        <span className="block font-black mb-1 uppercase tracking-widest">Порада:</span>
                        У вас є труднощі із жестом "{difficult[0].character}". Спробуйте потренувати його перед дзеркалом.
                    </p>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};


export default Dashboard;
