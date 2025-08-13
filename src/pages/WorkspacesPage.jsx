import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { Plus, Users, Settings, Calendar } from 'lucide-react';
import { workspaceAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const WorkspacesPage = () => {
  const { data: workspaces, isLoading, error } = useQuery(
    'workspaces',
    () => workspaceAPI.getWorkspaces(),
    {
      select: (response) => response.data.data
    }
  );

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading workspaces</h2>
          <p className="text-gray-600">{error.response?.data?.message || 'Something went wrong'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
            <p className="text-gray-600 mt-2">Manage your workspaces and collaborate with your team</p>
          </div>
          <Link
            to="/workspace/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Link>
        </div>

        {workspaces && workspaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
              <p className="text-gray-600 mb-6">Create your first workspace to get started</p>
              <Link
                to="/workspace/create"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Workspace
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces?.map((workspace) => (
              <div key={workspace._id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
                        style={{ backgroundColor: workspace.color }}
                      >
                        {workspace.icon || workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">{workspace.name}</h3>
                        <p className="text-sm text-gray-600">
                          {workspace.members?.length || 0} member{workspace.members?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>

                  {workspace.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workspace.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      Created {new Date(workspace.createdAt).toLocaleDateString()}
                    </div>
                    <Link
                      to={`/workspace/${workspace._id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspacesPage;
