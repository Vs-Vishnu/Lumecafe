import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Bike,
  Plus,
  Mail,
  Send,
  RotateCcw,
  Ban,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  Phone,
  Search,
  Eye
} from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const AdminDeliveryPartners = () => {
  const [activeTab, setActiveTab] = useState('partners'); // 'partners' | 'invitations'

  const [partners, setPartners] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviting, setInviting] = useState(false);

  // Selected partner details modal
  const [selectedPartnerDetails, setSelectedPartnerDetails] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Status confirm dialog
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partRes, invRes] = await Promise.all([
        api.get('/admin/delivery-partners'),
        api.get('/admin/delivery-partners/invitations'),
      ]);

      if (partRes.data.success) setPartners(partRes.data.data);
      if (invRes.data.success) setInvitations(invRes.data.data);
    } catch (err) {
      console.error(err);
      showToast('Error loading delivery partner records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) {
      showToast('Name and email are required.', 'error');
      return;
    }

    setInviting(true);
    try {
      const res = await api.post('/admin/delivery-partners/invitations', {
        name: inviteName,
        email: inviteEmail,
        phone: invitePhone,
      });

      if (res.data.success) {
        showToast(res.data.message || 'Invitation sent successfully!');
        setInviteName('');
        setInviteEmail('');
        setInvitePhone('');
        setIsInviteModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send invitation.', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invitationId) => {
    try {
      const res = await api.post(`/admin/delivery-partners/invitations/${invitationId}/resend`);
      if (res.data.success) {
        showToast('Invitation resent successfully!');
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to resend invitation.', 'error');
    }
  };

  const handleRevoke = async (invitationId) => {
    try {
      const res = await api.post(`/admin/delivery-partners/invitations/${invitationId}/revoke`);
      if (res.data.success) {
        showToast('Invitation revoked.');
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke invitation.', 'error');
    }
  };

  const handleOpenStatusConfirm = (partner) => {
    setStatusConfirmTarget(partner);
    setIsStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    const newStatus = statusConfirmTarget.status === 'active' ? 'inactive' : 'active';

    try {
      const res = await api.patch(`/admin/delivery-partners/${statusConfirmTarget._id}/status`, {
        status: newStatus,
      });
      if (res.data.success) {
        showToast(`Partner status updated to ${newStatus}.`);
        fetchData();
      }
    } catch (err) {
      showToast('Failed to update partner status.', 'error');
    } finally {
      setIsStatusConfirmOpen(false);
    }
  };

  const handleViewPartner = async (partnerId) => {
    try {
      const res = await api.get(`/admin/delivery-partners/${partnerId}`);
      if (res.data.success) {
        setSelectedPartnerDetails(res.data.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      showToast('Error retrieving partner delivery details.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
            Delivery Partner Management
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Invite, activate, and manage your delivery fleet and invitations
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold shadow-lg shadow-brand/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Delivery Partner</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-3">
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'partners'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Active Fleet ({partners.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'invitations'
              ? 'bg-brand text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Pending & Past Invitations ({invitations.length})
        </button>
      </div>

      {/* Active Fleet Tab */}
      {activeTab === 'partners' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
                <tr>
                  <th className="px-6 py-4">Delivery Partner</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4 text-center">Duty Status</th>
                  <th className="px-6 py-4 text-center">Active Deliveries</th>
                  <th className="px-6 py-4 text-center">Total Completed</th>
                  <th className="px-6 py-4 text-center">Account</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                    </td>
                  </tr>
                ) : partners.length > 0 ? (
                  partners.map((partner) => (
                    <tr key={partner._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-50 text-brand flex items-center justify-center font-bold text-xs uppercase border border-brand/20">
                            {partner.name?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block">{partner.name}</span>
                            <span className="text-xs text-gray-400 font-semibold">{partner.vehicleType} • {partner.vehicleNumber || 'No plate'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                        <span className="block text-gray-900">{partner.email}</span>
                        <span className="text-gray-400">{partner.phone || 'No phone'}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            partner.availability === 'available'
                              ? 'bg-emerald-100 text-brand'
                              : partner.availability === 'busy'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {partner.availability}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-gray-900">
                        {partner.activeOrdersCount || 0}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-brand">
                        {partner.totalDeliveries || 0}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            partner.status === 'active'
                              ? 'bg-green-50 text-brand border border-green-200'
                              : 'bg-red-50 text-red-500 border border-red-200'
                          }`}
                        >
                          {partner.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewPartner(partner._id)}
                            className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors cursor-pointer"
                            title="View History & Stats"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenStatusConfirm(partner)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              partner.status === 'active'
                                ? 'bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500'
                                : 'bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-brand'
                            }`}
                            title={partner.status === 'active' ? 'Deactivate Partner' : 'Activate Partner'}
                          >
                            {partner.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 font-semibold">
                      No active delivery partners registered yet. Click "Invite Delivery Partner" to onboard drivers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
                <tr>
                  <th className="px-6 py-4">Invitee Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4 text-center">Invitation Status</th>
                  <th className="px-6 py-4 text-center">Expiration Date</th>
                  <th className="px-6 py-4 text-center">Invited By</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {invitations.length > 0 ? (
                  invitations.map((inv) => {
                    const statusBadge = {
                      pending: 'bg-blue-100 text-blue-700',
                      accepted: 'bg-emerald-100 text-brand',
                      expired: 'bg-gray-100 text-gray-600',
                      revoked: 'bg-red-100 text-red-600',
                    }[inv.status] || 'bg-gray-100 text-gray-700';

                    return (
                      <tr key={inv._id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-900">{inv.name}</td>
                        <td className="px-6 py-4 text-gray-600">{inv.email}</td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${statusBadge}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-500 whitespace-nowrap">
                          {new Date(inv.expiresAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-gray-400">{inv.invitedBy?.name || 'Admin'}</td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {inv.status === 'pending' || inv.status === 'expired' ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleResend(inv._id)}
                                className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors cursor-pointer"
                                title="Resend Invitation Email"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              {inv.status === 'pending' && (
                                <button
                                  onClick={() => handleRevoke(inv._id)}
                                  className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                  title="Revoke Invitation"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-semibold">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 font-semibold">
                      No invitations on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Delivery Partner Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Delivery Partner"
      >
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-xs text-emerald-900 leading-relaxed">
            An official single-use invitation with a secure cryptographically verified token link will be dispatched via email. The recipient will be allowed to configure their credentials and activate their Delivery Partner account.
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Ramesh Patel"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="e.g. ramesh.patel@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number (Optional)</label>
            <input
              type="tel"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-md shadow-brand/10 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{inviting ? 'Sending Invitation...' : 'Send Invitation Email'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Partner Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Delivery Partner Profile & History"
        size="lg"
      >
        {selectedPartnerDetails && (
          <div className="space-y-5 font-sans">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg uppercase">
                {selectedPartnerDetails.partner?.name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900">{selectedPartnerDetails.partner?.name}</h4>
                <p className="text-xs text-gray-500 font-semibold">{selectedPartnerDetails.partner?.email} • {selectedPartnerDetails.partner?.phone}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-emerald-100 text-brand px-2 py-0.5 rounded-full font-extrabold uppercase">
                    Vehicle: {selectedPartnerDetails.profile?.vehicleType || 'Bike'} ({selectedPartnerDetails.profile?.vehicleNumber || 'No plate'})
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-extrabold uppercase">
                    Status: {selectedPartnerDetails.partner?.status}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Delivery Assignments</h4>
              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-100 text-xs">
                {(selectedPartnerDetails.assignments || []).length > 0 ? (
                  selectedPartnerDetails.assignments.map((asg) => (
                    <div key={asg._id} className="p-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900">#{asg.order?.orderNumber}</span>
                        <span className="text-gray-400 block">{asg.order?.deliveryAddress?.city} • ₹{asg.order?.grandTotal?.toFixed(2)}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-extrabold uppercase text-[10px]">
                        {asg.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 font-semibold">No delivery records found for this partner yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Partner Status Change */}
      <ConfirmDialog
        isOpen={isStatusConfirmOpen}
        onClose={() => setIsStatusConfirmOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={statusConfirmTarget?.status === 'active' ? 'Deactivate Partner Account' : 'Activate Partner Account'}
        message={`Are you sure you want to ${
          statusConfirmTarget?.status === 'active' ? 'deactivate' : 'activate'
        } ${statusConfirmTarget?.name}'s delivery partner account?`}
        confirmText={statusConfirmTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        type={statusConfirmTarget?.status === 'active' ? 'danger' : 'warning'}
      />
    </div>
  );
};

export default AdminDeliveryPartners;
