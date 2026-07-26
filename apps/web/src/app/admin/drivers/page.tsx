'use client';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store';
import { apiClient } from 'shared/src/api/axios';
import { FaSearch, FaCarSide, FaCheckCircle, FaTimesCircle, FaEye, FaSyncAlt } from 'react-icons/fa';

export default function AdminDriversPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Selected driver for verification inspection modal
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => { fetchVerifications(); }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/admin/drivers/verifications');
      setDrivers(res.data);
    } catch {
      setError('Failed to load driver verification list.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (driverId: string, docType: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await apiClient.post('/admin/drivers/verify-document', {
        driver_id: driverId,
        document_type: docType,
        action: action,
        rejection_reason: action === 'REJECT' ? rejectionReason || 'Document photo is unclear' : null
      });
      setActionMsg(`Document ${docType} set to ${action}.`);
      setRejectionReason('');
      fetchVerifications();
      if (selectedDriver) {
        // refresh selected driver state locally
        setSelectedDriver((prev: any) => {
          if (!prev) return null;
          const updatedDocs = prev.documents.map((d: any) => {
            if (d.document_type === docType) {
              return { ...d, status: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED', rejection_reason: action === 'REJECT' ? rejectionReason : null };
            }
            return d;
          });
          return { ...prev, documents: updatedDocs };
        });
      }
    } catch {
      setActionMsg('Failed to update document status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAll = async (driverId: string) => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await apiClient.post('/admin/drivers/approve-all', { driver_id: driverId });
      setActionMsg('Driver fully approved and verified!');
      fetchVerifications();
      setSelectedDriver(null);
    } catch {
      setActionMsg('Failed to approve driver account.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = drivers.filter(u =>
    u.phone_number?.includes(search) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Driver Document Verification Portal</h2>
          <p className="text-xs text-gray-500">Inspect driver Aadhaar, Driving Licence, and Vehicle RC proofs for approval.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <button onClick={fetchVerifications} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
            <FaSyncAlt /> Refresh List
          </button>
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search driver by name or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-bold">
          {actionMsg}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Driver Partner</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Approval Status</th>
                <th className="px-6 py-4">Submitted Proofs</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading verifications...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No driver accounts found.</td></tr>
              )}
              {filtered.map(driver => (
                <tr key={driver.driver_id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        <FaCarSide size={14} />
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 block">{driver.full_name}</span>
                        <span className="text-[10px] text-gray-400">{driver.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-gray-700">{driver.phone_number}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      driver.approval_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      driver.approval_status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {driver.approval_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {driver.documents?.map((doc: any, idx: number) => (
                        <span key={idx} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          doc.status === 'VERIFIED' || doc.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          doc.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {doc.document_type}: {doc.status}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedDriver(driver)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <FaEye size={12} /> Inspect Proofs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Inspection Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedDriver(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 font-bold text-lg"
            >
              ✕
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Proof Inspection Drawer</span>
              <h3 className="text-xl font-black text-gray-900">{selectedDriver.full_name} ({selectedDriver.phone_number})</h3>
              <p className="text-xs text-gray-500">Cross-verify documents and approve or mark for correction.</p>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {selectedDriver.documents?.map((doc: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">{doc.document_type} Proof</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      doc.status === 'VERIFIED' || doc.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      doc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  {doc.file_url && (
                    <div className="w-full h-36 bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center border">
                      <img src={doc.file_url} alt={doc.document_type} className="w-full h-full object-contain" />
                    </div>
                  )}

                  {doc.rejection_reason && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100 font-medium">
                      ⚠️ Note: {doc.rejection_reason}
                    </p>
                  )}

                  {/* Actions for this document */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyDocument(selectedDriver.driver_id, doc.document_type, 'APPROVE')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <FaCheckCircle /> Approve {doc.document_type}
                    </button>

                    <button
                      onClick={() => {
                        const reason = prompt(`Enter rejection reason for ${doc.document_type}:`, "Photo is blurry or unreadable. Please re-upload.");
                        if (reason) {
                          setRejectionReason(reason);
                          handleVerifyDocument(selectedDriver.driver_id, doc.document_type, 'REJECT');
                        }
                      }}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <FaTimesCircle /> Reject (Request Fix)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Approve All */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Final Account Approval</span>
                <span className="text-[10px] text-emerald-700">Marks all driver proofs as verified & approves partner account</span>
              </div>
              <button
                onClick={() => handleApproveAll(selectedDriver.driver_id)}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
              >
                Approve Driver Account ✓
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
