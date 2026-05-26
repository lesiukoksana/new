import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GestureRecognizer from '../components/GestureRecognizer';
import { checkGesture } from '../utils/uslLogic';
import { fetchGesture, createSession, logAttempt, fetchLetters } from '../utils/api';
import { useAuth } from '../utils/AuthContext';

const LearningModule = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState('instruction');
  const [gesture, setGesture] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [isSuccess, setIsSuccess] = useState(false);
  const [nextLetterId, setNextLetterId] = useState(null);
  
  // Optimization State
  const [realtimeFeedback, setRealtimeFeedback] = useState('Приготуйтеся...');
  const [holdFrames, setHoldFrames] = useState(0); 
  
  // Refs for Performance, Timing and Motion
  const pendingFeedback = useRef('');
  const feedbackPersistCount = useRef(0);
  const lastFrameTime = useRef(0);
  const historyBuffer = useRef([]); // Stores { x, y, time } for dynamic movement tracking
  const MAX_HOLD = 5000; // 5 seconds target

  useEffect(() => {
    lastFrameTime.current = performance.now();
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const gestureResult = await fetchGesture(id);
        if (gestureResult.message === 'success') setGesture(gestureResult.data);

        // Find next letter for "Next" button logic
        try {
          const lettersRes = await fetchLetters(user.id);
          if (lettersRes.message === 'success') {
            const sorted = lettersRes.data;
            const currentIndex = sorted.findIndex(g => g.id === parseInt(id));
            if (currentIndex !== -1 && currentIndex < sorted.length - 1) {
              setNextLetterId(sorted[currentIndex + 1].id);
            }
          }
        } catch { console.warn('Could not fetch letters for navigation'); }

        try {
          const sessionResult = await createSession(user.id);
          if (sessionResult.message === 'success') setSessionId(sessionResult.session_id);
        } catch {
          console.warn('Backend offline - running in local mode');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Init error:', err);
        setLoading(false);
      }
    };
    init();
  }, [id, user]);

  useEffect(() => {
    let timer;
    if (step === 'countdown' && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (step === 'countdown' && countdown === 0) {
      setStep('practice');
      lastFrameTime.current = performance.now(); // Reset timer when practice starts
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSuccess = async (confidence = 0.95) => {
    if (!gesture || isSuccess) return;
    
    // Set success state immediately for UX
    setIsSuccess(true);
    setRealtimeFeedback('Успіх! Жест розпізнано.');

    // Attempt to log to backend if available
    if (sessionId) {
      try {
        await logAttempt(sessionId, gesture.id, true, confidence);
      } catch (err) { console.error('Log error:', err); }
    }
  };

  const handleNextLetter = () => {
    if (nextLetterId) {
      navigate(`/learn/${nextLetterId}`);
      window.location.reload(); // Reset state and camera
    } else {
      navigate('/map');
    }
  };

  const onGestureResults = useCallback((results) => {
    if (step !== 'practice' || isSuccess || !gesture) return;

    const now = performance.now();
    const deltaTime = now - lastFrameTime.current;
    lastFrameTime.current = now;

    // Safety check: if frame rate is extremely low, don't jump too much
    const effectiveDelta = Math.min(deltaTime, 500); 

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Update history buffer for dynamic motion (Ring Tip is more reliable for 'И'/'Й' pose)
      const motionLandmark = landmarks[16];
      historyBuffer.current.push({ x: motionLandmark.x, y: motionLandmark.y, time: now });
      if (historyBuffer.current.length > 20) historyBuffer.current.shift();

      const result = checkGesture(landmarks, gesture.character, historyBuffer.current);
      
      // If a dynamic gesture is triggered, clear the buffer to prevent double-triggering
      if (result.isCorrect && result.isDynamic) {
        historyBuffer.current = [];
      }
      
      // Update feedback with small debounce
      if (result.feedback !== pendingFeedback.current) {
        pendingFeedback.current = result.feedback;
        feedbackPersistCount.current = 0;
      } else {
        feedbackPersistCount.current++;
        if (feedbackPersistCount.current >= 2) {
          setRealtimeFeedback(result.feedback);
        }
      }

      // Logic: hold for real-time seconds
      if (result.score >= 0.7) { 
        setHoldFrames(prev => {
          const next = prev + effectiveDelta;
          if (next >= MAX_HOLD) {
            handleSuccess(result.score);
            return 0;
          }
          return next;
        });
      } else {
        // Resilient hold: decay 2x faster than it grows, instead of instant reset
        setHoldFrames(prev => Math.max(0, prev - (effectiveDelta * 2)));
      }
    } else {
      // If no hand is detected, progress decays
      setHoldFrames(prev => Math.max(0, prev - (effectiveDelta * 2)));
      setRealtimeFeedback('Покажіть руку в камеру');
    }
  }, [step, isSuccess, gesture, handleSuccess]);


  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  );
  
  if (!gesture) return <div className="p-8 text-center text-red-500 font-bold">Жест не знайдено</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
            <button onClick={() => navigate('/map')} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
                <h1 className="text-xl font-black text-indigo-900">Урок: Літера "{gesture.character}"</h1>
                <div className="flex items-center gap-2">
                    {/* <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> */}
                    {/* <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Аналіз Активний</p> */}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Прогрес уроку</p>
                <div className="w-48 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: isSuccess ? '100%' : '50%' }}></div>
                </div>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 flex flex-col items-center justify-center">
        {step === 'instruction' ? (
          <div className="w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row">
            <div className="md:w-2/3 bg-black aspect-video flex items-center justify-center">
                <video src={gesture.video_url} autoPlay muted loop className="w-full h-full object-contain" />
            </div>
            <div className="md:w-1/3 p-12 flex flex-col justify-center">
                <span className="text-indigo-600 font-black text-sm uppercase tracking-[0.2em] mb-4">Інструкція</span>
                <h2 className="text-4xl font-black mb-6 leading-tight">Уважно подивіться, як показувати літеру "{gesture.character}"</h2>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                    Коли будете готові, натисніть кнопку нижче. У вас буде 3 секунди, щоб підготувати руку перед камерою.
                </p>
                <button 
                    onClick={() => setStep('countdown')} 
                    className="bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    Я ГОТОВИЙ ПРАКТИКУВАТИСЯ
                </button>
            </div>
          </div>
        ) : step === 'countdown' ? (
          <div className="flex flex-col items-center">
            <div className="text-[12rem] font-black text-indigo-600 animate-bounce leading-none mb-8">{countdown}</div>
            <p className="text-2xl font-black text-slate-400 uppercase tracking-[0.3em]">Приготуйте руку...</p>
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-12 items-start justify-center">
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                <div className="relative group">
                    <GestureRecognizer onResults={onGestureResults} />
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white/50">
                            <p className="text-indigo-900 font-black text-lg tracking-tight">{realtimeFeedback}</p>
                        </div>
                        {holdFrames > 0 && (
                            <div className="bg-green-500 text-white px-5 py-2 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 animate-pulse">
                                <span className="w-2 h-2 bg-white rounded-full"></span> УТРИМУЙТЕ!
                            </div>
                        )}
                    </div>
                    {holdFrames > 0 && (
                        <div className="absolute bottom-8 right-8 w-20 h-20">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="transparent" />
                                <circle 
                                    cx="40" cy="40" r="34" stroke="#22c55e" strokeWidth="8" fill="transparent"
                                    strokeDasharray={213.6}
                                    strokeDashoffset={213.6 - (holdFrames / MAX_HOLD) * 213.6}
                                    className="transition-all duration-200"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white font-black text-xs">{Math.round((holdFrames / MAX_HOLD) * 100)}%</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-6 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-indigo-900 text-sm font-bold">
                        Підказка: Тримайте руку на відстані 50-70 см від камери так, щоб було видно зап'ястя.
                    </p>
                </div>
            </div>

            <div className="w-full lg:w-1/3 flex flex-col gap-8">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Еталонний жест</h3>
                        <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Відео-довідка</span>
                    </div>
                    <div className="aspect-video bg-black">
                        <video src={gesture.video_url} autoPlay muted loop className="w-full h-full object-contain" />
                    </div>
                    <div className="p-8">
                        <h4 className="text-5xl font-black text-indigo-900 mb-4 text-center">"{gesture.character}"</h4>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed text-center">
                            Повторюйте рухи за інструктором на відео. Наша нейромережа в реальному часі оцінює вашу точність.
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setStep('instruction')}
                    className="w-full py-5 border-4 border-slate-200 text-slate-400 rounded-3xl font-black uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-400 transition-all"
                >
                    Повернутися до опису
                </button>
            </div>
          </div>
        )}
      </main>

      {/* Success Modal */}
      {isSuccess && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-fade-in">
          <div className="bg-white rounded-[4rem] p-16 max-w-xl w-full shadow-[0_30px_100px_rgba(0,0,0,0.3)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-10 shadow-inner">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                    <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" d="M5 13l4 4L19 7" /></svg>
                </div>
            </div>
            <h2 className="text-5xl font-black text-slate-900 mb-4">Чудова робота!</h2>
            <p className="text-slate-500 font-bold text-xl mb-12">Ви успішно засвоїли літеру <span className="text-indigo-600">"{gesture.character}"</span></p>
            
            <div className="flex flex-col gap-4">
                <button 
                    onClick={handleNextLetter} 
                    className="w-full py-6 bg-indigo-600 text-white font-black text-xl rounded-3xl shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
                >
                    {nextLetterId ? 'Наступна літера' : 'До карти уроків'}
                </button>
                <button 
                    onClick={() => window.location.reload()} 
                    className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                    Спробувати ще раз
                </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};


export default LearningModule;
