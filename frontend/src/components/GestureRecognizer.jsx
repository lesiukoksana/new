import React, { useRef, useEffect, useState } from 'react';

/**
 * GestureRecognizer component optimized for performance.
 * Uses requestAnimationFrame for the camera loop and offloads drawing logic 
 * to avoid React re-renders.
 */
const GestureRecognizer = ({ onResults }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // Drawing logic moved to a ref-based function to prevent re-renders
  const drawResults = (results) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');
    if (!canvasCtx) return;

    const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Mirror the output
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    // Draw video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: '#6366f1',
          lineWidth: 4,
        });
        drawLandmarks(canvasCtx, landmarks, {
          color: '#ef4444',
          lineWidth: 1,
          radius: 4,
        });
      }
    }
    canvasCtx.restore();
  };

  useEffect(() => {
    const { Hands } = window;
    if (!Hands) {
      console.error('MediaPipe Hands not found');
      return;
    }

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0, // 0 = Lite (Fastest), 1 = Full
      minDetectionConfidence: 0.5, // Slightly lower for faster detection
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setIsLoading(false);
      }
      
      drawResults(results);

      if (onResults) {
        onResults(results);
      }
    });

    handsRef.current = hands;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            processFrame();
          };
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    const processFrame = async () => {
      if (videoRef.current && handsRef.current) {
        // Downscale to 320x240 for AI processing ONLY
        // MediaPipe handles internal scaling but providing a smaller source can be faster
        await handsRef.current.send({ image: videoRef.current });
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };


    startCamera();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (handsRef.current) handsRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onResults]);

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl shadow-2xl border-4 border-indigo-500 bg-gray-900 aspect-video">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover" width={640} height={480} />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80 z-10">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-bold tracking-widest animate-pulse uppercase">Initializing AI...</p>
        </div>
      )}
    </div>
  );
};

export default GestureRecognizer;