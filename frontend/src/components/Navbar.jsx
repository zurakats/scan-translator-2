import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, Settings } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-full transition-all duration-300 font-winky tracking-wider ${
      isActive 
        ? "bg-brand-blue text-white shadow-[0_0_15px_rgba(0,123,255,0.4)]" 
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;
  };

  return (
    <header className="z-[99] fixed top-0 w-full bg-brand-dark/95 backdrop-blur-md border-b border-white/10 shadow-xl h-[80px]">
      <div className="w-full h-full flex items-center relative px-6">
        
        {/* Left Side: Empty flex space to balance the right side */}
        <div className="flex-1 hidden md:block"></div>
        
        {/* Center: Logo */}
        <div className="flex-1 flex justify-start md:justify-center">
          <Link to="/" className="flex items-center group">
            <p className="logo transition-colors duration-300 group-hover:text-brand-blue-hover drop-shadow-md">
              Comic Translator
            </p>
          </Link>
        </div>
        
        {/* Right Side: Navigation Links */}
        <nav className="flex-1 flex justify-end items-center gap-1 md:gap-4">
          <Link to="/" className={getLinkClass('/')}>
            <Home size={22} />
            <span className="hidden md:inline text-lg">Home</span>
          </Link>
          <Link to="/history" className={getLinkClass('/history')}>
            <History size={22} />
            <span className="hidden md:inline text-lg">History</span>
          </Link>
          <Link to="/settings" className={getLinkClass('/settings')}>
            <Settings size={22} />
            <span className="hidden md:inline text-lg">Settings</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
