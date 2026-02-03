import { useState, useEffect } from 'react';
import { FileText, Filter, Download, Trash2, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const TimesheetDashboard = () => {
    const [uploads, setUploads] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        employee_id: '',
        source: '',
        status: ''
    });

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');

            // Build query params
            const params = new URLSearchParams();
            if (filters.employee_id) params.append('employee_id', filters.employee_id);
            if (filters.source) params.append('source', filters.source);
            if (filters.status) params.append('status_filter', filters.status);

            // Fetch uploads
            const uploadsResponse = await axios.get(
                `${API_BASE}/timesheets/uploads?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUploads(uploadsResponse.data);

            // Fetch stats
            const statsResponse = await axios.get(
                `${API_BASE}/timesheets/uploads/stats/summary`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStats(statsResponse.data);

            // Fetch employees
            const employeesResponse = await axios.get(
                `${API_BASE}/employees`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEmployees(employeesResponse.data);

        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (uploadId) => {
        if (!confirm('Are you sure you want to delete this upload?')) return;

        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`${API_BASE}/timesheets/uploads/${uploadId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert('Failed to delete upload');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            processing: 'badge-info',
            analyzed: 'badge-success',
            failed: 'badge-error'
        };
        return badges[status] || 'badge-gray';
    };

    const getSourceBadge = (source) => {
        const badges = {
            manual: 'badge-primary',
            email: 'badge-info',
            drive: 'badge-success'
        };
        return badges[source] || 'badge-gray';
    };

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Timesheet Dashboard</h1>
                    <p className="text-gray-600 mt-2">View and manage all collected timesheets</p>
                </div>
                <button onClick={fetchData} className="btn btn-secondary">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Uploads</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                            </div>
                            <FileText className="h-12 w-12 text-primary-600 opacity-20" />
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.by_status.pending}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <span className="text-2xl">⏳</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Analyzed</p>
                                <p className="text-3xl font-bold text-green-600 mt-1">{stats.by_status.analyzed}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-2xl">✓</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Failed</p>
                                <p className="text-3xl font-bold text-red-600 mt-1">{stats.by_status.failed}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-2xl">✗</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Source Breakdown */}
            {stats && (
                <div className="card mb-8">
                    <h2 className="text-lg font-semibold mb-4">Uploads by Source</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-primary-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-600">Manual</p>
                            <p className="text-2xl font-bold text-primary-600 mt-1">{stats.by_source.manual}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-600">Email</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.by_source.email}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-600">Drive</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{stats.by_source.drive}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex items-center mb-4">
                    <Filter className="h-5 w-5 text-gray-600 mr-2" />
                    <h2 className="text-lg font-semibold">Filters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                        <select
                            className="input"
                            value={filters.employee_id}
                            onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
                        >
                            <option value="">All Employees</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                        <select
                            className="input"
                            value={filters.source}
                            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                        >
                            <option value="">All Sources</option>
                            <option value="manual">Manual</option>
                            <option value="email">Email</option>
                            <option value="drive">Drive</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            className="input"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="analyzed">Analyzed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {(filters.employee_id || filters.source || filters.status) && (
                    <div className="mt-4">
                        <button
                            onClick={() => setFilters({ employee_id: '', source: '', status: '' })}
                            className="btn btn-secondary btn-sm"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Uploads Table */}
            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">All Uploads ({uploads.length})</h2>
                </div>

                {uploads.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No timesheets found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>File Name</th>
                                    <th>Format</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th>Uploaded</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploads.map((upload) => {
                                    const employee = employees.find(e => e.id === upload.employee_id);
                                    return (
                                        <tr key={upload.id}>
                                            <td className="font-medium">
                                                {employee ? `${employee.first_name} ${employee.last_name}` : `ID: ${upload.employee_id}`}
                                            </td>
                                            <td className="text-sm font-mono max-w-xs truncate" title={upload.file_name}>
                                                {upload.file_name}
                                            </td>
                                            <td>
                                                <span className="badge-gray uppercase">{upload.file_format}</span>
                                            </td>
                                            <td>
                                                <span className={getSourceBadge(upload.source)}>{upload.source}</span>
                                            </td>
                                            <td>
                                                <span className={getStatusBadge(upload.status)}>{upload.status}</span>
                                            </td>
                                            <td className="text-sm text-gray-600">
                                                {new Date(upload.created_at).toLocaleString()}
                                            </td>
                                            <td>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleDelete(upload.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimesheetDashboard;
