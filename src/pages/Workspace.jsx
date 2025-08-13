import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  LayoutDashboard, 
  FolderOpen, 
  List, 
  Plus, 
  Settings, 
  Users,
  Search,
  Grid,
  Calendar,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const Workspace = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: workspace, isLoading: workspaceLoading } = useQuery(
    ['workspace', workspaceId],
    () => api.get(`/workspaces/${workspaceId}`),
    {
      select: (response) => response.data.data
    }
  );

  const { data: spaces, isLoading: spacesLoading } = useQuery(
    ['spaces', workspaceId],
    () => api.get(`/spaces?workspace=${workspaceId}`),
    {
      select: (response) => response.data.data
    }
  );

  const { data: tasks, isLoading: tasksLoading } = useQuery(
    ['tasks', workspaceId],
    () => api.get(`/tasks?workspaceId=${workspaceId}`),
    {
      select: (response) => response.data.data.tasks
    }
  );

  if (workspaceLoading || spacesLoading || tasksLoading) {
    return <LoadingSpinner />;
  }

  const filteredTasks = tasks?.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status) => {
    const colors = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'done': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: workspace?.color }}
            >
              {workspace?.name?.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-lg font-semibold text-gray-900 truncate">{workspace?.name}</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to={`/workspace/${workspaceId}`}
            className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md"
          >
            <LayoutDashboard className="mr-3 h-4 w-4" />
            Dashboard
          </Link>
          
          <Link
            to={`/workspace/${workspaceId}/tasks`}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            <List className="mr-3 h-4 w-4" />
            All Tasks
          </Link>

          <Link
            to={`/workspace/${workspaceId}/calendar`}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            <Calendar className="mr-3 h-4 w-4" />
            Calendar
          </Link>

          <Link
            to={`/workspace/${workspaceId}/gantt`}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            <BarChart3 className="mr-3 h-4 w-4" />
            Gantt Chart
          </Link>

          <div className="pt-4 mt-4 border-t border-gray-200">
            <Link
              to={`/workspace/${workspaceId}/settings`}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <Settings className="mr-3 h-4 w-4" />
              Settings
            </Link>
            
            <Link
              to={`/workspace/${workspaceId}/members`}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <Users className="mr-3 h-4 w-4" />
              Members
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">WORKSPACE MEMBERS</div>
          <div className="space-y-2">
            {workspace?.members?.slice(0, 5).map((member) => (
              <div key={member.user._id} className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                  {member.user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-700 truncate">{member.user.name}</span>
              </div>
            ))}
            {workspace?.members?.length > 5 && (
              <div className="text-xs text-gray-500">+{workspace.members.length - 5} more</div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Link to="/dashboard" className="hover:text-gray-700">Dashboard</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900">{workspace?.name}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate(`/workspace/${workspaceId}/calendar`)}
                  className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  <Calendar className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => navigate(`/workspace/${workspaceId}/task/create`)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'list' && (
            <div className="space-y-6">
              {/* Spaces and Folders */}
              {spaces?.map((space) => (
                <div key={space._id} className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{space.name}</h3>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        <Plus className="h-4 w-4 inline mr-1" />
                        Add Folder
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {space.folders?.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h4 className="mt-2 text-sm font-medium text-gray-900">No folders</h4>
                        <p className="mt-1 text-sm text-gray-500">Create folders to organize your lists.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {space.folders?.map((folder) => (
                          <div key={folder._id} className="border border-gray-200 rounded-lg">
                            <div className="p-3 bg-gray-50 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900">{folder.name}</h4>
                                <button className="text-blue-600 hover:text-blue-700 text-sm">
                                  <Plus className="h-4 w-4 inline mr-1" />
                                  Add List
                                </button>
                              </div>
                            </div>
                            
                            <div className="p-3">
                              {folder.lists?.length === 0 ? (
                                <div className="text-center py-4">
                                  <List className="mx-auto h-8 w-8 text-gray-400" />
                                  <p className="mt-1 text-sm text-gray-500">No lists in this folder</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {folder.lists?.map((list) => (
                                    <div key={list._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                                      <h5 className="text-sm font-medium text-gray-900 mb-2">{list.name}</h5>
                                      <div className="space-y-2">
                                        {filteredTasks
                                          .filter(task => task.list?._id === list._id)
                                          .slice(0, 3)
                                          .map((task) => (
                                            <Link
                                              key={task._id}
                                              to={`/workspace/${workspaceId}/task/${task._id}`}
                                              className="block p-2 border border-gray-200 rounded hover:bg-gray-50"
                                            >
                                              <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-900 truncate">{task.title}</span>
                                                <div className="flex items-center space-x-1">
                                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                  </span>
                                                </div>
                                              </div>
                                            </Link>
                                          ))}
                                      </div>
                                      {filteredTasks.filter(task => task.list?._id === list._id).length > 3 && (
                                        <div className="text-xs text-gray-500 mt-2">
                                          +{filteredTasks.filter(task => task.list?._id === list._id).length - 3} more tasks
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'kanban' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Kanban Board</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['todo', 'in-progress', 'review', 'done'].map((status) => (
                    <div key={status} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">{status.replace('-', ' ')}</h4>
                      <div className="space-y-3">
                        {filteredTasks
                          .filter(task => task.status === status)
                          .map((task) => (
                            <div key={task._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                              <Link
                                to={`/workspace/${workspaceId}/task/${task._id}`}
                                className="block"
                              >
                                <h5 className="text-sm font-medium text-gray-900 mb-2">{task.title}</h5>
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  {task.dueDate && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {spaces?.length === 0 && (
            <div className="text-center py-12">
              <LayoutDashboard className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No spaces yet</h3>
              <p className="mt-2 text-sm text-gray-500">Create your first space to organize your work.</p>
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Space
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
