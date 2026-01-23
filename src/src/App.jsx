import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Timesheets from './pages/Timesheets';
import Employees from './pages/Employees';
import EmployeeOnboarding from './pages/EmployeeOnboarding';
import Clients from './pages/Clients';
import ClientOnboarding from './pages/ClientOnboarding';
import Calendars from './pages/Calendars';
import Configurations from './pages/Configurations';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/timesheets"
            element={
              <ProtectedRoute>
                <Layout>
                  <Timesheets />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['manager', 'finance', 'admin']}>
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/onboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <EmployeeOnboarding />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute allowedRoles={['manager', 'finance', 'admin']}>
                <Layout>
                  <Clients />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients/onboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <ClientOnboarding />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/calendars"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <Layout>
                  <Calendars />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/configurations"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <Configurations />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
