import React, { useState, useEffect } from 'react';
import { Complaint, VerificationItem, AuditLogEntry } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { StatusPill } from '../../components/common/StatusPill';
import { RoleSwitcher } from '../../components/layout/RoleSwitcher';
import { Modal } from '../../components/common/Modal';
import {
  ShieldCheck,
  FileCheck2,
  AlertOctagon,
  ScrollText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Users,
  Briefcase,
  Zap,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'VERIFICATIONS' | 'DISPUTES' | 'AUDIT_LOGS'>('VERIFICATIONS');
  const [metrics, setMetrics] = useState({
    total_users: 142,
    verified_providers: 28,
    active_bookings: 3,
    active_rentals: 2,
    open_disputes: 1,
  });

  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [disputes, setDisputes] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Review modal state
  const [reviewItem, setReviewItem] = useState<VerificationItem | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dispute resolution modal state
  const [resolvingDispute, setResolvingDispute] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadData = async () => {
    try {
      const [met, q, d, a] = await Promise.all([
        api.admin.getMetrics(),
        api.verifications.getAdminQueue(),
        api.disputes.getAdminCases(),
        api.admin.getAuditLogs(),
      ]);
      setMetrics(met);
      setQueue(q);
      setDisputes(d);
      setAuditLogs(a as AuditLogEntry[]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    if (!reviewItem) return;
    if (!decisionReason.trim()) {
      showToast('A mandatory decision reason is required for compliance audit logs.', 'error');
      return;
    }

    // Rule: Cannot review own submission
    if (reviewItem.user_id === user?.id) {
      showToast(t('cantReviewSelf'), 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await api.verifications.review(reviewItem.id, action, decisionReason);
      showToast(`Verification submission ${action.toLowerCase()}d! Audit log recorded.`, 'success');
      setReviewItem(null);
      setDecisionReason('');
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error reviewing';
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispute) return;
    if (!resolutionNotes.trim()) {
      showToast('Please provide resolution notes.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await api.disputes.resolve(resolvingDispute.id, resolutionNotes);
      showToast(`Case ${resolvingDispute.case_reference} resolved!`, 'success');
      setResolvingDispute(null);
      setResolutionNotes('');
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error resolving case';
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      <RoleSwitcher />

      {/* Admin Title */}
      <div>
        <h2 className="font-extrabold text-midnight-navy text-xl tracking-tight">
          {t('adminTitle')}
        </h2>
        <p className="text-xs text-dark-slate/80 mt-0.5">
          Two-tier trust verification review queue, dispute case manager, and immutable audit logs.
        </p>
      </div>

      {/* Platform Indicators Grid (Section 5.7 & FR-ADM-003) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-pure-white p-3 rounded-2xl border border-cloud-gray shadow-card">
          <div className="flex items-center gap-1.5 text-royal-indigo mb-1">
            <Users className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold">Total Users</span>
          </div>
          <span className="font-extrabold text-midnight-navy text-lg">
            {metrics.total_users}
          </span>
        </div>

        <div className="bg-pure-white p-3 rounded-2xl border border-cloud-gray shadow-card">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <Briefcase className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold">Verified Providers</span>
          </div>
          <span className="font-extrabold text-midnight-navy text-lg">
            {metrics.verified_providers}
          </span>
        </div>

        <div className="bg-pure-white p-3 rounded-2xl border border-cloud-gray shadow-card">
          <div className="flex items-center gap-1.5 text-amber-500 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold">Active Power Rentals</span>
          </div>
          <span className="font-extrabold text-midnight-navy text-lg">
            {metrics.active_rentals}
          </span>
        </div>

        <div className="bg-pure-white p-3 rounded-2xl border border-cloud-gray shadow-card">
          <div className="flex items-center gap-1.5 text-rose-600 mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold">Open Disputes</span>
          </div>
          <span className="font-extrabold text-midnight-navy text-lg">
            {metrics.open_disputes}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center bg-pure-white p-1 rounded-2xl border border-cloud-gray shadow-xs gap-1 text-xs">
        <button
          onClick={() => setActiveTab('VERIFICATIONS')}
          className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'VERIFICATIONS'
              ? 'bg-royal-indigo text-pure-white shadow-xs'
              : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Verifications ({queue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DISPUTES')}
          className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'DISPUTES'
              ? 'bg-royal-indigo text-pure-white shadow-xs'
              : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Disputes ({disputes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`flex-1 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'AUDIT_LOGS'
              ? 'bg-royal-indigo text-pure-white shadow-xs'
              : 'text-dark-slate/70 hover:text-midnight-navy hover:bg-cloud-gray/50'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Tab 1: Manual Verification Queue (AC-02 & AC-03) */}
      {activeTab === 'VERIFICATIONS' && (
        <div className="space-y-3">
          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-royal-indigo/20 text-xs text-dark-slate leading-relaxed">
            <strong>Security & Trust Rule (`AC-02`):</strong> Reviewers inspect the private document via a short-lived URL. Decisions require a mandatory reason and are written immediately to the immutable audit log.
          </div>

          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3"
            >
              <div className="flex items-center justify-between border-b border-cloud-gray pb-2">
                <div>
                  <span className="font-extrabold text-midnight-navy text-sm block">
                    {item.user_name}
                  </span>
                  <span className="text-[11px] text-dark-slate/70 font-mono">
                    {item.phone_e164}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-royal-indigo border border-royal-indigo/20">
                    {item.verification_type}
                  </span>
                  <StatusPill status={item.status} />
                </div>
              </div>

              <div className="text-xs space-y-1">
                <div>
                  <span className="text-dark-slate/60 font-semibold">Document: </span>
                  <span className="font-bold text-midnight-navy">{item.document_type}</span>
                </div>
                {item.service_name && (
                  <div>
                    <span className="text-dark-slate/60 font-semibold">Associated Service: </span>
                    <span className="font-bold text-royal-indigo">{item.service_name}</span>
                  </div>
                )}
                {item.decision_reason && (
                  <p className="p-2 bg-cloud-gray/40 rounded-xl text-[11px] text-dark-slate/80 italic mt-1">
                    Decision Note: "{item.decision_reason}"
                  </p>
                )}
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setReviewItem(item);
                    setDecisionReason('');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Document & Review</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Dispute & Complaint Case Manager */}
      {activeTab === 'DISPUTES' && (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div
              key={d.id}
              className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3 text-xs"
            >
              <div className="flex items-center justify-between border-b border-cloud-gray pb-2">
                <span className="font-mono font-extrabold text-royal-indigo text-xs">
                  {d.case_reference}
                </span>
                <StatusPill status={d.status} />
              </div>

              <div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                  {d.category}
                </span>
                <p className="mt-2 text-dark-slate leading-relaxed bg-cloud-gray/30 p-2.5 rounded-xl border border-cloud-gray">
                  "{d.description}"
                </p>
              </div>

              {d.resolution_notes && (
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px]">
                  <strong>Resolution:</strong> {d.resolution_notes}
                </div>
              )}

              {d.status !== 'RESOLVED' && (
                <button
                  onClick={() => setResolvingDispute(d)}
                  className="w-full py-2 px-3 rounded-xl bg-royal-indigo text-pure-white font-bold text-xs shadow-xs hover:bg-royal-indigo/90 transition-all cursor-pointer"
                >
                  Record Investigation & Resolve Case
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Immutable Audit Log Viewer (FR-ADM-002) */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-pure-white rounded-3xl p-4 border border-cloud-gray shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-cloud-gray pb-2">
            <h4 className="font-bold text-midnight-navy text-xs">
              Platform Compliance Audit Trail
            </h4>
            <span className="text-[10px] text-dark-slate/60">Immutable Ledger</span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-cloud-gray/30 border border-cloud-gray text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-royal-indigo font-mono">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-dark-slate/60">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-dark-slate text-[11px]">
                  Target: <strong>{log.entity_type}</strong> ({log.entity_id}) • Actor: {log.actor_id}
                </div>
                <p className="text-[11px] text-dark-slate/80 italic">
                  Reason: "{log.reason}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Inspection & Decision Modal */}
      {reviewItem && (
        <Modal
          isOpen={Boolean(reviewItem)}
          onClose={() => setReviewItem(null)}
          title="Review Verification Submission"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Signed Document Inspection Preview (5-min TTL) */}
            <div className="rounded-2xl overflow-hidden border border-cloud-gray shadow-xs">
              <div className="bg-midnight-navy text-pure-white px-3 py-1.5 flex items-center justify-between text-[11px]">
                <span>Document: {reviewItem.document_type}</span>
                <span className="text-emerald-400 font-mono">Signed URL (5m TTL)</span>
              </div>
              <img
                src={reviewItem.document_url}
                alt="Document Preview"
                className="w-full h-56 object-cover bg-cloud-gray"
              />
            </div>

            <div>
              <span className="font-bold text-midnight-navy block text-sm">
                Applicant: {reviewItem.user_name}
              </span>
              <span className="text-[11px] text-dark-slate/70">
                Phone: {reviewItem.phone_e164} • Submitted: {new Date(reviewItem.submitted_at).toLocaleString()}
              </span>
            </div>

            {/* Mandatory Decision Reason Input */}
            <div>
              <label className="block font-bold text-midnight-navy mb-1.5">
                {t('mandatoryReasonLabel')} *
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                rows={3}
                required
                placeholder="State the factual basis for this decision (e.g. CNI hologram verified, photo matched)."
                className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo"
              />
            </div>

            {/* Actions: Approve / Reject / Request More Info */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction('APPROVE')}
                className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-pure-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction('REJECT')}
                className="py-2.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-pure-white font-bold text-xs shadow-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleReviewAction('REQUEST_INFO')}
                className="py-2.5 px-2 rounded-xl border border-cloud-gray text-dark-slate hover:bg-cloud-gray font-bold text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <HelpCircle className="w-3.5 h-3.5 text-royal-indigo" />
                <span>More Info</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dispute Resolution Modal */}
      {resolvingDispute && (
        <Modal
          isOpen={Boolean(resolvingDispute)}
          onClose={() => setResolvingDispute(null)}
          title={`Resolve Dispute: ${resolvingDispute.case_reference}`}
          maxWidth="md"
        >
          <form onSubmit={handleResolveDispute} className="space-y-4 text-xs">
            <div className="bg-cloud-gray/30 p-3 rounded-2xl border border-cloud-gray">
              <span className="font-bold text-midnight-navy block mb-1">
                Statement:
              </span>
              <p className="text-dark-slate italic">
                "{resolvingDispute.description}"
              </p>
            </div>

            <div>
              <label className="block font-bold text-midnight-navy mb-1.5">
                Admin Resolution Outcome & Action Taken *
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                required
                placeholder="e.g. Conducted interview with both parties. Refund issued from escrow. Provider warned on electrical safety standards."
                className="w-full bg-cloud-gray/40 border border-cloud-gray rounded-xl p-2.5 text-xs text-midnight-navy focus:outline-royal-indigo"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 rounded-2xl bg-royal-indigo hover:bg-royal-indigo/90 text-pure-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              Confirm Resolution & Close Case
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

