import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  BarChart3,
  Plus,
  Filter,
  Download
} from 'lucide-react';
import { timeAPI } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const TimeTrackingPage = () => {
  const queryClient = useQueryClient();
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTask, setCurrentTask] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState('week');

  // Get current timer
  const { data: currentTimer } = useQuery(
    'current-timer',
    () => timeAPI.getCurrentTimer(),
    {
      select: (response) => response.data.data,
      onSuccess: (data) => {
        if (data) {
          setIsTimerRunning(true);
          setCurrentTask(data.task);
          // Calculate elapsed time
          const startTime = new Date(data.startTime);
          const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
          setCurrentTime(elapsed);
        }
      }
    }
  );

  // Get time stats
  const { data: timeStats, isLoading: statsLoading } = useQuery(
    ['time-stats', filterPeriod],
    () => timeAPI.getTimeReports({ period: filterPeriod }),
    {
      select: (response) => response.data.data
    }
  );

  // Get time logs
  const { data: timeLogs, isLoading: logsLoading } = useQuery(
    ['time-logs', filterPeriod],
    () => timeAPI.getTimeLogs({ period: filterPeriod }),
    {
      select: (response) => response.data.data
    }
  );

  // Start timer mutation
  const startTimerMutation = useMutation(
    (data) => timeAPI.startTimer(data),
    {
      onSuccess: () => {
        setIsTimerRunning(true);
        setCurrentTime(0);
        queryClient.invalidateQueries('current-timer');
        toast.success('Timer started!');
      },
      onError: () => {
        toast.error('Failed to start timer');
      }
    }
  );

  // Stop timer mutation
  const stopTimerMutation = useMutation(
    () => timeAPI.stopTimer(),
    {
      onSuccess: () => {
        setIsTimerRunning(false);
        setCurrentTime(0);
        setCurrentTask(null);
        queryClient.invalidateQueries(['current-timer', 'time-stats', 'time-logs']);
        toast.success('Timer stopped!');
      },
      onError: () => {
        toast.error('Failed to stop timer');
      }
    }
  );

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    const taskName = prompt('Enter task name:');
    if (taskName) {
      startTimerMutation.mutate({ taskName, description: '' });
    }
  };

  const handleStopTimer = () => {
    stopTimerMutation.mutate();
  };

  if (statsLoading || logsLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-gray-600 mt-2">Track your time and analyze productivity</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Timer Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="text-center">
            <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
              {formatTime(currentTime)}
            </div>
            {currentTask && (
              <p className="text-lg text-gray-600 mb-4">Working on: {currentTask}</p>
            )}
            <div className="flex justify-center gap-4">
              {!isTimerRunning ? (
                <button
                  onClick={handleStartTimer}
                  disabled={startTimerMutation.isLoading}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Timer
                </button>
              ) : (
                <button
                  onClick={handleStopTimer}
                  disabled={stopTimerMutation.isLoading}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center disabled:opacity-50"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Timer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatTime(timeStats?.totalTime || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {timeStats?.sessionsCount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg/Day</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatTime(timeStats?.averagePerDay || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Time Logs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Time Logs</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {timeLogs && timeLogs.length > 0 ? (
              timeLogs.map((log) => (
                <div key={log._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{log.taskName || 'Untitled Task'}</h3>
                      <p className="text-sm text-gray-600">{log.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.startTime).toLocaleDateString()} •
                        {new Date(log.startTime).toLocaleTimeString()} -
                        {log.endTime ? new Date(log.endTime).toLocaleTimeString() : 'Running'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatTime(log.duration || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No time logs yet</h3>
                <p className="text-gray-600">Start tracking your time to see logs here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeTrackingPage;
