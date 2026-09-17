import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { THEME } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  reportService,
  ReportSummaryData,
  DetailedReportResponse,
} from '../../../services/reportService';
import {
  formatINR,
  downloadReportPdf,
  downloadReportCsv,
  generatePdf,
  buildReportCsv,
  stringToBase64,
} from '../../../services/reportExport';

const { width } = Dimensions.get('window');

const REPORT_TYPES = [
  {
    id: 'project',
    title: 'Project Report',
    icon: 'document-text-outline',
    metricKey: 'projects',
    unit: 'Projects',
    color: '#7A131A',
  },
  {
    id: 'sales',
    title: 'Sales Report',
    icon: 'trending-up-outline',
    metricKey: 'sales',
    unit: 'Clients',
    color: '#D97706',
  },
  {
    id: 'employee',
    title: 'Employee Report',
    icon: 'people-outline',
    metricKey: 'employees',
    unit: 'Staff',
    color: '#2563EB',
  },
  {
    id: 'attendance',
    title: 'Attendance Report',
    icon: 'calendar-outline',
    metricKey: 'attendance',
    unit: 'Present',
    color: '#10B981',
  },
  {
    id: 'payment',
    title: 'Payment Report',
    icon: 'cash-outline',
    metricKey: 'payments',
    unit: 'Entries',
    color: '#8B5CF6',
  },
] as const;

type ReportTypeId = typeof REPORT_TYPES[number]['id'];

interface MonthOption {
  month: number;
  year: number;
  label: string;
}

function generateMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  // Current month and preceding 11 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ month: m, year: y, label });
  }

  // Ensure May 2024 (reference image / seed data month) is available if not in list
  if (!options.some(o => o.month === 5 && o.year === 2024)) {
    options.push({ month: 5, year: 2024, label: 'May 2024' });
  }

  return options;
}

export default function ReportsScreen() {
  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Default to current month or May 2024 if preferred
  const [selectedPeriod, setSelectedPeriod] = useState<MonthOption>(monthOptions[0]);
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);

  // Active Detail State
  const [activeType, setActiveType] = useState<ReportTypeId>('project');
  const [detailData, setDetailData] = useState<DetailedReportResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Email state
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailFormat, setEmailFormat] = useState<'pdf' | 'csv'>('pdf');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load summary data
  const fetchSummary = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await reportService.getSummary({
        month: selectedPeriod.month,
        year: selectedPeriod.year,
      });

      if (res.success) {
        setSummary(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching reports summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Load detailed report data
  const fetchDetails = useCallback(async () => {
    try {
      setDetailLoading(true);
      const res = await reportService.getDetails({
        type: activeType,
        month: selectedPeriod.month,
        year: selectedPeriod.year,
        search: searchQuery,
        status: statusFilter !== 'All' ? statusFilter : undefined,
      });

      if (res.success) {
        setDetailData(res);
      }
    } catch (err) {
      console.error('Error fetching report details:', err);
      Alert.alert('Error', 'Failed to fetch detailed report data.');
    } finally {
      setDetailLoading(false);
    }
  }, [activeType, selectedPeriod, searchQuery, statusFilter]);

  const openDetailReport = (type: ReportTypeId) => {
    setActiveType(type);
    setSearchQuery('');
    setStatusFilter('All');
    setDetailModalVisible(true);
  };

  useEffect(() => {
    if (detailModalVisible) {
      fetchDetails();
    }
  }, [detailModalVisible, fetchDetails]);

  // Handle Export PDF
  const handleExportPdf = async () => {
    if (!detailData) return;
    try {
      setExporting(true);
      await downloadReportPdf(
        activeType,
        selectedPeriod.label,
        detailData.summary || {},
        detailData.data || [],
        `Status: ${statusFilter}${searchQuery ? `, Search: "${searchQuery}"` : ''}`
      );
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  // Handle Export CSV / Excel
  const handleExportCsv = async () => {
    if (!detailData) return;
    try {
      setExporting(true);
      await downloadReportCsv(activeType, selectedPeriod.label, detailData.data || []);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not export Excel CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Open Email Modal
  const openEmailModal = () => {
    const activeObj = REPORT_TYPES.find(r => r.id === activeType);
    const title = activeObj ? activeObj.title : 'Report';
    setEmailSubject(`[Altera Interior] ${title} - ${selectedPeriod.label}`);
    setEmailMessage(`Hi,\n\nPlease find attached the ${title} for ${selectedPeriod.label} generated from the Altera Interior System.\n\nRegards,\nAltera Interior Team`);
    setEmailModalVisible(true);
  };

  // Dispatch Email
  const handleSendEmail = async () => {
    if (!emailRecipients.trim()) {
      Alert.alert('Recipient Missing', 'Please enter at least one recipient email address.');
      return;
    }

    if (!detailData) return;

    try {
      setSendingEmail(true);

      let attachmentBase64 = '';
      let filename = '';
      let mimeType = '';

      if (emailFormat === 'pdf') {
        const generated = await generatePdf(
          activeType,
          selectedPeriod.label,
          detailData.summary || {},
          detailData.data || [],
          `Status: ${statusFilter}${searchQuery ? `, Search: "${searchQuery}"` : ''}`
        );
        attachmentBase64 = generated.base64;
        filename = generated.filename;
        mimeType = 'application/pdf';
      } else {
        const csv = buildReportCsv(activeType, selectedPeriod.label, detailData.data || []);
        attachmentBase64 = stringToBase64(csv);
        filename = `${activeType}_Report_${selectedPeriod.label.replace(/\s+/g, '_')}.csv`;
        mimeType = 'text/csv';
      }

      const res = await reportService.sendEmail({
        recipients: emailRecipients.trim(),
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
        reportType: activeType,
        period: selectedPeriod.label,
        filename,
        attachmentBase64,
        mimeType,
      });

      setEmailModalVisible(false);
      Alert.alert('Email Sent', res.message || 'Report has been successfully emailed.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to send report email.';
      Alert.alert('Delivery Error', msg);
    } finally {
      setSendingEmail(false);
    }
  };

  // Filter options per type
  const filterOptions = useMemo(() => {
    switch (activeType) {
      case 'project':
        return ['All', 'In Progress', 'Planning', 'Completed', 'Pending'];
      case 'sales':
        return ['All', 'Client', 'Lead', 'Active', 'New'];
      case 'employee':
        return ['All', 'ACTIVE', 'INACTIVE'];
      case 'attendance':
        return ['All', 'PRESENT', 'LATE', 'LEAVE', 'ABSENT'];
      case 'payment':
        return ['All', 'Income', 'Expense', 'Paid', 'Settled'];
      default:
        return ['All'];
    }
  }, [activeType]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchSummary(true)} colors={[THEME.colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Date Dropdown */}
        <TouchableOpacity
          style={styles.datePicker}
          onPress={() => setPeriodModalVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.dateText}>{selectedPeriod.label}</Text>
          <Ionicons name="chevron-down" size={18} color={THEME.colors.text} />
        </TouchableOpacity>

        {/* Revenue Card (Matching design reference) */}
        <View style={styles.redCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.redCardTitle}>Total Revenue</Text>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
            ) : (
              <Text style={styles.redCardValue}>{formatINR(summary?.totalRevenue ?? 0)}</Text>
            )}
            <Text style={styles.redCardSub}>
              {summary?.revenueChangeText || '+15% from last period'}
            </Text>
          </View>

          {/* Dynamic mini bar chart */}
          <View style={styles.barChartMock}>
            {(summary?.trendBars && summary.trendBars.length === 4 ? summary.trendBars : [20, 35, 25, 50]).map((h, i) => (
              <View key={i} style={[styles.bar, { height: h }]} />
            ))}
          </View>
        </View>

        {/* Section Heading */}
        <Text style={styles.sectionHeader}>Activity & Department Reports</Text>

        {/* Reports List */}
        <View style={styles.listContainer}>
          {REPORT_TYPES.map((report) => {
            const count = summary ? (summary as any)[report.metricKey] : undefined;
            return (
              <TouchableOpacity
                key={report.id}
                style={styles.listItem}
                onPress={() => openDetailReport(report.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.listIconWrap, { backgroundColor: `${report.color}15` }]}>
                  <Ionicons name={report.icon as any} size={22} color={report.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.listText}>{report.title}</Text>
                  <Text style={styles.listSubText}>
                    {count !== undefined ? `${count} ${report.unit}` : 'View details & analytics'}
                  </Text>
                </View>

                <View style={styles.listActionWrap}>
                  <Text style={styles.viewBadge}>View</Text>
                  <Ionicons name="chevron-forward" size={18} color={THEME.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 1. Period Selector Modal */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={periodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPeriodModalVisible(false)}
        >
          <View style={styles.periodPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Reporting Period</Text>
              <TouchableOpacity onPress={() => setPeriodModalVisible(false)}>
                <Ionicons name="close" size={22} color="#444" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {monthOptions.map((item, idx) => {
                const isSelected = item.month === selectedPeriod.month && item.year === selectedPeriod.year;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.periodOption, isSelected && styles.periodOptionSelected]}
                    onPress={() => {
                      setSelectedPeriod(item);
                      setPeriodModalVisible(false);
                    }}
                  >
                    <Text style={[styles.periodOptionText, isSelected && styles.periodOptionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 2. Detailed Report Modal */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.detailContainer}>
          {/* Detail Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.detailBackBtn}
              onPress={() => setDetailModalVisible(false)}
            >
              <Ionicons name="arrow-back" size={22} color="#111" />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {REPORT_TYPES.find(r => r.id === activeType)?.title}
              </Text>
              <Text style={styles.detailSub}>{selectedPeriod.label}</Text>
            </View>

            <View style={styles.detailActionButtons}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleExportPdf}
                disabled={exporting}
              >
                <Ionicons name="download-outline" size={20} color={THEME.colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={openEmailModal}
                disabled={exporting}
              >
                <Ionicons name="mail-outline" size={20} color={THEME.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action Bar */}
          <View style={styles.quickBar}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={handleExportPdf}
              disabled={exporting}
            >
              <Ionicons name="document-text-outline" size={16} color="#7A131A" />
              <Text style={styles.quickBtnText}>PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={handleExportCsv}
              disabled={exporting}
            >
              <Ionicons name="grid-outline" size={16} color="#10B981" />
              <Text style={styles.quickBtnText}>Excel / CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnPrimary]}
              onPress={openEmailModal}
              disabled={exporting}
            >
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={[styles.quickBtnText, { color: '#fff' }]}>Send Email</Text>
            </TouchableOpacity>
          </View>

          {/* Search & Status Filter Chips */}
          <View style={styles.filterSection}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search report records..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {filterOptions.map((opt) => {
                const isSelected = statusFilter === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setStatusFilter(opt)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Content Body */}
          {detailLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Loading report details...</Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Summary KPIs */}
              {detailData?.summary && Object.keys(detailData.summary).length > 0 ? (
                <View style={styles.kpiGrid}>
                  {Object.entries(detailData.summary).map(([k, v], i) => {
                    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                    const isCurrency = typeof v === 'number' && (k.toLowerCase().includes('budget') || k.toLowerCase().includes('revenue') || k.toLowerCase().includes('salary') || k.toLowerCase().includes('inflow') || k.toLowerCase().includes('outflow') || k.toLowerCase().includes('cashflow') || k.toLowerCase().includes('value'));
                    return (
                      <View key={i} style={styles.kpiBox}>
                        <Text style={styles.kpiBoxLabel} numberOfLines={1}>{label}</Text>
                        <Text style={styles.kpiBoxVal} numberOfLines={1}>{isCurrency ? formatINR(v) : String(v)}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Records Section Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableCount}>
                  Showing {detailData?.data?.length || 0} Records
                </Text>
              </View>

              {/* Record Cards */}
              {detailData?.data && detailData.data.length > 0 ? (
                detailData.data.map((item, idx) => (
                  <RecordCard key={item._id || idx} type={activeType} item={item} />
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="file-tray-outline" size={44} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Records Found</Text>
                  <Text style={styles.emptySub}>
                    Try changing your search keywords or switching filters for {selectedPeriod.label}.
                  </Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* 3. Send Email Modal */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setEmailModalVisible(false)}
        >
          <View style={styles.emailModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Send Report via Email</Text>
                <Text style={styles.modalSubtitle}>Report will be dispatched with attachment</Text>
              </View>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Recipient Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Recipient Email(s) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. director@alterainterior.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailRecipients}
                onChangeText={setEmailRecipients}
              />
              <Text style={styles.hintText}>Separate multiple emails with commas</Text>
            </View>

            {/* Format Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Attachment Format</Text>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[styles.formatBtn, emailFormat === 'pdf' && styles.formatBtnActive]}
                  onPress={() => setEmailFormat('pdf')}
                >
                  <Ionicons name="document-text" size={16} color={emailFormat === 'pdf' ? '#fff' : '#555'} />
                  <Text style={[styles.formatBtnText, emailFormat === 'pdf' && styles.formatBtnTextActive]}>PDF Document</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.formatBtn, emailFormat === 'csv' && styles.formatBtnActive]}
                  onPress={() => setEmailFormat('csv')}
                >
                  <Ionicons name="grid" size={16} color={emailFormat === 'csv' ? '#fff' : '#555'} />
                  <Text style={[styles.formatBtnText, emailFormat === 'csv' && styles.formatBtnTextActive]}>Excel (.CSV)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Subject */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput
                style={styles.modalInput}
                value={emailSubject}
                onChangeText={setEmailSubject}
              />
            </View>

            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={3}
                value={emailMessage}
                onChangeText={setEmailMessage}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEmailModalVisible(false)}
                disabled={sendingEmail}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSendBtn, sendingEmail && { opacity: 0.7 }]}
                onPress={handleSendEmail}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSendText}>Send Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/**
 * Subcomponent to render individual cards according to the report type
 */
function RecordCard({ type, item }: { type: ReportTypeId; item: any }) {
  switch (type) {
    case 'project':
      return (
        <View style={styles.recordCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>Client: {item.client}</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: getStatusBg(item.status) }]}>
              <Text style={[styles.badgePillText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.cardStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Budget</Text>
              <Text style={[styles.statVal, { color: '#7A131A' }]}>{formatINR(item.budget)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Start Date</Text>
              <Text style={styles.statVal}>{item.startDate}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Deadline</Text>
              <Text style={styles.statVal}>{item.deadline}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.progress || 0}%` }]} />
              </View>
            </View>
            <Text style={styles.progressText}>{item.progress || 0}% Done</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.teamTag}><Ionicons name="person-circle-outline" size={14} /> Team: {item.assignedTeam}</Text>
          </View>
        </View>
      );

    case 'sales':
      return (
        <View style={styles.recordCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>{item.company}</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: item.type === 'Client' ? '#DEF7EC' : '#FEF08A' }]}>
              <Text style={[styles.badgePillText, { color: item.type === 'Client' ? '#03543F' : '#854D0E' }]}>
                {item.type}
              </Text>
            </View>
          </View>

          <View style={styles.cardStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Phone</Text>
              <Text style={styles.statVal}>{item.phone}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Email</Text>
              <Text style={styles.statVal} numberOfLines={1}>{item.email}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statVal}>{item.status}</Text>
            </View>
          </View>

          {item.orderValue > 0 && (
            <View style={styles.orderValBanner}>
              <Text style={styles.orderValLabel}>Associated Project Value:</Text>
              <Text style={styles.orderVal}>{formatINR(item.orderValue)}</Text>
            </View>
          )}
        </View>
      );

    case 'employee':
      return (
        <View style={styles.recordCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSub}>ID: {item.employeeId} • {item.designation}</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: item.status === 'ACTIVE' ? '#DEF7EC' : '#FDE8E8' }]}>
              <Text style={[styles.badgePillText, { color: item.status === 'ACTIVE' ? '#03543F' : '#9B1C1C' }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.cardStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Department</Text>
              <Text style={styles.statVal}>{item.department}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Salary</Text>
              <Text style={styles.statVal}>{formatINR(item.salary)}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={[styles.statVal, { color: '#10B981' }]}>{item.presentDays || 0} Days</Text>
            </View>
          </View>
        </View>
      );

    case 'attendance':
      return (
        <View style={styles.recordCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.employeeName}</Text>
              <Text style={styles.cardSub}>{item.date} • {item.employeeId}</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: getAttendanceBg(item.status) }]}>
              <Text style={[styles.badgePillText, { color: getAttendanceColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.cardStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Check-In</Text>
              <Text style={styles.statVal}>{item.checkIn}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Check-Out</Text>
              <Text style={styles.statVal}>{item.checkOut}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Location</Text>
              <Text style={styles.statVal} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
        </View>
      );

    case 'payment':
      const isPositive = item.amount >= 0;
      return (
        <View style={styles.recordCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.party} • {item.referenceId}</Text>
            </View>
            <Text style={[styles.paymentAmount, { color: isPositive ? '#10B981' : '#D60000' }]}>
              {formatINR(item.amount)}
            </Text>
          </View>

          <View style={styles.cardStatsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Type</Text>
              <Text style={styles.statVal}>{item.type}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Date</Text>
              <Text style={styles.statVal}>{item.date}</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statVal}>{item.status}</Text>
            </View>
          </View>
        </View>
      );
  }
}

function getStatusBg(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': return '#DEF7EC';
    case 'in progress': return '#FEF08A';
    case 'planning': return '#E1EFFE';
    case 'cancelled': return '#FDE8E8';
    default: return '#F3F4F6';
  }
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': return '#03543F';
    case 'in progress': return '#854D0E';
    case 'planning': return '#1E429F';
    case 'cancelled': return '#9B1C1C';
    default: return '#374151';
  }
}

function getAttendanceBg(status: string) {
  switch (status?.toUpperCase()) {
    case 'PRESENT': return '#DEF7EC';
    case 'LATE': return '#FEF08A';
    case 'LEAVE': case 'HALF_DAY': return '#E1EFFE';
    case 'ABSENT': return '#FDE8E8';
    default: return '#F3F4F6';
  }
}

function getAttendanceColor(status: string) {
  switch (status?.toUpperCase()) {
    case 'PRESENT': return '#03543F';
    case 'LATE': return '#854D0E';
    case 'LEAVE': case 'HALF_DAY': return '#1E429F';
    case 'ABSENT': return '#9B1C1C';
    default: return '#374151';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginRight: 8,
  },

  redCard: {
    backgroundColor: '#7A131A',
    borderRadius: 18,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7A131A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  redCardTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  redCardValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  redCardSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  barChartMock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 52,
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 6,
    borderRadius: 8,
  },
  bar: {
    width: 7,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 4,
  },

  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  listIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  listSubText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '400',
  },
  listActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7A131A',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  periodPickerModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  periodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  periodOptionSelected: {
    backgroundColor: '#FFF5F5',
  },
  periodOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  periodOptionTextSelected: {
    color: '#7A131A',
    fontWeight: '700',
  },

  // Detail Modal Container
  detailContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
  },
  detailSub: {
    fontSize: 12,
    color: '#7A131A',
    fontWeight: '600',
  },
  detailActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },

  // Quick Action Bar
  quickBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  quickBtnPrimary: {
    backgroundColor: '#7A131A',
    borderColor: '#7A131A',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  // Filter & Search
  filterSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111',
    height: '100%',
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: '#7A131A',
  },
  chipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiBox: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiBoxLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiBoxVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  tableHeaderRow: {
    marginBottom: 12,
  },
  tableCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Record Cards
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  cardSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7A131A',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 2,
  },
  teamTag: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  orderValBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  orderValLabel: {
    fontSize: 11,
    color: '#7A131A',
    fontWeight: '600',
  },
  orderVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7A131A',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // Email Modal
  emailModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111',
  },
  hintText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  formatBtnActive: {
    backgroundColor: '#7A131A',
    borderColor: '#7A131A',
  },
  formatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  formatBtnTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7A131A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSendText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
