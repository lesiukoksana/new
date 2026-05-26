/**
 * Modular Gesture Detection Functions
 */
import { getDistance, isFingerExtended } from './handHelpers';

export const gestureChecks = {
  checkFist: (landmarks) => {
    // All fingers folded (Index, Middle, Ring, Pinky)
    return !isFingerExtended(landmarks, 1) && 
           !isFingerExtended(landmarks, 2) && 
           !isFingerExtended(landmarks, 3) && 
           !isFingerExtended(landmarks, 4);
  },
  
  checkFlatPalm: (landmarks) => {
    // All fingers extended
    return isFingerExtended(landmarks, 1) && 
           isFingerExtended(landmarks, 2) && 
           isFingerExtended(landmarks, 3) && 
           isFingerExtended(landmarks, 4);
  },

  checkThumbOut: (landmarks) => {
    // Tip of thumb (4) vs CMC joint of thumb (2)
    return getDistance(landmarks[4], landmarks[2]) > 0.06;
  },

  checkThumbTucked: (landmarks) => {
    // Tip of thumb (4) vs MCP of ring finger (13)
    return getDistance(landmarks[4], landmarks[13]) < 0.1;
  },

  // Specific Letter Logic Mapping
  'A': (landmarks) => {
    const isFist = gestureChecks.checkFist(landmarks);
    const thumbNearIndex = getDistance(landmarks[4], landmarks[5]) < 0.08;
    return { isCorrect: isFist && thumbNearIndex, feedback: "Чудово! Це літера 'А'." };
  },

  'B': (landmarks) => {
    const indexExtended = isFingerExtended(landmarks, 1);
    const othersFolded = !isFingerExtended(landmarks, 2) && 
                         !isFingerExtended(landmarks, 3) && 
                         !isFingerExtended(landmarks, 4);
    const thumbAcross = getDistance(landmarks[4], landmarks[10]) < 0.1 || 
                        getDistance(landmarks[4], landmarks[12]) < 0.1;
    return { isCorrect: indexExtended && othersFolded && thumbAcross, feedback: "Правильно! Це літера 'Б'." };
  },

  'V': (landmarks) => { // Ukrainian 'В' 
    return gestureChecks['B'](landmarks);
  },

  'O': (landmarks) => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const circleClosed = getDistance(thumbTip, indexTip) < 0.05;
    return { isCorrect: circleClosed, feedback: "Відмінно! Це літера 'О'." };
  },

  'U': (landmarks) => {
    const thumbExtended = gestureChecks.checkThumbOut(landmarks);
    const pinkyExtended = isFingerExtended(landmarks, 4);
    const middleThreeFolded = !isFingerExtended(landmarks, 1) && 
                              !isFingerExtended(landmarks, 2) && 
                              !isFingerExtended(landmarks, 3);
    return { isCorrect: thumbExtended && pinkyExtended && middleThreeFolded, feedback: "Супер! Це літера 'У'." };
  },

  'E': (landmarks) => {
    const wrist = landmarks[0];
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    
    const fingersBent = tips.every((tipIdx, i) => 
      getDistance(landmarks[tipIdx], wrist) < getDistance(landmarks[pips[i]], wrist) * 1.1
    );
    
    const thumbParallel = getDistance(landmarks[4], landmarks[5]) < 0.1 || 
                          getDistance(landmarks[4], landmarks[6]) < 0.1;
                          
    const spread = getDistance(landmarks[8], landmarks[12]) + 
                   getDistance(landmarks[12], landmarks[16]) + 
                   getDistance(landmarks[16], landmarks[20]);

    const notFist = tips.every(idx => getDistance(landmarks[idx], wrist) > 0.1);

    return { 
      isCorrect: fingersBent && thumbParallel && spread < 0.15 && notFist, 
      feedback: "Відмінно! Це літера 'Е'." 
    };
  },

  'X': (landmarks) => {
    const indexPip = landmarks[6];
    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];
    const indexHooked = indexPip.y < indexMcp.y && indexTip.y >= indexPip.y - 0.02;
    const othersFolded = !isFingerExtended(landmarks, 2) && 
                         !isFingerExtended(landmarks, 3) && 
                         !isFingerExtended(landmarks, 4);
    const thumbFolded = getDistance(landmarks[4], landmarks[10]) < 0.1 || 
                        getDistance(landmarks[4], landmarks[13]) < 0.1;
    return { isCorrect: indexHooked && othersFolded && thumbFolded, feedback: "Правильно! Це літера 'Х'." };
  },

  'YI': (landmarks) => {
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    
    const indexExtended = isFingerExtended(landmarks, 1);
    const middleExtended = isFingerExtended(landmarks, 2);
    const ringFolded = !isFingerExtended(landmarks, 3);
    const pinkyFolded = !isFingerExtended(landmarks, 4);
    
    const thumbFolded = getDistance(landmarks[4], landmarks[14]) < 0.12 || 
                        getDistance(landmarks[4], landmarks[13]) < 0.12;

    const isSplayed = getDistance(indexTip, middleTip) > 0.08;

    return { 
      isCorrect: indexExtended && middleExtended && ringFolded && pinkyFolded && thumbFolded && isSplayed, 
      feedback: "Правильно! Це літера 'И'." 
    };
  },

  'I': (landmarks) => {
    const wrist = landmarks[0];
    const pinkyTip = landmarks[20];
    const pinkyMcp = landmarks[17];

    const pinkyExtended = isFingerExtended(landmarks, 4);
    const pinkyUpward = pinkyTip.y < pinkyMcp.y && pinkyTip.y < wrist.y;

    const indexFolded = !isFingerExtended(landmarks, 1);
    const middleFolded = !isFingerExtended(landmarks, 2);
    const ringFolded = !isFingerExtended(landmarks, 3);
    
    const othersTightFold = [8, 12, 16].every(idx => 
      getDistance(landmarks[idx], wrist) < 0.25
    );

    const thumbFolded = getDistance(landmarks[4], landmarks[9]) < 0.12 || 
                        getDistance(landmarks[4], landmarks[13]) < 0.12;

    return { 
      isCorrect: pinkyExtended && pinkyUpward && indexFolded && middleFolded && ringFolded && othersTightFold && thumbFolded, 
      feedback: "Відмінно! Це літера 'І'." 
    };
  },

  'M': (landmarks) => {
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const isPointingDown = landmarks[8].y > landmarks[5].y && 
                           landmarks[12].y > landmarks[9].y && 
                           landmarks[16].y > landmarks[13].y;

    const m3Extended = isFingerExtended(landmarks, 1) && 
                       isFingerExtended(landmarks, 2) && 
                       isFingerExtended(landmarks, 3);
    
    const avgExtendedTipDist = (getDistance(indexTip, wrist) + getDistance(middleTip, wrist) + getDistance(ringTip, wrist)) / 3;
    const pinkyFolded = getDistance(pinkyTip, wrist) < avgExtendedTipDist * 0.85; 
    const thumbFolded = getDistance(thumbTip, landmarks[17]) < 0.2;

    const dist8_12 = getDistance(indexTip, middleTip);
    const dist12_16 = getDistance(middleTip, ringTip);
    const fingersSplayed = dist8_12 > 0.06 && dist12_16 > 0.06;

    return { 
      isCorrect: isPointingDown && m3Extended && pinkyFolded && thumbFolded && fingersSplayed, 
      feedback: "Правильно! Це літера 'М'." 
    };
  },

  'L': (landmarks) => {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const thumbTip = landmarks[4];

    const isPointingDown = landmarks[8].y > landmarks[5].y && 
                           landmarks[12].y > landmarks[9].y;

    const indexExtended = isFingerExtended(landmarks, 1);
    const middleExtended = isFingerExtended(landmarks, 2);
    
    const avgExtendedTipDist = (getDistance(indexTip, wrist) + getDistance(middleTip, wrist)) / 2;
    const ringPinkyFolded = getDistance(ringTip, wrist) < avgExtendedTipDist * 0.8 && 
                            getDistance(pinkyTip, wrist) < avgExtendedTipDist * 0.8;
    const thumbFolded = getDistance(thumbTip, landmarks[13]) < 0.2;

    const isSplayed = getDistance(indexTip, middleTip) > 0.08;

    return { 
      isCorrect: isPointingDown && indexExtended && middleExtended && ringPinkyFolded && thumbFolded && isSplayed, 
      feedback: "Чудово! Це літера 'Л'." 
    };
  },

  'N': (landmarks) => {
    const indexExtended = isFingerExtended(landmarks, 1);
    const middleExtended = isFingerExtended(landmarks, 2);
    const pinkyExtended = isFingerExtended(landmarks, 4);
    const ringFolded = !isFingerExtended(landmarks, 3);
    const thumbHoldingRing = getDistance(landmarks[4], landmarks[14]) < 0.1 || 
                             getDistance(landmarks[4], landmarks[16]) < 0.1;
    return { 
      isCorrect: indexExtended && middleExtended && pinkyExtended && ringFolded && thumbHoldingRing, 
      feedback: "Правильно! Це літера 'Н'." 
    };
  },

  'R': (landmarks) => {
    const indexExtended = isFingerExtended(landmarks, 1);
    const middleExtended = isFingerExtended(landmarks, 2);
    const ringExtended = isFingerExtended(landmarks, 3);
    const loopClosed = getDistance(landmarks[4], landmarks[20]) < 0.07;
    const isSplayed = getDistance(landmarks[8], landmarks[12]) > 0.05 && 
                      getDistance(landmarks[12], landmarks[16]) > 0.05;
    return { 
      isCorrect: indexExtended && middleExtended && ringExtended && loopClosed && isSplayed, 
      feedback: "Правильно! Це літера 'Р'." 
    };
  }
};

