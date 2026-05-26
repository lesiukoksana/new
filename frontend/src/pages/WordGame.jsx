import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GestureRecognizer from '../components/GestureRecognizer';
import { WordBuildingGame } from '../utils/wordBuildingGame';

const WordGame = () => {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState('easy');
  const [gameManager, setGameManager] = useState(new WordBuildingGame('easy'));
  const [uiState, setUiState] = useState(gameManager.getUIState());
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Latin mapping for video filenames (matching server.js)
  const charMap = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye',
    'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Yj', 'К': 'K', 'Л': 'L',
    'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ь': 'Soft',
    'Ю': 'Yu', 'Я': 'Ya'
  };

  // Refs for performance timing and state tracking
  const lastStateUpdate = useRef(0);

  const handleDifficultyChange = (newDiff) => {
    setDifficulty(newDiff);
    const newManager = new WordBuildingGame(newDiff);
    setGameManager(newManager);
    setUiState(newManager.getUIState());
    setShowConfetti(false);
  };

  const onGestureResults = useCallback((results) => {
    // Check game state from the manager directly to avoid stale closures if not careful,
    // but here gameManager is a constant ref-like state.
    if (gameManager.gameState !== 'PLAYING') return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const newState = gameManager.updateGame(landmarks);
      
      // Throttling UI updates to 10 FPS to reduce React overhead, 
      // while keeping AI processing at max speed.
      const now = Date.now();
      if (now - lastStateUpdate.current > 100 || newState.triggerConfetti || newState.gameState !== 'PLAYING') {
        setUiState(newState);
        lastStateUpdate.current = now;

        if (newState.triggerConfetti) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        }
      }
    }
  }, [gameManager]);

  const handleStart = () => {
    gameManager.startNextWord();
    setUiState(gameManager.getUIState());
    setShowConfetti(false);
  };

  const targetLetter = uiState.currentPrompt.split(': ')[1] || '';
  const videoUrl = targetLetter ? `/videos/video${charMap[targetLetter] || targetLetter}.mp4` : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
            <button onClick={() => navigate('/map')} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
                <h1 className="text-xl font-black text-indigo-900">Гра: Збери слово</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Розвиток навичок дактилю</p>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 flex flex-col items-center justify-center">
        <div className="w-full flex flex-col lg:flex-row gap-12 items-center justify-center">
            {/* Left Side: Camera & Interaction */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                <div className="relative rounded-[3rem] overflow-hidden shadow-2xl bg-slate-900 aspect-video group border-[12px] border-white shadow-indigo-100/50">
                    <GestureRecognizer onResults={onGestureResults} />
                    
                    {/* Overlay UI */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-white/50 max-w-md">
                            <p className="text-indigo-900 font-black text-lg tracking-tight leading-tight">
                                {uiState.feedbackMessage}
                            </p>
                        </div>
                    </div>

                    {/* Game State Overlays */}
                    {uiState.gameState === 'IDLE' && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-20">
                            <button 
                                onClick={handleStart}
                                className="bg-white text-indigo-600 px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all"
                            >
                                СТАРТ
                            </button>
                        </div>
                    )}

                    {uiState.gameState === 'COMPLETED' && (
                        <div className="absolute inset-0 bg-green-500/20 backdrop-blur-md flex flex-col items-center justify-center z-20 animate-fade-in">
                            <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center max-w-sm">
                                <div className="text-6xl mb-4">🏆</div>
                                <h2 className="text-3xl font-black text-slate-900 mb-2">Перемога!</h2>
                                <p className="text-slate-500 font-bold mb-8">Ви успішно зібрали слово!</p>
                                <button 
                                    onClick={handleStart}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all"
                                >
                                    НАСТУПНЕ СЛОВО
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side: Word Display & Progress */}
            <div className="w-full lg:w-1/3 flex flex-col gap-8">
                <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center">
                    <div className="flex justify-center gap-2 mb-6">
                        {['easy', 'medium', 'hard'].map((level) => (
                            <button
                                key={level}
                                onClick={() => handleDifficultyChange(level)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    difficulty === level 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                {level === 'easy' ? 'Легко' : level === 'medium' ? 'Середньо' : 'Складно'}
                            </button>
                        ))}
                    </div>
                    <span className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-6 block">Ваше завдання</span>
                    <div className="flex justify-center gap-4 mb-8">
                        {uiState.wordDisplay.split(' ').map((char, i) => (
                            <div 
                                key={i} 
                                className={`w-16 h-20 rounded-2xl flex items-center justify-center text-4xl font-black border-b-8 transition-all duration-500 ${
                                    char === '_' 
                                    ? 'bg-slate-50 border-slate-200 text-slate-300' 
                                    : 'bg-indigo-50 border-indigo-500 text-indigo-600'
                                }`}
                            >
                                {char}
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-slate-100 w-full mb-8"></div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{uiState.currentPrompt}</h3>
                    <p className="text-slate-500 font-medium">Покажіть жест відповідної літери, щоб відкрити її в слові.</p>
                </div>

                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16"></div>
                    <h4 className="font-black text-sm uppercase tracking-widest mb-4">Словниковий запас</h4>
                    <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                        Гра допомагає автоматизувати навичку розпізнавання жестів та складання їх у слова.
                    </p>
                </div>
            </div>
        </div>
      </main>

      {/* Confetti Effect Simulation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
            {[...Array(50)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute w-3 h-3 rounded-sm animate-confetti"
                    style={{
                        backgroundColor: ['#6366f1', '#fbbf24', '#22c55e', '#ef4444', '#06b6d4'][i % 5],
                        left: `${Math.random() * 100}%`,
                        top: `-5%`,
                        animationDelay: `${Math.random() * 3}s`,
                        transform: `rotate(${Math.random() * 360}deg)`
                    }}
                ></div>
            ))}
        </div>
      )}

      <style>{`
        @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
            animation: confetti 4s ease-out infinite;
        }
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default WordGame;
