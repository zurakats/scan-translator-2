import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import History from './pages/History';
import Settings from './pages/Settings';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen relative font-winky overflow-x-hidden bg-brand-dark isolate">
        <Navbar />
        
        {/* Main Content wrapper with padding to account for fixed navbar */}
        <main className="pt-[80px]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
