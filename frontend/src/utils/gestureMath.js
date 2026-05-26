import { gestureChecks } from './allGestures';

/**
 * Evaluates hand landmarks against dynamic AI rules.
 * rulesConfig: { ruleName: 'A', fallbackLetter: 'А' }
 */
export const evaluateUSL = (landmarks, rulesConfig) => {
  if (!landmarks || landmarks.length < 21) {
    return { isCorrect: false, feedback: "Hand not detected" };
  }

  // Parse config if it's a string
  let config = rulesConfig;
  if (typeof rulesConfig === 'string') {
    try {
      config = JSON.parse(rulesConfig);
    } catch (e) {
      // If not JSON, treat as the letter itself for backward compatibility
      config = { ruleName: rulesConfig };
    }
  }

  const { ruleName, fallbackLetter } = config;
  
  // Use the modular check if it exists
  if (gestureChecks[ruleName]) {
    return gestureChecks[ruleName](landmarks);
  }

  // Fallback to basic character check if ruleName didn't match
  if (fallbackLetter && gestureChecks[fallbackLetter]) {
    return gestureChecks[fallbackLetter](landmarks);
  }

  return { 
    isCorrect: false, 
    feedback: `Розпізнавання для "${ruleName || fallbackLetter}" ще не реалізовано.` 
  };
};