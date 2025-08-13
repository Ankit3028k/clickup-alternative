import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import InvitationPage from './pages/InvitationPage';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import TaskView from './pages/TaskView';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import WorkspaceTasksPage from './pages/WorkspaceTasksPage';
import WorkspacesPage from './pages/WorkspacesPage';
import TasksPage from './pages/TasksPage';
import TimeTrackingPage from './pages/TimeTrackingPage';
import TeamPage from './pages/TeamPage';
import CreateWorkspacePage from './pages/CreateWorkspacePage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                <Route path="/register" element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } />
                <Route path="/invite/:token" element={<InvitationPage />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="workspaces" element={<WorkspacesPage />} />
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="time" element={<TimeTrackingPage />} />
                  <Route path="team" element={<TeamPage />} />
                  <Route path="workspace/create" element={<CreateWorkspacePage />} />
                  <Route path="workspace/:workspaceId" element={<Workspace />} />
                  <Route path="workspace/:workspaceId/tasks" element={<WorkspaceTasksPage />} />
                  <Route path="workspace/:workspaceId/task/:taskId" element={<TaskView />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  theme: {
                    primary: '#4aed88',
                  },
                },
                error: {
                  duration: 5000,
                  theme: {
                    primary: '#f44336',
                  },
                },
              }}
            />
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
