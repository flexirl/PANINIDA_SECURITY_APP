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
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
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
    Alert.alert('Success', `Downloading PDF Payslip for ${period}...`);
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
  const statusLabel = isPaid ? 'Paid via Bank Transfer' : 'Generated';
  const statusColor = isPaid ? Colors.successGreen : Colors.warningAmber;
  const statusBg = isPaid ? 'rgba(39, 174, 96, 0.1)' : 'rgba(243, 156, 18, 0.1)';

  // Calculate absents
  const absentDays = Math.max(0, slipData.total_working_days - slipData.days_present);

  // Calculate overtime hours from overtime amount (standard hourly rate in mockup is approx ₹204/hr, or we show based on seeded data)
  const estimatedOtHours = Math.round(slipData.overtime_amount / 204);

  const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBi_f7HzWWUK3r9qVfk21NI-iLmMLqpi4ZX_0MZ3TUDwwDst5XCSXIrOmFPb8MMYlHKgupKpG2mQzLFt6RG4_qjUJtwkCwrnpy6JfTfaaULHZtWY7iq1YKMShFsaUG3rOUISRTpIRYgYpog-vmxaqPPa9RG4OolnfKt2pcTkoeetElgorqSvGVjRhBoPtGzpYuvCWwVtYVHSxXeBuJEss33fDNr5oWXeI9hT3Nyy2WJe45iQO0Tp0VRnzYYOXxhJJEg8HLbseKh2iA';
  const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ═══ TopAppBar ═══ */}
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
            <Text style={s.topBarTitle} numberOfLines={1}>
              {/* Title */}
              Payslip Detail
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={s.topBarIconBtn}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardProfile')}
            >
              <View style={s.avatarSmall}>
                <Image
                  source={{ uri: user?.avatar_url || DEFAULT_AVATAR }}
                  style={s.avatarSmallImage as any}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ─── Hero Status Section ─── */}
        <View style={s.heroCard}>
          <View style={s.heroHeader}>
            <View>
              <Text style={s.heroPeriodLabel}>Payment Period</Text>
              <Text style={s.heroPeriodVal}>{periodName}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusBg, borderColor: statusColor + '20' }]}>
              <MaterialIcons name="check-circle" size={14} color={statusColor} />
              <Text style={[s.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          
          <View style={s.netPayCard}>
            <Text style={s.netPayLabel}>Net Salary Credited</Text>
            <Text style={s.netPayVal}>₹{slipData.final_salary.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* ─── Earnings Section ─── */}
        <View style={s.breakdownSection}>
          <View style={s.sectionTitleRow}>
            <MaterialIcons name="payments" size={20} color={Colors.primary} />
            <Text style={s.sectionTitle}>Earnings</Text>
          </View>
          
          <View style={s.itemsCard}>
            <View style={s.breakdownItem}>
              <View>
                <Text style={s.itemTitle}>Base Salary</Text>
                <Text style={s.itemSubtitle}>Monthly Fixed Pay</Text>
              </View>
              <Text style={s.itemAmount}>₹{slipData.pro_rated_salary.toLocaleString('en-IN')}</Text>
            </View>

            {slipData.overtime_amount > 0 && (
              <View style={s.breakdownItem}>
                <View>
                  <Text style={s.itemTitle}>Overtime</Text>
                  <Text style={s.itemSubtitle}>
                    {estimatedOtHours > 0 ? `${estimatedOtHours} Hours @ ₹204/hr` : 'Overtime Benefits'}
                  </Text>
                </View>
                <Text style={[s.itemAmount, { color: Colors.successGreen, fontWeight: '700' }]}>
                  +₹{slipData.overtime_amount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Deductions Section ─── */}
        <View style={s.breakdownSection}>
          <View style={s.sectionTitleRow}>
            <MaterialIcons name="account-balance-wallet" size={20} color={Colors.secondary} />
            <Text style={[s.sectionTitle, { color: Colors.secondary }]}>Deductions</Text>
          </View>

          <View style={s.itemsCard}>
            {/* Late penalty */}
            <View style={s.breakdownItem}>
              <View>
                <Text style={s.itemTitle}>Late Penalty</Text>
                <Text style={s.itemSubtitle}>Grace period breaches</Text>
              </View>
              <Text style={[s.itemAmount, { color: Colors.secondary }]}>
                -₹{slipData.penalty_amount.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Uniform deductions */}
            {slipData.uniform_deduction > 0 && (
              <View style={s.breakdownItem}>
                <View>
                  <Text style={s.itemTitle}>Uniform Installment</Text>
                  <Text style={s.itemSubtitle}>Uniform dues deduction</Text>
                </View>
                <Text style={[s.itemAmount, { color: Colors.secondary }]}>
                  -₹{slipData.uniform_deduction.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            {/* Salary Advances */}
            {slipData.advance_deduction > 0 && (
              <View style={s.breakdownItem}>
                <View>
                  <Text style={s.itemTitle}>Salary Advance</Text>
                  <Text style={s.itemSubtitle}>Advance repayment</Text>
                </View>
                <Text style={[s.itemAmount, { color: Colors.secondary }]}>
                  -₹{slipData.advance_deduction.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            {/* Other Deductions */}
            {slipData.other_deduction !== undefined && slipData.other_deduction > 0 && (
              <View style={s.breakdownItem}>
                <View>
                  <Text style={s.itemTitle}>Miscellaneous</Text>
                  <Text style={s.itemSubtitle}>{slipData.other_deduction_reason || 'Other Deductions'}</Text>
                </View>
                <Text style={[s.itemAmount, { color: Colors.secondary }]}>
                  -₹{slipData.other_deduction.toLocaleString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── Attendance Summary Bento ─── */}
        <View style={s.bentoGrid}>
          {/* Days Present */}
          <View style={[s.bentoCard, s.bentoCardSuccess]}>
            <MaterialIcons name="event-available" size={22} color={Colors.successGreen} />
            <Text style={s.bentoLabel}>Days Present</Text>
            <Text style={s.bentoVal}>{slipData.days_present} Days</Text>
          </View>

          {/* Absents */}
          <View style={[s.bentoCard, s.bentoCardDanger]}>
            <MaterialIcons name="event-busy" size={22} color={Colors.secondary} />
            <Text style={s.bentoLabel}>Absents</Text>
            <Text style={s.bentoVal}>{absentDays} Days</Text>
          </View>
        </View>

        {/* ─── Download CTA ─── */}
        <TouchableOpacity activeOpacity={0.9} style={s.actionBtn} onPress={handleDownload}>
          <MaterialIcons name="download" size={20} color="#ffffff" />
          <Text style={s.actionBtnText}>Download PDF Payslip</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    gap: 12,
  },
  loadingText: {
    color: Colors.outline,
    fontWeight: '600',
    fontSize: 14,
  },
  backBtnText: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfdaf1',
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroPeriodLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  heroPeriodVal: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  netPayCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netPayLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  netPayVal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Inter_700Bold',
  },
  breakdownSection: {
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfdaf1',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  breakdownItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(207,218,241,0.3)',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  itemSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: Spacing.gutter,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfdaf1',
    borderRadius: BorderRadius.xl,
    padding: 12,
    gap: 4,
  },
  bentoCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.successGreen,
  },
  bentoCardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  bentoLabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 4,
  },
  bentoVal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    fontFamily: 'Inter_700Bold',
  },
  actionBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 2,
    paddingRight: 8,
    height: 56,
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 208, 0.3)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 175,
    height: 44,
    resizeMode: 'contain',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarIconBtn: {
    position: 'relative',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainerLowest,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 39, 82, 0.15)',
    overflow: 'hidden',
  },
  avatarSmallImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  backBtn: {
    padding: 8,
    marginLeft: -4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    borderRadius: 36,
    height: 72,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    zIndex: 100,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
  },
  navItemActive: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
