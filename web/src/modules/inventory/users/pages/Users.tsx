import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Search, Lock, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import Badge from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';

interface User {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  district: string;
  role: string;
  employeeNumber: string;
  branchId?: string;
  isActive: boolean;
  createdAt: string;
}

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya'
];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    address: '',
    district: '',
    role: 'StoreEmployee',
    employeeNumber: '',
    branchId: '',
    isActive: true
  });
  const [formErrors, setFormErrors] = useState<any>({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersRes, branchesRes] = await Promise.all([
        apiClient.get<any>('/users' + (searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '')),
        apiClient.get<any>('/branches?isActive=true')
      ]);
      const userList = Array.isArray(usersRes) ? usersRes : (usersRes?.data ?? []);
      const branchList = Array.isArray(branchesRes) ? branchesRes : (branchesRes?.data ?? []);
      setUsers(userList);
      setBranches(branchList);
      setError(null);
    } catch (err: any) {
      setError(err.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setIsEditing(true);
      setFormData({
        userId: user.userId,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        district: user.district,
        role: user.role,
        employeeNumber: user.employeeNumber || '',
        branchId: user.branchId || '',
        isActive: user.isActive
      });
    } else {
      setIsEditing(false);
      setFormData({
        fullName: '',
        username: '',
        email: '',
        phoneNumber: '',
        address: '',
        district: '',
        role: 'StoreEmployee',
        employeeNumber: '',
        branchId: branches.length > 0 ? branches[0].branchId : '',
        isActive: true
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const errs: any = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required.';
    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(formData.username)) errs.username = 'Username must start with a letter and contain only letters, numbers, dot, underscore, or hyphen.';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address (e.g. user@example.com).';
    }
    if (!/^(\+94|0)[1-9][0-9]{8}$/.test(formData.phoneNumber)) errs.phoneNumber = 'Invalid Sri Lankan phone number format (+94... or 0...).';
    if (!formData.district) errs.district = 'District is required.';
    if (formData.role === 'StoreEmployee' && !formData.employeeNumber?.trim()) errs.employeeNumber = 'Employee Number is required for Store Employees.';
    if ((formData.role === 'BranchManager' || formData.role === 'StoreEmployee') && !formData.branchId) {
      errs.branchId = 'Branch is required for Branch Managers and Store Employees.';
    }
    if (!isEditing && formData.password && formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters long if provided.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: any = {
      fullName: formData.fullName.trim(),
      username: formData.username.trim(),
      email: formData.email.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      address: formData.address?.trim() || '',
      district: formData.district || '',
      role: formData.role,
      employeeNumber: formData.employeeNumber?.trim() ? formData.employeeNumber.trim().toUpperCase() : '',
      branchId: (formData.role === 'BranchManager' || formData.role === 'StoreEmployee') && formData.branchId ? formData.branchId : null,
      isActive: Boolean(formData.isActive)
    };

    if (!isEditing && formData.password?.trim()) {
      payload.password = formData.password.trim();
    }

    try {
      if (isEditing) {
        await apiClient.put(`/users/${formData.userId}`, payload);
      } else {
        await apiClient.post('/users', payload);
      }
      setShowModal(false);
      await fetchUsers();
    } catch (err: any) {
      const apiErrors: any = {};
      let hasFieldErrors = false;

      if (err.data?.errors && typeof err.data.errors === 'object') {
        for (const [key, val] of Object.entries(err.data.errors)) {
          const cleanKey = key.replace(/^\$\.?/, '').replace(/^\[['"]?/, '').replace(/['"]?\]$/, '');
          const normalizedKey = cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1);
          const message = Array.isArray(val) ? val[0] : (val as string);
          apiErrors[normalizedKey] = message;
          hasFieldErrors = true;
        }
      }

      const fallbackMsg = err.data?.message || err.data?.title || err.message || 'An error occurred while saving the user.';
      if (!hasFieldErrors || err.data?.message) {
        apiErrors.general = fallbackMsg;
      }
      setFormErrors(apiErrors);
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      await apiClient.patch(`/users/${user.userId}/status`, { isActive: !user.isActive });
      await fetchUsers();
    } catch (err: any) {
      alert(err.data?.message || 'Failed to update status');
    }
  };

  const resetPassword = async (user: User) => {
    const newPwd = prompt(`Enter new password for ${user.username} (min 8 chars, uppercase, lowercase, number, symbol):`);
    if (!newPwd) return;

    try {
      await apiClient.post(`/users/${user.userId}/reset-password`, { newPassword: newPwd });
      alert(`Password for ${user.username} has been reset successfully.`);
    } catch (err: any) {
      alert(err.data?.message || err.data?.errors?.NewPassword?.[0] || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-h)]">User Management</h1>
          <p className="text-[var(--text)] mt-1">Manage system users, roles, and access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            title="Refresh Users List"
            className="flex items-center gap-1.5 border border-[var(--border)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-h)] px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl p-4 shadow-sm flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/50"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4">
                      <div className="font-medium text-[var(--text-h)]">{user.fullName}</div>
                      <div className="text-xs text-[var(--text)] mt-1">@{user.username}</div>
                      {user.employeeNumber && <div className="text-xs text-gray-400 mt-1">Emp #: {user.employeeNumber}</div>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-[var(--text-h)]">
                        <Shield className="w-4 h-4 text-black" />
                        {user.role.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                    </td>
                    <td className="p-4 text-[var(--text)]">
                      <div>{user.email}</div>
                      <div className="text-xs mt-1">{user.phoneNumber}</div>
                      <div className="text-xs mt-1">{user.district}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.isActive ? 'success' : 'danger'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => resetPassword(user)}
                          title="Reset Password"
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {currentUser?.id !== user.userId && (
                          <button
                            onClick={() => toggleStatus(user)}
                            className={`p-1.5 rounded transition-colors ${
                              user.isActive
                                ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f2028] rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
              <h2 className="text-lg font-bold text-[var(--text-h)]">
                {isEditing ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-6 overflow-y-auto">
              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                  {formErrors.general}
                </div>
              )}

              <form id="userForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.fullName ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                  />
                  {formErrors.fullName && <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.username ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                  />
                  {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Phone Number (+94...) *</label>
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.phoneNumber ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                    placeholder="+94771234567"
                  />
                  {formErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{formErrors.phoneNumber}</p>}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      setFormData({
                        ...formData,
                        role: newRole,
                        branchId: (newRole === 'BusinessOwner' || newRole === 'ProcurementManager') ? '' : formData.branchId
                      });
                    }}
                    className="w-full border border-[var(--border)] rounded-lg p-2.5 text-sm bg-transparent text-[var(--text-h)] focus:ring-black"
                  >
                    <option value="BusinessOwner">Business Owner</option>
                    <option value="ProcurementManager">Procurement Manager</option>
                    <option value="BranchManager">Branch Manager</option>
                    <option value="StoreEmployee">Store Employee</option>
                  </select>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">District *</label>
                  <select
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.district ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                  >
                    <option value="">Select District</option>
                    {DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {formErrors.district && <p className="text-red-500 text-xs mt-1">{formErrors.district}</p>}
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
                    Employee Number {formData.role === 'StoreEmployee' && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.employeeNumber}
                    onChange={e => setFormData({ ...formData, employeeNumber: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.employeeNumber ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                    placeholder={formData.role === 'StoreEmployee' ? 'EMP-001' : 'Optional'}
                  />
                  {formErrors.employeeNumber && <p className="text-red-500 text-xs mt-1">{formErrors.employeeNumber}</p>}
                </div>

                {formData.role !== 'BusinessOwner' && formData.role !== 'ProcurementManager' && (
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
                      Branch {(formData.role === 'BranchManager' || formData.role === 'StoreEmployee') && '*'}
                    </label>
                    <select
                      value={formData.branchId || ''}
                      onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                      className={`w-full border rounded-lg p-2.5 text-sm bg-transparent text-[var(--text-h)] focus:ring-black ${
                        formErrors.branchId ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)]'
                      }`}
                    >
                      <option value="">
                        {(formData.role === 'BranchManager' || formData.role === 'StoreEmployee') ? '-- Select a Branch --' : 'Headquarters / None'}
                      </option>
                      {branches.map(b => (
                        <option key={b.branchId} value={b.branchId}>{b.name} ({b.branchCode})</option>
                      ))}
                    </select>
                    {formErrors.branchId && <p className="text-red-500 text-xs mt-1">{formErrors.branchId}</p>}
                  </div>
                )}

                {!isEditing && (
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-[var(--text-h)] mb-1">
                      Initial Password <span className="text-gray-400 text-xs font-normal">(Default: TempPassword123!)</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full border rounded-lg p-2.5 text-sm ${formErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-[var(--border)] focus:ring-black'} bg-transparent text-[var(--text-h)]`}
                      placeholder="Leave blank for default"
                    />
                    {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-h)] mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-lg p-2.5 text-sm bg-transparent text-[var(--text-h)] focus:ring-black"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="userForm"
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isEditing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
