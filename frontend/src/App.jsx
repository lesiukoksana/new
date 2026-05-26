import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import Home from './pages/Home';
import LessonMap from './pages/LessonMap';
import LearningModule from './pages/LearningModule';
import WordGame from './pages/WordGame';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center">
      <div className="w-16 h-16 border-8 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/map" element={
              <ProtectedRoute>
                <LessonMap />
              </ProtectedRoute>
            } />
            <Route path="/learn/:id" element={
              <ProtectedRoute>
                <LearningModule />
              </ProtectedRoute>
            } />
            <Route path="/game" element={
              <ProtectedRoute>
                <WordGame />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
