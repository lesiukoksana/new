const BASE_URL = 'http://localhost:5000/api';
const DEFAULT_USER_ID = 1;

export const fetchModules = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/modules?user_id=${userId}`);
  return res.json();
};

export const fetchLetters = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/letters?user_id=${userId}`);
  return res.json();
};

export const fetchGesture = async (id) => {
  const res = await fetch(`${BASE_URL}/gestures/${id}`);
  return res.json();
};

export const createSession = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  return res.json();
};

export const logAttempt = async (sessionId, gestureId, isSuccessful, confidence = 0) => {
  const res = await fetch(`${BASE_URL}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      gesture_id: gestureId,
      is_successful: isSuccessful,
      confidence_score: confidence
    })
  });
  return res.json();
};

export const fetchStats = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/stats/${userId}`);
  return res.json();
};

export const fetchActivityStats = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/stats/activity/${userId}`);
  return res.json();
};

export const fetchDifficultStats = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/stats/difficult/${userId}`);
  return res.json();
};

export const fetchTimeStats = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${BASE_URL}/stats/time/${userId}`);
  return res.json();
};
