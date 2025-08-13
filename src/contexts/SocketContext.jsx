import { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://clickup-alternative.onrender.com';
      const newSocket = io(socketUrl, {
        auth: {
          token: localStorage.getItem('token'),
          userId: user._id,
        },
        autoConnect: false, // Don't auto-connect to prevent immediate errors
        transports: ['websocket', 'polling'], // Fallback transports
      });

      // Add error handling
      newSocket.on('connect_error', (error) => {
        console.warn('Socket connection failed:', error.message);
        // Don't throw error, just log it
      });

      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
      });

      // Try to connect
      newSocket.connect();

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else {
      // Close socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [isAuthenticated, user]);

  const joinWorkspace = useCallback((workspaceId) => {
    if (socket) {
      socket.emit('join-workspace', workspaceId);
    }
  }, [socket]);

  const leaveWorkspace = useCallback((workspaceId) => {
    if (socket) {
      socket.emit('leave-workspace', workspaceId);
    }
  }, [socket]);

  const joinTask = useCallback((taskId) => {
    if (socket) {
      socket.emit('join-task', taskId);
    }
  }, [socket]);

  const leaveTask = useCallback((taskId) => {
    if (socket) {
      socket.emit('leave-task', taskId);
    }
  }, [socket]);

  const sendMessage = useCallback((data) => {
    if (socket) {
      socket.emit('send-message', data);
    }
  }, [socket]);

  const onTaskCreated = useCallback((callback) => {
    if (socket) {
      socket.on('task-created', callback);
    }
    return () => {
      if (socket) {
        socket.off('task-created', callback);
      }
    };
  }, [socket]);

  const onTaskUpdated = useCallback((callback) => {
    if (socket) {
      socket.on('task-updated', callback);
    }
    return () => {
      if (socket) {
        socket.off('task-updated', callback);
      }
    };
  }, [socket]);

  const onTaskDeleted = useCallback((callback) => {
    if (socket) {
      socket.on('task-deleted', callback);
    }
    return () => {
      if (socket) {
        socket.off('task-deleted', callback);
      }
    };
  }, [socket]);

  const onCommentAdded = useCallback((callback) => {
    if (socket) {
      socket.on('comment-added', callback);
    }
    return () => {
      if (socket) {
        socket.off('comment-added', callback);
      }
    };
  }, [socket]);

  const onReceiveMessage = useCallback((callback) => {
    if (socket) {
      socket.on('receive-message', callback);
    }
    return () => {
      if (socket) {
        socket.off('receive-message', callback);
      }
    };
  }, [socket]);

  const value = {
    socket,
    isConnected: !!socket && socket.connected,
    joinWorkspace,
    leaveWorkspace,
    joinTask,
    leaveTask,
    sendMessage,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onCommentAdded,
    onReceiveMessage,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
