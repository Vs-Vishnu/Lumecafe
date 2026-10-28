import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0B0F17] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0 h-full lg:pl-64">
        {/* Top Navbar */}
        <Navbar toggleSidebar={setSidebarOpen} />

        {/* Dynamic Page Views */}
        <main className="flex-grow overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
