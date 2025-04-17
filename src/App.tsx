import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';          // Admin Sidebar Layout
import { UserLayout } from './components/UserLayout';  // User Sidebar Layout

import { Login } from './pages/Login';
import { Dashboard } from './pages/AdminDashboard';         // Admin Dashboard
import { Tasks } from './pages/Tasks';
import { Contacts } from './pages/Contacts';
import { Templates } from './pages/Templates';
import { TimeLog } from './pages/TimeLog';
import { UserDashboard } from './pages/UserDashboard'; // User Dashboard
import { AdminContacts } from './pages/AdminContacts';
import { AdminUsers } from './pages/AdminUsers';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Admin Layout */}
        <Route
          path="/admindashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/tasks"
          element={
            <Layout>
              <Tasks />
            </Layout>
          }
        />
        <Route
          path="/admincontacts"
          element={
            <Layout> {/* Admin Layout */}
              <AdminContacts />
            </Layout>
          }
        />
        <Route
          path="/templates"
          element={
            <Layout>
              <Templates />
            </Layout>
          }
        />
        <Route
          path="/time-log"
          element={
            <Layout>
              <TimeLog />
            </Layout>
          }
        />
        <Route
          path="/adduser"
          element={
            <Layout> {/* Admin Layout */}
              <AdminUsers />
            </Layout>
          }
        />

        {/* User Layout */}
        <Route
          path="/userdashboard"
          element={
            <UserLayout>
              <UserDashboard />
            </UserLayout>
          }
        />
        <Route
          path="/contacts"
          element={
            <UserLayout>
              <Contacts />
            </UserLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
