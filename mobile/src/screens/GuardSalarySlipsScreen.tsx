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
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, BorderRadius } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as payrollService from '../api/payrollService';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format year-month YYYY-MM to word month format, e.g. "May 2026"
const formatMonthString = (monthStr: string) => {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch (err) {
    return monthStr;
  }
};

const SlipAccordionItem = ({ record, onDownload }: { record: payrollService.PayrollRecord, onDownload: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const isPaid = record.status === 'paid';
  const isApproved = record.status === 'approved';
  
  let statusText = 'Processing Verification...';
  let statusColor = '#b52424'; // secondary
  let iconName = 'history' as any;
  let iconBgColor = 'rgba(181, 36, 36, 0.1)';
  
  if (isPaid) {
    statusText = `Paid ${formatMonthString(record.month)}`;
    statusColor = '#10b981'; // success
    iconName = 'calendar_today';
    iconBgColor = 'rgba(0, 39, 82, 0.1)'; // primary-fixed/20
  } else if (isApproved) {
    statusText = 'Approved, Pending Payment';
    statusColor = '#D97706'; 
    iconName = 'calendar_today';
    iconBgColor = '#f0f3fd';
  }

  const baseSalary = record.pro_rated_salary || 0;
  const overtimeAmt = record.overtime_amount || 0;
  const allowances = 0; 
  const bonus = 0;
  const grossEarnings = baseSalary + overtimeAmt + allowances + bonus;

  const latePenalty = record.penalty_amount || 0;
  const uniformDed = record.uniform_deduction || 0;
  const advanceDed = record.advance_deduction || 0;
  const otherDed = record.other_deduction || 0;
  const pf = 0;
  const esi = 0;
  const totalDeductions = latePenalty + uniformDed + advanceDed + otherDed + pf + esi;
  
  const netPayable = record.final_salary || Math.max(0, grossEarnings - totalDeductions);

  return (
    <View style={[styles.slipItem, !isPaid && !isApproved && styles.slipItemPending]}>
      <TouchableOpacity 
        activeOpacity={0.7} 
        style={styles.slipHeader} 
        onPress={toggleExpand}
        disabled={!isPaid && !isApproved}
      >
        <View style={styles.slipHeaderLeft}>
          <View>
            <Text style={styles.slipMonthText}>{formatMonthString(record.month)}</Text>
            <Text style={[styles.slipStatusText, { color: statusColor }, (!isPaid && !isApproved) && styles.slipStatusTextItalic]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.slipHeaderRight}>
          {(isPaid || isApproved) ? (
            <>
              <View style={styles.netPayCol}>
                <Text style={styles.netPayLabel}>NET PAY</Text>
                <Text style={styles.netPayVal}>₹{netPayable.toLocaleString('en-IN')}</Text>
              </View>
              <MaterialIcons 
                name="expand-more" 
                size={24} 
                color="#747780" 
                style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
              />
            </>
          ) : (
            <MaterialIcons name="lock" size={20} color="rgba(116, 119, 128, 0.4)" />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.expandedInner}>
            {/* Earnings Section */}
            <View style={styles.sectionBlock}>
              <View style={[styles.sectionHeader, { borderBottomColor: 'rgba(0, 19, 45, 0.1)' }]}>
                <Text style={styles.sectionTitleText}>Earnings / कमाई</Text>
                <Text style={styles.sectionTitleText}>₹{grossEarnings.toLocaleString('en-IN')}</Text>
              </View>
              
              <View style={styles.breakdownList}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.bdLabel}>Base Salary / मूल वेतन</Text>
                  <Text style={styles.bdValue}>₹{baseSalary.toLocaleString('en-IN')}</Text>
                </View>
                {overtimeAmt > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.bdLabel}>Overtime / अतिरिक्त समय</Text>
                    <Text style={styles.bdValue}>₹{overtimeAmt.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                {allowances > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.bdLabel}>Allowances / भत्ते</Text>
                    <Text style={styles.bdValue}>₹{allowances.toLocaleString('en-IN')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Deductions Section */}
            {totalDeductions > 0 && (
              <View style={[styles.sectionBlock, { marginTop: 24 }]}>
                <View style={[styles.sectionHeader, { borderBottomColor: 'rgba(181, 36, 36, 0.1)' }]}>
                  <Text style={[styles.sectionTitleText, { color: '#b52424' }]}>Deductions / कटौतियां</Text>
                  <Text style={[styles.sectionTitleText, { color: '#b52424' }]}>₹{totalDeductions.toLocaleString('en-IN')}</Text>
                </View>
                
                <View style={styles.breakdownList}>
                  {pf > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.bdLabel}>Provident Fund (PF)</Text>
                      <Text style={styles.bdValue}>₹{pf.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                  {esi > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.bdLabel}>ESI</Text>
                      <Text style={styles.bdValue}>₹{esi.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                  {latePenalty > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.bdLabel}>Late Penalty / देरी दंड</Text>
                      <Text style={styles.bdValue}>₹{latePenalty.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                  {uniformDed > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.bdLabel}>Uniform / वर्दी</Text>
                      <Text style={styles.bdValue}>₹{uniformDed.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                  {advanceDed > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.bdLabel}>Advance / अग्रिम</Text>
                      <Text style={styles.bdValue}>₹{advanceDed.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                  {otherDed > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.bdLabel}>Others / अन्य</Text>
                      <Text style={styles.bdValue}>₹{otherDed.toLocaleString('en-IN')}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.expandedActions}>
              <TouchableOpacity activeOpacity={0.7} style={styles.btnPrint} onPress={() => Alert.alert('Print', 'Printing slip...')}>
                <MaterialIcons name="print" size={18} color="#111c2c" />
                <Text style={styles.btnPrintText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={styles.btnPdf} onPress={onDownload}>
                <MaterialIcons name="download" size={18} color="#ffffff" />
                <Text style={styles.btnPdfText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default function GuardSalarySlipsScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payrollRecords, setPayrollRecords] = useState<payrollService.PayrollRecord[]>([]);

  const loadPayrollData = async () => {
    try {
      const records = await payrollService.getPayrollRecords();
      setPayrollRecords(records);
    } catch (err) {
      console.error('Error fetching payroll records for guard:', err);
      Alert.alert('Error', 'Failed to retrieve salary slips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData();
  }, []);

  const handleDownloadPress = (monthName: string) => {
    Alert.alert('Success / सफलता', `Downloading PDF Payslip for ${monthName}... / ${monthName} के लिए पीडीएफ वेतन पर्ची डाउनलोड की जा रही है...`);
  };

  const navItems = [
    { key: 'home', icon: 'dashboard' as const, label: 'Home' },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'salary', icon: 'payments' as const, label: 'Salary' },
    { key: 'profile', icon: 'person' as const, label: 'Profile' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'home') {
      navigation.navigate('GuardHome');
    } else if (key === 'attendance') {
      navigation.navigate('GuardAttendanceHistory');
    } else if (key === 'profile') {
      navigation.navigate('GuardProfile');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00132d" />
        <Text style={styles.loadingText}>Loading records...</Text>
      </View>
    );
  }

  // Find latest paid/approved record for highlight card
  const latestRecord = payrollRecords.find(r => r.status === 'paid' || r.status === 'approved');
  
  let highlightNetPay = 0;
  let highlightGross = 0;
  let highlightDeductions = 0;
  let highlightMonth = 'No Records';
  let highlightIsPaid = false;

  if (latestRecord) {
    highlightMonth = formatMonthString(latestRecord.month);
    highlightIsPaid = latestRecord.status === 'paid';
    
    highlightGross = (latestRecord.pro_rated_salary || 0) + (latestRecord.overtime_amount || 0);
    highlightDeductions = (latestRecord.penalty_amount || 0) + (latestRecord.uniform_deduction || 0) + (latestRecord.advance_deduction || 0) + (latestRecord.other_deduction || 0);
    highlightNetPay = latestRecord.final_salary || Math.max(0, highlightGross - highlightDeductions);
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      
      {/* ═══ Top App Bar ═══ */}
      <View style={[styles.header, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#00132d" />
            </TouchableOpacity>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjWcPgQ9_BPA--bRSkPaBZLRGLh-4CWQZnNrLKJ9iEZvQF7uVFVhKz8s4GDmzkUDYQB8pZLzDJrBICPhFMVFIpWBVHI-Qb2bm12rbpLFzSmwIG8qL6eR-g0naiEgZfbf7s2tFbKwASU1dnuMJ8jEMKDZsSFBGx4pzVGyiz7C4kfwvDy5S4WwPefEKqyqsi_PevjZz560_ebosD8_9WH-P6SBaoaVkrM5qnFMc_7SN8f_OY7A-Z8MeN5OMBnIP8TrHckSD83ga-v0c' }} 
              style={styles.headerLogo} 
            />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="notifications-none" size={24} color="#00132d" />
              <View style={styles.notifBadgeRedDot} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.screenTitleWrap}>
          <Text style={styles.screenTitle}>My Salary Slips / मेरी वेतन पर्ची</Text>
          <Text style={styles.screenSubtitle}>View your financial records / अपने वित्तीय रिकॉर्ड देखें</Text>
        </View>

        {/* ─── Highlight Card ─── */}
        {latestRecord && (
          <View style={styles.highlightCard}>
            {/* Decors mapped from HTML css are complex, we'll use simple background */}
            <View style={styles.highlightTop}>
              <View>
                <Text style={styles.highlightLabel}>LATEST PAYOUT / नवीनतम भुगतान</Text>
                <Text style={styles.highlightMonth}>{highlightMonth}</Text>
              </View>
              {highlightIsPaid && (
                <View style={styles.paidBadge}>
                  <MaterialIcons name="check-circle" size={14} color="#ffffff" />
                  <Text style={styles.paidBadgeText}>PAID</Text>
                </View>
              )}
            </View>

            <View style={styles.highlightMid}>
              <Text style={styles.highlightLabel}>NET PAYABLE AMOUNT / शुद्ध देय राशि</Text>
              <View style={styles.highlightNetRow}>
                <Text style={styles.highlightNetVal}>₹{highlightNetPay.toLocaleString('en-IN')}</Text>
                <Text style={styles.highlightCurrency}>INR</Text>
              </View>
            </View>

            <View style={styles.highlightBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightBottomLabel}>TOTAL EARNINGS / कुल कमाई</Text>
                <Text style={styles.highlightBottomVal}>₹{highlightGross.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.highlightBottomLabel}>TOTAL DEDUCTIONS / कुल कटौतियां</Text>
                <Text style={[styles.highlightBottomVal, { color: '#ffb4ac' }]}>₹{highlightDeductions.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <TouchableOpacity 
              activeOpacity={0.8} 
              style={styles.downloadBigBtn} 
              onPress={() => handleDownloadPress(highlightMonth)}
            >
              <MaterialIcons name="download" size={20} color="#00132d" />
              <Text style={styles.downloadBigBtnText}>Download PDF / पीडीएफ डाउनलोड करें</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Slips List ─── */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>Payment History</Text>
            <TouchableOpacity style={styles.filterBtn}>
              <Text style={styles.filterBtnText}>Filter</Text>
              <MaterialIcons name="filter-list" size={18} color="#00132d" />
            </TouchableOpacity>
          </View>

          <View style={styles.listWrap}>
            {payrollRecords.map((record) => (
              <SlipAccordionItem 
                key={record.id} 
                record={record} 
                onDownload={() => handleDownloadPress(formatMonthString(record.month))} 
              />
            ))}
            
            {payrollRecords.length === 0 && (
              <Text style={styles.noRecordsText}>No salary records found.</Text>
            )}
          </View>
        </View>

        {/* ─── Help Section ─── */}
        <View style={styles.helpSection}>
          <View style={styles.helpIconWrap}>
            <MaterialIcons name="contact-support" size={30} color="#00132d" />
          </View>
          <View style={styles.helpTextWrap}>
            <Text style={styles.helpTitle}>Need Clarification?</Text>
            <Text style={styles.helpSubtitle}>If there's any discrepancy in your salary, please raise a dispute or contact admin before the 5th of the month.</Text>
          </View>
          <View style={{ width: '100%', gap: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[styles.disputeBtn, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#00132d', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => Linking.openURL('tel:7322012345')}
            >
              <MaterialIcons name="call" size={18} color="#00132d" style={{ marginRight: 8 }} />
              <Text style={[styles.disputeBtnText, { color: '#00132d' }]}>Call Admin (Pankaj Kumar)</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={[styles.disputeBtn, { alignItems: 'center' }]}>
              <Text style={styles.disputeBtnText}>Raise a Dispute</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ Bottom Nav (Floating pill style) ═══ */}
      <View style={[styles.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
      {navItems.map((item) => {
        const isActive = item.key === 'salary';
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.navItem, isActive && styles.navItemActive]}
            activeOpacity={0.7}
            onPress={() => handleNavPress(item.key)}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={isActive ? '#ffffff' : 'rgba(67, 71, 79, 0.7)'}
            />
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fbff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fbff',
  },
  loadingText: {
    marginTop: 12,
    color: '#43474f',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 198, 208, 0.3)',
    height: 64,
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerLogo: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBadgeRedDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#b52424',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  iconBtn: {
    padding: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  screenTitleWrap: {
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00132d',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#43474f',
    fontWeight: '500',
  },
  highlightCard: {
    backgroundColor: '#00132d',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  highlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  highlightLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 4,
  },
  highlightMonth: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  paidBadge: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paidBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  highlightMid: {
    marginBottom: 32,
  },
  highlightNetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  highlightNetVal: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  highlightCurrency: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(171, 199, 252, 0.6)',
  },
  highlightBottom: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 24,
    marginBottom: 32,
  },
  highlightBottomLabel: {
    fontSize: 10,
    color: 'rgba(171, 199, 252, 0.6)',
    fontWeight: '600',
    marginBottom: 4,
  },
  highlightBottomVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  downloadBigBtn: {
    backgroundColor: '#ffffff',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  downloadBigBtnText: {
    color: '#00132d',
    fontWeight: '700',
    fontSize: 15,
  },
  listSection: {
    marginBottom: 32,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00132d',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00132d',
  },
  listWrap: {
    gap: 16,
  },
  noRecordsText: {
    fontSize: 14,
    color: '#43474f',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  slipItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 198, 208, 0.3)',
    overflow: 'hidden',
  },
  slipItemPending: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(196, 198, 208, 0.2)',
    opacity: 0.8,
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  slipHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  slipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slipMonthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111c2c',
  },
  slipStatusText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  slipStatusTextItalic: {
    fontStyle: 'italic',
  },
  slipHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  netPayCol: {
    alignItems: 'flex-end',
    display: 'flex',
  },
  netPayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#43474f',
    textTransform: 'uppercase',
  },
  netPayVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00132d',
  },
  expandedContent: {
    backgroundColor: 'rgba(240, 243, 253, 0.5)',
  },
  expandedInner: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196, 198, 208, 0.1)',
  },
  sectionBlock: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 8,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00132d',
    letterSpacing: -0.5,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bdLabel: {
    fontSize: 14,
    color: '#43474f',
    fontWeight: '500',
  },
  bdValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111c2c',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  btnPrint: {
    flex: 1,
    height: 48,
    backgroundColor: '#dfe2ec',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnPrintText: {
    color: '#111c2c',
    fontWeight: '700',
    fontSize: 15,
  },
  btnPdf: {
    flex: 1,
    height: 48,
    backgroundColor: '#00132d',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnPdfText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  helpSection: {
    backgroundColor: 'rgba(0, 19, 45, 0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 19, 45, 0.1)',
    alignItems: 'center',
  },
  helpIconWrap: {
    width: 56,
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  helpTextWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00132d',
    marginBottom: 8,
  },
  helpSubtitle: {
    fontSize: 13,
    color: '#43474f',
    textAlign: 'center',
    lineHeight: 20,
  },
  disputeBtn: {
    backgroundColor: '#00132d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  disputeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
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
    borderRadius: 16,
  },
  navItemActive: {
    backgroundColor: '#002752', // Colors.primaryContainer
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(67, 71, 79, 0.7)', // Colors.onSurfaceVariant
    marginTop: 2,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
