import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, ApiError } from '../services/apiClient';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

export default function Profile() {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [address, setAddress] = useState(user?.address || '');
  const [district, setDistrict] = useState(user?.district || '');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await apiClient.put<any>('/auth/profile', {
        fullName,
        phoneNumber,
        address,
        district,
      });
      const token = localStorage.getItem('token');
      if (token) {
        login(token, response);
      }
      setSuccessMsg('Profile updated successfully.');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 400 && err.data?.errors) {
        setErrorMsg(Object.values(err.data.errors).flat().join(' '));
      } else {
        setErrorMsg(err.message || 'Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 400 && err.data?.errors) {
        setErrorMsg(Object.values(err.data.errors).flat().join(' '));
      } else {
        setErrorMsg(err.message || 'Failed to change password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500">Manage your personal information and security settings.</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm border border-green-200">
          {successMsg}
        </div>
      )}

      <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Overview</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-gray-500">Role</span>
            <span className="font-medium text-gray-900">{user?.role}</span>
          </div>
          <div>
            <span className="block text-gray-500">Assigned Branch ID</span>
            <span className="font-medium text-gray-900">{user?.branchId || 'Headquarters / All'}</span>
          </div>
          <div>
            <span className="block text-gray-500">Email Address</span>
            <span className="font-medium text-gray-900">{user?.email}</span>
          </div>
          <div>
            <span className="block text-gray-500">Employee Number</span>
            <span className="font-medium text-gray-900">{user?.employeeNumber || 'N/A'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="bg-white shadow rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number (LK)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0712345678 or +94712345678"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">District</label>
            <select
              value={district}
              onChange={e => setDistrict(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            >
              <option value="">Select District</option>
              {DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
          >
            Save Profile
          </button>
        </div>
      </form>

      <form onSubmit={handlePasswordSubmit} className="bg-white shadow rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Change Password</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, number, and a special character.
        </div>
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
          >
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}
