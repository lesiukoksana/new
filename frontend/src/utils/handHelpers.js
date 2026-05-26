/**
 * Utility functions for MediaPipe 21 Hand Landmarks.
 * Optimized for performance using 2D math where possible.
 */

/**
 * Calculates Euclidean distance between two points (2D).
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} Distance
 */
export const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

/**
 * Checks if a finger is extended.
 * Rule: Tip is further from the wrist than the middle joint (PIP/IP).
 * @param {Array} landmarks - 21 MediaPipe landmarks
 * @param {number} fingerIdx - 0: Thumb, 1: Index, 2: Middle, 3: Ring, 4: Pinky
 * @returns {boolean} True if extended
 */
export const isFingerExtended = (landmarks, fingerIdx) => {
  const wrist = landmarks[0];
  const tips = [4, 8, 12, 16, 20];
  const middleJoints = [3, 6, 10, 14, 18]; // IP for thumb, PIP for others

  const tipDist = getDistance(wrist, landmarks[tips[fingerIdx]]);
  const jointDist = getDistance(wrist, landmarks[middleJoints[fingerIdx]]);

  return tipDist > jointDist;
};

/**
 * Checks if the palm is facing the camera (Palmar View).
 * Uses the cross product of vectors from Wrist to Index MCP and Wrist to Pinky MCP
 * to determine the hand's orientation in 2D space, combined with Z-depth.
 * @param {Array} landmarks - 21 MediaPipe landmarks
 * @returns {boolean} True if palm is likely facing camera
 */
export const isPalmFacingCamera = (landmarks) => {
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];

  // Vectors relative to wrist
  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y };

  // 2D Cross Product (Z-component of 3D cross product)
  // This value's sign tells us the winding order of the fingers
  const crossProductZ = v1.x * v2.y - v1.y * v2.x;

  // MediaPipe Z: smaller (more negative) values are closer to the camera.
  const wristZ = wrist.z;
  const knucklesZ = (landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 4;
  const isClose = knucklesZ < wristZ;

  /**
   * For a Right Hand (palmar view): Index is left of Pinky -> crossProductZ > 0
   * For a Left Hand (palmar view): Index is right of Pinky -> crossProductZ < 0
   * However, MediaPipe landmarks are mirrored by default in many webcams.
   * 
   * A more universal way to check "Palm vs Back" without knowing handedness 
   * is to use the Z-coordinates of the thumb vs the pinky/index.
   * But here we follow the cross-product suggestion.
   */
  
  // For most setups, if the palm is facing the camera, the knuckles are closer than the wrist
  // and the hand is not "flipped". 
  return isClose && Math.abs(crossProductZ) > 0.005; 
};

/**
 * Measures distance between tips of two fingers.
 * @param {Array} landmarks - 21 MediaPipe landmarks
 * @param {number} f1 - First finger index (0: Thumb, 1: Index, 2: Middle, 3: Ring, 4: Pinky)
 * @param {number} f2 - Second finger index (0: Thumb, 1: Index, 2: Middle, 3: Ring, 4: Pinky)
 * @returns {number} Distance between tips
 */
export const getFingerSpread = (landmarks, f1, f2) => {
  const tips = [4, 8, 12, 16, 20];
  return getDistance(landmarks[tips[f1]], landmarks[tips[f2]]);
};
