import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clientsAPI, employeesAPI, timesheetsAPI } from '../api/client';
import {
  Clock,
  Filter,
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Mail,
  HardDrive,
  MousePointerClick,
  Sparkles,
  Building2,
  User,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { integrationsAPI } from '../api/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Timesheets = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchTimesheets();
    fetchClients();
    fetchEmployees();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedClient) {
      const filtered = employees.filter(emp =>
        emp.client_assignments?.some(assignment => assignment.client_id === parseInt(selectedClient))
      );
      setFilteredEmployees(filtered);
      setSelectedEmployee('');
    } else {
      setFilteredEmployees(employees);
    }
  }, [selectedClient, employees]);

  const fetchTimesheets = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await timesheetsAPI.getUploads(params);
      setTimesheets(response.data);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
      setTimesheets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setClients(response.data);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      analyzed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      submitted: 'bg-blue-100 text-blue-800 border-blue-200',
      approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };
    return `px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`;
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'email':
        return <Mail className="h-4 w-4 text-red-500" />;
      case 'drive':
        return <HardDrive className="h-4 w-4 text-blue-500" />;
      default:
        return <MousePointerClick className="h-4 w-4 text-purple-500" />;
    }
  };

  const getSourceLabel = (source) => {
    const labels = {
      email: 'Email',
      drive: 'Drive',
      manual: 'Manual'
    };
    return labels[source] || 'Manual';
  };

  const handleStatusFilter = (status) => {
    if (status === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ status });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'text/csv'];
    if (!validTypes.includes(file.type)) {
      setUploadResult({
        success: false,
        message: 'Invalid file type. Only PDF, JPG, and CSV files are allowed.'
      });
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedEmployee || !selectedFile) {
      setUploadResult({
        success: false,
        message: 'Please select both an employee and a file.'
      });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('employee_id', selectedEmployee);

      await axios.post(`${API_BASE}/timesheets/uploads/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadResult({
        success: true,
        message: 'Timesheet uploaded successfully!'
      });

      // Reset form after short delay
      setTimeout(() => {
        setSelectedClient('');
        setSelectedEmployee('');
        setSelectedFile(null);
        setUploadResult(null);
        setShowUploadModal(false);
        fetchTimesheets();
      }, 1500);

    } catch (error) {
      setUploadResult({
        success: false,
        message: error.response?.data?.detail || 'Failed to upload timesheet'
      });
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedClient('');
    setSelectedEmployee('');
    setSelectedFile(null);
    setUploadResult(null);
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      // Sync both Drive and Email
      await Promise.allSettled([
        integrationsAPI.sync('email'),
        integrationsAPI.sync('drive')
      ]);
      await fetchTimesheets();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setLoading(false);
    }
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
      {/* Header with Upload Button */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-600 mt-2">Manage timesheets collected via email, drive, or manual upload</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSync}
            className="flex items-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Sync Now
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="group relative inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <Upload className="h-5 w-5 mr-2 group-hover:animate-bounce" />
            Upload Timesheet
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'processing', 'analyzed', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${statusFilter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timesheets List */}
      <div className="card">
        {timesheets.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-6">
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'all' ? 'No timesheets yet' : `No ${statusFilter} timesheets`}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Timesheets will appear here once they're collected via email, Google Drive, or manual upload.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload your first timesheet
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">File</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timesheets.map((timesheet) => {
                  const employee = employees.find(e => e.id === timesheet.employee_id);
                  return (
                    <tr key={timesheet.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 rounded-lg bg-gray-100">
                            {getSourceIcon(timesheet.source)}
                          </div>
                          <span className="text-sm text-gray-600">{getSourceLabel(timesheet.source)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900">
                          {employee ? `${employee.first_name} ${employee.last_name}` : `ID: ${timesheet.employee_id}`}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono text-gray-600">{timesheet.file_name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 uppercase">
                          {timesheet.file_format}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={getStatusBadge(timesheet.status)}>
                          {timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {timesheet.created_at ? format(new Date(timesheet.created_at), 'MMM dd, yyyy HH:mm') : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
              onClick={closeModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto transform transition-all">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Upload Timesheet</h3>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                {uploadResult && (
                  <div className={`mb-6 p-4 rounded-xl flex items-start ${uploadResult.success
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    {uploadResult.success ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <p className={`text-sm ${uploadResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                      {uploadResult.message}
                    </p>
                  </div>
                )}

                <form onSubmit={handleUpload} className="space-y-5">
                  {/* Client Filter */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                      Filter by Client (Optional)
                    </label>
                    <select
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    >
                      <option value="">All Clients</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Employee Select */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      Select Employee *
                    </label>
                    <select
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                    >
                      <option value="">Choose an employee...</option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.email})
                        </option>
                      ))}
                    </select>
                    {selectedClient && filteredEmployees.length === 0 && (
                      <p className="mt-2 text-sm text-amber-600">
                        No employees assigned to this client.
                      </p>
                    )}
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      Upload File *
                    </label>
                    <div
                      className={`relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer ${dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : selectedFile
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                        }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input').click()}
                    >
                      <input
                        id="file-input"
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.csv"
                        onChange={handleFileChange}
                      />
                      <div className="text-center">
                        {selectedFile ? (
                          <>
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                              <CheckCircle className="h-6 w-6 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                              <Upload className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">
                              Drop your file here or <span className="text-blue-600">browse</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, or CSV up to 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2.5 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors mr-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !selectedEmployee || !selectedFile}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheets;
