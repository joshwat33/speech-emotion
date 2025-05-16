import React from 'react';

function Header({ title }) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-md sticky top-0 z-10">
      <div className="container mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      </div>
    </header>
  );
}

export default Header;