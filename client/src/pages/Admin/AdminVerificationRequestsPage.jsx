// Rewrite/client/src/pages/Admin/AdminVerificationRequestsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
// FaUserCircle has been added to the import list
import { FaCheckCircle, FaSpinner, FaUserShield, FaUserCircle } from 'react-icons/fa';

const AdminVerificationRequestsPage = () => {
  const { apiClient, user } = useAuth(); // Ensure user is admin (handled by ProtectedRoute)
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchVerificationRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/users/admin/verification-requests');
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to fetch verification requests:", err);
      setError(err.response?.data?.error || 'Could not load verification requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    // Component will only be rendered for admins, but this is a good safety check
    if (user?.role === 'admin') {
      fetchVerificationRequests();
    }
  }, [fetchVerificationRequests, user?.role]);

  const handleApproveRequest = async (userIdToApprove, username) => {
    if (!window.confirm(`Are you sure you want to approve verification for user "${username}"?`)) return;
    
    setActionLoading(userIdToApprove);
    setError('');
    try {
      const response = await apiClient.post(`/users/admin/verification-requests/${userIdToApprove}/approve`);
      alert(response.data.message || 'User verified successfully.');
      // Remove the user from the list to update the UI immediately
      setRequests(prev => prev.filter(req => req.id !== userIdToApprove));
    } catch (err) {
      console.error("Failed to approve verification:", err);
      alert(err.response?.data?.error || 'Failed to approve verification.');
      setError(`Failed to approve user ${username}: ${err.response?.data?.error || 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="admin-verification-requests-page">
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', borderBottom:'1px solid #eee', paddingBottom:'0.75rem'}}>
        <h2 style={{margin:0}}><FaUserShield style={{marginRight:'10px'}}/> User Verification Requests</h2>
        <button onClick={() => fetchVerificationRequests()} className="btn btn-sm btn-outline-secondary" disabled={loading}>
            {loading ? <FaSpinner className="spin"/> : 'Refresh List'}
        </button>
      </div>

      {error && <p className="error-message text-center card" style={{padding:'1rem', marginBottom:'1rem'}}>{error}</p>}

      {!loading && requests.length === 0 && (
        <p className="text-center card" style={{padding:'1.5rem'}}>No pending verification requests at this time.</p>
      )}

      {requests.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-hover" style={{background:'#fff', borderRadius:'5px', overflow:'hidden'}}>
            <thead className="thead-dark" style={{backgroundColor:'#343a40', color:'white'}}>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Avatar</th>
                <th scope="col">Requested On</th>
                <th scope="col">Joined</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(reqUser => (
                <tr key={reqUser.id}>
                  <td>
                    <Link to={`/profile/${reqUser.username}`} target="_blank" rel="noopener noreferrer" title={`View ${reqUser.username}'s profile`}>
                      {reqUser.username}
                    </Link>
                  </td>
                  <td>
                    {reqUser.profilePicture ? (
                      <img src={reqUser.profilePicture} alt={reqUser.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'}/>
                    ) : (
                      <FaUserCircle size={30} style={{color:'#ccc'}}/>
                    )}
                  </td>
                  <td>{reqUser.verificationRequestedAt ? format(new Date(reqUser.verificationRequestedAt), 'MMM d,, HH:mm') : 'N/A'}</td>
                  <td>{reqUser.createdAt ? format(new Date(reqUser.createdAt), 'MMM d,colourCodeDict') : 'N/A'}</td>
                  <td>
                    <button
                      onClick={() => handleApproveRequest(reqUser.id, reqUser.username)}
                      className="btn btn-sm btn-success"
                      disabled={actionLoading === reqUser.id}
                      title={`Approve verification for ${reqUser.username}`}
                    >
                      {actionLoading === reqUser.id ? <FaSpinner className="spin" /> : <FaCheckCircle />} Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationRequestsPage;
