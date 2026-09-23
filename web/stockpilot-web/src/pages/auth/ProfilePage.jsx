import React, { useState, useEffect } from 'react';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { FormInput } from '../../components/ui/FormControls';
import ErrorState from '../../components/ui/ErrorState';
import { CheckCircleIcon, RefreshIcon } from '../../components/ui/Icons';

export default function ProfilePage() {
    const { user, login } = useAuth();
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        profileImageUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                phoneNumber: user.phoneNumber || '',
                address: user.address || '',
                profileImageUrl: user.profileImageUrl || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});
        setSuccess('');

        try {
            const response = await api.put('/api/auth/profile', formData);
            login(localStorage.getItem('stockpilot_token'), response.data);
            setSuccess('Profile updated successfully!');
        } catch (err) {
            setError(err.displayMessage || 'Failed to update profile.');
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
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-subtitle">Update your personal information</p>
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

            <div className="card" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <FormInput
                        label="Full Name"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        error={fieldErrors.fullName}
                        required
                        disabled={loading}
                    />

                    <FormInput
                        label="Phone Number"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        error={fieldErrors.phoneNumber}
                        optionalText
                        placeholder="e.g. 0771234567"
                        disabled={loading}
                    />

                    <div className="form-group">
                        <label>
                            Address
                            <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>
                                (Optional)
                            </span>
                        </label>
                        <textarea
                            name="address"
                            className={`form-control ${fieldErrors.address ? 'error' : ''}`}
                            value={formData.address}
                            onChange={handleChange}
                            rows={3}
                            disabled={loading}
                        />
                        {fieldErrors.address && <span className="form-error">{fieldErrors.address}</span>}
                    </div>

                    <FormInput
                        label="Profile Image URL"
                        type="url"
                        name="profileImageUrl"
                        value={formData.profileImageUrl}
                        onChange={handleChange}
                        error={fieldErrors.profileImageUrl}
                        optionalText
                        disabled={loading}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <RefreshIcon style={{ animation: 'spin 0.7s linear infinite', width: 14, height: 14, marginRight: 6 }} />
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
