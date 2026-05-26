/**
 * Core USL (Ukrainian Sign Language) Hand Skeleton Engine
 * Focuses on high-precision geometric checks for the 5 fundamental poses.
 */
import { getDistance, isFingerExtended } from './handHelpers';

// Configuration
export const strictHoldRequired = 15; // Consecutive frames

/**
 * Letter 'А' (The Fist)
 */
export const checkA = (landmarks) => {
  const wrist = landmarks[0];
  
  // Strict check: all fingers (except thumb) must be folded
  const fingersFolded = !isFingerExtended(landmarks, 1) && 
                        !isFingerExtended(landmarks, 2) && 
                        !isFingerExtended(landmarks, 3) && 
                        !isFingerExtended(landmarks, 4);
  
  // Calculate average distance from tips (8, 12, 16, 20) to wrist for confidence
  const tips = [8, 12, 16, 20];
  const avgDist = tips.reduce((sum, idx) => sum + getDistance(landmarks[idx], wrist), 0) / 4;
  
  return {
    isCorrect: fingersFolded,
    confidence: Math.max(0, 1 - avgDist),
    feedback: 'Стисніть пальці у кулак'
  };
};

/**
 * Letter 'В' (The Palm)
 */
export const checkV = (landmarks) => {
  const allExtended = isFingerExtended(landmarks, 1) && 
                      isFingerExtended(landmarks, 2) && 
                      isFingerExtended(landmarks, 3) && 
                      isFingerExtended(landmarks, 4);
  
  // Confidence based on how far the index finger tip is from the joint
  const indexConfidence = Math.min(1, (getDistance(landmarks[8], landmarks[0]) - getDistance(landmarks[6], landmarks[0])) * 10);

  return {
    isCorrect: allExtended,
    confidence: Math.max(0, indexConfidence),
    feedback: 'Випряміть долоню'
  };
};

/**
 * Letter 'О' (The Circle)
 */
export const checkO = (landmarks) => {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  
  const d = getDistance(thumbTip, indexTip);
  const isCircle = d < 0.04;
  
  return {
    isCorrect: isCircle,
    confidence: isCircle ? 1.0 : Math.max(0, 1 - d * 10),
    feedback: 'З’єднайте кінчики великого та вказівного пальців'
  };
};

/**
 * Letter 'Ш' (Three Fingers)
 */
export const checkSH = (landmarks) => {
  const middleThreeExtended = isFingerExtended(landmarks, 1) && 
                              isFingerExtended(landmarks, 2) && 
                              isFingerExtended(landmarks, 3);
  const pinkyFolded = !isFingerExtended(landmarks, 4);
  
  return {
    isCorrect: middleThreeExtended && pinkyFolded,
    confidence: middleThreeExtended && pinkyFolded ? 1.0 : 0.4,
    feedback: 'Випряміть лише три середні пальці'
  };
};

/**
 * Letter 'Г' (The Pointer)
 */
export const checkG = (landmarks) => {
  const indexExtended = isFingerExtended(landmarks, 1);
  const othersFolded = !isFingerExtended(landmarks, 2) && 
                       !isFingerExtended(landmarks, 3) && 
                       !isFingerExtended(landmarks, 4);
  
  return {
    isCorrect: indexExtended && othersFolded,
    confidence: indexExtended && othersFolded ? 1.0 : 0.3,
    feedback: 'Випряміть лише вказівний палець'
  };
};

/**
 * Dispatcher
 */
export const evaluateCoreGesture = (landmarks, target) => {
  if (!landmarks || landmarks.length < 21) {
    return { isCorrect: false, confidence: 0, feedback: 'Покажіть руку в камеру' };
  }

  switch (target.toUpperCase()) {
    case 'А': return checkA(landmarks);
    case 'В': return checkV(landmarks);
    case 'О': return checkO(landmarks);
    case 'Ш': return checkSH(landmarks);
    case 'Г': return checkG(landmarks);
    default:
      return { isCorrect: false, confidence: 0, feedback: 'Жест не знайдено в базі' };
  }
};

