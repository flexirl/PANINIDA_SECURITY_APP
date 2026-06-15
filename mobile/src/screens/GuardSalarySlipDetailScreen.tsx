import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as payrollService from '../api/payrollService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to format year-month YYYY-MM to word month format, e.g. "May 2026"
const formatMonthString = (monthStr: string) => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch (err) {
    return monthStr;
  }
};

export default function GuardSalarySlipDetailScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: any;
}) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { payrollId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slipData, setSlipData] = useState<payrollService.PayrollRecord | null>(null);

  const loadSlipDetails = async () => {
    try {
      const data = await payrollService.getSalarySlipDetail(payrollId);
      setSlipData(data);
    } catch (err) {
      console.error('Error fetching payroll detail for guard:', err);
      Alert.alert('Error', 'Failed to retrieve salary slip breakdown.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlipDetails();
  }, [payrollId]);

  const handleDownload = () => {
    const period = slipData ? formatMonthString(slipData.month) : 'Payslip';
    Alert.alert('Success / सफलता', `Downloading PDF Payslip for ${period}... / ${period} के लिए पीडीएफ वेतन पर्ची डाउनलोड की जा रही है...`);
  };

  const handleShare = () => {
    Alert.alert('Share / साझा करें', 'Opening share dialog... / साझा संवाद खुल रहा है...');
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Loading slip breakdown...</Text>
      </View>
    );
  }

  if (!slipData) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingText}>Salary slip data not found.</Text>
        <TouchableOpacity activeOpacity={0.7} style={s.backBtnText} onPress={() => navigation.goBack()}>
          <Text style={{ color: Colors.primary, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const periodName = formatMonthString(slipData.month);

  // Status visual configurations
  const isPaid = slipData.status === 'paid';
  const isApproved = slipData.status === 'approved';
  
  let statusLabel = 'GENERATED';
  let statusColor = Colors.warningAmber;
  let statusBg = 'rgba(243, 156, 18, 0.1)';
  
  if (isPaid) {
    statusLabel = 'PAID';
    statusColor = Colors.successGreen;
    statusBg = '#e0f2fe'; // From design
  } else if (isApproved) {
    statusLabel = 'APPROVED';
    statusColor = Colors.primary;
    statusBg = 'rgba(0, 39, 82, 0.1)';
  }

  const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';
  
  const guardInfo = (slipData as any).guards || {};
  const guardName = guardInfo?.users?.name || guardInfo?.name || 'Unknown Guard';
  const guardId = guardInfo?.employee_id || slipData.guard_id.substring(0, 8).toUpperCase();
  const avatarUrl = user?.avatar_url || DEFAULT_AVATAR;

  // Calculate earnings
  const baseSalary = slipData.pro_rated_salary || 0;
  const overtimeAmt = slipData.overtime_amount || 0;
  // Let's add allowances/bonus if available, otherwise 0
  const allowances = 0; 
  const bonus = 0;
  const grossEarnings = baseSalary + overtimeAmt + allowances + bonus;

  // Calculate deductions
  const pf = 0; // If you have PF, put it here
  const esi = 0; // If you have ESI, put it here
  const latePenalty = slipData.penalty_amount || 0;
  const uniformDed = slipData.uniform_deduction || 0;
  const advanceDed = slipData.advance_deduction || 0;
  const otherDed = slipData.other_deduction || 0;
  
  const totalDeductions = latePenalty + uniformDed + advanceDed + otherDed + pf + esi;
  const netPayable = Math.max(0, grossEarnings - totalDeductions);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F9" />

      {/* ═══ Header ═══ */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={s.headerInner}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={s.iconBtn}>
            <MaterialIcons name="menu" size={26} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Sentinel Prime</Text>
          <TouchableOpacity activeOpacity={0.7} style={s.iconBtn}>
            <View style={s.bellWrap}>
              <MaterialIcons name="notifications-none" size={26} color="#111827" />
              <View style={s.notifDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ─── Profile Card ─── */}
        <View style={s.card}>
          <View style={s.profileTop}>
            <View style={s.profileTopLeft}>
              <View style={s.pisLogo}>
                <Text style={s.pisLogoText}>PIS</Text>
              </View>
              <View style={s.profileInfo}>
                <Text style={s.profileName}>{guardName}</Text>
                <Text style={s.profileMeta}>ID: {guardId} • Security Guard</Text>
              </View>
            </View>
            <View style={[s.statusPill, { backgroundColor: statusBg }]}>
              {isPaid && <MaterialIcons name="check-circle-outline" size={12} color={statusColor} style={{ marginRight: 2 }} />}
              <Text style={[s.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          
          <View style={s.divider} />
          
          <View style={s.profileBottom}>
            <View>
              <Text style={s.monthLabel}>SALARY MONTH / वेतन माह</Text>
              <Text style={s.monthValue}>{periodName}</Text>
            </View>
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          </View>
        </View>

        {/* ─── Earnings Card ─── */}
        <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
          <View style={s.cardHeader}>
            <MaterialIcons name="payments" size={20} color="#111827" />
            <Text style={s.cardHeaderTitle}>Earnings / कमाई</Text>
          </View>
          <View style={s.cardBody}>
            <View style={s.row}>
              <Text style={s.rowLabel}>Base Salary / मूल वेतन</Text>
              <Text style={s.rowValue}>₹{baseSalary.toLocaleString('en-IN')}</Text>
            </View>
            {allowances > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Allowances / भत्ते</Text>
                <Text style={s.rowValue}>₹{allowances.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={s.rowLabel}>Overtime / अतिरिक्त समय</Text>
              <Text style={s.rowValue}>₹{overtimeAmt.toLocaleString('en-IN')}</Text>
            </View>
            {bonus > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Bonus / बोनस</Text>
                <Text style={s.rowValue}>₹{bonus.toLocaleString('en-IN')}</Text>
              </View>
            )}
            
            <View style={s.dottedDivider} />
            
            <View style={s.row}>
              <Text style={s.totalLabel}>GROSS TOTAL / कुल कमाई</Text>
              <Text style={s.totalValue}>₹{grossEarnings.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* ─── Deductions Card ─── */}
        <View style={[s.card, { padding: 0, overflow: 'hidden', borderColor: '#fee2e2' }]}>
          <View style={[s.cardHeader, { backgroundColor: '#fff5f5' }]}>
            <MaterialIcons name="arrow-upward" size={20} color="#dc2626" style={{ transform: [{ rotate: '45deg' }] }} />
            <Text style={[s.cardHeaderTitle, { color: '#dc2626' }]}>Deductions / कटौतियां</Text>
          </View>
          <View style={s.cardBody}>
            {pf > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Provident Fund (PF)</Text>
                <Text style={s.rowValueRed}>₹{pf.toLocaleString('en-IN')}</Text>
              </View>
            )}
            {esi > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>ESI</Text>
                <Text style={s.rowValueRed}>₹{esi.toLocaleString('en-IN')}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={s.rowLabel}>Late Penalty / देरी दंड</Text>
              <Text style={s.rowValueRed}>₹{latePenalty.toLocaleString('en-IN')}</Text>
            </View>
            {uniformDed > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Uniform / वर्दी</Text>
                <Text style={s.rowValueRed}>₹{uniformDed.toLocaleString('en-IN')}</Text>
              </View>
            )}
            {advanceDed > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Advance / अग्रिम</Text>
                <Text style={s.rowValueRed}>₹{advanceDed.toLocaleString('en-IN')}</Text>
              </View>
            )}
            {otherDed > 0 && (
              <View style={s.row}>
                <Text style={s.rowLabel}>Others / अन्य</Text>
                <Text style={s.rowValueRed}>₹{otherDed.toLocaleString('en-IN')}</Text>
              </View>
            )}
            
            <View style={s.dottedDivider} />
            
            <View style={s.row}>
              <Text style={[s.totalLabel, { color: '#dc2626' }]}>TOTAL DEDUCTIONS / कुल कटौती</Text>
              <Text style={[s.totalValue, { color: '#dc2626' }]}>₹{totalDeductions.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* ─── Net Payable Card ─── */}
        <View style={s.netPayCard}>
          <View style={s.netPayTop}>
            <View>
              <Text style={s.netPayLabelEn}>NET PAYABLE AMOUNT</Text>
              <Text style={s.netPayLabelHi}>निवल वेतन</Text>
            </View>
            <MaterialIcons name="account-balance-wallet" size={28} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={s.netPayAmount}>₹{netPayable.toLocaleString('en-IN')}</Text>
          
          <View style={s.paymentInfoBox}>
            <View style={s.paymentInfoLeft}>
              <View style={s.bankIconWrap}>
                <MaterialIcons name="account-balance" size={18} color="#fff" />
              </View>
              <View>
                <Text style={s.bankText}>{guardInfo?.bank_name || 'Bank'} Transfer • ****{guardInfo?.bank_account_number ? guardInfo.bank_account_number.slice(-4) : 'XXXX'}</Text>
                <Text style={s.paidDateText}>
                  {isPaid ? `Paid on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Pending Payment'}
                </Text>
              </View>
            </View>
            {isPaid && <MaterialIcons name="verified" size={20} color="#10b981" />}
          </View>
        </View>

        {/* ─── Action Buttons ─── */}
        <View style={s.actionsWrap}>
          <TouchableOpacity activeOpacity={0.8} style={s.btnDownload} onPress={handleDownload}>
            <MaterialIcons name="file-download" size={20} color="#fff" />
            <Text style={s.btnDownloadText}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={s.btnShare} onPress={handleShare}>
            <MaterialIcons name="share" size={20} color="#111827" />
            <Text style={s.btnShareText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F4F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F9',
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  backBtnText: {
    padding: 8,
  },
  header: {
    backgroundColor: '#F4F4F9',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  iconBtn: {
    padding: 8,
  },
  bellWrap: {
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 3,
    width: 8,
    height: 8,
    backgroundColor: '#dc2626',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#F4F4F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileTopLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  pisLogo: {
    width: 48,
    height: 48,
    backgroundColor: '#002752',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pisLogoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    justifyContent: 'center',
    gap: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileMeta: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  profileBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  monthLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  monthValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardBody: {
    padding: 20,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  rowValueRed: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  netPayCard: {
    backgroundColor: '#001e3f',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#001e3f',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  netPayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  netPayLabelEn: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 1,
  },
  netPayLabelHi: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginTop: 2,
  },
  netPayAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginTop: 20,
    marginBottom: 24,
  },
  paymentInfoBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bankText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  paidDateText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsWrap: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnDownload: {
    flex: 1,
    backgroundColor: '#001e3f',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnDownloadText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnShare: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnShareText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
});
