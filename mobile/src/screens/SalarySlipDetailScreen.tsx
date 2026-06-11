import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as payrollService from '../api/payrollService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SalarySlipDetailScreenProps {
  navigation: any;
  route: any;
}

interface SalarySlipData {
  id: string;
  guardName: string;
  guardId: string;
  site: string;
  avatar: string;
  paymentCycle: string;
  status: 'draft' | 'generated' | 'approved' | 'paid';
  
  // Earnings
  baseSalary: number;
  daysPresent: number;
  totalDays: number;
  proRatedSalary: number;
  overtimeHours: number;
  overtimeRate: number; // rate per hour
  overtimeAmount: number;
  totalEarnings: number;

  // Deductions
  lateArrivalsCount: number;
  lateArrivalPenaltyRate: number;
  lateArrivalPenaltyAmount: number;
  uniformInstallment: number;
  salaryAdvance: number;
  otherDeductions: number;
  totalDeductions: number;

  // Final
  netSalary: number;
  payoutMethod: string;
}

export default function SalarySlipDetailScreen({ navigation, route }: SalarySlipDetailScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const payrollId = route?.params?.payrollId;
  
  const [data, setData] = useState<SalarySlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Edit fields state
  const [editBaseSalary, setEditBaseSalary] = useState('');
  const [editDaysPresent, setEditDaysPresent] = useState('');
  const [editOvertimeHours, setEditOvertimeHours] = useState('');
  const [editOvertimeAmount, setEditOvertimeAmount] = useState('');
  const [editLateArrivals, setEditLateArrivals] = useState('');
  const [editLatePenalty, setEditLatePenalty] = useState('');
  const [editUniformInstallment, setEditUniformInstallment] = useState('');
  const [editSalaryAdvance, setEditSalaryAdvance] = useState('');
  const [editOtherDeductions, setEditOtherDeductions] = useState('');

  // Fetch salary slip from backend
  const fetchSlip = useCallback(async () => {
    if (!payrollId) {
      setError('No payroll ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const record = await payrollService.getSalarySlipDetail(payrollId);
      // Map backend PayrollRecord to screen SalarySlipData
      const guardInfo = (record as any).guards || {};
      const userName = guardInfo?.users?.name || guardInfo?.name || 'Unknown Guard';
      const userPhone = guardInfo?.users?.phone || guardInfo?.phone || '';
      const baseSal = record.base_salary || 0;
      const daysP = record.days_present || 0;
      const totalD = record.total_working_days || 30;
      const proRated = totalD > 0 ? Math.round((baseSal / totalD) * daysP) : 0;
      const overtimeAmt = record.overtime_amount || 0;
      const totalEarnings = proRated + overtimeAmt;
      const penaltyAmt = record.penalty_amount || 0;
      const uniformDed = record.uniform_deduction || 0;
      const advanceDed = record.advance_deduction || 0;
      const otherDed = record.other_deduction || 0;
      const totalDeductions = penaltyAmt + uniformDed + advanceDed + otherDed;
      const netSalary = record.final_salary || Math.max(0, totalEarnings - totalDeductions);
      
      setData({
        id: record.id,
        guardName: userName,
        guardId: record.guard_id.substring(0, 14).toUpperCase(),
        site: 'Assigned Site',
        avatar: '',
        paymentCycle: record.month || '',
        status: record.status,
        baseSalary: baseSal,
        daysPresent: daysP,
        totalDays: totalD,
        proRatedSalary: proRated,
        overtimeHours: 0,
        overtimeRate: 0,
        overtimeAmount: overtimeAmt,
        totalEarnings,
        lateArrivalsCount: 0,
        lateArrivalPenaltyRate: 0,
        lateArrivalPenaltyAmount: penaltyAmt,
        uniformInstallment: uniformDed,
        salaryAdvance: advanceDed,
        otherDeductions: otherDed,
        totalDeductions,
        netSalary,
        payoutMethod: 'Bank Transfer',
      });
    } catch (err: any) {
      console.error('Failed to fetch salary slip:', err);
      setError(err.message || 'Failed to load salary slip');
    } finally {
      setLoading(false);
    }
  }, [payrollId]);

  useEffect(() => {
    fetchSlip();
  }, [fetchSlip]);

  const formatCurrency = (val: number) => {
    return '₹' + Math.max(0, val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusStyle = (status: 'draft' | 'generated' | 'approved' | 'paid') => {
    switch (status) {
      case 'draft':
        return { bg: '#F1F5F9', text: '#475569', label: 'DRAFT' };
      case 'generated':
        return { bg: '#FFF3E0', text: '#E65100', label: 'GENERATED' };
      case 'approved':
        return { bg: '#e7f5e9', text: '#1b5e20', label: 'APPROVED' };
      case 'paid':
        return { bg: '#e0f2fe', text: '#0369a1', label: 'PAID' };
    }
  };

  if (loading || !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleApprove = () => {
    if (data.status === 'paid') {
      Alert.alert('Already Paid', 'This salary slip has already been marked as PAID.');
      return;
    }
    
    setData(prev => prev ? {
      ...prev,
      status: 'approved',
    } : null);
    
    Alert.alert(
      'Payment Approved',
      `Salary for ${data.guardName} has been approved successfully!`
    );
  };

  const openEditModal = () => {
    setEditBaseSalary(data.baseSalary.toString());
    setEditDaysPresent(data.daysPresent.toString());
    setEditOvertimeHours(data.overtimeHours.toString());
    setEditOvertimeAmount(data.overtimeAmount.toString());
    setEditLateArrivals(data.lateArrivalsCount.toString());
    setEditLatePenalty(data.lateArrivalPenaltyAmount.toString());
    setEditUniformInstallment(data.uniformInstallment.toString());
    setEditSalaryAdvance(data.salaryAdvance.toString());
    setEditOtherDeductions(data.otherDeductions.toString());
    setIsEditModalVisible(true);
  };

  // Calculate live values for display inside modal
  const calcBase = parseFloat(editBaseSalary) || 0;
  const calcDays = parseFloat(editDaysPresent) || 0;
  const calcTotalDays = data.totalDays;
  const calcProRated = Math.round((calcBase / calcTotalDays) * calcDays);
  const calcOvertime = parseFloat(editOvertimeAmount) || 0;
  
  const calcTotalEarnings = calcProRated + calcOvertime;

  const calcLatePenalty = parseFloat(editLatePenalty) || 0;
  const calcUniform = parseFloat(editUniformInstallment) || 0;
  const calcAdvance = parseFloat(editSalaryAdvance) || 0;
  const calcOther = parseFloat(editOtherDeductions) || 0;

  const calcTotalDeductions = calcLatePenalty + calcUniform + calcAdvance + calcOther;
  const calcNetSalary = Math.max(0, calcTotalEarnings - calcTotalDeductions);

  const saveAdjustments = () => {
    if (calcDays > calcTotalDays) {
      Alert.alert('Invalid Days', `Present days cannot exceed total days (${calcTotalDays}).`);
      return;
    }

    setData(prev => prev ? {
      ...prev,
      baseSalary: calcBase,
      daysPresent: calcDays,
      proRatedSalary: calcProRated,
      overtimeHours: parseFloat(editOvertimeHours) || 0,
      overtimeAmount: calcOvertime,
      totalEarnings: calcTotalEarnings,
      lateArrivalsCount: parseInt(editLateArrivals) || 0,
      lateArrivalPenaltyAmount: calcLatePenalty,
      uniformInstallment: calcUniform,
      salaryAdvance: calcAdvance,
      otherDeductions: calcOther,
      totalDeductions: calcTotalDeductions,
      netSalary: calcNetSalary,
    } : null);

    setIsEditModalVisible(false);
    Alert.alert('Success', 'Adjustments saved successfully.');
  };

  const statusConfig = getStatusStyle(data.status);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={s.backBtn}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Salary Slip</Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={s.topBarIconBtn}
              onPress={() => Alert.alert('Download', 'Salary slip PDF download initiated.')}
            >
              <MaterialIcons name="file-download" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={s.topBarIconBtn}
              onPress={openEditModal}
            >
              <MaterialIcons name="edit" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={s.scrollView} 
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Guard Profile Section ─── */}
        <View style={s.profileCard}>
          <Image source={{ uri: data.avatar }} style={s.profileAvatar} />
          <View style={s.profileDetails}>
            <Text style={s.profileName}>{data.guardName}</Text>
            <Text style={s.profileSite}>Site: {data.site}</Text>
            <Text style={s.profileId}>ID: {data.guardId}</Text>
          </View>
        </View>

        {/* ─── Cycle & Status Badge Row ─── */}
        <View style={s.statusRow}>
          <Text style={s.paymentCycleText}>Payment Cycle: {data.paymentCycle}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[s.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* ─── Breakdown Card ─── */}
        <View style={s.breakdownCard}>
          {/* Earnings Breakdown */}
          <View style={s.sectionHeaderBg}>
            <Text style={s.sectionHeaderTitle}>Earnings Breakdown</Text>
          </View>
          <View style={s.sectionBody}>
            <View style={s.breakdownRow}>
              <Text style={s.rowLabel}>Base Salary</Text>
              <Text style={s.rowValue}>{formatCurrency(data.baseSalary)}</Text>
            </View>
            <View style={s.breakdownRow}>
              <Text style={s.rowLabel}>Pro-rated ({data.daysPresent} Days)</Text>
              <Text style={s.rowValue}>{formatCurrency(data.proRatedSalary)}</Text>
            </View>
            <View style={s.breakdownRow}>
              <Text style={s.rowLabel}>Overtime ({data.overtimeHours} Hrs)</Text>
              <Text style={s.rowValue}>{formatCurrency(data.overtimeAmount)}</Text>
            </View>
            
            <View style={[s.breakdownRow, s.totalRowBorder]}>
              <Text style={s.totalRowLabel}>Total Earnings</Text>
              <Text style={s.totalRowValue}>{formatCurrency(data.totalEarnings)}</Text>
            </View>
          </View>

          {/* Deductions Breakdown */}
          <View style={s.sectionHeaderBg}>
            <Text style={[s.sectionHeaderTitle, { color: Colors.secondary }]}>Deductions</Text>
          </View>
          <View style={s.sectionBody}>
            <View style={s.breakdownRow}>
              <Text style={s.rowLabel}>Late Arrivals ({data.lateArrivalsCount})</Text>
              <Text style={[s.rowValue, { color: Colors.secondary }]}>
                -{formatCurrency(data.lateArrivalPenaltyAmount)}
              </Text>
            </View>
            <View style={s.breakdownRow}>
              <Text style={s.rowLabel}>Uniform Installment</Text>
              <Text style={[s.rowValue, { color: Colors.secondary }]}>
                -{formatCurrency(data.uniformInstallment)}
              </Text>
            </View>
            <View style={s.breakdownRow}>
              <Text style={s.rowLabel}>Salary Advance</Text>
              <Text style={[s.rowValue, { color: Colors.secondary }]}>
                -{formatCurrency(data.salaryAdvance)}
              </Text>
            </View>
            {data.otherDeductions > 0 && (
              <View style={s.breakdownRow}>
                <Text style={s.rowLabel}>Other Deductions</Text>
                <Text style={[s.rowValue, { color: Colors.secondary }]}>
                  -{formatCurrency(data.otherDeductions)}
                </Text>
              </View>
            )}

            <View style={[s.breakdownRow, s.totalRowBorder]}>
              <Text style={[s.totalRowLabel, { color: Colors.secondary }]}>Total Deductions</Text>
              <Text style={[s.totalRowValue, { color: Colors.secondary }]}>
                {formatCurrency(data.totalDeductions)}
              </Text>
            </View>
          </View>

          {/* Net Salary Payout Footer */}
          <View style={s.payoutFooter}>
            <View>
              <Text style={s.payoutLabel}>Final Payout</Text>
              <Text style={s.payoutTitle}>NET SALARY</Text>
            </View>
            <View style={s.payoutRight}>
              <Text style={s.payoutAmount}>
                ₹{Math.round(data.netSalary).toLocaleString('en-IN')}
              </Text>
              <Text style={s.payoutMethod}>Credited via {data.payoutMethod}</Text>
            </View>
          </View>
        </View>

        {/* ─── Actions Buttons ─── */}
        <View style={s.actionsContainer}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            style={s.approveBtn} 
            onPress={handleApprove}
          >
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
            <Text style={s.approveBtnText}>Approve &amp; Release Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            activeOpacity={0.8} 
            style={s.editAdjustmentsBtn} 
            onPress={openEditModal}
          >
            <MaterialIcons name="tune" size={20} color={Colors.primary} />
            <Text style={s.editAdjustmentsBtnText}>Edit Adjustments</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ Edit Adjustments Modal ═══ */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.modalContainer}
          >
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Adjustments</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={s.formSectionTitle}>Earnings Config</Text>
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Base Salary (₹)</Text>
                <TextInput
                  style={s.textInput}
                  keyboardType="numeric"
                  value={editBaseSalary}
                  onChangeText={setEditBaseSalary}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Days Present (max {data.totalDays})</Text>
                <TextInput
                  style={s.textInput}
                  keyboardType="numeric"
                  value={editDaysPresent}
                  onChangeText={setEditDaysPresent}
                />
              </View>

              <View style={s.rowInputs}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.inputLabel}>Overtime Hours</Text>
                  <TextInput
                    style={s.textInput}
                    keyboardType="numeric"
                    value={editOvertimeHours}
                    onChangeText={setEditOvertimeHours}
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={s.inputLabel}>Overtime Amount (₹)</Text>
                  <TextInput
                    style={s.textInput}
                    keyboardType="numeric"
                    value={editOvertimeAmount}
                    onChangeText={setEditOvertimeAmount}
                  />
                </View>
              </View>

              <Text style={[s.formSectionTitle, { marginTop: 16 }]}>Deductions Config</Text>
              <View style={s.rowInputs}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.inputLabel}>Late Arrivals Count</Text>
                  <TextInput
                    style={s.textInput}
                    keyboardType="numeric"
                    value={editLateArrivals}
                    onChangeText={setEditLateArrivals}
                  />
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={s.inputLabel}>Penalty Amount (₹)</Text>
                  <TextInput
                    style={s.textInput}
                    keyboardType="numeric"
                    value={editLatePenalty}
                    onChangeText={setEditLatePenalty}
                  />
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Uniform Dues Installment (₹)</Text>
                <TextInput
                  style={s.textInput}
                  keyboardType="numeric"
                  value={editUniformInstallment}
                  onChangeText={setEditUniformInstallment}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Salary Advance Deduction (₹)</Text>
                <TextInput
                  style={s.textInput}
                  keyboardType="numeric"
                  value={editSalaryAdvance}
                  onChangeText={setEditSalaryAdvance}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Other Deductions (₹)</Text>
                <TextInput
                  style={s.textInput}
                  keyboardType="numeric"
                  value={editOtherDeductions}
                  onChangeText={setEditOtherDeductions}
                />
              </View>

              {/* Real-time Recalculation Display */}
              <View style={s.modalSummaryBox}>
                <View style={s.summaryBoxRow}>
                  <Text style={s.summaryBoxLabel}>Total Earnings:</Text>
                  <Text style={s.summaryBoxValue}>{formatCurrency(calcTotalEarnings)}</Text>
                </View>
                <View style={s.summaryBoxRow}>
                  <Text style={s.summaryBoxLabel}>Total Deductions:</Text>
                  <Text style={[s.summaryBoxValue, { color: Colors.secondary }]}>
                    -{formatCurrency(calcTotalDeductions)}
                  </Text>
                </View>
                <View style={[s.summaryBoxRow, s.summaryBoxTotalRow]}>
                  <Text style={s.summaryBoxTotalLabel}>Net Salary Payout:</Text>
                  <Text style={s.summaryBoxTotalValue}>{formatCurrency(calcNetSalary)}</Text>
                </View>
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={saveAdjustments}>
                <Text style={s.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 56,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 16,
    gap: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  profileSite: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  profileId: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  paymentCycleText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
  sectionHeaderBg: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#c3c6d0',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionBody: {
    padding: 16,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  totalRowBorder: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#c3c6d0',
    paddingTop: 12,
    marginTop: 6,
  },
  totalRowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  totalRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  payoutFooter: {
    backgroundColor: Colors.primaryContainer,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onPrimaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  payoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
  },
  payoutMethod: {
    fontSize: 11,
    color: Colors.onPrimaryContainer,
    marginTop: 4,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  approveBtn: {
    backgroundColor: '#2E7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  approveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  editAdjustmentsBtn: {
    borderWidth: 2,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
  },
  editAdjustmentsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalForm: {
    padding: 16,
  },
  formSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#c3c6d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.onSurface,
    backgroundColor: '#F8FAFC',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 16,
    gap: 8,
  },
  summaryBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBoxLabel: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  summaryBoxValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  summaryBoxTotalRow: {
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 4,
  },
  summaryBoxTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryBoxTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primaryContainer,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
