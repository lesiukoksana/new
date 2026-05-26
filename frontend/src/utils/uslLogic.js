/**
 * Strict USL (Ukrainian Sign Language - УЖМ) Dactyl Recognition Logic.
 * Optimized for speed using 2D coordinates and hierarchical checks.
 */
import { getDistance, isFingerExtended, isPalmFacingCamera } from './handHelpers';
import { DynamicGesture_Й, DynamicGesture_Ї, DynamicGesture_Ґ, DynamicGesture_Щ, DynamicGesture_Ц, DynamicGesture_Ь, DynamicGesture_К, DynamicGesture_Д, DynamicGesture_З } from './dynamicGestures';

const createResult = (isCorrect, score, feedback, isDynamic = false) => ({ isCorrect, score, feedback, isDynamic });

// Persistent instances of the trackers
const yjTracker = new DynamicGesture_Й();
const yiDoubleDotTracker = new DynamicGesture_Ї();
const geTracker = new DynamicGesture_Ґ();
const shchTracker = new DynamicGesture_Щ();
const tseTracker = new DynamicGesture_Ц();
const softTracker = new DynamicGesture_Ь();
const kaTracker = new DynamicGesture_К();
const dTracker = new DynamicGesture_Д();
const zeTracker = new DynamicGesture_З();

/**
 * Static Pose for Letter 'И' (Pinky and Ring UP) and base for 'Й'.
 */
const checkYI_Pose = (landmarks) => {
  const result = yjTracker.checkPose_И(landmarks);
  return {
    isCorrect: result,
    score: result ? 1.0 : 0,
    ringExtended: true, // Placeholder for feedback logic if needed
    pinkyExtended: true,
    indexFolded: true,
    middleFolded: true,
    thumbFolded: true
  };
};

const checkA = (landmarks) => {
  const wrist = landmarks[0];
  const fingers = [{ tip: 8, pip: 6 }, { tip: 12, pip: 10 }, { tip: 16, pip: 14 }, { tip: 20, pip: 18 }];
  const allTipsFolded = fingers.every(f => getDistance(landmarks[f.tip], wrist) < getDistance(landmarks[f.pip], wrist));
  const thumbTucked = getDistance(landmarks[4], landmarks[5]) < 0.1;
  if (allTipsFolded && thumbTucked) return createResult(true, 1.0, 'Чудово! Літера "А".');
  return createResult(false, 0.4, 'Зімкніть пальці у кулак');
};

const checkB = (landmarks) => {
  const wrist = landmarks[0];
  const knucklesZ = (landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 4;
  
  // 1. Orientation: Palm facing camera
  if (knucklesZ > wrist.z + 0.1) return createResult(false, 0.4, 'Поверніть долоню до камери');

  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];

  // 2. Index Finger Extended Check (Strict Y-coordinates per prompt)
  const indexExtended = indexTip.y < indexPip.y - 0.04 && indexTip.y < indexMcp.y - 0.05;
  if (!indexExtended) return createResult(false, 0.3, 'Випряміть вказівний палець вгору');

  // 3. Folded Finger Check (Middle, Ring, Pinky curled)
  // Logic: tip Y > PIP joint Y. We use a majority rule for stability.
  const m = landmarks[12].y > landmarks[10].y;
  const r = landmarks[16].y > landmarks[14].y;
  const p = landmarks[20].y > landmarks[18].y;
  const foldedCount = (m ? 1 : 0) + (r ? 1 : 0) + (p ? 1 : 0);
  
  if (foldedCount < 2) return createResult(false, 0.4, 'Зберіть інші пальці у долоню');

  // 4. Bent Thumb Check (The Sideways "Hook")
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];

  // IP joint (3) must be furthest outside relative to palm center (Middle MCP)
  const ipDistX = Math.abs(thumbIp.x - middleMcp.x);
  const tipDistX = Math.abs(thumbTip.x - middleMcp.x);
  
  // "Thumb Tip (4) must be bent inward" -> tip is closer to center than IP is
  const isHooked = ipDistX > tipDistX + 0.01; 

  // "Thumb Tip (4) near Middle PIP (10)" -> resting against the side
  const distTipToMiddle = getDistance(thumbTip, middlePip);
  const isResting = distTipToMiddle < 0.18;

  // Exclusivity: 
  // - Ensure thumb is extended sideways, not flat across (distance from center)
  const isExtendedSideways = ipDistX > 0.07;
  // - Thumb tip shouldn't be too close to index tip (prevents false 'O'/'F')
  const notO = getDistance(thumbTip, indexTip) > 0.08;

  if (isHooked && isResting && isExtendedSideways && notO) {
    return createResult(true, 1.0, 'Правильно! Літера "Б".');
  }

  return createResult(false, 0.5, 'Зігніть великий палець "гачком" до середнього');
};

const checkV = (landmarks) => {
  const indexTip = landmarks[8];
  const pinkyTip = landmarks[20];
  const fingers = [{ tip: 8, pip: 6 }, { tip: 12, pip: 10 }, { tip: 16, pip: 14 }, { tip: 20, pip: 18 }];
  if (!isPalmFacingCamera(landmarks)) return createResult(false, 0.4, 'Поверніть долоню до камери');
  const allUp = fingers.every(f => landmarks[f.tip].y < landmarks[f.pip].y - 0.05);
  if (!allUp) return createResult(false, 0.3, 'Випряміть усі пальці вгору');
  if (Math.abs(indexTip.x - pinkyTip.x) > 0.15) return createResult(false, 0.6, 'Тримайте пальці разом');
  return createResult(true, 1.0, 'Чудово! Літера "В".');
};

const checkG = (landmarks) => {
  const res = geTracker.update(landmarks);
  if (res && (res.detected === 'Г' || res.detected === 'Ґ')) return createResult(true, 1.0, 'Правильно! Літера "Г".');
  return createResult(false, 0.3, 'Вказівний вниз, великий убік');
};

const checkGE = (landmarks) => {
  const res = geTracker.update(landmarks);
  if (res && res.detected === 'Ґ') return createResult(true, 1.0, 'Чудово! Літера "Ґ" — рух виконано.', true);
  if (res && res.detected === 'Г') return createResult(false, 0.5, 'Тепер зробіть рух вгору-вниз (підстрибування)');
  return createResult(false, 0.4, 'Сформуйте позу "Г" та зробіть рух вгору-вниз');
};

const checkD = (landmarks) => {
  const res = dTracker.update(landmarks);
  if (res && res.detected === 'Д') return createResult(true, 1.0, 'Чудово! Літера "Д" — рух виконано.', true);
  
  const isBase = dTracker.checkStaticPose(landmarks);
  if (isBase) return createResult(false, 0.5, 'Тепер зробіть коло рукою у повітрі');
  return createResult(false, 0.4, 'Випряміть вказівний та середній разом вгору і зробіть коло');
};

const checkE = (landmarks) => {
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  const mcps = [5, 9, 13, 17];

  // 1. Four Fingers Curled Check (Deep Curl/Arch)
  // Tip Y > PIP Y (lower on screen)
  const allCurled = tips.every((tipIdx, i) => landmarks[tipIdx].y > landmarks[pips[i]].y + 0.02);
  if (!allCurled) return createResult(false, 0.3, 'Зігніть чотири пальці "аркою" до долоні');

  // 2. Compact Arch Check (Tips pulled into palm)
  const tipsCloseToWrist = tips.every((tipIdx) => getDistance(landmarks[tipIdx], wrist) < 0.28);
  if (!tipsCloseToWrist) return createResult(false, 0.4, 'Тримайте пальці щільно зігнутими');

  // Knuckles (MCP) stay higher than tips to form the arch profile
  const knucklesHigh = mcps.every((mcpIdx, i) => landmarks[mcpIdx].y < landmarks[tips[i]].y);
  if (!knucklesHigh) return createResult(false, 0.4, 'Підніміть кісточки пальців вище (формуючи арку)');

  // 3. Thumb Folded Check (Underneath fingers)
  const thumbTip = landmarks[4];
  const middleMcp = landmarks[9];
  
  // Thumb tip pulled inward toward the center of the palm
  const thumbInward = Math.abs(thumbTip.x - middleMcp.x) < 0.15;
  
  // Thumb tip should be near or just below the average Y of the fingertips
  const avgFingertipY = tips.reduce((sum, idx) => sum + landmarks[idx].y, 0) / 4;
  const thumbPositionedCorrectly = thumbTip.y > avgFingertipY - 0.05;

  if (thumbInward && thumbPositionedCorrectly) {
    return createResult(true, 1.0, 'Чудово! Літера "Е".');
  }

  return createResult(false, 0.5, 'Заховайте великий палець під зігнуті пальці');
};

const checkYE = (landmarks) => {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];

  // 1. Folded Fingers Check (Middle, Ring, Pinky)
  // Tip Y > PIP Y (lower on screen)
  const middleFolded = middleTip.y > middlePip.y + 0.02;
  const ringFolded = ringTip.y > ringPip.y + 0.02;
  const pinkyFolded = pinkyTip.y > pinkyPip.y + 0.02;

  if (!middleFolded || !ringFolded || !pinkyFolded) {
    return createResult(false, 0.3, 'Сховайте середній, безіменний та мізинець у долоню');
  }

  // 2. Open Arc Check (Index & Thumb)
  // Index extended forward/up
  const indexExtended = indexTip.y < indexMcp.y;
  
  // Thumb extended outward (large X distance from palm center - Index MCP)
  const thumbExtended = Math.abs(thumbTip.x - indexMcp.x) > 0.08;

  // 3. The Gap Check (CRUCIAL)
  const tipDistance = getDistance(indexTip, thumbTip);
  const MIN_OPEN_GAP = 0.12;
  const MAX_ARC_GAP = 0.25;

  const hasProperGap = tipDistance > MIN_OPEN_GAP && tipDistance < MAX_ARC_GAP;

  if (indexExtended && thumbExtended && hasProperGap) {
    return createResult(true, 1.0, 'Правильно! Літера "Є".');
  }

  if (tipDistance <= MIN_OPEN_GAP) {
    return createResult(false, 0.5, 'Залиште проміжок між вказівним та великим пальцями');
  }

  return createResult(false, 0.4, 'Сформуйте дугу вказівним та великим пальцями');
};

const checkZH = (landmarks) => {
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const fingerTips = [8, 12, 16, 20];
  const fingerPips = [6, 10, 14, 18];

  // 1. Finger Convergence Check (Cluster around thumb tip)
  const distancesToThumb = fingerTips.map(idx => getDistance(thumbTip, landmarks[idx]));
  const isClustered = distancesToThumb.every(dist => dist < 0.15); // Small radius cluster
  const maxSpread = Math.max(...distancesToThumb);
  
  if (!isClustered) return createResult(false, 0.3, 'Зберіть усі пальці у "дзьобик" до великого');

  // 2. Extended but Bent Check (Not a fist, fingers pointing forward)
  // Distance from wrist to tip must be greater than wrist to PIP
  const allExtendedForward = fingerTips.every((tipIdx, i) => 
    getDistance(wrist, landmarks[tipIdx]) > getDistance(wrist, landmarks[fingerPips[i]])
  );
  if (!allExtendedForward) return createResult(false, 0.4, 'Тримайте пальці витягнутими вперед, не стискайте у кулак');

  // 3. Horizontal Alignment Check (Flatness of the beak)
  // Fingertips and thumb tip should be on a similar Y-plane
  const fingertipYs = fingerTips.map(idx => landmarks[idx].y);
  const avgY = fingertipYs.reduce((a, b) => a + b, 0) / 4;
  const yStability = fingertipYs.every(y => Math.abs(y - avgY) < 0.08);
  const nearThumbY = Math.abs(avgY - thumbTip.y) < 0.1;

  if (!yStability || !nearThumbY) return createResult(false, 0.5, 'Тримайте "дзьобик" горизонтально');

  // 4. Thumb Position (Pointing forward/outward)
  const thumbExtended = getDistance(thumbTip, landmarks[2]) > 0.1;
  if (!thumbExtended) return createResult(false, 0.4, 'Витягніть великий палець вперед');

  // Exclusivity: Ensure the fingers are close together (not splayed)
  const spread = getDistance(landmarks[8], landmarks[20]);
  if (spread > 0.15) return createResult(false, 0.4, 'Тримайте пальці разом');

  if (isClustered && allExtendedForward && yStability && thumbExtended) {
    return createResult(true, 1.0, 'Чудово! Літера "Ж".');
  }

  return createResult(false, 0.6, 'Сформуйте чіткий "дзьобик" усіма пальцями');
};

const checkZ = (landmarks) => {
  const res = zeTracker.update(landmarks);
  if (res && res.detected === 'З') return createResult(true, 1.0, 'Чудово! Літера "З" — рух виконано.', true);
  
  const isBase = zeTracker.checkStaticPose(landmarks);
  if (isBase) return createResult(false, 0.5, 'Тепер намалюйте у повітрі цифру "3"');
  return createResult(false, 0.4, 'Зігніть вказівний "гачком" та намалюйте "3"');
};

const checkI = (landmarks) => {
  if (isFingerExtended(landmarks, 1) && !isFingerExtended(landmarks, 2) && !isFingerExtended(landmarks, 3) && !isFingerExtended(landmarks, 4)) return createResult(true, 1.0, 'Відмінно! Літера "І".');
  return createResult(false, 0.4, 'Випряміть вказівний палець вгору');
};

const checkYI = (landmarks) => {
  const res = yjTracker.update(landmarks);
  if (res && res.detected === 'И') return createResult(true, 1.0, 'Правильно! Літера "И".');
  return createResult(false, 0.4, 'Підніміть безіменний та мізинець вгору');
};

const checkYJ = (landmarks) => {
  const res = yjTracker.update(landmarks);
  if (res && res.detected === 'Й') return createResult(true, 1.0, 'Чудово! Літера "Й" — рух виконано.', true);
  if (res && res.detected === 'И') return createResult(false, 0.5, 'Тепер намалюйте в повітрі невеличку дугу (˘)');
  return createResult(false, 0.4, 'Сформуйте позу "И" та зробіть рух дугою');
};

const checkK = (landmarks) => {
  const res = kaTracker.update(landmarks);
  if (res && res.detected === 'К') return createResult(true, 1.0, 'Чудово! Літера "К" — рух виконано.', true);
  
  const isBase = kaTracker.checkStaticPose(landmarks);
  if (isBase) return createResult(false, 0.5, 'Тепер зробіть різкий рух рукою донизу');
  return createResult(false, 0.4, 'Випряміть вказівний та середній у формі "V" та зробіть рух');
};


const checkX = (landmarks) => {
  if (landmarks[8].y > landmarks[6].y && landmarks[6].y < landmarks[5].y) return createResult(true, 1.0, 'Правильно! Літера "Х".');
  return createResult(false, 0.3, 'Зігніть вказівний "гачком"');
};

const checkF = (landmarks) => {
  if (landmarks[4].y < landmarks[3].y && getDistance(landmarks[8], landmarks[5]) > 0.1) return createResult(true, 1.0, 'Чудово! Літера "Ф".');
  return createResult(false, 0.4, 'Великий вгору, інші вперед');
};

const checkO = (landmarks) => {
  if (getDistance(landmarks[4], landmarks[8]) < 0.1) return createResult(true, 1.0, 'Чудово! Літера "О".');
  return createResult(false, 0.5, 'З’єднайте вказівний та великий у кільце');
};

const checkU = (landmarks) => {
  if (isFingerExtended(landmarks, 0) && isFingerExtended(landmarks, 4) && !isFingerExtended(landmarks, 1)) return createResult(true, 1.0, 'Супер! Це літера У');
  return createResult(false, 0.5, 'Випряміть великий та мізинець');
};

const checkM = (landmarks) => {
  if (landmarks[8].y > landmarks[5].y && landmarks[12].y > landmarks[9].y && landmarks[16].y > landmarks[13].y) return createResult(true, 1.0, 'Правильно! Літера "М".');
  return createResult(false, 0.4, 'Три пальці вниз');
};

const checkN = (landmarks) => {
  const wrist = landmarks[0];
  if (landmarks[8].y < landmarks[5].y && landmarks[12].y < landmarks[9].y && getDistance(landmarks[16], wrist) < getDistance(landmarks[14], wrist) + 0.05) return createResult(true, 1.0, 'Правильно! Літера "Н".');
  return createResult(false, 0.4, 'Три пальці вгору');
};

const checkC = (landmarks) => {
  const wrist = landmarks[0];
  if ([8, 12, 16, 20].every(idx => getDistance(landmarks[idx], wrist) < 0.35 && getDistance(landmarks[idx], wrist) > 0.15)) return createResult(true, 1.0, 'Супер! Літера "С".');
  return createResult(false, 0.5, 'Зігніть долоню "дужкою"');
};

const checkL = (landmarks) => {
  if (landmarks[8].y > landmarks[5].y && landmarks[12].y > landmarks[9].y) return createResult(true, 1.0, 'Чудово! Літера "Л".');
  return createResult(false, 0.4, 'Вказівний та середній вниз');
};

const checkP = (landmarks) => {
  if (landmarks[8].y > landmarks[5].y && getDistance(landmarks[8], landmarks[12]) < 0.08) return createResult(true, 1.0, 'Правильно! Літера "П".');
  return createResult(false, 0.4, 'Два пальці вниз разом');
};

const checkSH = (landmarks) => {
  const res = shchTracker.update(landmarks);
  if (res && (res.detected === 'Ш' || res.detected === 'Щ')) return createResult(true, 1.0, 'Чудово! Літера "Ш".');
  return createResult(false, 0.3, 'Випряміть три пальці вгору разом');
};

const checkSHCH = (landmarks) => {
  const res = shchTracker.update(landmarks);
  if (res && res.detected === 'Щ') return createResult(true, 1.0, 'Чудово! Літера "Щ" — рух виконано.', true);
  if (res && res.detected === 'Ш') return createResult(false, 0.5, 'Тепер зробіть рух вгору-вниз (підстрибування)');
  return createResult(false, 0.4, 'Сформуйте позу "Ш" та зробіть рух вгору-вниз');
};

const checkTSE = (landmarks) => {
  const res = tseTracker.update(landmarks);
  if (res && res.detected === 'Ц') return createResult(true, 1.0, 'Чудово! Літера "Ц" — рух виконано.', true);
  
  const isBase = tseTracker.checkStaticPose(landmarks);
  if (isBase) return createResult(false, 0.5, 'Тепер зробіть рух вгору-вниз (підстрибування)');
  return createResult(false, 0.4, 'Випряміть вказівний та середній разом вгору і зробіть рух');
};

const checkR = (landmarks) => {
  const thumbTip = landmarks[4];
  const middleTip = landmarks[12];
  const indexTip = landmarks[8];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  // 1. Middle-Thumb Pinch Check (The Loop)
  const loopDistance = getDistance(thumbTip, middleTip);
  const isLoopClosed = loopDistance < 0.08;
  if (!isLoopClosed) return createResult(false, 0.4, 'З’єднайте середній та великий пальці у кільце');

  // 2. Extended Fingers Check (Index, Ring, Pinky)
  const indexUp = isFingerExtended(landmarks, 1);
  const ringUp = isFingerExtended(landmarks, 3);
  const pinkyUp = isFingerExtended(landmarks, 4);

  if (!indexUp) return createResult(false, 0.3, 'Випряміть вказівний палець вгору');
  if (!ringUp || !pinkyUp) return createResult(false, 0.3, 'Випряміть безіменний палець та мізинець вгору');

  // 3. Exclusivity: Index should NOT be part of the loop
  const indexToThumbDist = getDistance(indexTip, thumbTip);
  if (indexToThumbDist < 0.1) return createResult(false, 0.5, 'Кільце має бути з середнім пальцем, а не вказівним');

  // 4. Fanned Out Check: Tips should be higher than PIP joints
  const tipsHigher = [8, 16, 20].every(idx => landmarks[idx].y < landmarks[idx - 2].y);
  if (!tipsHigher) return createResult(false, 0.4, 'Тримайте випрямлені пальці рівно вгору');

  if (isLoopClosed && indexUp && ringUp && pinkyUp && indexToThumbDist > 0.1) {
    return createResult(true, 1.0, 'Правильно! Літера "Р".');
  }

  return createResult(false, 0.6, 'З’єднайте середній з великим, інші три вгору');
};

const checkCH = (landmarks) => {
  if (getDistance(landmarks[4], landmarks[8]) < 0.12 && getDistance(landmarks[4], landmarks[12]) < 0.12) return createResult(true, 1.0, 'Правильно! Літера "Ч".');
  return createResult(false, 0.4, 'Три пальці в "дзьобик"');
};

const checkYU = (landmarks) => {
  const thumbTip = landmarks[4];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  
  // 1. Pinky Extended Check
  const pinkyUp = pinkyTip.y < pinkyPip.y - 0.05;
  if (!pinkyUp) return createResult(false, 0.3, 'Випряміть мізинець вгору');

  // 2. Four-Point Pinch Check (Thumb, Index, Middle, Ring)
  const tips = [8, 12, 16]; // Index, Middle, Ring
  const distancesToThumb = tips.map(idx => getDistance(thumbTip, landmarks[idx]));
  const isBeakClustered = distancesToThumb.every(dist => dist < 0.12);
  
  if (!isBeakClustered) return createResult(false, 0.4, 'Зберіть вказівний, середній та безіменний до великого');

  // 3. Forward Pinch Alignment (Beak is lower than extended pinky)
  const avgBeakY = (thumbTip.y + landmarks[8].y + landmarks[12].y + landmarks[16].y) / 4;
  const beakBelowPinky = avgBeakY > pinkyTip.y + 0.1;

  if (pinkyUp && isBeakClustered && beakBelowPinky) {
    return createResult(true, 1.0, 'Чудово! Літера "Ю".');
  }

  return createResult(false, 0.5, 'Тримайте мізинець вгору, а інші пальці у "дзьобик"');
};

const checkSOFT = (landmarks) => {
  const res = softTracker.update(landmarks);
  if (res && res.detected === 'Ь') return createResult(true, 1.0, 'Чудово! М’який знак — рух виконано.', true);
  
  const isBase = softTracker.checkPose_StaticBase(landmarks);
  if (isBase) return createResult(false, 0.5, 'Тепер зробіть рух рукою з боку в бік (тремтіння)');
  return createResult(false, 0.4, 'Вказівний вгору, великий убік (L-форма) та зробіть рух');
};

const checkYA = (landmarks) => {
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];

  // 1. Index & Middle Extended Check
  const indexUp = isFingerExtended(landmarks, 1);
  const middleUp = isFingerExtended(landmarks, 2);
  if (!indexUp || !middleUp) return createResult(false, 0.3, 'Випряміть вказівний та середній пальці');

  // 2. Crossed Fingers Check (Crucial)
  // Standard position (not crossed): Index MCP X < Middle MCP X (for right hand)
  // Crossed position: tips are swapped horizontally relative to their bases
  const baseOrder = middleMcp.x - indexMcp.x;
  const tipOrder = middleTip.x - indexTip.x;
  
  // If the signs are different, the fingers are crossed
  const isCrossed = (baseOrder * tipOrder) < 0 || Math.abs(tipOrder) < 0.03;
  if (!isCrossed) return createResult(false, 0.4, 'Схрестіть вказівний та середній пальці');

  // 3. Folded Fingers Check (Ring, Pinky)
  const ringFolded = !isFingerExtended(landmarks, 3);
  const pinkyFolded = !isFingerExtended(landmarks, 4);
  if (!ringFolded || !pinkyFolded) return createResult(false, 0.4, 'Зберіть безіменний та мізинець у долоню');

  // 4. Thumb Position Check
  const thumbTip = landmarks[4];
  const thumbTucked = getDistance(thumbTip, landmarks[14]) < 0.15; // Near Ring PIP

  if (indexUp && middleUp && isCrossed && ringFolded && pinkyFolded) {
    return createResult(true, 1.0, 'Правильно! Літера "Я".');
  }

  return createResult(false, 0.5, 'Схрестіть пальці, інші притисніть до долоні');
};

const checkYI_DoubleDot = (landmarks) => {
  const res = yiDoubleDotTracker.update(landmarks);
  if (res && res.detected === 'Ї') return createResult(true, 1.0, 'Чудово! Літера "Ї" — рух виконано.', true);
  if (res && res.detected === 'І') return createResult(false, 0.5, 'Тепер зробіть рух з боку в бік (тремтіння)');
  return createResult(false, 0.4, 'Сформуйте позу "І" та зробіть рух з боку в бік');
};

export const checkGesture = (landmarks, targetLetter) => {
  if (!landmarks || landmarks.length < 21) return createResult(false, 0, 'Покажіть руку в камеру');
  const letter = targetLetter.toUpperCase();
  switch (letter) {
    case 'А': return checkA(landmarks);
    case 'Б': return checkB(landmarks);
    case 'В': return checkV(landmarks);
    case 'Г': return checkG(landmarks);
    case 'Ґ': return checkGE(landmarks);
    case 'Д': return checkD(landmarks);
    case 'Е': return checkE(landmarks);
    case 'Є': return checkYE(landmarks);
    case 'Ж': return checkZH(landmarks);
    case 'З': return checkZ(landmarks);
    case 'І': return checkI(landmarks);
    case 'И': return checkYI(landmarks);
    case 'Й': return checkYJ(landmarks);
    case 'Ї': return checkYI_DoubleDot(landmarks);
    case 'К': return checkK(landmarks);
    case 'Т': return checkT(landmarks);
    case 'Х': return checkX(landmarks);
    case 'Ф': return checkF(landmarks);
    case 'О': return checkO(landmarks);
    case 'У': return checkU(landmarks);
    case 'М': return checkM(landmarks);
    case 'Н': return checkN(landmarks);
    case 'С': return checkC(landmarks);
    case 'Л': return checkL(landmarks);
    case 'П': return checkP(landmarks);
    case 'Ш': return checkSH(landmarks);
    case 'Щ': return checkSHCH(landmarks);
    case 'Ц': return checkTSE(landmarks);
    case 'Р': return checkR(landmarks);
    case 'Ч': return checkCH(landmarks);
    case 'Ю': return checkYU(landmarks);
    case 'Я': return checkYA(landmarks);
    case 'Ь': return checkSOFT(landmarks);
    default: return createResult(false, 0, `Літера "${letter}" у розробці`);
  }
};
