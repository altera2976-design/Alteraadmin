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
  Dimensions,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import {
  payrollService,
  PayrollRecord,
  PayrollSummary,
  PayrollConfig,
} from '../../services/payrollService';
import {
  formatINR,
  downloadPayslipPdf,
  generatePayslipPdf,
} from '../../services/payslipExport';

const { width, height } = Dimensions.get('window');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalaryScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // ── Mode Switch: 'my' | 'admin' ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');

  // ── Month Selection ────────────────────────────────────────────────────────
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);

  // ── State for Employee Payroll View ─────────────────────────────────────────
  const [myRecord, setMyRecord] = useState<PayrollRecord | null>(null);

  // ── State for Admin Payroll View ────────────────────────────────────────────
  const [payrollList, setPayrollList] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  // ── UI States ───────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // ── Detail Modal State ─────────────────────────────────────────────────────
  const [selectedDetail, setSelectedDetail] = useState<PayrollRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ── Pay Salary Modal State ─────────────────────────────────────────────────
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'UPI' | 'CHEQUE'>('BANK_TRANSFER');
  const [transactionId, setTransactionId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ── Email Modal State ──────────────────────────────────────────────────────
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetRecord, setEmailTargetRecord] = useState<PayrollRecord | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // ── Settings Modal State ───────────────────────────────────────────────────
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [config, setConfig] = useState<PayrollConfig | null>(null);
  const [editConfig, setEditConfig] = useState<any>({});
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleAuthError = useCallback((error: any) => {
    const status = error?.status || error?.response?.status;
    if (status === 401) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'OK',
            onPress: async () => {
              if (logout) await logout();
              router.replace('/(auth)/login');
            },
          },
        ]
      );
      return true;
    }
    return false;
  }, [logout, router]);

  // ── Load Payroll Data ──────────────────────────────────────────────────────
  const loadPayroll = useCallback(async (forceRecalculate = false) => {
    try {
      const res = await payrollService.calculate(selectedMonth, forceRecalculate);
      if (res?.success) {
        setPayrollList(res.payroll || []);
        setSummary(res.summary || null);

        // Find current user's record
        if (user?._id) {
          const userRec = res.payroll.find(
            p => (p.userId?._id || p.userId) === user._id || (p.employee?._id === user._id)
          );
          setMyRecord(userRec || (res.payroll.length === 1 ? res.payroll[0] : null));
        }
      }
    } catch (error: any) {
      if (!handleAuthError(error)) {
        console.warn('Payroll notice:', error?.response?.data?.message || error?.message || 'Unable to load payroll.');
      }
    }
  }, [selectedMonth, user?._id, handleAuthError]);

  // Load config on mount
  useEffect(() => {
    payrollService.getConfig().then(res => {
      if (res?.success) {
        setConfig(res.data);
        setEditConfig(res.data);
      }
    }).catch(err => console.error('Config fetch error:', err));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadPayroll(false).finally(() => setIsLoading(false));
  }, [loadPayroll]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPayroll(false);
    setIsRefreshing(false);
  }, [loadPayroll]);

  // ── Available Months Generator (Past 12 Months) ────────────────────────────
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      months.push({ value: val, label });
    }
    return months;
  }, []);

  const currentMonthLabel = useMemo(() => {
    const found = availableMonths.find(m => m.value === selectedMonth);
    if (found) return found.label;
    const [y, m] = selectedMonth.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1] || m} ${y}`;
  }, [selectedMonth, availableMonths]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprovePayroll = async () => {
    Alert.alert(
      'Approve Monthly Payroll',
      `Are you sure you want to approve payroll for ${currentMonthLabel}? This will lock the calculated salaries for disbursal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Lock',
          style: 'default',
          onPress: async () => {
            try {
              const res = await payrollService.approve(selectedMonth);
              if (res?.success) {
                Alert.alert('Success', res.message || 'Payroll approved successfully.');
                loadPayroll(false);
              }
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to approve payroll.');
            }
          },
        },
      ]
    );
  };

  const handleRecalculateAll = async () => {
    Alert.alert(
      'Recalculate Payroll',
      `This will recalculate all employees' salaries for ${currentMonthLabel} based on their latest attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalculate',
          style: 'default',
          onPress: async () => {
            setIsLoading(true);
            await loadPayroll(true);
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const handleMarkAsPaid = async () => {
    if (!selectedDetail?._id) return;
    setIsSubmittingPayment(true);
    try {
      const res = await payrollService.pay({
        payrollId: selectedDetail._id,
        paymentMethod,
        transactionId: transactionId.trim() || `TXN-${Date.now()}`,
        paidAmount: selectedDetail.netSalary,
      });

      if (res?.success) {
        Alert.alert('Payment Recorded', `Salary marked as paid for ${selectedDetail.employee?.name || 'Employee'}.`);
        setIsPaymentModalOpen(false);
        setSelectedDetail(res.payroll);
        loadPayroll(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSendEmailSubmit = async () => {
    if (!emailTargetRecord?._id) return;
    setIsSendingEmail(true);
    try {
      const pdf = await generatePayslipPdf(emailTargetRecord, emailTargetRecord.employee);
      const res = await payrollService.sendPayslip({
        payrollId: emailTargetRecord._id,
        recipientEmail: emailRecipient.trim(),
        message: emailMessage.trim(),
        pdfBase64: pdf.base64,
      });

      if (res?.success) {
        Alert.alert('Payslip Dispatched', res.message || 'Email sent successfully.');
        setIsEmailModalOpen(false);
      }
    } catch (err: any) {
      Alert.alert('Sending Failed', err?.response?.data?.message || err?.message || 'Failed to send payslip email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingConfig(true);
    try {
      const res = await payrollService.updateConfig({
        standardWorkingHours: Number(editConfig.standardWorkingHours) || 8,
        workingDaysPerWeek: Number(editConfig.workingDaysPerWeek) || 6,
        defaultOvertimeRatePerHour: Number(editConfig.defaultOvertimeRatePerHour) || 200,
        calculationMethod: editConfig.calculationMethod || 'CALENDAR_DAYS',
        deductionRules: {
          pfPercentage: Number(editConfig.pfPercentage) || 12,
          esiPercentage: Number(editConfig.esiPercentage) || 0.75,
          profTaxFixed: Number(editConfig.profTaxFixed) || 200,
          tdsDefaultPercentage: Number(editConfig.tdsDefaultPercentage) || 0,
        },
      });

      if (res?.success) {
        setConfig(res.data);
        setIsSettingsModalOpen(false);
        Alert.alert('Settings Saved', 'Payroll calculation rules updated successfully.');
        loadPayroll(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update settings.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ── Filtered Payroll for Admin ─────────────────────────────────────────────
  const filteredPayroll = useMemo(() => {
    return payrollList.filter(item => {
      const name = (item.employee?.name || '').toLowerCase();
      const empId = (item.employee?.employeeId || '').toLowerCase();
      const s = searchQuery.toLowerCase();
      const matchesSearch = name.includes(s) || empId.includes(s);
      const matchesStatus = statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [payrollList, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return '#10B981';
      case 'APPROVED':
        return '#3B82F6';
      case 'CALCULATED':
        return '#F59E0B';
      case 'DRAFT':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'rgba(16, 185, 129, 0.12)';
      case 'APPROVED':
        return 'rgba(59, 130, 246, 0.12)';
      case 'CALCULATED':
        return 'rgba(245, 158, 11, 0.12)';
      default:
        return '#F3F4F6';
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salary & Payroll</Text>
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => {
              setEditConfig({
                ...config,
                pfPercentage: config?.deductionRules?.pfPercentage ?? 12,
                esiPercentage: config?.deductionRules?.esiPercentage ?? 0.75,
                profTaxFixed: config?.deductionRules?.profTaxFixed ?? 200,
                tdsDefaultPercentage: config?.deductionRules?.tdsDefaultPercentage ?? 0,
              });
              setIsSettingsModalOpen(true);
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* ── ADMIN TAB SWITCHER ──────────────────────────────────────────────── */}
      {isAdmin && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'admin' && styles.tabItemActive]}
            onPress={() => setActiveTab('admin')}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={activeTab === 'admin' ? THEME.colors.primary : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'admin' && styles.tabTextActive]}>
              Admin Payroll
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'my' && styles.tabItemActive]}
            onPress={() => setActiveTab('my')}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={activeTab === 'my' ? THEME.colors.primary : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
              My Payslip
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PERIOD SELECTOR BAR ─────────────────────────────────────────────── */}
      <View style={styles.periodBar}>
        <TouchableOpacity
          style={styles.monthSelectorBtn}
          onPress={() => setIsMonthModalOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar" size={18} color={THEME.colors.primary} />
          <Text style={styles.monthSelectorText}>{currentMonthLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="#6B7280" />
        </TouchableOpacity>

        {activeTab === 'admin' && isAdmin && (
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleRecalculateAll} accessibilityLabel="Recalculate">
              <Ionicons name="refresh" size={18} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtnPrimary} onPress={handleApprovePayroll} accessibilityLabel="Approve">
              <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── MAIN SCROLLABLE BODY ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
      >
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loaderText}>Calculating salary from attendance records...</Text>
          </View>
        ) : activeTab === 'my' ? (
          /* ═════════════════════════════════════════════════════════════════════
             EMPLOYEE VIEW: MY PAYSLIP
          ═════════════════════════════════════════════════════════════════════ */
          myRecord ? (
            <>
              {/* Red Total Salary Card */}
              <View style={styles.redCard}>
                <View style={styles.redCardHeader}>
                  <Text style={styles.redCardSubtitle}>Net Take-Home Salary</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBg(myRecord.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(myRecord.status) },
                      ]}
                    >
                      {myRecord.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.redCardValue}>{formatINR(myRecord.netSalary)}</Text>
                <Text style={styles.redCardSub}>
                  {myRecord.proRata?.isProRata
                    ? myRecord.proRata.notes
                    : `Pay Period: ${currentMonthLabel}`}
                </Text>
              </View>

              {/* Attendance Modification Warning Banner */}
              {myRecord.attendanceChangedAfterApproval && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={20} color="#B45309" />
                  <Text style={styles.warningBannerText}>
                    Attendance records changed after payroll approval. Contact Admin for review.
                  </Text>
                </View>
              )}

              {/* Attendance Statistics Grid */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Attendance Performance</Text>
                <View style={styles.attGrid}>
                  <View style={styles.attBox}>
                    <Text style={styles.attVal}>{myRecord.attendanceSummary?.totalCalendarDays ?? 30}</Text>
                    <Text style={styles.attLbl}>Days in Month</Text>
                  </View>
                  <View style={styles.attBox}>
                    <Text style={[styles.attVal, { color: '#10B981' }]}>
                      {myRecord.attendanceSummary?.presentDays ?? 0}
                    </Text>
                    <Text style={styles.attLbl}>Present Days</Text>
                  </View>
                  <View style={styles.attBox}>
                    <Text style={[styles.attVal, { color: '#F59E0B' }]}>
                      {myRecord.attendanceSummary?.halfDays ?? 0}
                    </Text>
                    <Text style={styles.attLbl}>Half Days</Text>
                  </View>
                  <View style={styles.attBox}>
                    <Text style={[styles.attVal, { color: '#EF4444' }]}>
                      {myRecord.attendanceSummary?.unpaidLeave ?? 0}
                    </Text>
                    <Text style={styles.attLbl}>Unpaid Leave</Text>
                  </View>
                  <View style={styles.attBox}>
                    <Text style={[styles.attVal, { color: '#3B82F6' }]}>
                      {myRecord.attendanceSummary?.paidLeave ?? 0}
                    </Text>
                    <Text style={styles.attLbl}>Paid Leave</Text>
                  </View>
                  <View style={styles.attBox}>
                    <Text style={styles.attVal}>{myRecord.attendanceSummary?.overtimeHours ?? 0} hrs</Text>
                    <Text style={styles.attLbl}>Overtime</Text>
                  </View>
                </View>
              </View>

              {/* Earnings & Deductions Breakdown */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Earnings Breakdown</Text>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLbl}>Basic Salary</Text>
                  <Text style={styles.tableVal}>{formatINR(myRecord.earnings?.basic)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLbl}>House Rent Allowance (HRA)</Text>
                  <Text style={styles.tableVal}>{formatINR(myRecord.earnings?.hra)}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={styles.tableLbl}>Special & Travel Allowances</Text>
                  <Text style={styles.tableVal}>{formatINR(myRecord.earnings?.allowances)}</Text>
                </View>
                {(myRecord.earnings?.overtimeAmount || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>
                      Overtime ({myRecord.attendanceSummary?.overtimeHours} hrs @ ₹{myRecord.earnings?.overtimeRate}/hr)
                    </Text>
                    <Text style={[styles.tableVal, { color: '#10B981' }]}>
                      +{formatINR(myRecord.earnings?.overtimeAmount)}
                    </Text>
                  </View>
                )}
                {(myRecord.earnings?.bonus || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>Performance Bonus</Text>
                    <Text style={[styles.tableVal, { color: '#10B981' }]}>+{formatINR(myRecord.earnings?.bonus)}</Text>
                  </View>
                )}
                <View style={[styles.tableRow, styles.subtotalRow]}>
                  <Text style={styles.subtotalLbl}>Total Gross Earnings</Text>
                  <Text style={styles.subtotalVal}>{formatINR(myRecord.earnings?.grossSalary)}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Deductions Breakdown</Text>
                {(myRecord.deductions?.unpaidLeaveDeduction || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>
                      Unpaid Absence ({myRecord.attendanceSummary?.unpaidLeave} days)
                    </Text>
                    <Text style={[styles.tableVal, { color: '#EF4444' }]}>
                      -{formatINR(myRecord.deductions?.unpaidLeaveDeduction)}
                    </Text>
                  </View>
                )}
                {(myRecord.deductions?.halfDayDeduction || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>
                      Half-Day Penalty ({myRecord.attendanceSummary?.halfDays} half days)
                    </Text>
                    <Text style={[styles.tableVal, { color: '#EF4444' }]}>
                      -{formatINR(myRecord.deductions?.halfDayDeduction)}
                    </Text>
                  </View>
                )}
                {(myRecord.deductions?.pf || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>Provident Fund (PF)</Text>
                    <Text style={styles.tableVal}>-{formatINR(myRecord.deductions?.pf)}</Text>
                  </View>
                )}
                {(myRecord.deductions?.esi || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>ESI Contribution</Text>
                    <Text style={styles.tableVal}>-{formatINR(myRecord.deductions?.esi)}</Text>
                  </View>
                )}
                {(myRecord.deductions?.profTax || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>Professional Tax (PT)</Text>
                    <Text style={styles.tableVal}>-{formatINR(myRecord.deductions?.profTax)}</Text>
                  </View>
                )}
                {(myRecord.deductions?.tds || 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>TDS Withholding</Text>
                    <Text style={styles.tableVal}>-{formatINR(myRecord.deductions?.tds)}</Text>
                  </View>
                )}
                <View style={[styles.tableRow, styles.subtotalRow]}>
                  <Text style={[styles.subtotalLbl, { color: '#EF4444' }]}>Total Deductions</Text>
                  <Text style={[styles.subtotalVal, { color: '#EF4444' }]}>
                    -{formatINR(myRecord.deductions?.totalDeductions)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: Download PDF & Email */}
              <View style={styles.employeeActionRow}>
                <TouchableOpacity
                  style={styles.downloadPdfBtn}
                  onPress={() => downloadPayslipPdf(myRecord, user)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.downloadPdfBtnText}>Download PDF Payslip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.emailPdfBtn}
                  onPress={() => {
                    setEmailTargetRecord(myRecord);
                    setEmailRecipient(user?.email || '');
                    setEmailMessage('');
                    setIsEmailModalOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-outline" size={18} color={THEME.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.emailPdfBtnText}>Email Payslip</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Payslip for {currentMonthLabel}</Text>
              <Text style={styles.emptySub}>
                Salary will appear once attendance is recorded for this month.
              </Text>
            </View>
          )
        ) : (
          /* ═════════════════════════════════════════════════════════════════════
             ADMIN VIEW: ALL EMPLOYEES PAYROLL
          ═════════════════════════════════════════════════════════════════════ */
          <>
            {/* KPI Summary Cards */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderLeftColor: THEME.colors.primary }]}>
                <Text style={styles.kpiVal}>{summary?.totalEmployees ?? 0}</Text>
                <Text style={styles.kpiLbl}>Total Staff</Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.kpiVal}>{formatINR(summary?.totalGrossSalary)}</Text>
                <Text style={styles.kpiLbl}>Gross Payroll</Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.kpiVal}>{formatINR(summary?.totalDeductions)}</Text>
                <Text style={styles.kpiLbl}>Deductions</Text>
              </View>
              <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
                <Text style={[styles.kpiVal, { color: '#10B981' }]}>{formatINR(summary?.totalNetSalary)}</Text>
                <Text style={styles.kpiLbl}>Net Payable</Text>
              </View>
            </View>

            {/* Search & Filter Bar */}
            <View style={styles.searchBarWrap}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search employee name or ID..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9CA3AF"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              >
                {['ALL', 'CALCULATED', 'APPROVED', 'PAID'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterChip,
                      statusFilter === st && styles.filterChipActive,
                    ]}
                    onPress={() => setStatusFilter(st)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === st && styles.filterChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Employee Payroll List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Employee Payroll Roster</Text>
              <Text style={styles.sectionSub}>{filteredPayroll.length} records</Text>
            </View>

            {filteredPayroll.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cash-outline" size={44} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Payroll Records Found</Text>
                <Text style={styles.emptySub}>No active employees or matches for {currentMonthLabel}.</Text>
              </View>
            ) : (
              filteredPayroll.map(item => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.payrollCard}
                  activeOpacity={0.85}
                  onPress={() => setSelectedDetail(item)}
                >
                  <View style={styles.payrollCardTop}>
                    <View style={styles.avatarWrap}>
                      <Text style={styles.avatarText}>
                        {item.employee?.name?.charAt(0) || 'E'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.empNameText}>{item.employee?.name || 'Employee'}</Text>
                      <Text style={styles.empIdText}>
                        {item.employee?.employeeId || 'ID Pending'} • {item.employee?.department || 'General'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBg(item.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getStatusColor(item.status) },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {item.attendanceChangedAfterApproval && (
                    <View style={styles.cardWarningBadge}>
                      <Ionicons name="alert-circle" size={14} color="#B45309" />
                      <Text style={styles.cardWarningText}>Attendance changed after approval</Text>
                    </View>
                  )}

                  <View style={styles.payrollCardDetails}>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLbl}>Present / Total</Text>
                      <Text style={styles.detailColVal}>
                        {item.attendanceSummary?.presentDays ?? 0} / {item.attendanceSummary?.workingDays ?? 26}d
                      </Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLbl}>Overtime</Text>
                      <Text style={styles.detailColVal}>{item.attendanceSummary?.overtimeHours ?? 0} hrs</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLbl}>Gross Pay</Text>
                      <Text style={styles.detailColVal}>{formatINR(item.earnings?.grossSalary)}</Text>
                    </View>
                    <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                      <Text style={styles.detailColLbl}>Net Salary</Text>
                      <Text style={[styles.detailColVal, { color: '#10B981', fontWeight: '800' }]}>
                        {formatINR(item.netSalary)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* ═════════════════════════════════════════════════════════════════════════
          MONTH PICKER MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isMonthModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.monthModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select Payroll Month</Text>
              <TouchableOpacity onPress={() => setIsMonthModalOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {availableMonths.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[
                    styles.monthItem,
                    selectedMonth === m.value && styles.monthItemActive,
                  ]}
                  onPress={() => {
                    setSelectedMonth(m.value);
                    setIsMonthModalOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthItemText,
                      selectedMonth === m.value && styles.monthItemTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                  {selectedMonth === m.value && (
                    <Ionicons name="checkmark-circle" size={20} color={THEME.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════
          ADMIN DETAILED SALARY BREAKDOWN MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!selectedDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Salary Breakdown</Text>
              <TouchableOpacity onPress={() => setSelectedDetail(null)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {selectedDetail && (
              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Employee Header Card */}
                <View style={styles.detailEmpHeader}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                      {selectedDetail.employee?.name?.charAt(0) || 'E'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailEmpName}>{selectedDetail.employee?.name}</Text>
                    <Text style={styles.detailEmpSub}>
                      {selectedDetail.employee?.employeeId || 'ID Pending'} • {selectedDetail.employee?.designation || 'Staff'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBg(selectedDetail.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(selectedDetail.status) },
                      ]}
                    >
                      {selectedDetail.status}
                    </Text>
                  </View>
                </View>

                {/* Net Pay Highlight Banner */}
                <View style={styles.netHighlightBanner}>
                  <div>
                    <Text style={styles.netHighlightLbl}>Net Payable Salary</Text>
                    <Text style={styles.netHighlightPeriod}>Month: {currentMonthLabel}</Text>
                  </div>
                  <Text style={styles.netHighlightVal}>{formatINR(selectedDetail.netSalary)}</Text>
                </View>

                {/* Attendance Summary */}
                <Text style={styles.fieldSectionTitle}>Attendance Breakdown</Text>
                <View style={styles.attGridMini}>
                  <View style={styles.attBoxMini}>
                    <Text style={styles.attValMini}>{selectedDetail.attendanceSummary?.presentDays ?? 0}</Text>
                    <Text style={styles.attLblMini}>Present</Text>
                  </View>
                  <View style={styles.attBoxMini}>
                    <Text style={[styles.attValMini, { color: '#F59E0B' }]}>
                      {selectedDetail.attendanceSummary?.halfDays ?? 0}
                    </Text>
                    <Text style={styles.attLblMini}>Half Day</Text>
                  </View>
                  <View style={styles.attBoxMini}>
                    <Text style={[styles.attValMini, { color: '#EF4444' }]}>
                      {selectedDetail.attendanceSummary?.unpaidLeave ?? 0}
                    </Text>
                    <Text style={styles.attLblMini}>Unpaid</Text>
                  </View>
                  <View style={styles.attBoxMini}>
                    <Text style={[styles.attValMini, { color: '#3B82F6' }]}>
                      {selectedDetail.attendanceSummary?.paidLeave ?? 0}
                    </Text>
                    <Text style={styles.attLblMini}>Paid Leave</Text>
                  </View>
                  <View style={styles.attBoxMini}>
                    <Text style={styles.attValMini}>{selectedDetail.attendanceSummary?.overtimeHours ?? 0} hrs</Text>
                    <Text style={styles.attLblMini}>Overtime</Text>
                  </View>
                </View>

                {/* Earnings List */}
                <Text style={styles.fieldSectionTitle}>Earnings</Text>
                <View style={styles.breakdownCard}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>Basic Salary</Text>
                    <Text style={styles.tableVal}>{formatINR(selectedDetail.earnings?.basic)}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>HRA</Text>
                    <Text style={styles.tableVal}>{formatINR(selectedDetail.earnings?.hra)}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLbl}>Allowances</Text>
                    <Text style={styles.tableVal}>{formatINR(selectedDetail.earnings?.allowances)}</Text>
                  </View>
                  {(selectedDetail.earnings?.overtimeAmount || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLbl}>
                        Overtime ({selectedDetail.attendanceSummary?.overtimeHours}h @ ₹{selectedDetail.earnings?.overtimeRate}/h)
                      </Text>
                      <Text style={[styles.tableVal, { color: '#10B981' }]}>
                        +{formatINR(selectedDetail.earnings?.overtimeAmount)}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.tableRow, styles.subtotalRow]}>
                    <Text style={styles.subtotalLbl}>Gross Salary</Text>
                    <Text style={styles.subtotalVal}>{formatINR(selectedDetail.earnings?.grossSalary)}</Text>
                  </View>
                </View>

                {/* Deductions List */}
                <Text style={styles.fieldSectionTitle}>Deductions</Text>
                <View style={styles.breakdownCard}>
                  {(selectedDetail.deductions?.unpaidLeaveDeduction || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLbl}>
                        Unpaid Absence ({selectedDetail.attendanceSummary?.unpaidLeave}d)
                      </Text>
                      <Text style={[styles.tableVal, { color: '#EF4444' }]}>
                        -{formatINR(selectedDetail.deductions?.unpaidLeaveDeduction)}
                      </Text>
                    </View>
                  )}
                  {(selectedDetail.deductions?.halfDayDeduction || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLbl}>
                        Half-Day Deduction ({selectedDetail.attendanceSummary?.halfDays}d)
                      </Text>
                      <Text style={[styles.tableVal, { color: '#EF4444' }]}>
                        -{formatINR(selectedDetail.deductions?.halfDayDeduction)}
                      </Text>
                    </View>
                  )}
                  {(selectedDetail.deductions?.pf || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLbl}>PF (Provident Fund)</Text>
                      <Text style={styles.tableVal}>-{formatINR(selectedDetail.deductions?.pf)}</Text>
                    </View>
                  )}
                  {(selectedDetail.deductions?.esi || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLbl}>ESI</Text>
                      <Text style={styles.tableVal}>-{formatINR(selectedDetail.deductions?.esi)}</Text>
                    </View>
                  )}
                  {(selectedDetail.deductions?.profTax || 0) > 0 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.tableLbl}>Professional Tax</Text>
                      <Text style={styles.tableVal}>-{formatINR(selectedDetail.deductions?.profTax)}</Text>
                    </View>
                  )}
                  <View style={[styles.tableRow, styles.subtotalRow]}>
                    <Text style={[styles.subtotalLbl, { color: '#EF4444' }]}>Total Deductions</Text>
                    <Text style={[styles.subtotalVal, { color: '#EF4444' }]}>
                      -{formatINR(selectedDetail.deductions?.totalDeductions)}
                    </Text>
                  </View>
                </View>

                {/* Payment Information if Paid */}
                {selectedDetail.status === 'PAID' && (
                  <View style={styles.paidInfoBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.paidInfoTitle}>Salary Disbursed</Text>
                      <Text style={styles.paidInfoSub}>
                        Method: {selectedDetail.payment?.paymentMethod || 'Bank Transfer'} • Ref: {selectedDetail.payment?.transactionId || '—'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.modalActionCol}>
                  {selectedDetail.status !== 'PAID' && (
                    <TouchableOpacity
                      style={styles.markPaidBtn}
                      onPress={() => setIsPaymentModalOpen(true)}
                    >
                      <Ionicons name="cash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.markPaidBtnText}>Mark as Paid</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={styles.modalSecondaryBtn}
                      onPress={() => downloadPayslipPdf(selectedDetail, selectedDetail.employee)}
                    >
                      <Ionicons name="download-outline" size={16} color="#374151" style={{ marginRight: 4 }} />
                      <Text style={styles.modalSecondaryBtnText}>PDF Payslip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalSecondaryBtn}
                      onPress={() => {
                        setEmailTargetRecord(selectedDetail);
                        setEmailRecipient(selectedDetail.employee?.email || '');
                        setEmailMessage('');
                        setIsEmailModalOpen(true);
                      }}
                    >
                      <Ionicons name="mail-outline" size={16} color="#374151" style={{ marginRight: 4 }} />
                      <Text style={styles.modalSecondaryBtnText}>Email Staff</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════
          PAYMENT RECORDING MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isPaymentModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Record Salary Payment</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.fieldSectionTitle}>Amount to Disburse</Text>
              <Text style={styles.paymentAmountVal}>
                {formatINR(selectedDetail?.netSalary)}
              </Text>

              <Text style={styles.fieldSectionTitle}>Payment Mode</Text>
              <View style={styles.paymentMethodRow}>
                {[
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { id: 'UPI', label: 'UPI' },
                  { id: 'CASH', label: 'Cash' },
                  { id: 'CHEQUE', label: 'Cheque' },
                ].map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodChip,
                      paymentMethod === m.id && styles.methodChipActive,
                    ]}
                    onPress={() => setPaymentMethod(m.id as any)}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        paymentMethod === m.id && styles.methodChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldSectionTitle}>Transaction / Reference ID</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. UTR / NEFT / Cheque #..."
                value={transactionId}
                onChangeText={setTransactionId}
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={styles.confirmPayBtn}
                onPress={handleMarkAsPaid}
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmPayBtnText}>Confirm Payment & Disburse</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════
          EMAIL PAYSLIP MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isEmailModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Email Payslip</Text>
              <TouchableOpacity onPress={() => setIsEmailModalOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={styles.fieldSectionTitle}>Recipient Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="employee@company.com"
                value={emailRecipient}
                onChangeText={setEmailRecipient}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldSectionTitle}>Optional Note</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Add a custom note to the employee..."
                value={emailMessage}
                onChangeText={setEmailMessage}
                multiline
              />

              <TouchableOpacity
                style={styles.confirmPayBtn}
                onPress={handleSendEmailSubmit}
                disabled={isSendingEmail}
              >
                {isSendingEmail ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmPayBtnText}>Send Payslip PDF</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════════
          ADMIN SETTINGS MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={isSettingsModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Payroll Policy Settings</Text>
              <TouchableOpacity onPress={() => setIsSettingsModalOpen(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.fieldSectionTitle}>Standard Working Hours / Day</Text>
              <TextInput
                style={styles.textInput}
                value={String(editConfig.standardWorkingHours ?? 8)}
                onChangeText={t => setEditConfig((p: any) => ({ ...p, standardWorkingHours: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldSectionTitle}>Working Days Per Week</Text>
              <TextInput
                style={styles.textInput}
                value={String(editConfig.workingDaysPerWeek ?? 6)}
                onChangeText={t => setEditConfig((p: any) => ({ ...p, workingDaysPerWeek: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldSectionTitle}>Overtime Rate (₹ / hour)</Text>
              <TextInput
                style={styles.textInput}
                value={String(editConfig.defaultOvertimeRatePerHour ?? 200)}
                onChangeText={t => setEditConfig((p: any) => ({ ...p, defaultOvertimeRatePerHour: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldSectionTitle}>Statutory PF Percentage (%)</Text>
              <TextInput
                style={styles.textInput}
                value={String(editConfig.pfPercentage ?? 12)}
                onChangeText={t => setEditConfig((p: any) => ({ ...p, pfPercentage: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldSectionTitle}>Statutory ESI Percentage (%)</Text>
              <TextInput
                style={styles.textInput}
                value={String(editConfig.esiPercentage ?? 0.75)}
                onChangeText={t => setEditConfig((p: any) => ({ ...p, esiPercentage: t }))}
                keyboardType="numeric"
              />

              <Text style={styles.fieldSectionTitle}>Monthly Professional Tax (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={String(editConfig.profTaxFixed ?? 200)}
                onChangeText={t => setEditConfig((p: any) => ({ ...p, profTaxFixed: t }))}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.confirmPayBtn}
                onPress={handleSaveSettings}
                disabled={isSavingConfig}
              >
                {isSavingConfig ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmPayBtnText}>Save Configuration</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: THEME.colors.primary,
  },
  periodBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  monthSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  monthSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnPrimary: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Red Card
  redCard: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 16,
    padding: 22,
    marginBottom: 16,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  redCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  redCardSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  redCardValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 4,
  },
  redCardSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },

  // Card general
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableLbl: {
    fontSize: 13,
    color: '#4B5563',
  },
  tableVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 4,
  },
  subtotalLbl: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  subtotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  // Attendance Grid
  attGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attBox: {
    flex: 1,
    minWidth: (width - 72) / 3,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  attLbl: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 2,
    fontWeight: '600',
  },

  employeeActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  downloadPdfBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  downloadPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emailPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emailPdfBtnText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // KPI Grid (Admin)
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  kpiLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  searchBarWrap: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSub: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Payroll Card
  payrollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  payrollCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(122, 19, 26, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  empNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  empIdText: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginBottom: 8,
  },
  cardWarningText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
  payrollCardDetails: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  detailCol: {
    flex: 1,
  },
  detailColLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  detailColVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Modal General
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  monthModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthItemActive: {
    backgroundColor: '#FFF5F5',
  },
  monthItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  monthItemTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },

  // Detail Modal
  detailModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.90,
  },
  detailEmpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailEmpName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  detailEmpSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  netHighlightBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  netHighlightLbl: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  netHighlightPeriod: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  netHighlightVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  fieldSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  attGridMini: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  attBoxMini: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  attValMini: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  attLblMini: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 2,
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  paidInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  paidInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#03543F',
  },
  paidInfoSub: {
    fontSize: 11,
    color: '#046C4E',
  },
  modalActionCol: {
    gap: 10,
    marginTop: 16,
    marginBottom: 30,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
  },
  markPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalSecondaryBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },

  // Payment Modal
  paymentModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  paymentAmountVal: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 10,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  confirmPayBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmPayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
