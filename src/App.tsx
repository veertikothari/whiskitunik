import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';          // Admin Sidebar Layout
import { UserLayout } from './components/UserLayout';  // User Sidebar Layout

import { Login } from './pages/Login';
import { Dashboard } from './pages/AdminDashboard';         // Admin Dashboard
import { AdminTasks } from './pages/AdminTasks';
import { Contacts } from './pages/Contacts';
import { AdminTemplates } from './pages/AdminTemplates';
import { Templates } from './pages/Templates';
import { TimeLog } from './pages/TimeLog';
import { UserDashboard } from './pages/UserDashboard'; // User Dashboard
import { AdminContacts } from './pages/AdminContacts';
import { AdminUsers } from './pages/AdminUsers';
import { Guidelines } from './pages/Guidelines';
import { AdminSearchScreen } from './pages/AdminSearchScreen';
import { SearchScreen } from './pages/SearchScreen';
import { Tasks } from './pages/Tasks';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
              <AdminTasks />
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
          path="/adminsearch"
          element={
            <Layout>
              <AdminSearchScreen />
            </Layout>
          }
        />
        <Route
          path="/admintemplates"
          element={
            <Layout>
              <Templates />
            </Layout>
          }
        />
        <Route
          path="/adminguidelines"
          element={
            <Layout>
              <Guidelines />
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
          path="/search"
          element={
            <UserLayout>
              <SearchScreen />
            </UserLayout>
          }
        />
        <Route
          path="/usertasks"
          element={
            <UserLayout>
              <Tasks />
            </UserLayout>
          }
        />
        <Route
          path="/templates"
          element={
            <UserLayout>
              <Templates />
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
        <Route
          path="/guidelines"
          element={
            <UserLayout>
              <Guidelines />
            </UserLayout>
          }
        />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
