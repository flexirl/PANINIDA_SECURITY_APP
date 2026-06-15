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
        guardId: (record as any).guards?.employee_id || record.guard_id.substring(0, 14).toUpperCase(),
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const handleApprove = async () => {
    if (data.status === 'paid') {
      Alert.alert('Already Paid', 'This salary slip has already been marked as PAID.');
      return;
    }
    
    try {
      await payrollService.approvePayrollRecord(data.id);
      setData(prev => prev ? {
        ...prev,
        status: 'approved',
      } : null);
      
      Alert.alert(
        'Payment Approved',
        `Salary for ${data.guardName} has been approved successfully!`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve payroll.');
    }
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

  const saveAdjustments = async () => {
    if (calcDays > calcTotalDays) {
      Alert.alert('Invalid Days', `Present days cannot exceed total days (${calcTotalDays}).`);
      return;
    }

    try {
      await payrollService.updateAdjustments(data.id, {
        advance_deduction: calcAdvance,
        uniform_deduction: calcUniform,
        other_deduction: calcOther,
        overtime_amount: calcOvertime,
      });

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
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update adjustments.');
    }
  };

  const statusConfig = getStatusStyle(data.status);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Salary Detail</Text>
          </View>
          <View style={s.topBarRight}>
            <View style={s.avatarContainer}>
              <Image source={{ uri: data.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNGg-ORY3RcRNLrcKOYkywBhQnTVQrjPgvftzZCqcXrvqgcxpPDjyYumdXAtZP2GyoybkiO_QHaAPiC-G5g2yjZUtJIbZEvbkwZH48Zf0ccn4xv5K-GUJbjwAt39CLfelCmsAh4wjKrxjurqbApF4lpykTOcSZ3NyWoKVpBGJwAXWX2MKVhw3d2jazluhQmEyF_XxcDcjNw4zXKBIjV7LjWSannrREU5jqW5A2hVbzYRFhV0lohYJOespTWJaeHuW-KaHFdRr2umQ' }} style={s.avatarImg} />
              <View style={s.pulseDot} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={s.scrollView} 
        contentContainerStyle={[s.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Profile & Net Pay Section ─── */}
        <View style={s.profileSection}>
          <View style={s.profileRow}>
            <View style={s.profileAvatarBox}>
              <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7eKOu05ydP8bmaeGUhJ3uHJ93hSc5qHgd5QiHHrdWh18O9kNyjRA5WPGiU-_vcJOmKbb7NF0aX5-qG5s8ZiEodxNud3rZibVooM1IrRrCezQwYq42qtYTdXPyfUEox200A_SkEmG1tPNJzYpnbykCO8n3v1xHuMRgAXtcLEnVINZG6xqurUEfo9IoALGU9LaWrrSWTimXJjaDYF9AbMVFf4CEcWyJaQkRAz8Wx6cEtfEYhbJmphISuIpTFsxLZiS0MeD0Ohgqok8' }} style={s.profileAvatarLg} />
            </View>
            <View style={s.profileInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={s.profileName}>{data.guardName}</Text>
                <View style={[s.badgeGenerated, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[s.badgeText, { color: statusConfig.text }]}>{statusConfig.label}</Text>
                </View>
              </View>
              <View style={s.metaItem}>
                <MaterialIcons name="badge" size={14} color={Colors.onSurfaceVariant} />
                <Text style={s.metaText}>ID: {data.guardId}</Text>
              </View>
              <View style={s.metaItem}>
                <MaterialIcons name="location-on" size={14} color={Colors.onSurfaceVariant} />
                <Text style={s.metaText}>{data.site}</Text>
              </View>
            </View>
          </View>
          
          <View style={s.netPayCard}>
            <Text style={s.netPayLabel}>NET PAY ({data.paymentCycle.toUpperCase()})</Text>
            <View style={s.netPayRow}>
              <Text style={s.netPayAmount}>{formatCurrency(data.netSalary)}</Text>
              <View style={s.growthPill}>
                <Text style={s.growthText}>+4% vs Prev</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Attendance Summary Bento ─── */}
        <View style={s.bentoGrid}>
          <View style={s.bentoCard}>
            <View>
              <Text style={s.bentoLabel}>ATTENDANCE</Text>
              <Text style={s.bentoValue}>{data.daysPresent}/{data.totalDays} Days</Text>
            </View>
            <View style={[s.bentoIconBox, { backgroundColor: Colors.surfaceContainerHigh }]}>
              <MaterialIcons name="event-available" size={24} color={Colors.primary} />
            </View>
          </View>
          
          <View style={s.bentoCard}>
            <View>
              <Text style={s.bentoLabel}>LEAVES</Text>
              <Text style={[s.bentoValue, { color: Colors.secondary }]}>{data.totalDays - data.daysPresent} Absent</Text>
            </View>
            <View style={[s.bentoIconBox, { backgroundColor: `${Colors.secondary}1A` }]}>
              <MaterialIcons name="event-busy" size={24} color={Colors.secondary} />
            </View>
          </View>
          
          <View style={s.bentoCard}>
            <View>
              <Text style={s.bentoLabel}>PUNCTUALITY</Text>
              <Text style={s.bentoValue}>{data.lateArrivalsCount} Late</Text>
            </View>
            <View style={[s.bentoIconBox, { backgroundColor: Colors.surfaceContainerLow }]}>
              <MaterialIcons name="schedule" size={24} color={Colors.outline} />
            </View>
          </View>
        </View>

        {/* ─── Earnings Card ─── */}
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <Text style={s.detailTitle}>Earnings</Text>
            <MaterialIcons name="trending-up" size={20} color={Colors.successGreen} />
          </View>
          <View style={s.detailBody}>
            <View style={s.detailRow}>
              <View>
                <Text style={s.detailRowTitle}>Base Salary</Text>
                <Text style={s.detailRowSub}>Pro-rated for {data.daysPresent} days</Text>
              </View>
              <Text style={s.detailRowAmount}>{formatCurrency(data.proRatedSalary)}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <View>
                <Text style={s.detailRowTitle}>Overtime (OT)</Text>
                <Text style={s.detailRowSub}>{data.overtimeHours} Hours</Text>
              </View>
              <Text style={s.detailRowAmount}>{formatCurrency(data.overtimeAmount)}</Text>
            </View>
          </View>
          <View style={s.detailFooter}>
            <Text style={s.detailFooterLabel}>GROSS EARNINGS</Text>
            <Text style={s.detailFooterAmountSuccess}>{formatCurrency(data.totalEarnings)}</Text>
          </View>
        </View>

        {/* ─── Deductions Card ─── */}
        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <Text style={s.detailTitle}>Deductions</Text>
            <MaterialIcons name="trending-down" size={20} color={Colors.secondary} />
          </View>
          <View style={s.detailBody}>
            <View style={s.detailRow}>
              <View>
                <Text style={s.detailRowTitle}>Late Penalty</Text>
                <Text style={s.detailRowSub}>{data.lateArrivalsCount} Instances detected</Text>
              </View>
              <Text style={s.detailRowAmountDanger}>{formatCurrency(data.lateArrivalPenaltyAmount)}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <View>
                <Text style={s.detailRowTitle}>Uniform Installment</Text>
                <Text style={s.detailRowSub}>Payment</Text>
              </View>
              <Text style={s.detailRowAmountDanger}>{formatCurrency(data.uniformInstallment)}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <View>
                <Text style={s.detailRowTitle}>Advance Recovery</Text>
                <Text style={s.detailRowSub}>Partial repayment</Text>
              </View>
              <Text style={s.detailRowAmountDanger}>{formatCurrency(data.salaryAdvance)}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.detailRow}>
              <View>
                <Text style={s.detailRowTitle}>Other Deductions</Text>
                <Text style={s.detailRowSub}>Miscellaneous</Text>
              </View>
              <Text style={s.detailRowAmountDanger}>{formatCurrency(data.otherDeductions)}</Text>
            </View>
          </View>
          <View style={s.detailFooter}>
            <Text style={s.detailFooterLabel}>TOTAL DEDUCTIONS</Text>
            <Text style={s.detailFooterAmountDanger}>{formatCurrency(data.totalDeductions)}</Text>
          </View>
        </View>

        {/* ─── Meta Info ─── */}
        <View style={s.metaCard}>
          <View style={s.metaCardHeader}>
            <MaterialIcons name="history" size={16} color={Colors.primary} />
            <Text style={s.metaCardTitle}>PAYROLL METADATA</Text>
          </View>
          <View style={s.metaCardRow}>
            <Text style={s.metaCardLabel}>Calculation Engine</Text>
            <Text style={s.metaCardValue}>Sentinel-Core v2.4</Text>
          </View>
          <View style={s.metaCardRow}>
            <Text style={s.metaCardLabel}>Tax Slab</Text>
            <Text style={s.metaCardValue}>Exempt (&lt;₹5L/yr)</Text>
          </View>
        </View>

      </ScrollView>

      {/* ─── Sticky Bottom Actions ─── */}
      <View style={[s.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity style={s.btnSecondary} onPress={openEditModal}>
          <Text style={s.btnSecondaryText}>EDIT ADJUSTMENTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnPrimary} onPress={handleApprove}>
          <MaterialIcons name="payments" size={18} color="#fff" />
          <Text style={s.btnPrimaryText}>APPROVE & RELEASE</Text>
        </TouchableOpacity>
      </View>

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
            <View style={s.modalHandleWrap}>
              <View style={s.modalHandle} />
            </View>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Adjustments</Text>
              <Text style={s.modalSubtitle}>Modify workforce parameters for the current payroll cycle.</Text>
            </View>

            <ScrollView style={s.modalForm} showsVerticalScrollIndicator={false}>
              
              <View style={s.rowInputs}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.inputLabel}>DAYS PRESENT (OVERRIDE)</Text>
                  <View style={s.inputIconWrap}>
                    <MaterialIcons name="calendar-today" size={18} color={Colors.outline} style={s.inputIcon} />
                    <TextInput
                      style={s.textInputWithIcon}
                      keyboardType="numeric"
                      value={editDaysPresent}
                      onChangeText={setEditDaysPresent}
                    />
                  </View>
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={s.inputLabel}>OVERTIME HOURS</Text>
                  <View style={s.inputIconWrap}>
                    <MaterialIcons name="timer" size={18} color={Colors.outline} style={s.inputIcon} />
                    <TextInput
                      style={s.textInputWithIcon}
                      keyboardType="numeric"
                      value={editOvertimeHours}
                      onChangeText={setEditOvertimeHours}
                    />
                  </View>
                </View>
              </View>

              <Text style={[s.formSectionTitle, { marginTop: 16 }]}>DEDUCTIONS</Text>
              
              <View style={s.rowInputs}>
                <View style={[s.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={s.inputLabel}>Salary Advance</Text>
                  <View style={s.inputIconWrap}>
                    <Text style={s.inputPrefix}>₹</Text>
                    <TextInput
                      style={s.textInputWithIcon}
                      keyboardType="numeric"
                      value={editSalaryAdvance}
                      onChangeText={setEditSalaryAdvance}
                    />
                  </View>
                </View>
                <View style={[s.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={s.inputLabel}>Uniform Deduction</Text>
                  <View style={s.inputIconWrap}>
                    <Text style={s.inputPrefix}>₹</Text>
                    <TextInput
                      style={s.textInputWithIcon}
                      keyboardType="numeric"
                      value={editUniformInstallment}
                      onChangeText={setEditUniformInstallment}
                    />
                  </View>
                </View>
              </View>

              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Other Deductions</Text>
                <View style={s.inputIconWrap}>
                  <Text style={s.inputPrefix}>₹</Text>
                  <TextInput
                    style={s.textInputWithIcon}
                    keyboardType="numeric"
                    value={editOtherDeductions}
                    onChangeText={setEditOtherDeductions}
                  />
                </View>
              </View>

              {/* Real-time Recalculation Display */}
              <View style={s.previewBox}>
                <View style={{ flex: 1 }}>
                  <Text style={s.previewLabel}>ADJUSTED CALCULATION</Text>
                  <Text style={s.previewSub}>Final payout for this employee</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.previewAmount}>{formatCurrency(calcNetSalary)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialIcons name="auto-graph" size={14} color={Colors.successGreen} />
                    <Text style={s.previewLive}>LIVE PREVIEW</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setIsEditModalVisible(false)}>
                <Text style={s.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSaveBtn} onPress={saveAdjustments}>
                <MaterialIcons name="save" size={18} color="#fff" />
                <Text style={s.modalSaveText}>SAVE ADJUSTMENTS</Text>
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
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 64,
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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  pulseDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: Colors.successGreen,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileSection: {
    marginBottom: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  profileAvatarBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
    backgroundColor: '#fff',
  },
  profileAvatarLg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  badgeGenerated: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  netPayCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  netPayLabel: {
    fontSize: 12,
    color: Colors.primaryFixedDim,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  netPayAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  growthPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  growthText: {
    color: Colors.successGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  bentoGrid: {
    marginBottom: 24,
    gap: 12,
  },
  bentoCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bentoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  bentoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  detailBody: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  detailRowSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  detailRowAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  detailRowAmountDanger: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: 8,
  },
  detailFooter: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailFooterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  detailFooterAmountSuccess: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  detailFooterAmountDanger: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.secondary,
  },
  metaCard: {
    backgroundColor: 'rgba(238, 237, 242, 0.5)',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    padding: 20,
  },
  metaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metaCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 1,
  },
  metaCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaCardLabel: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  metaCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    paddingHorizontal: 16,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    elevation: 4,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 39, 82, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalHandle: {
    width: 48,
    height: 6,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 3,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  modalForm: {
    paddingHorizontal: 24,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingBottom: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    height: '100%',
    padding: 0,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  previewBox: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onPrimaryContainer,
    letterSpacing: 0.5,
  },
  previewSub: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  previewLive: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successGreen,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    backgroundColor: 'rgba(244, 243, 247, 0.5)',
    gap: 16,
  },
  modalCancelBtn: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
  },
  modalSaveBtn: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
});
