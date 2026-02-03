import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  HardDrive,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  AlertCircle,
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import { integrationsAPI } from '../api/client';

const Connect = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState({
    gmail: { connected: false, configured: false, last_sync: null },
    drive: { connected: false, configured: false, last_sync: null }
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchStatus();

    // Check for OAuth callback results
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    // Handle Popup Logic
    if (window.opener && (success || error)) {
      if (success) {
        window.opener.postMessage({ type: 'INTEGRATION_SUCCESS', provider: success }, window.location.origin);
      } else if (error) {
        window.opener.postMessage({ type: 'INTEGRATION_ERROR', error: error }, window.location.origin);
      }
      window.close();
      return;
    }

    // Listen for messages from popup
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'INTEGRATION_SUCCESS') {
        setNotification({
          type: 'success',
          message: `${event.data.provider === 'gmail' ? 'Gmail' : 'Google Drive'} connected successfully!`
        });
        fetchStatus();
      } else if (event.data?.type === 'INTEGRATION_ERROR') {
        const errorMessages = {
          'missing_params': 'OAuth callback missing required parameters.',
          'invalid_state': 'Invalid OAuth state. Please try again.',
          'token_exchange_failed': 'Failed to exchange authorization code.',
          'server_error': 'A server error occurred. Please try again.',
          'access_denied': 'Access was denied. Please authorize the application.'
        };
        setNotification({
          type: 'error',
          message: errorMessages[event.data.error] || 'An error occurred during authentication.'
        });
      }
    };
    window.addEventListener('message', handleMessage);

    if (success) {
      setNotification({
        type: 'success',
        message: `${success === 'gmail' ? 'Gmail' : 'Google Drive'} connected successfully!`
      });
      setSearchParams({});
      fetchStatus();
    } else if (error) {
      const errorMessages = {
        'missing_params': 'OAuth callback missing required parameters.',
        'invalid_state': 'Invalid OAuth state. Please try again.',
        'token_exchange_failed': 'Failed to exchange authorization code.',
        'server_error': 'A server error occurred. Please try again.',
        'access_denied': 'Access was denied. Please authorize the application.'
      };
      setNotification({
        type: 'error',
        message: errorMessages[error] || 'An error occurred during authentication.'
      });
      setSearchParams({});
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await integrationsAPI.getStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (type) => {
    setConnecting(type);
    try {
      const response = type === 'gmail'
        ? await integrationsAPI.getGmailAuthUrl()
        : await integrationsAPI.getDriveAuthUrl();

      // Open OAuth URL in new window
      window.open(response.data.auth_url, '_blank', 'width=600,height=700');
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to initiate connection'
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (type) => {
    if (!window.confirm(`Are you sure you want to disconnect ${type === 'gmail' ? 'Gmail' : 'Google Drive'}?`)) {
      return;
    }

    try {
      if (type === 'gmail') {
        await integrationsAPI.disconnectGmail();
      } else {
        await integrationsAPI.disconnectDrive();
      }
      setNotification({
        type: 'success',
        message: `${type === 'gmail' ? 'Gmail' : 'Google Drive'} disconnected successfully.`
      });
      fetchStatus();
    } catch (error) {
      setNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to disconnect'
      });
    }
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Connect Integrations</h1>
        <p className="text-gray-600 mt-2">
          Connect your Gmail or Google Drive to automatically collect employee timesheets
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl flex items-start justify-between ${notification.type === 'success'
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-red-50 border border-red-200'
          }`}>
          <div className="flex items-start">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            )}
            <p className={`text-sm ${notification.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={dismissNotification}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Integration Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Gmail Card */}
        <div className="card relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-red-50 rounded-bl-full opacity-50" />

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/25">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Gmail</h2>
                  <p className="text-sm text-gray-500">Collect timesheets from email</p>
                </div>
              </div>
              {status.gmail.connected && (
                <span className="flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Connected
                </span>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Zap className="h-4 w-4 mr-2 text-amber-500" />
                Automatically detect timesheet attachments
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2 text-blue-500" />
                Secure OAuth 2.0 authentication
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <RefreshCw className="h-4 w-4 mr-2 text-green-500" />
                Real-time email monitoring
              </div>
            </div>

            {/* Status info */}
            {status.gmail.connected && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg space-y-1">
                {status.gmail.email && (
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    {status.gmail.email}
                  </p>
                )}
                <p className="text-xs text-gray-500 ml-4">
                  Last synced: {status.gmail.last_sync ? new Date(status.gmail.last_sync).toLocaleString() : 'Never'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {status.gmail.connected ? (
                <>
                  <button
                    onClick={() => handleDisconnect('gmail')}
                    className="flex items-center px-4 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </button>
                  <button
                    onClick={fetchStatus}
                    className="flex items-center px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect('gmail')}
                  disabled={connecting === 'gmail'}
                  className="group flex items-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium shadow-lg shadow-red-500/25 hover:shadow-xl hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50"
                >
                  {connecting === 'gmail' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                      Connect Gmail
                      <ExternalLink className="h-4 w-4 ml-2 opacity-70" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Google Drive Card */}
        <div className="card relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-50 rounded-bl-full opacity-50" />

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25">
                  <HardDrive className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Google Drive</h2>
                  <p className="text-sm text-gray-500">Watch a folder for timesheets</p>
                </div>
              </div>
              {status.drive.connected && (
                <span className="flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Connected
                </span>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <Zap className="h-4 w-4 mr-2 text-amber-500" />
                Monitor shared folder for new files
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Shield className="h-4 w-4 mr-2 text-blue-500" />
                Secure OAuth 2.0 authentication
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                Supports PDF, JPG, and CSV files
              </div>
            </div>

            {/* Status info */}
            {status.drive.connected && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg space-y-1">
                {status.drive.folder_id && (
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Folder ID: {status.drive.folder_id}
                  </p>
                )}
                <p className="text-xs text-gray-500 ml-4">
                  Last synced: {status.drive.last_sync ? new Date(status.drive.last_sync).toLocaleString() : 'Never'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {status.drive.connected ? (
                <>
                  <button
                    onClick={() => handleDisconnect('drive')}
                    className="flex items-center px-4 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </button>
                  <button
                    onClick={fetchStatus}
                    className="flex items-center px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConnect('drive')}
                  disabled={connecting === 'drive'}
                  className="group flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                  {connecting === 'drive' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <HardDrive className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                      Connect Drive
                      <ExternalLink className="h-4 w-4 ml-2 opacity-70" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How it works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Connect</p>
              <p className="text-sm text-gray-600">Authorize TimesheetPro to access your Gmail or Drive</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Monitor</p>
              <p className="text-sm text-gray-600">We automatically watch for new timesheet files</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Process</p>
              <p className="text-sm text-gray-600">Timesheets are parsed and added to the system</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connect;
