import { useState } from 'react';
import { Mail, FolderOpen, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const IntegrationCard = ({ type, title, icon: Icon, children }) => {
  return (
    <div className="card mb-6">
      <div className="flex items-center mb-4">
        <Icon className="h-6 w-6 text-primary-600 mr-3" />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
};

const EmailIntegration = ({ token }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    imap_server: 'imap.gmail.com',
    imap_port: 993,
    email: '',
    password: ''
  });
  const [testResult, setTestResult] = useState(null);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE}/integrations/email`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
      setShowForm(false);
    } catch (error) {
      if (error.response?.status === 404) {
        setShowForm(true);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = config ? 'put' : 'post';
      await axios[method](`${API_BASE}/integrations/email`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchConfig();
      alert('Email integration configured successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to configure email integration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API_BASE}/integrations/email/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult(response.data);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.detail || 'Test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async () => {
    try {
      await axios.post(`${API_BASE}/integrations/email/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchConfig();
    } catch (error) {
      alert('Failed to toggle monitoring');
    }
  };

  return (
    <IntegrationCard type="email" title="Email Integration" icon={Mail}>
      {config && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status: {config.is_active ? 'Active' : 'Inactive'}</p>
            {config.last_sync && (
              <p className="text-xs text-gray-600">Last sync: {new Date(config.last_sync).toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-600">Emails processed: {config.sync_count}</p>
          </div>
          <button onClick={handleToggle} className={`btn btn-sm ${config.is_active ? 'btn-secondary' : 'btn-primary'}`}>
            {config.is_active ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
      )}

      {showForm || !config ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Server</label>
              <input
                type="text"
                required
                className="input"
                value={formData.imap_server}
                onChange={(e) => setFormData({ ...formData, imap_server: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                required
                className="input"
                value={formData.imap_port}
                onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="input"
              placeholder="inbox@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-3">
            {config && (
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex space-x-3">
          <button onClick={() => setShowForm(true)} className="btn btn-secondary">
            Update Settings
          </button>
          <button onClick={handleTest} disabled={testing} className="btn btn-primary">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Connection
          </button>
        </div>
      )}

      {testResult && (
        <div className={`mt-4 p-3 rounded-lg flex items-center ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {testResult.success ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
          <p className="text-sm">{testResult.message}</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> System will monitor inbox for emails from registered employee addresses with PDF/JPG/CSV attachments.
        </p>
      </div>
    </IntegrationCard>
  );
};

const DriveIntegration = ({ token }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    oauth_credentials: '',
    folder_id: ''
  });
  const [testResult, setTestResult] = useState(null);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE}/integrations/drive`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
      setShowForm(false);
    } catch (error) {
      if (error.response?.status === 404) {
        setShowForm(true);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = config ? 'put' : 'post';
      await axios[method](`${API_BASE}/integrations/drive`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchConfig();
      alert('Drive integration configured successfully!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to configure Drive integration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API_BASE}/integrations/drive/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult(response.data);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.detail || 'Test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async () => {
    try {
      await axios.post(`${API_BASE}/integrations/drive/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchConfig();
    } catch (error) {
      alert('Failed to toggle monitoring');
    }
  };

  return (
    <IntegrationCard type="drive" title="Google Drive Integration" icon={FolderOpen}>
      {config && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status: {config.is_active ? 'Active' : 'Inactive'}</p>
            {config.last_sync && (
              <p className="text-xs text-gray-600">Last sync: {new Date(config.last_sync).toLocaleString()}</p>
            )}
            <p className="text-xs text-gray-600">Files processed: {config.sync_count}</p>
          </div>
          <button onClick={handleToggle} className={`btn btn-sm ${config.is_active ? 'btn-secondary' : 'btn-primary'}`}>
            {config.is_active ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
      )}

      {showForm || !config ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OAuth Credentials (JSON)</label>
            <textarea
              required
              className="input font-mono text-sm"
              rows="6"
              placeholder='{"client_id": "...", "client_secret": "...", ...}'
              value={formData.oauth_credentials}
              onChange={(e) => setFormData({ ...formData, oauth_credentials: e.target.value })}
            />
            <p className="text-xs text-gray-600 mt-1">Paste your Google OAuth credentials JSON here</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Folder ID</label>
            <input
              type="text"
              required
              className="input font-mono"
              placeholder="1a2b3c4d5e6f7g8h9i0j"
              value={formData.folder_id}
              onChange={(e) => setFormData({ ...formData, folder_id: e.target.value })}
            />
            <p className="text-xs text-gray-600 mt-1">The ID of the Google Drive folder to monitor</p>
          </div>

          <div className="flex justify-end space-x-3">
            {config && (
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex space-x-3">
          <button onClick={() => setShowForm(true)} className="btn btn-secondary">
            Update Settings
          </button>
          <button onClick={handleTest} disabled={testing} className="btn btn-primary">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Test Connection
          </button>
        </div>
      )}

      {testResult && (
        <div className={`mt-4 p-3 rounded-lg flex items-center ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {testResult.success ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
          <p className="text-sm">{testResult.message}</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> System will monitor the specified folder for files owned by registered employees.
        </p>
      </div>
    </IntegrationCard>
  );
};

export { EmailIntegration, DriveIntegration };
