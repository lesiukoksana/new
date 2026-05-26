/**
 * Unified Architecture for USL Dynamic Gestures
 * 
 * This file contains the state-machine based trackers for dynamic gestures "Й" and "Ї".
 * Both follow the same "IDLE -> TRACKING -> TRIGGERED -> COOLDOWN" lifecycle
 * to ensure stability, jitter resistance, and anti-flicker UI output.
 */

/**
 * GestureTracker_Й
 * Tracks the horizontal swipe for the USL letter "Й".
 */
export class GestureTracker_Й {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',           // Waiting for base pose
      TRACKING: 'TRACKING',   // Base pose held, monitoring movement buffer
      TRIGGERED: 'TRIGGERED', // Dynamic gesture recognized, latching output
      COOLDOWN: 'COOLDOWN'    // Brief pause after latch to reset
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.MIN_SWIPE_THRESHOLD = 0.05;
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 10;
  }

  checkPose_И(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;
    
    // Pinky (20) and Ring (16) extended UP
    const pinkyExtended = landmarks[20].y < landmarks[18].y - 0.03;
    const ringExtended = landmarks[16].y < landmarks[14].y - 0.03;

    // Index (8) and Middle (12) folded
    const indexFolded = landmarks[8].y > landmarks[6].y;
    const middleFolded = landmarks[12].y > landmarks[10].y;

    return pinkyExtended && ringExtended && indexFolded && middleFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkPose_И(landmarks);
    const currentPoint = { x: landmarks[16].x, y: landmarks[16].y }; // Use Ring tip for Й

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [currentPoint];
        }
        return isBasePose ? { detected: 'И' } : null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(currentPoint);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const deltaX = Math.abs(this.historyBuffer[this.historyBuffer.length - 1].x - this.historyBuffer[0].x);
          if (deltaX > this.MIN_SWIPE_THRESHOLD) {
            this.currentState = this.STATES.TRIGGERED;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Й' };
          }
        }
        return { detected: 'И' };

      case this.STATES.TRIGGERED:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        return { detected: 'Й' }; // CONSISTENT LATCHED OUTPUT

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return isBasePose ? { detected: 'И' } : null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

/**
 * GestureTracker_I_Pinky
 * Tracks the static USL letter "І" (Pinky Only).
 * Includes state machine for jitter resistance and high-precision geometric checks.
 */
export class GestureTracker_I_Pinky {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      DETECTED: 'DETECTED'
    };
    this.currentState = this.STATES.IDLE;
    this.holdCounter = 0;
    this.MIN_HOLD_FRAMES = 3; 
  }

  checkStaticPose(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];
    const pinkyIp = landmarks[19];

    // 1. Extended Pinky Check (Crucial)
    // Tip MUST be significantly higher (smaller Y) than PIP and MCP
    const isPinkyHigh = pinkyTip.y < pinkyPip.y - 0.05 && pinkyTip.y < pinkyMcp.y - 0.08;

    // Validate Pinky is straight (nearly linear structure pointing up)
    // We check if the IP and PIP joints are between the tip and MCP in Y-space
    const isPinkyStraight = pinkyTip.y < pinkyIp.y && pinkyIp.y < pinkyPip.y && pinkyPip.y < pinkyMcp.y;

    // 2. Folded Fingers Check (Critical Exclusivity)
    // Folded Index: Tip (8) significantly lower (larger Y) than PIP (6)
    const indexFolded = landmarks[8].y > landmarks[6].y + 0.02;

    // Folded Middle & Ring: Tips lower than respective PIP joints
    const middleFolded = landmarks[12].y > landmarks[10].y + 0.02;
    const ringFolded = landmarks[16].y > landmarks[14].y + 0.02;

    // 3. Thumb Check
    // Thumb tip (4) folded inward, near Index MCP (5)
    const thumbFolded = Math.abs(landmarks[4].x - landmarks[5].x) < 0.1 && 
                        Math.abs(landmarks[4].y - landmarks[5].y) < 0.1;

    // 4. Exclusivity Rules
    // Reject if Index is extended up (prevents false 'V' or '1')
    const indexNotExtended = landmarks[8].y > landmarks[5].y;
    
    // Reject if Thumb is extended horizontally (prevents ASL 'Y')
    // Thumb tip (4) should not be far from the palm center (Middle MCP 9) horizontally
    const thumbNotSplayed = Math.abs(landmarks[4].x - landmarks[9].x) < 0.15;

    return isPinkyHigh && isPinkyStraight && indexFolded && middleFolded && ringFolded && thumbFolded && indexNotExtended && thumbNotSplayed;
  }

  update(landmarks) {
    const isPoseMatch = this.checkStaticPose(landmarks);

    if (isPoseMatch) {
      this.holdCounter++;
      if (this.holdCounter >= this.MIN_HOLD_FRAMES) {
        this.currentState = this.STATES.DETECTED;
      }
    } else {
      this.holdCounter = 0;
      this.currentState = this.STATES.IDLE;
    }

    return this.currentState === this.STATES.DETECTED ? { detected: 'І' } : null;
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.holdCounter = 0;
  }
}

/**
 * GestureTracker_Ї
 * Tracks the horizontal side-to-side "shake" for the USL letter "Ї".
 */
export class GestureTracker_Ї {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_Ї: 'TRIGGERED_Ї',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.MIN_SHAKE_THRESHOLD = 0.04; // Horizontal displacement maxX - minX
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 10;
    
    this.staticTracker = new GestureTracker_I_Pinky();
  }

  /**
   * Static Pose Validation (Base "І")
   * Pinky only extended.
   */
  checkPose_І(landmarks) {
    return this.staticTracker.checkStaticPose(landmarks);
  }

  /**
   * Main update loop for the "Ї" tracker.
   */
  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkPose_І(landmarks);
    const pinkyTipX = landmarks[20].x;

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [pinkyTipX];
        }
        return isBasePose ? { detected: 'І' } : null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(pinkyTipX);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        // TRIGGER CONDITION: Horizontal oscillation
        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const maxX = Math.max(...this.historyBuffer);
          const minX = Math.min(...this.historyBuffer);
          const deltaX = maxX - minX;

          if (deltaX > this.MIN_SHAKE_THRESHOLD) {
            this.currentState = this.STATES.TRIGGERED_Ї;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Ї' };
          }
        }
        return { detected: 'І' };

      case this.STATES.TRIGGERED_Ї:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        // ANTI-FLICKER: consistently return 'Ї' and ignore static pose
        return { detected: 'Ї' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return isBasePose ? { detected: 'І' } : null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

// Map the new class names to the exports expected by uslLogic.js
export { GestureTracker_Й as DynamicGesture_Й };
export { GestureTracker_Ї as DynamicGesture_Ї };

/**
 * GestureTracker_Ґ
 * Tracks the vertical up-and-down "bounce" for the USL letter "Ґ".
 */
export class GestureTracker_Ґ {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED: 'TRIGGERED',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.MIN_BOUNCE_THRESHOLD = 0.04; // Vertical displacement deltaY
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 15;
  }

  /**
   * Static Pose Validation (Base "Г")
   * Index down, Thumb horizontal, others folded.
   */
  checkPose_Г(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // Index (8): tip Y > PIP (6) and MCP (5) -> Pointing DOWN
    const indexDown = landmarks[8].y > landmarks[6].y + 0.03 && landmarks[8].y > landmarks[5].y + 0.04;

    // Thumb (4): Horizontal distance from Index MCP (5)
    const thumbHorizontal = Math.abs(landmarks[4].x - landmarks[5].x) > 0.1;
    // Thumb Y should be relatively near Index MCP/PIP
    const thumbStableY = Math.abs(landmarks[4].y - landmarks[5].y) < 0.1;

    // Middle (12), Ring (16), Pinky (20): Folded into palm
    // In downward orientation, folded tips are HIGHER on screen (smaller Y) than MCPs
    const middleFolded = landmarks[12].y < landmarks[9].y;
    const ringFolded = landmarks[16].y < landmarks[13].y;
    const pinkyFolded = landmarks[20].y < landmarks[17].y;

    return indexDown && thumbHorizontal && thumbStableY && middleFolded && ringFolded && pinkyFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkPose_Г(landmarks);
    // Use Wrist (0) or Index MCP (5) as a stable tracking point for movement
    const trackingPoint = { x: landmarks[5].x, y: landmarks[5].y };

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [trackingPoint.y];
        }
        return isBasePose ? { detected: 'Г' } : null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(trackingPoint.y);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        // TRIGGER CONDITION: Vertical bounce
        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const maxY = Math.max(...this.historyBuffer);
          const minY = Math.min(...this.historyBuffer);
          const deltaY = maxY - minY;

          if (deltaY > this.MIN_BOUNCE_THRESHOLD) {
            this.currentState = this.STATES.TRIGGERED;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Ґ' };
          }
        }
        return { detected: 'Г' };

      case this.STATES.TRIGGERED:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        // Latch output to 'Ґ' to prevent flickering
        return { detected: 'Ґ' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return isBasePose ? { detected: 'Г' } : null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_Ґ as DynamicGesture_Ґ };

/**
 * GestureTracker_Щ
 * Tracks the vertical up-and-down "bounce" for the USL letter "Щ".
 * Base pose is "Ш".
 */
export class GestureTracker_Щ {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_Щ: 'TRIGGERED_Щ',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.MIN_BOUNCE_THRESHOLD = 0.04;
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 15;
  }

  /**
   * Static Pose Validation (Base "Ш")
   * Index, Middle, Ring extended UP and grouped.
   */
  checkPose_Ш(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // Three Pillars: Index (8), Middle (12), Ring (16) extended UP
    const indexUp = landmarks[8].y < landmarks[6].y - 0.04 && landmarks[8].y < landmarks[5].y - 0.06;
    const middleUp = landmarks[12].y < landmarks[10].y - 0.04 && landmarks[12].y < landmarks[9].y - 0.06;
    const ringUp = landmarks[16].y < landmarks[14].y - 0.04 && landmarks[16].y < landmarks[13].y - 0.06;

    // Fingers Grouped: minimal horizontal spread
    const spread1 = Math.abs(landmarks[8].x - landmarks[12].x);
    const spread2 = Math.abs(landmarks[12].x - landmarks[16].x);
    const grouped = spread1 < 0.08 && spread2 < 0.08;

    // Pinky (20) folded
    const pinkyFolded = landmarks[20].y > landmarks[18].y + 0.02;

    // Thumb (4) folded across
    const thumbFolded = Math.abs(landmarks[4].x - landmarks[17].x) < 0.15;

    return indexUp && middleUp && ringUp && grouped && pinkyFolded && thumbFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkPose_Ш(landmarks);
    const trackingPointY = landmarks[5].y; // Index MCP

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [trackingPointY];
        }
        return isBasePose ? { detected: 'Ш' } : null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(trackingPointY);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const maxY = Math.max(...this.historyBuffer);
          const minY = Math.min(...this.historyBuffer);
          const deltaY = maxY - minY;

          if (deltaY > this.MIN_BOUNCE_THRESHOLD) {
            this.currentState = this.STATES.TRIGGERED_Щ;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Щ' };
          }
        }
        return { detected: 'Ш' };

      case this.STATES.TRIGGERED_Щ:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        return { detected: 'Щ' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return isBasePose ? { detected: 'Ш' } : null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_Щ as DynamicGesture_Щ };

/**
 * GestureTracker_Ц
 * Tracks the vertical up-and-down "bounce" for the USL letter "Ц".
 * Base pose: Index and Middle extended UP and held together.
 */
export class GestureTracker_Ц {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_Ц: 'TRIGGERED_Ц',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.MIN_BOUNCE_THRESHOLD = 0.04;
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 15;
  }

  /**
   * Static Pose Validation
   * Index (8) & Middle (12) extended UP and grouped.
   * Ring (16) & Pinky (20) folded.
   */
  checkStaticPose(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // 1. Index (8) & Middle (12) extended UP
    const indexUp = landmarks[8].y < landmarks[6].y - 0.04 && landmarks[8].y < landmarks[5].y - 0.06;
    const middleUp = landmarks[12].y < landmarks[10].y - 0.04 && landmarks[12].y < landmarks[9].y - 0.06;

    // 2. Fingers Grouped (not a "V")
    const fingerSpread = Math.abs(landmarks[8].x - landmarks[12].x);
    const grouped = fingerSpread < 0.08;

    // 3. Ring (16) & Pinky (20) folded
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    // 4. Thumb (4) folded across
    const thumbFolded = Math.abs(landmarks[4].x - landmarks[9].x) < 0.15;

    return indexUp && middleUp && grouped && ringFolded && pinkyFolded && thumbFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkStaticPose(landmarks);
    const trackingPointY = landmarks[5].y; // Index MCP

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [trackingPointY];
        }
        return null; // Don't return a letter for the static pose in this tracker to avoid conflict

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(trackingPointY);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        // TRIGGER CONDITION: Vertical displacement
        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const maxY = Math.max(...this.historyBuffer);
          const minY = Math.min(...this.historyBuffer);
          const deltaY = maxY - minY;

          if (deltaY > this.MIN_BOUNCE_THRESHOLD) {
            this.currentState = this.STATES.TRIGGERED_Ц;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Ц' };
          }
        }
        return null;

      case this.STATES.TRIGGERED_Ц:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        // ANTI-FLICKER LATCH
        return { detected: 'Ц' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_Ц as DynamicGesture_Ц };

/**
 * GestureTracker_Ь
 * Tracks the horizontal side-to-side "shake" for the USL letter "Ь" (Soft Sign).
 * Base pose: Index UP, Thumb OUT (L-shape).
 */
export class GestureTracker_Ь {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_Ь: 'TRIGGERED_Ь',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.MIN_SHAKE_THRESHOLD = 0.04; // Horizontal displacement maxX - minX
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 30;
  }

  /**
   * Static Pose Validation
   * Index (8) extended UP, Thumb (4) extended horizontally.
   * Middle, Ring, Pinky folded.
   */
  checkPose_StaticBase(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // 1. Extended Index (8) UP
    const indexUp = landmarks[8].y < landmarks[6].y - 0.04 && landmarks[8].y < landmarks[5].y - 0.05;

    // 2. Extended Thumb (4) horizontally OUT
    // Horizontal distance from Index MCP (5)
    const thumbHorizontal = Math.abs(landmarks[4].x - landmarks[5].x) > 0.12;
    // Thumb Y should be relatively near Index MCP/Thumb MCP
    const thumbStableY = Math.abs(landmarks[4].y - landmarks[2].y) < 0.1;

    // 3. Middle (12), Ring (16), Pinky (20) folded into palm
    const middleFolded = landmarks[12].y > landmarks[10].y;
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    return indexUp && thumbHorizontal && thumbStableY && middleFolded && ringFolded && pinkyFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkPose_StaticBase(landmarks);
    const trackingPointX = landmarks[8].x; // Index Tip X

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [trackingPointX];
        }
        return null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(trackingPointX);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        // TRIGGER CONDITION: Horizontal oscillation
        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const maxX = Math.max(...this.historyBuffer);
          const minX = Math.min(...this.historyBuffer);
          const deltaX = maxX - minX;

          if (deltaX > this.MIN_SHAKE_THRESHOLD) {
            this.currentState = this.STATES.TRIGGERED_Ь;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Ь' };
          }
        }
        return null;

      case this.STATES.TRIGGERED_Ь:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        // ANTI-FLICKER LATCH
        return { detected: 'Ь' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_Ь as DynamicGesture_Ь };

/**
 * GestureTracker_К
 * Tracks the downward stroke for the USL letter "К".
 * Base pose: "V" sign (Index and Middle spread).
 */
export class GestureTracker_К {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_К: 'TRIGGERED_К',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = []; // Will store { i8y: number, m12y: number }
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 15;
    this.VELOCITY_WINDOW = 6;       // Number of frames to check for sharp delta
    this.MIN_NOD_VELOCITY = 0.045;  // Combined Y-displacement threshold for tips
    this.MIN_FINGER_SPREAD = 0.08;  // X-distance between 8 and 12 for "V" shape
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 20;
  }

  /**
   * Static Pose Validation: The "V" Shape
   * Index (8) & Middle (12) extended UP and SPREAD apart.
   */
  checkStaticPose(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // 1. Index (8) & Middle (12) extended UP relative to their MCPs
    const indexUp = landmarks[8].y < landmarks[5].y - 0.05;
    const middleUp = landmarks[12].y < landmarks[9].y - 0.05;

    // 2. V-Shape Spread Check: Crucial differentiator from 'Ц' or 'Д'
    const fingerSpreadX = Math.abs(landmarks[8].x - landmarks[12].x);
    const isSpread = fingerSpreadX > this.MIN_FINGER_SPREAD;

    // 3. Ring (16) & Pinky (20) folded tightly down
    const ringFolded = landmarks[16].y > landmarks[14].y + 0.02;
    const pinkyFolded = landmarks[20].y > landmarks[18].y + 0.02;

    // 4. Thumb (4) folded across the palm
    const thumbFolded = Math.abs(landmarks[4].x - landmarks[13].x) < 0.22;

    return indexUp && middleUp && isSpread && ringFolded && pinkyFolded && thumbFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkStaticPose(landmarks);

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [{ i8y: landmarks[8].y, m12y: landmarks[12].y }];
        }
        return null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        // Record tips Y coordinates
        this.historyBuffer.push({ i8y: landmarks[8].y, m12y: landmarks[12].y });
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        // NOD DETECTION MATH: Look for sudden sharp downward displacement
        if (this.historyBuffer.length >= this.VELOCITY_WINDOW) {
          const current = this.historyBuffer[this.historyBuffer.length - 1];
          const past = this.historyBuffer[this.historyBuffer.length - this.VELOCITY_WINDOW];
          
          const deltaIndexY = current.i8y - past.i8y;
          const deltaMiddleY = current.m12y - past.m12y;

          // Both tips must move down sharply together
          if (deltaIndexY > this.MIN_NOD_VELOCITY && deltaMiddleY > this.MIN_NOD_VELOCITY) {
            this.currentState = this.STATES.TRIGGERED_К;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'К' };
          }
        }
        return null;

      case this.STATES.TRIGGERED_К:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        // ANTI-FLICKER LATCH: Consistently return detected during latch
        return { detected: 'К' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
        }
        return null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_К as DynamicGesture_К };

/**
 * GestureTracker_Д
 * Tracks the full circular/looping motion for the USL letter "Д".
 * Base pose: Index and Middle extended UP and grouped.
 */
export class GestureTracker_Д {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_Д: 'TRIGGERED_Д',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 30;           // Enough frames to complete a circle
    this.MIN_CIRCLE_DIAMETER = 0.05; // Minimum size for the loop
    this.LOOP_CLOSURE_RATIO = 0.5;   // Start-to-end distance must be < 50% of bounding box diameter
    this.LATCH_FRAMES = 40;
    this.COOLDOWN_FRAMES = 20;
  }

  /**
   * Static Pose Validation
   * Index (8) & Middle (12) extended UP and grouped.
   * Ring (16) & Pinky (20) folded.
   */
  checkStaticPose(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // 1. Index (8) & Middle (12) extended UP
    const indexUp = landmarks[8].y < landmarks[6].y - 0.04 && landmarks[8].y < landmarks[5].y - 0.06;
    const middleUp = landmarks[12].y < landmarks[10].y - 0.04 && landmarks[12].y < landmarks[9].y - 0.06;

    // 2. Fingers Grouped
    const fingerSpread = Math.abs(landmarks[8].x - landmarks[12].x);
    const grouped = fingerSpread < 0.08;

    // 3. Ring (16) & Pinky (20) folded
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    // 4. Thumb (4) folded across
    const thumbFolded = Math.abs(landmarks[4].x - landmarks[13].x) < 0.2;

    return indexUp && middleUp && grouped && ringFolded && pinkyFolded && thumbFolded;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkStaticPose(landmarks);
    const trackingPoint = { x: landmarks[8].x, y: landmarks[8].y }; // Index Tip

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [trackingPoint];
        }
        return null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(trackingPoint);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        // TRIGGER CONDITION: Full Circle Proof
        if (this.historyBuffer.length === this.BUFFER_SIZE) {
          const xs = this.historyBuffer.map(p => p.x);
          const ys = this.historyBuffer.map(p => p.y);
          
          const deltaX = Math.max(...xs) - Math.min(...xs);
          const deltaY = Math.max(...ys) - Math.min(...ys);
          const boundingBoxDiameter = Math.max(deltaX, deltaY);

          // 1. Size Check (Must be a 2D movement, not a line)
          const isLargeEnough = deltaX > this.MIN_CIRCLE_DIAMETER && deltaY > this.MIN_CIRCLE_DIAMETER;

          // 2. Loop Closure Check (Distance between start and end)
          const start = this.historyBuffer[0];
          const end = this.historyBuffer[this.historyBuffer.length - 1];
          const distStartEnd = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

          const isClosedLoop = distStartEnd < boundingBoxDiameter * this.LOOP_CLOSURE_RATIO;

          if (isLargeEnough && isClosedLoop) {
            this.currentState = this.STATES.TRIGGERED_Д;
            this.displayTimer = this.LATCH_FRAMES;
            return { detected: 'Д' };
          }
        }
        return null;

      case this.STATES.TRIGGERED_Д:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.historyBuffer = []; // Clear buffer after latch
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        // ANTI-FLICKER LATCH
        return { detected: 'Д' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_Д as DynamicGesture_Д };

/**
 * GestureTracker_З
 * Tracks the "number 3" path trajectory for the USL letter "З".
 * Base pose: Tilted/Bent Index finger.
 */
export class GestureTracker_З {
  constructor() {
    this.STATES = {
      IDLE: 'IDLE',
      TRACKING: 'TRACKING',
      TRIGGERED_З: 'TRIGGERED_З',
      COOLDOWN: 'COOLDOWN'
    };

    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;

    // Configuration
    this.BUFFER_SIZE = 40;
    this.LATCH_FRAMES = 45;
    this.COOLDOWN_FRAMES = 25;
    this.MIN_PATH_DIAMETER = 0.06;
  }

  /**
   * Helper to calculate angle at P2
   */
  getAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    if (mag1 * mag2 === 0) return 180;
    const val = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, val)));
    return (angle * 180) / Math.PI;
  }

  /**
   * Static Pose Validation
   * Index (8) slightly bent/tilted.
   * Others folded.
   */
  checkStaticPose(landmarks) {
    if (!landmarks || landmarks.length < 21) return false;

    // 1. Folded Fingers (12, 16, 20)
    const middleFolded = landmarks[12].y > landmarks[10].y;
    const ringFolded = landmarks[16].y > landmarks[14].y;
    const pinkyFolded = landmarks[20].y > landmarks[18].y;

    // 2. Thumb folded across
    const thumbFolded = Math.abs(landmarks[4].x - landmarks[9].x) < 0.2;

    // 3. Tilted/Bent Index Check
    // Tip (8) above MCP (5)
    const indexUp = landmarks[8].y < landmarks[5].y;
    
    // Angle at PIP joint (6) using 5, 6, 8
    const angle = this.getAngle(landmarks[5], landmarks[6], landmarks[8]);
    // NOTICEABLE SOFT BEND: 120-165 degrees
    const isBent = angle > 110 && angle < 168;

    return middleFolded && ringFolded && pinkyFolded && thumbFolded && indexUp && isBent;
  }

  /**
   * Peak-Valley-Peak Algorithm for '3' path
   */
  isDrawingThree() {
    if (this.historyBuffer.length < this.BUFFER_SIZE) return false;

    const xs = this.historyBuffer.map(p => p.x);
    const ys = this.historyBuffer.map(p => p.y);

    // 1. Size Check
    const deltaX = Math.max(...xs) - Math.min(...xs);
    const deltaY = Math.max(...ys) - Math.min(...ys);
    if (deltaX < this.MIN_PATH_DIAMETER || deltaY < this.MIN_PATH_DIAMETER) return false;

    // 2. Downward Progression Check
    // Start should be higher than end
    if (ys[ys.length - 1] < ys[0] + 0.02) return false;

    // 3. Peak-Valley-Peak Sequence (X-axis)
    let dir = 0; // 1: increasing, -1: decreasing
    let transitions = 0;
    const threshold = deltaX * 0.3; // Minimum movement to count as a directional shift

    let currentRef = xs[0];
    for (let i = 1; i < xs.length; i++) {
      const diff = xs[i] - currentRef;
      if (Math.abs(diff) > threshold) {
        const newDir = diff > 0 ? 1 : -1;
        if (dir !== 0 && newDir !== dir) {
          transitions++;
        }
        dir = newDir;
        currentRef = xs[i];
      }
    }

    return transitions >= 2;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      this.reset();
      return null;
    }

    const isBasePose = this.checkStaticPose(landmarks);
    const trackingPoint = { x: landmarks[8].x, y: landmarks[8].y };

    switch (this.currentState) {
      case this.STATES.IDLE:
        if (isBasePose) {
          this.currentState = this.STATES.TRACKING;
          this.historyBuffer = [trackingPoint];
        }
        return null;

      case this.STATES.TRACKING:
        if (!isBasePose) {
          this.currentState = this.STATES.IDLE;
          this.historyBuffer = [];
          return null;
        }

        this.historyBuffer.push(trackingPoint);
        if (this.historyBuffer.length > this.BUFFER_SIZE) {
          this.historyBuffer.shift();
        }

        if (this.isDrawingThree()) {
          this.currentState = this.STATES.TRIGGERED_З;
          this.displayTimer = this.LATCH_FRAMES;
          return { detected: 'З' };
        }
        return null;

      case this.STATES.TRIGGERED_З:
        this.displayTimer--;
        if (this.displayTimer <= 0) {
          this.historyBuffer = [];
          this.currentState = this.STATES.COOLDOWN;
          this.cooldownTimer = this.COOLDOWN_FRAMES;
        }
        return { detected: 'З' };

      case this.STATES.COOLDOWN:
        this.cooldownTimer--;
        if (this.cooldownTimer <= 0) {
          this.currentState = this.STATES.IDLE;
        }
        return null;

      default:
        this.reset();
        return null;
    }
  }

  reset() {
    this.currentState = this.STATES.IDLE;
    this.historyBuffer = [];
    this.displayTimer = 0;
    this.cooldownTimer = 0;
  }
}

export { GestureTracker_З as DynamicGesture_З };
