import { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { employeesAPI, timesheetsAPI } from '../api/client';

const TimesheetUpload = () => {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [recentUploads, setRecentUploads] = useState([]);

    useEffect(() => {
        fetchEmployees();
        fetchRecentUploads();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await employeesAPI.getAll();
            setEmployees(response.data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const fetchRecentUploads = async () => {
        try {
            const response = await timesheetsAPI.getUploads({ limit: 10 });
            setRecentUploads(response.data);
        } catch (error) {
            console.error('Failed to fetch recent uploads:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
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
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('employee_id', selectedEmployee);

            await timesheetsAPI.upload(formData);

            setUploadResult({
                success: true,
                message: 'Timesheet uploaded successfully!'
            });

            // Reset form
            setSelectedEmployee('');
            setSelectedFile(null);
            document.getElementById('file-input').value = '';

            // Refresh recent uploads
            fetchRecentUploads();

        } catch (error) {
            setUploadResult({
                success: false,
                message: error.response?.data?.detail || 'Failed to upload timesheet'
            });
        } finally {
            setUploading(false);
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

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Upload Timesheet</h1>
                <p className="text-gray-600 mt-2">Manually upload employee timesheets (PDF, JPG, CSV)</p>
            </div>

            {/* Upload Form */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-6">Upload New Timesheet</h2>

                {uploadResult && (
                    <div className={`mb-6 p-4 rounded-lg flex items-start ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {uploadResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                        )}
                        <p className={`text-sm ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                            {uploadResult.message}
                        </p>
                    </div>
                )}

                <form onSubmit={handleUpload} className="space-y-6">
                    <div>
                        <label htmlFor="employee-select" className="block text-sm font-medium text-gray-700 mb-2">
                            Select Employee *
                        </label>
                        <select
                            id="employee-select"
                            name="employee"
                            required
                            className="input"
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                            <option value="">Choose an employee...</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.first_name} {emp.last_name} ({emp.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select File *
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                            <div className="space-y-1 text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label
                                        htmlFor="file-input"
                                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none"
                                    >
                                        <span>Upload a file</span>
                                        <input
                                            id="file-input"
                                            type="file"
                                            className="sr-only"
                                            accept=".pdf,.jpg,.jpeg,.csv"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">PDF, JPG, or CSV up to 10MB</p>
                                {selectedFile && (
                                    <div className="mt-4 flex items-center justify-center text-sm text-gray-700">
                                        <FileText className="h-5 w-5 mr-2 text-primary-600" />
                                        <span className="font-medium">{selectedFile.name}</span>
                                        <span className="ml-2 text-gray-500">
                                            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={uploading || !selectedEmployee || !selectedFile}
                            className="btn btn-primary"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Timesheet
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Recent Uploads */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Recent Uploads</h2>

                {recentUploads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No uploads yet</p>
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
                                </tr>
                            </thead>
                            <tbody>
                                {recentUploads.map((upload) => {
                                    const employee = employees.find(e => e.id === upload.employee_id);
                                    return (
                                        <tr key={upload.id}>
                                            <td className="font-medium">
                                                {employee ? `${employee.first_name} ${employee.last_name}` : `ID: ${upload.employee_id}`}
                                            </td>
                                            <td className="text-sm font-mono">{upload.file_name}</td>
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

export default TimesheetUpload;
