import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckSquare, Users, Menu, LogOut, Book, Search, LayoutDashboard, FileText } from 'lucide-react';

interface UserLayoutProps {
  children: React.ReactNode;
}

const userNav = [
  { name: 'Assigned Tasks', href: '/userdashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/usertasks', icon: CheckSquare },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Guidelines', href: '/guidelines', icon: Book },
  { name: 'Search', href: '/search', icon: Search },
];

export const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    // You can replace this with your own logout logic
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white shadow">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle Sidebar">
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
        <h2 className="text-xl font-bold text-gray-800">User Panel</h2>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] md:h-screen">
        {/* Sidebar */}
        <div
          className={`fixed md:static z-40 top-0 left-0 h-full w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="h-16 flex items-center justify-center border-b">
            <h2 className="text-xl font-bold text-gray-800">User Panel</h2>
          </div>

          <nav className="mt-4 space-y-1 px-3">
            {userNav.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition ${
                    active
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout button at bottom */}
          <div className="absolute bottom-0 w-full border-t p-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-800"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {/* Overlay for mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
