import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock, 
  Users, 
  Calendar,
  BarChart3,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: workspaces, isLoading: workspacesLoading } = useQuery(
    'workspaces',
    () => api.get('/workspaces'),
    {
      select: (response) => response.data.data
    }
  );

  const { data: recentTasks, isLoading: tasksLoading } = useQuery(
    'recent-tasks',
    () => api.get('/tasks?limit=10&sortBy=createdAt&sortOrder=desc'),
    {
      select: (response) => response.data.data.tasks
    }
  );

  const { data: timeStats, isLoading: timeLoading } = useQuery(
    'time-stats',
    () => api.get('/time/stats'),
    {
      select: (response) => response.data.data
    }
  );

  if (workspacesLoading || tasksLoading || timeLoading) {
    return <LoadingSpinner />;
  }

  const stats = [
    {
      title: 'Total Tasks',
      value: recentTasks?.length || 0,
      icon: CheckSquare,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Workspaces',
      value: workspaces?.length || 0,
      icon: LayoutDashboard,
      color: 'bg-green-500'
    },
    {
      title: 'Time Tracked',
      value: `${Math.round((timeStats?.totalTime || 0) / 60)}h`,
      icon: Clock,
      color: 'bg-purple-500'
    },
    {
      title: 'Team Members',
      value: workspaces?.reduce((acc, ws) => acc + ws.members.length, 0) || 0,
      icon: Users,
      color: 'bg-orange-500'
    }
  ];

  const filteredTasks = recentTasks?.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspaces Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Workspaces</h2>
                <Link
                  to="/workspace/create"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Workspace
                </Link>
              </div>
            </div>
            <div className="p-6">
              {workspaces?.length === 0 ? (
                <div className="text-center py-8">
                  <LayoutDashboard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No workspaces</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating your first workspace.</p>
                  <div className="mt-6">
                    <Link
                      to="/workspace/create"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workspace
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {workspaces?.map((workspace) => (
                    <Link
                      key={workspace._id}
                      to={`/workspace/${workspace._id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                            style={{ backgroundColor: workspace.color }}
                          >
                            {workspace.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-900">{workspace.name}</h3>
                            <p className="text-sm text-gray-500">
                              {workspace.members.length} members • {workspace.spaces.length} spaces
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Tasks Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {filteredTasks?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
                  <p className="mt-1 text-sm text-gray-500">Create your first task to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTasks?.map((task) => (
                    <Link
                      key={task._id}
                      to={`/workspace/${task.list?.folder?.space?.workspace?._id}/task/${task._id}`}
                      className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {task.list?.name} • {task.status}
                          </p>
                          <div className="flex items-center mt-2 space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
