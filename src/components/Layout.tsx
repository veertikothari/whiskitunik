import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  FileText,
  Clock,
  PlusSquareIcon,
  Menu,
  LogOut,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase'; // adjust path

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admindashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Contacts', href: '/admincontacts', icon: Users },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Time Log', href: '/time-log', icon: Clock },
    { name: 'Add Users', href: '/adduser', icon: PlusSquareIcon },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('userEmail');
    navigate('/');
  };

  if (location.pathname === '/') return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm md:hidden">
        {/* Left side: Hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-700 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Task Manager</h1>
        </div>
      </div>


      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] md:h-screen">
        {/* Sidebar */}
      <div
        className={`fixed z-40 inset-y-0 left-0 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out bg-white w-64 shadow-lg rounded-r-2xl md:static md:translate-x-0 md:flex md:flex-col md:justify-between`}
      >
          {/* Top Section */}
          <div>
            <div className="flex h-16 items-center justify-center border-b md:border-none">
              <h1 className="text-xl font-bold text-gray-900">Task Manager</h1>
            </div>

            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      location.pathname === item.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Logout Button */}
          <div className="px-2 py-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
