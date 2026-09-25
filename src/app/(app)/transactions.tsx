import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  createTransaction,
  getTransactions,
  getTransactionSummary,
  refundTransaction,
  TransactionDoc,
  TransactionSummary,
} from '../../services/transactionApi';

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'COMPLETED':
      return { bg: '#DEF7EC', text: '#03543F', border: '#84E1BC' };
    case 'PENDING':
      return { bg: '#FEF08A', text: '#713F12', border: '#FDE047' };
    case 'REFUNDED':
      return { bg: '#E1F5FE', text: '#0288D1', border: '#81D4FA' };
    case 'FAILED':
      return { bg: '#FDE8E8', text: '#9B1C1C', border: '#F8B4B4' };
    case 'CANCELLED':
      return { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
    default:
      return { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
  }
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userRole = (user as any)?.role;
  const isAdmin =
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN' ||
    userRole?.toUpperCase() === 'ADMIN' ||
    userRole?.toUpperCase() === 'SUPER_ADMIN' ||
    user?.email?.toLowerCase() === 'admin@company.com' ||
    user?.email?.toLowerCase()?.includes('admin');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

  // Modals
  const [selectedTxn, setSelectedTxn] = useState<TransactionDoc | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Create Transaction Form Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    type: 'Payment Received',
    amount: '',
    paymentMethod: 'UPI',
    customerName: '',
    referenceId: '',
    note: '',
    status: 'COMPLETED',
  });

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (!isAdmin) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedType !== 'ALL') params.transactionType = selectedType;
      if (selectedMethod !== 'ALL') params.paymentMethod = selectedMethod;

      const [listRes, summaryRes] = await Promise.all([
        getTransactions(params),
        getTransactionSummary(),
      ]);

      if (listRes.success) setTransactions(listRes.data || []);
      if (summaryRes.success) setSummary(summaryRes.data || null);
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [selectedStatus, selectedType, selectedMethod, isAdmin]);

  const handleSearchSubmit = () => {
    loadData();
  };

  const handleCreateSubmit = async () => {
    const amt = parseFloat(createForm.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTransaction({
        type: createForm.type as any,
        amount: amt,
        paymentMethod: createForm.paymentMethod as any,
        customerName: createForm.customerName.trim() || undefined,
        referenceId: createForm.referenceId.trim() || undefined,
        note: createForm.note.trim() || undefined,
        status: createForm.status as any,
      });

      if (res?.success) {
        Alert.alert(
          'Transaction Recorded',
          res.message || `Transaction ${res.data.transactionId} recorded successfully.`,
        );
        setIsCreateModalOpen(false);
        setCreateForm({
          type: 'Payment Received',
          amount: '',
          paymentMethod: 'UPI',
          customerName: '',
          referenceId: '',
          note: '',
          status: 'COMPLETED',
        });
        loadData();
      }
    } catch (err: any) {
      Alert.alert(
        'Transaction Error',
        err?.response?.data?.message || 'Failed to create transaction record.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!selectedTxn?._id) return;
    setIsRefunding(true);
    try {
      const res = await refundTransaction(selectedTxn._id, refundReason.trim());
      if (res?.success) {
        Alert.alert('Refund Processed', res.message || 'Transaction refunded successfully.');
        setShowRefundModal(false);
        setModalVisible(false);
        setRefundReason('');
        loadData();
      }
    } catch (err: any) {
      Alert.alert(
        'Refund Error',
        err?.response?.data?.message || 'Failed to process refund.',
      );
    } finally {
      setIsRefunding(false);
    }
  };

  const statusOptions = ['ALL', 'COMPLETED', 'PENDING', 'REFUNDED', 'FAILED', 'CANCELLED'];
  const typeOptions = [
    'ALL',
    'Payment Received',
    'Quotation Payment',
    'Payroll Disbursement',
    'Expense',
    'Refund',
  ];
  const methodOptions = ['ALL', 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE'];

  const renderItem = ({ item }: { item: TransactionDoc }) => {
    const statusStyle = getStatusBadgeStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedTxn(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.txnIdText}>{item.transactionId}</Text>
            {item.referenceId ? (
              <Text style={styles.refIdText}>Ref: {item.referenceId}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.customerName || item.employeeName || item.adminName || 'Direct Transaction'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>
              {item.paymentMethod} • {(item.type || 'PAYMENT').replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text
            style={[
              styles.amountValue,
              {
                color:
                  item.type?.toLowerCase().includes('refund') || item.type?.toLowerCase().includes('expense')
                    ? '#DC2626'
                    : '#059669',
              },
            ]}
          >
            {formatINR(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Access Denied</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.centerContainer, { paddingHorizontal: 24 }]}>
          <Ionicons name="lock-closed-outline" size={64} color={THEME.colors.primary} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
            Admin Access Only
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>
            Transaction history is restricted to administrators.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: THEME.colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}
            onPress={() => router.replace('/(app)/tabs/dashboard')}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>

        <TouchableOpacity
          style={styles.newTxnHeaderBtn}
          onPress={() => setIsCreateModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#7A131A" />
          <Text style={styles.newTxnHeaderBtnText}>+ New Txn</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Banner Cards */}
      {summary && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryContainer}
        >
          <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}>
            <Text style={styles.summaryLabel}>Total Received</Text>
            <Text style={[styles.summaryValue, { color: '#059669' }]}>
              {formatINR(summary.completedTotalAmount)}
            </Text>
            <Text style={styles.summarySubtext}>{summary.totalCompletedCount} completed</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#D97706' }]}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: '#D97706' }]}>
              {formatINR(summary.pendingAmount)}
            </Text>
            <Text style={styles.summarySubtext}>{summary.totalPendingCount} pending</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#2563EB' }]}>
            <Text style={styles.summaryLabel}>Refunded</Text>
            <Text style={[styles.summaryValue, { color: '#2563EB' }]}>
              {formatINR(summary.refundedAmount)}
            </Text>
            <Text style={styles.summarySubtext}>{summary.totalRefundedCount} refunded</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: '#7C3AED' }]}>
            <Text style={styles.summaryLabel}>Today's Total</Text>
            <Text style={[styles.summaryValue, { color: '#7C3AED' }]}>
              {formatINR(summary.todayTotal)}
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, Ref, Customer Name..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              loadData();
            }}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Category 1: Status */}
      <View style={{ maxHeight: 40, marginBottom: 4 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {statusOptions.map((st) => {
            const isActive = selectedStatus === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setSelectedStatus(st)}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Category 2: Transaction Types (including Quotation Payment) */}
      <View style={{ maxHeight: 40, marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
        >
          {typeOptions.map((tp) => {
            const isActive = selectedType === tp;
            return (
              <TouchableOpacity
                key={tp}
                style={[styles.pill, isActive && styles.pillActiveBlue]}
                onPress={() => setSelectedType(tp)}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                  {tp}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transactions List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#DC2626"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or filter selection.
              </Text>
            </View>
          }
        />
      )}

      {/* ── CREATE TRANSACTION MODAL ────────────────────────────────────────── */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record CRM Transaction</Text>
              <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <Text style={styles.inputLabel}>Transaction Type *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                {[
                  'Payment Received',
                  'Quotation Payment',
                  'Payroll Disbursement',
                  'Expense',
                  'Refund',
                  'Other',
                ].map((type) => {
                  const isActive = createForm.type === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.smallPill, isActive && styles.smallPillActive]}
                      onPress={() => setCreateForm({ ...createForm, type })}
                    >
                      <Text style={[styles.smallPillText, isActive && styles.smallPillTextActive]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="e.g. 25000"
                value={createForm.amount}
                onChangeText={(amount) => setCreateForm({ ...createForm, amount })}
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Payment Method *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                {['UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE'].map((method) => {
                  const isActive = createForm.paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.smallPill, isActive && styles.smallPillActive]}
                      onPress={() => setCreateForm({ ...createForm, paymentMethod: method })}
                    >
                      <Text style={[styles.smallPillText, isActive && styles.smallPillTextActive]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Customer / Payee Name (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rajesh Kumar / Client Name"
                value={createForm.customerName}
                onChangeText={(customerName) => setCreateForm({ ...createForm, customerName })}
              />

              <Text style={styles.inputLabel}>Reference / Transaction ID (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. UTR / Cheque No / Txn Ref"
                value={createForm.referenceId}
                onChangeText={(referenceId) => setCreateForm({ ...createForm, referenceId })}
              />

              <Text style={styles.inputLabel}>Notes / Purpose (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                placeholder="e.g. Project advance payment received"
                value={createForm.note}
                onChangeText={(note) => setCreateForm({ ...createForm, note })}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Save &amp; Sync Transaction</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── TRANSACTION DETAIL MODAL ────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <ScrollView style={{ maxHeight: 450 }}>
                <View style={styles.modalAmountBox}>
                  <Text style={styles.modalAmountLabel}>Amount</Text>
                  <Text style={styles.modalAmountValue}>{formatINR(selectedTxn.amount)}</Text>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeText}>{selectedTxn.status}</Text>
                  </View>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.detailLabel}>Txn ID</Text>
                  <Text style={styles.detailVal}>{selectedTxn.transactionId}</Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.detailLabel}>Ref ID</Text>
                  <Text style={styles.detailVal}>{selectedTxn.referenceId || '—'}</Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailVal}>{selectedTxn.type}</Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.detailLabel}>Method</Text>
                  <Text style={styles.detailVal}>{selectedTxn.paymentMethod}</Text>
                </View>

                {selectedTxn.customerName ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.detailLabel}>Customer</Text>
                    <Text style={styles.detailVal}>{selectedTxn.customerName}</Text>
                  </View>
                ) : null}

                {selectedTxn.employeeName ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.detailLabel}>Employee</Text>
                    <Text style={styles.detailVal}>{selectedTxn.employeeName}</Text>
                  </View>
                ) : null}

                {selectedTxn.adminName ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.detailLabel}>Admin</Text>
                    <Text style={styles.detailVal}>{selectedTxn.adminName}</Text>
                  </View>
                ) : null}

                <View style={styles.modalDetailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailVal}>{formatDate(selectedTxn.createdAt)}</Text>
                </View>

                {selectedTxn.note ? (
                  <View style={styles.noteSection}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.noteText}>{selectedTxn.note}</Text>
                  </View>
                ) : null}

                {selectedTxn.timeline && selectedTxn.timeline.length > 0 && (
                  <View style={styles.timelineSection}>
                    <Text style={styles.timelineTitle}>Audit Trail</Text>
                    {selectedTxn.timeline.map((item, idx) => (
                      <View key={idx} style={styles.timelineItem}>
                        <View style={styles.timelineDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.timelineStatus}>{item.status}</Text>
                          {item.note ? (
                            <Text style={styles.timelineNote}>{item.note}</Text>
                          ) : null}
                          <Text style={styles.timelineDate}>{formatDate(item.updatedAt)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Refund Action if Completed */}
                {selectedTxn.status === 'COMPLETED' && (
                  <TouchableOpacity
                    style={styles.refundBtn}
                    onPress={() => setShowRefundModal(true)}
                  >
                    <Ionicons name="refresh-circle-outline" size={18} color="#DC2626" />
                    <Text style={styles.refundBtnText}>Issue Refund for this Transaction</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── REFUND CONFIRMATION MODAL ────────────────────────────────────────── */}
      <Modal visible={showRefundModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Transaction Refund</Text>
              <TouchableOpacity onPress={() => setShowRefundModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
              Refunding <Text style={{ fontWeight: '700', color: '#111827' }}>{selectedTxn?.transactionId}</Text> ({formatINR(selectedTxn?.amount || 0)}).
            </Text>

            <Text style={styles.inputLabel}>Refund Reason / Notes</Text>
            <TextInput
              style={[styles.textInput, { height: 60 }]}
              multiline
              placeholder="e.g. Order cancellation requested by customer"
              value={refundReason}
              onChangeText={setRefundReason}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.closeBtn, { flex: 1, backgroundColor: '#F3F4F6' }]}
                onPress={() => setShowRefundModal(false)}
              >
                <Text style={{ color: '#4B5563', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1, backgroundColor: '#DC2626', marginTop: 0 }]}
                onPress={handleRefundSubmit}
                disabled={isRefunding}
              >
                {isRefunding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Refund</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    height: 56,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newTxnHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 3,
  },
  newTxnHeaderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7A131A',
  },
  summaryScroll: {
    marginVertical: 10,
    maxHeight: 90,
  },
  summaryContainer: {
    paddingHorizontal: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginRight: 10,
    minWidth: 140,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  summarySubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  pillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  pillActive: {
    backgroundColor: '#DC2626',
  },
  pillActiveBlue: {
    backgroundColor: '#2563EB',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  txnIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  refIdText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginVertical: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalAmountBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalAmountLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalAmountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 4,
  },
  modalBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  noteSection: {
    marginTop: 10,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  timelineSection: {
    marginTop: 14,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginTop: 4,
  },
  timelineStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  timelineNote: {
    fontSize: 11,
    color: '#6B7280',
  },
  timelineDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  closeBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
  },
  smallPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  smallPillActive: {
    backgroundColor: '#DC2626',
  },
  smallPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  refundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
    marginTop: 14,
  },
  refundBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
});
