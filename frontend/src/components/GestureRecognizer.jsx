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
  const onResultsRef = useRef(onResults);
  const [isLoading, setIsLoading] = useState(true);

  // Update the ref whenever onResults changes without triggering useEffect
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

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

    // Draw video frame with proper aspect ratio covering
    const videoWidth = results.image.width;
    const videoHeight = results.image.height;
    const canvasWidth = canvasElement.width;
    const canvasHeight = canvasElement.height;
    
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (videoAspect > canvasAspect) {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * videoAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / videoAspect;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    canvasCtx.drawImage(results.image, offsetX, offsetY, drawWidth, drawHeight);

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
      modelComplexity: 1, 
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setIsLoading(false);
      }
      
      drawResults(results);

      if (onResultsRef.current) {
        onResultsRef.current(results);
      }
    });

    handsRef.current = hands;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
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
      if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (e) {
          console.error('MediaPipe send error:', e);
        }
      }
      
      if (handsRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    startCamera();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (handsRef.current) {
        const h = handsRef.current;
        handsRef.current = null;
        h.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Empty dependency array means this only runs once

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-cover" width={1280} height={720} />

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
