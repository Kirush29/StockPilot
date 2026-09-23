import React, { useState } from 'react';
import api from '../../api/axiosClient';
import { FormInput } from '../../components/ui/FormControls';
import ErrorState from '../../components/ui/ErrorState';
import { CheckCircleIcon, RefreshIcon } from '../../components/ui/Icons';

export default function ChangePasswordPage() {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
    };

    const toggleShowPassword = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setFieldErrors({ confirmPassword: "New password and confirm password do not match." });
            setLoading(false);
            return;
        }

        try {
            await api.post('/api/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            setSuccess('Password changed successfully!');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.displayMessage || 'Failed to change password.');
            if (err.fieldErrors) {
                setFieldErrors(err.fieldErrors);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Change Password</h1>
                    <p className="page-subtitle">Update your account password</p>
                </div>
            </div>

            {error && (
                <div style={{ marginBottom: '24px' }}>
                    <ErrorState error={error} inline />
                </div>
            )}

            {success && (
                <div className="success-banner" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'var(--color-success-light)', color: 'var(--color-success-dark)', borderRadius: '8px' }}>
                    <CheckCircleIcon style={{ width: 20, height: 20 }} />
                    <span>{success}</span>
                </div>
            )}

            <div className="card" style={{ maxWidth: '400px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <FormInput
                        label="Current Password"
                        type={showPasswords.current ? 'text' : 'password'}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        error={fieldErrors.currentPassword}
                        required
                        disabled={loading}
                        suffix={
                            <span
                                style={{ cursor: 'pointer', fontSize: '12px' }}
                                onClick={() => toggleShowPassword('current')}
                            >
                                {showPasswords.current ? 'Hide' : 'Show'}
                            </span>
                        }
                    />

                    <FormInput
                        label="New Password"
                        type={showPasswords.new ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        error={fieldErrors.newPassword}
                        required
                        disabled={loading}
                        suffix={
                            <span
                                style={{ cursor: 'pointer', fontSize: '12px' }}
                                onClick={() => toggleShowPassword('new')}
                            >
                                {showPasswords.new ? 'Hide' : 'Show'}
                            </span>
                        }
                    />

                    <FormInput
                        label="Confirm New Password"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={fieldErrors.confirmPassword}
                        required
                        disabled={loading}
                        suffix={
                            <span
                                style={{ cursor: 'pointer', fontSize: '12px' }}
                                onClick={() => toggleShowPassword('confirm')}
                            >
                                {showPasswords.confirm ? 'Hide' : 'Show'}
                            </span>
                        }
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <RefreshIcon style={{ animation: 'spin 0.7s linear infinite', width: 14, height: 14, marginRight: 6 }} />
                                    Changing Password...
                                </>
                            ) : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
