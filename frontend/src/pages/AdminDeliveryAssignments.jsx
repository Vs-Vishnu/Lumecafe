import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Package,
  Bike,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  Filter,
  AlertCircle,
  History
} from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const AdminDeliveryAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isReassignment, setIsReassignment] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History & Audit Modal
  const [selectedAuditAssignment, setSelectedAuditAssignment] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, partnerRes, ordersRes] = await Promise.all([
        api.get('/admin/delivery-assignments'),
        api.get('/admin/delivery-partners/available'),
        api.get('/orders?limit=50'),
      ]);

      if (assignRes.data.success) {
        setAssignments(assignRes.data.data);
      }
      if (partnerRes.data.success) {
        setAvailablePartners(partnerRes.data.data);
      }
      if (ordersRes.data.success) {
        // Filter orders that are delivery type or unassigned
        const unassigned = (ordersRes.data.data || []).filter(
          (o) => o.orderType === 'delivery' && !o.deliveryPartner && o.deliveryStatus !== 'delivered' && o.deliveryStatus !== 'cancelled'
        );
        setUnassignedOrders(unassigned);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading delivery assignments console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleOpenAssignModal = (order, isReassign = false, currentAssignment = null) => {
    setSelectedOrderToAssign(order);
    setIsReassignment(isReassign);
    setSelectedPartnerId('');
    setAssignNotes('');
    setReassignReason('');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      showToast('Please select an eligible delivery partner.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (isReassignment) {
        const res = await api.patch(
          `/admin/delivery-assignments/orders/${selectedOrderToAssign._id}/reassign`,
          {
            newDeliveryPartnerId: selectedPartnerId,
            reason: reassignReason || 'Reassigned by Administrator',
          }
        );
        if (res.data.success) {
          showToast(res.data.message || 'Order successfully reassigned!');
          setIsAssignModalOpen(false);
          fetchData();
        }
      } else {
        const res = await api.post(
          `/admin/delivery-assignments/orders/${selectedOrderToAssign._id}/assign`,
          {
            deliveryPartnerId: selectedPartnerId,
            notes: assignNotes,
          }
        );
        if (res.data.success) {
          showToast(res.data.message || 'Order assigned to partner!');
          setIsAssignModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Assignment failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAuditModal = (assignment) => {
    setSelectedAuditAssignment(assignment);
    setIsAuditModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-16">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={() => setToastMsg(null)} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
          Order Delivery Assignments
        </h2>
        <p className="text-sm text-gray-500 font-semibold mt-0.5">
          Assign incoming delivery orders, monitor active driver workloads, and review audit trails
        </p>
      </div>

      {/* Unassigned Incoming Delivery Orders */}
      {unassignedOrders.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="font-extrabold text-sm text-amber-900">
              Orders Requiring Delivery Partner Assignment ({unassignedOrders.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedOrders.map((ord) => (
              <div
                key={ord._id}
                className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-black text-gray-900 text-sm">#{ord.orderNumber}</span>
                    <span className="text-xs font-bold text-brand">₹{ord.grandTotal?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">
                    {ord.deliveryAddress?.fullName || ord.customerDetails?.name}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {ord.deliveryAddress?.area}, {ord.deliveryAddress?.city}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleOpenAssignModal(ord, false)}
                    className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Assign Partner
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Assignments Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-gray-900">
            System Delivery Assignments & Workloads ({assignments.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Order #</th>
                <th className="px-6 py-4">Customer Destination</th>
                <th className="px-6 py-4">Assigned Partner</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Assigned Timestamp</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  </td>
                </tr>
              ) : assignments.length > 0 ? (
                assignments.map((assignment) => {
                  const ord = assignment.order;
                  const partner = assignment.deliveryPartner;

                  return (
                    <tr key={assignment._id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                        #{ord?.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 block">{ord?.deliveryAddress?.fullName || ord?.customerDetails?.name}</span>
                        <span className="text-xs text-gray-500 truncate block max-w-xs">{ord?.deliveryAddress?.city} - {ord?.deliveryAddress?.postalCode}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 block">{partner?.name || 'Unassigned'}</span>
                        <span className="text-xs text-gray-400">{partner?.phone}</span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            assignment.status === 'delivered'
                              ? 'bg-emerald-100 text-brand'
                              : assignment.status === 'out_for_delivery'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-400 whitespace-nowrap">
                        {new Date(assignment.assignedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenAuditModal(assignment)}
                            className="p-1.5 bg-gray-50 hover:bg-brand/10 text-gray-600 hover:text-brand rounded-lg transition-colors cursor-pointer"
                            title="View Reassignment Audit Trail"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {assignment.status !== 'delivered' && (
                            <button
                              onClick={() => handleOpenAssignModal(ord, true, assignment)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Reassign to another partner"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-semibold">
                    No delivery assignments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign / Reassign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={isReassignment ? `Reassign Order #${selectedOrderToAssign?.orderNumber}` : `Assign Order #${selectedOrderToAssign?.orderNumber}`}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1">
            <span className="font-bold text-gray-800 block">Delivery Destination:</span>
            <p className="text-gray-600">
              {selectedOrderToAssign?.deliveryAddress?.houseNumber}, {selectedOrderToAssign?.deliveryAddress?.streetName}, {selectedOrderToAssign?.deliveryAddress?.city}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Select Available Delivery Partner *
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availablePartners.length > 0 ? (
                availablePartners.map((p) => (
                  <label
                    key={p._id}
                    className={`block p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedPartnerId === p._id
                        ? 'border-brand bg-emerald-50/60 ring-1 ring-brand'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="partner_choice"
                          value={p._id}
                          checked={selectedPartnerId === p._id}
                          onChange={() => setSelectedPartnerId(p._id)}
                          className="text-brand focus:ring-brand"
                        />
                        <div>
                          <span className="font-bold text-xs text-gray-900 block">{p.name}</span>
                          <span className="text-[10px] text-gray-400">{p.vehicleType} • Active deliveries: {p.activeOrdersCount || 0}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-brand rounded-full text-[9px] font-black uppercase">
                        Available
                      </span>
                    </div>
                  </label>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-gray-500 border border-dashed rounded-2xl">
                  No partners currently on "Available" duty status.
                </div>
              )}
            </div>
          </div>

          {isReassignment ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Reassignment Reason *</label>
              <input
                type="text"
                required
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="e.g. Previous driver has bike puncture"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Assignment Notes (Optional)</label>
              <input
                type="text"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="e.g. Handle with care, hot soup"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-dark text-white rounded-xl shadow-md shadow-brand/10 cursor-pointer"
            >
              {submitting ? 'Saving...' : isReassignment ? 'Confirm Reassignment' : 'Assign Partner'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reassignment Audit Trail Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title={`Audit Trail: Order #${selectedAuditAssignment?.order?.orderNumber}`}
        size="md"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="p-3 bg-gray-50 rounded-2xl space-y-1">
            <p><strong>Assigned By:</strong> {selectedAuditAssignment?.assignedBy?.name || 'Administrator'}</p>
            <p><strong>Assigned Timestamp:</strong> {selectedAuditAssignment?.assignedAt ? new Date(selectedAuditAssignment.assignedAt).toLocaleString('en-IN') : '--'}</p>
            {selectedAuditAssignment?.pickedUpAt && (
              <p><strong>Picked Up Timestamp:</strong> {new Date(selectedAuditAssignment.pickedUpAt).toLocaleString('en-IN')}</p>
            )}
            {selectedAuditAssignment?.deliveredAt && (
              <p><strong>Delivered Timestamp:</strong> {new Date(selectedAuditAssignment.deliveredAt).toLocaleString('en-IN')}</p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-gray-400 uppercase text-[10px] tracking-wider mb-2">Reassignment History</h4>
            {(selectedAuditAssignment?.reassignmentHistory || []).length > 0 ? (
              <div className="space-y-2 border border-gray-100 rounded-2xl p-3 bg-white divide-y divide-gray-100">
                {selectedAuditAssignment.reassignmentHistory.map((item, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 space-y-0.5">
                    <p className="font-bold text-gray-900">
                      Reassigned to: <span className="text-brand">{item.newPartner?.name || 'Partner'}</span>
                    </p>
                    <p className="text-gray-500 text-[11px]">Reason: {item.reason}</p>
                    <p className="text-gray-400 text-[10px]">
                      {new Date(item.timestamp).toLocaleString('en-IN')} by {item.reassignedBy?.name || 'Admin'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">No reassignments on this order.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDeliveryAssignments;
