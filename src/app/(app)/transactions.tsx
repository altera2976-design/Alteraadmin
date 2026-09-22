import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import {
  getTransactions,
  getTransactionSummary,
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionDoc[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

  const [selectedTxn, setSelectedTxn] = useState<TransactionDoc | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
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
    loadData();
  }, [selectedStatus, selectedMethod]);

  const handleSearchSubmit = () => {
    loadData();
  };

  const statusOptions = ['ALL', 'COMPLETED', 'PENDING', 'REFUNDED', 'FAILED', 'CANCELLED'];
  const methodOptions = ['ALL', 'CASH', 'ONLINE', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER'];

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
              {item.paymentMethod} • {item.type.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.infoText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>{formatINR(item.amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 24 }} />
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
          placeholder="Search by ID, Ref, Name..."
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

      {/* Filter Horizontal Pills */}
      <View style={{ maxHeight: 44 }}>
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

      {/* Transaction Detail Modal */}
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
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
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
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  pillsContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#DC2626',
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
    padding: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  txnIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  refIdText: {
    fontSize: 12,
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
    marginBottom: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalAmountBox: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  modalAmountLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalAmountValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 4,
  },
  modalBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  noteSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginTop: 5,
    marginRight: 8,
  },
  timelineStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
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
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
