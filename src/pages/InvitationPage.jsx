import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Building,
  Mail
} from 'lucide-react';
import { invitationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const InvitationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Get invitation details
  const { data: invitationData, isLoading, error } = useQuery(
    ['invitation', token],
    () => invitationAPI.getInvitationDetails(token),
    {
      select: (response) => response.data.data,
      retry: false
    }
  );

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation(
    (data) => invitationAPI.acceptInvitation(token, data),
    {
      onSuccess: (response) => {
        toast.success('Invitation accepted successfully!');
        navigate('/dashboard');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to accept invitation');
      }
    }
  );

  // Decline invitation mutation
  const declineInvitationMutation = useMutation(
    () => invitationAPI.declineInvitation(token),
    {
      onSuccess: () => {
        toast.success('Invitation declined');
        navigate('/');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to decline invitation');
      }
    }
  );

  useEffect(() => {
    if (invitationData && isAuthenticated && user) {
      // Check if user's email matches invitation email
      if (user.email.toLowerCase() !== invitationData.invitation.email.toLowerCase()) {
        setShowLoginPrompt(true);
      }
    }
  }, [invitationData, isAuthenticated, user]);

  const handleAcceptInvitation = () => {
    if (!isAuthenticated) {
      // Store invitation token and redirect to login
      localStorage.setItem('pendingInvitation', token);
      navigate('/login', { 
        state: { 
          message: 'Please login to accept the invitation',
          redirectTo: `/invite/${token}`
        }
      });
      return;
    }

    if (user.email.toLowerCase() !== invitationData.invitation.email.toLowerCase()) {
      toast.error('This invitation is not for your email address');
      return;
    }

    acceptInvitationMutation.mutate({ userId: user._id });
  };

  const handleDeclineInvitation = () => {
    declineInvitationMutation.mutate();
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Invitation
            </h2>
            <p className="text-gray-600 mb-6">
              {error.response?.data?.message || 'This invitation link is invalid or has expired.'}
            </p>
            <Link
              to="/"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 inline-block"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const invitation = invitationData?.invitation;
  const workspace = invitationData?.workspace;
  const inviter = invitationData?.inviter;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              You're Invited!
            </h2>
            <p className="text-gray-600 mt-2">
              Join your team on ClickUp Alternative
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Building className="h-5 w-5 text-gray-500 mr-2" />
                <span className="font-medium text-gray-900">Workspace</span>
              </div>
              <p className="text-lg font-semibold text-blue-600">{workspace?.name}</p>
              {workspace?.description && (
                <p className="text-sm text-gray-600 mt-1">{workspace.description}</p>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <User className="h-5 w-5 text-gray-500 mr-2" />
                <span className="font-medium text-gray-900">Invited by</span>
              </div>
              <p className="text-gray-900">{inviter?.name}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Mail className="h-5 w-5 text-gray-500 mr-2" />
                <span className="font-medium text-gray-900">Email</span>
              </div>
              <p className="text-gray-900">{invitation?.email}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-gray-500 mr-2" />
                <span className="font-medium text-gray-900">Role</span>
              </div>
              <p className="text-gray-900 capitalize">{invitation?.role}</p>
            </div>

            {invitation?.metadata?.personalMessage && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800 italic">
                  "{invitation.metadata.personalMessage}"
                </p>
              </div>
            )}
          </div>

          {showLoginPrompt && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                This invitation is for {invitation?.email}. Please login with the correct account or create a new account with this email address.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={handleAcceptInvitation}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium"
                >
                  Login to Accept Invitation
                </button>
                <Link
                  to="/register"
                  state={{ email: invitation?.email, invitationToken: token }}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium text-center block"
                >
                  Create Account & Accept
                </Link>
              </>
            ) : (
              <button
                onClick={handleAcceptInvitation}
                disabled={acceptInvitationMutation.isLoading || showLoginPrompt}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptInvitationMutation.isLoading ? 'Accepting...' : 'Accept Invitation'}
              </button>
            )}

            <button
              onClick={handleDeclineInvitation}
              disabled={declineInvitationMutation.isLoading}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
            >
              {declineInvitationMutation.isLoading ? 'Declining...' : 'Decline'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              Expires on {new Date(invitation?.expiresAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitationPage;
