import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
  Dimensions,
  ScrollView,
  Platform,
  Modal,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import * as payrollService from '../api/payrollService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────
type PayrollStatus = 'draft' | 'generated' | 'approved' | 'paid';
type FilterChip = 'all' | PayrollStatus;

interface PayrollEntry {
  id: string;
  guardName: string;
  guardId: string;
  site: string;
  baseSalary: number;
  overtime: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  daysPresent: number;
  totalDays: number;
  shift: 'day' | 'night';
  adminOverride?: number; // Admin-set final salary
}

interface MonthData {
  key: string;
  label: string;
  shortLabel: string;
  year: number;
}

interface PayrollListScreenProps {
  navigation: any;
}

// ─── Generate last 6 months dynamically ─────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function generateMonths(): MonthData[] {
  const months: MonthData[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      shortLabel: MONTH_NAMES[d.getMonth()],
      year: d.getFullYear(),
    });
  }
  return months;
}
const MONTHS = generateMonths();

/** Maps backend PayrollRecord to screen's PayrollEntry */
function mapToEntry(r: payrollService.PayrollRecord): PayrollEntry {
  return {
    id: r.id,
    guardName: (r as any).guards?.users?.name || (r as any).guards?.name || 'Unknown',
    guardId: r.guard_id,
    site: 'Assigned Site',
    baseSalary: r.base_salary || 0,
    overtime: r.overtime_amount || 0,
    deductions: (r.penalty_amount || 0) + (r.uniform_deduction || 0) + (r.advance_deduction || 0) + (r.other_deduction || 0),
    netSalary: r.final_salary || 0,
    status: r.status,
    daysPresent: r.days_present || 0,
    totalDays: r.total_working_days || 30,
    shift: 'day',
  };
}

// ─── Helpers ────────────────────────────────────────
const formatCurrency = (amount: number): string => {
  return '₹' + amount.toLocaleString('en-IN');
};

const getStatusConfig = (status: PayrollStatus) => {
  switch (status) {
    case 'draft':
      return {
        label: 'DRAFT',
        bg: Colors.surfaceContainerHigh,
        text: Colors.onSurfaceVariant,
        icon: 'edit-note' as const,
        dotColor: Colors.outline,
      };
    case 'generated':
      return {
        label: 'GENERATED',
        bg: '#FFF3E0',
        text: '#E65100',
        icon: 'receipt-long' as const,
        dotColor: Colors.warningAmber,
      };
    case 'approved':
      return {
        label: 'APPROVED',
        bg: '#E3F2FD',
        text: '#1565C0',
        icon: 'verified' as const,
        dotColor: Colors.infoBlue,
      };
    case 'paid':
      return {
        label: 'PAID',
        bg: '#E8F5E9',
        text: '#2E7D32',
        icon: 'check-circle' as const,
        dotColor: Colors.successGreen,
      };
  }
};

// ─── Month Pill Component ───────────────────────────
function MonthPill({
  month,
  isActive,
  onPress,
}: {
  month: MonthData;
  isActive: boolean;
  onPress: () => void;
}) {
  const s = useScaledStyles(styles);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          s.monthPill,
          isActive ? s.monthPillActive : s.monthPillInactive,
        ]}
      >
        <Text
          style={[
            s.monthPillText,
            isActive ? s.monthPillTextActive : s.monthPillTextInactive,
          ]}
        >
          {month.shortLabel}
        </Text>
        <Text
          style={[
            s.monthPillYear,
            isActive ? s.monthPillYearActive : s.monthPillYearInactive,
          ]}
        >
          {month.year}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Filter Chip Component ──────────────────────────
function FilterChipButton({
  label,
  isActive,
  onPress,
  dotColor,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  dotColor?: string;
}) {
  const s = useScaledStyles(styles);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          s.filterChip,
          isActive ? s.filterChipActive : s.filterChipInactive,
        ]}
      >
        {dotColor && (
          <View
            style={[
              s.filterDot,
              { backgroundColor: isActive ? Colors.onPrimary : dotColor },
            ]}
          />
        )}
        <Text
          style={[
            s.filterChipText,
            isActive ? s.filterChipTextActive : s.filterChipTextInactive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Salary Summary Card ────────────────────────────
function SalarySummaryCard({ entries }: { entries: PayrollEntry[] }) {
  const s = useScaledStyles(styles);

  // Calculate summary metrics from provided entries
  const totalBase = entries.reduce((sum, e) => sum + e.baseSalary, 0);
  const totalOT = entries.reduce((sum, e) => sum + e.overtime, 0);
  const totalDed = entries.reduce((sum, e) => sum + e.deductions, 0);
  const totalNet = entries.reduce((sum, e) => sum + e.netSalary, 0);

  return (
    <View style={s.summaryCard}>
      <View style={s.summaryGradientBar} />
      <View style={s.summaryContent}>
        <View style={s.summaryMainRow}>
          <View>
            <Text style={s.summaryLabel}>Total Net Salary</Text>
            <Text style={s.summaryAmount}>{formatCurrency(totalNet)}</Text>
          </View>
          <View style={s.summaryIconBg}>
            <MaterialIcons name="account-balance-wallet" size={24} color={Colors.primary} />
          </View>
        </View>

        <View style={s.summaryBreakdown}>
          <View>
            <View style={s.breakdownItem}>
              <View style={[s.breakdownDot, { backgroundColor: Colors.successGreen }]} />
              <Text style={s.breakdownLabel}>Base</Text>
            </View>
            <Text style={s.breakdownValue}>{formatCurrency(totalBase)}</Text>
          </View>
          <View>
            <View style={s.breakdownItem}>
              <View style={[s.breakdownDot, { backgroundColor: Colors.infoBlue }]} />
              <Text style={s.breakdownLabel}>Overtime</Text>
            </View>
            <Text style={s.breakdownValue}>{formatCurrency(totalOT)}</Text>
          </View>
          <View>
            <View style={s.breakdownItem}>
              <View style={[s.breakdownDot, { backgroundColor: Colors.dangerRed }]} />
              <Text style={s.breakdownLabel}>Deductions</Text>
            </View>
            <Text style={s.breakdownValue}>{formatCurrency(totalDed)}</Text>
          </View>
        </View>

        <View style={s.summaryFooter}>
          <View style={s.summaryStatChip}>
            <MaterialIcons name="receipt" size={14} color={Colors.onSurfaceVariant} />
            <Text style={s.summaryStatText}>{entries.length} entries</Text>
          </View>
          <View style={s.summaryStatChip}>
            <MaterialIcons name="calendar-today" size={14} color={Colors.onSurfaceVariant} />
            <Text style={s.summaryStatText}>Current Month</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main Component ────────────────────────────────
export default function PayrollListScreen({ navigation }: PayrollListScreenProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { selectedCategory, categoryFilterIds, getLabel, categoryFilterError } = usePersonnelCategory();

  // ─── Nav Items (moved inside component to access getLabel) ──
  const navItems = useMemo(() => [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'personnel', icon: 'people' as const, label: getLabel('plural') },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'more', icon: 'more-horiz' as const, label: 'More' },
  ], [getLabel]);

  // ── State ──
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[MONTHS.length - 1].key);
  
  // Cache for frontend recalculation (prefetch data for all categories)
  const [cachedEntries, setCachedEntries] = useState<PayrollEntry[]>([]);
  const [dataFullyCached, setDataFullyCached] = useState(false);

  // ── Override Modal State ──
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<PayrollEntry | null>(null);
  const [overrideAmount, setOverrideAmount] = useState('');

  // ── Data Fetching ──
  const fetchPayroll = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all payroll records without category filter for caching
      const records = await payrollService.getPayrollRecords({
        month: selectedMonth,
        status: activeFilter !== 'all' ? activeFilter : undefined,
      });
      const mappedEntries = records.map(mapToEntry);
      
      // Cache all entries (capped at 1000 records)
      const cappedEntries = mappedEntries.slice(0, 1000);
      setCachedEntries(cappedEntries);
      setEntries(cappedEntries);
      setDataFullyCached(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, activeFilter]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPayroll();
    });
    return unsubscribe;
  }, [navigation, fetchPayroll]);
  
  // Instant frontend recalculation when category filter changes (no backend calls, no loading spinner)
  useEffect(() => {
    if (dataFullyCached && cachedEntries.length > 0) {
      const startTime = performance.now();
      
      // Frontend filtering completes within 100ms
      let filtered = cachedEntries;
      
      // Apply category filter
      if (selectedCategory !== 'all' && categoryFilterIds.length > 0) {
        filtered = filtered.filter(e => categoryFilterIds.includes(e.guardId));
      }
      
      setEntries(filtered);
      
      const endTime = performance.now();
      const recalcTime = endTime - startTime;
      console.log(`Payroll category filter recalculation completed in ${recalcTime.toFixed(2)}ms`);
    }
  }, [categoryFilterIds, selectedCategory, dataFullyCached, cachedEntries]);

  // ── Filtered Entries ──
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Category filter
    if (selectedCategory !== 'all' && categoryFilterIds.length > 0) {
      result = result.filter(e => categoryFilterIds.includes(e.guardId));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.guardName.toLowerCase().includes(q) ||
          e.guardId.toLowerCase().includes(q) ||
          e.site.toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, searchQuery, selectedCategory, categoryFilterIds]);

  // ── Navigation Handler ──
  const handleNavPress = useCallback((key: string) => {
    switch (key) {
      case 'dashboard':
        navigation.navigate('AdminDashboard');
        break;
      case 'personnel':
        navigation.navigate('WorkforcePersonnelList');
        break;
      case 'attendance':
        navigation.navigate('AttendanceList');
        break;
      case 'more':
        navigation.navigate('MoreMenu');
        break;
    }
  }, [navigation]);

  // ── Override Handlers ──
  const handleOpenOverride = useCallback((entry: PayrollEntry) => {
    setOverrideTarget(entry);
    setOverrideAmount(entry.adminOverride != null ? String(entry.adminOverride) : String(entry.netSalary));
    setOverrideModal(true);
  }, []);

  const handleConfirmOverride = useCallback(async () => {
    if (!overrideTarget) return;
    const amount = parseInt(overrideAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid salary amount.');
      return;
    }
    try {
      await payrollService.updateAdjustments(overrideTarget.id, {
        other_deduction: overrideTarget.netSalary - amount,
        other_deduction_reason: 'Admin salary override',
      });
      setOverrideModal(false);
      fetchPayroll();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update salary.');
    }
  }, [overrideTarget, overrideAmount, fetchPayroll]);

  const handleRemoveOverride = useCallback(async () => {
    if (!overrideTarget) return;
    try {
      await payrollService.updateAdjustments(overrideTarget.id, {
        other_deduction: 0,
        other_deduction_reason: '',
      });
      setOverrideModal(false);
      fetchPayroll();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to revert salary.');
    }
  }, [overrideTarget, fetchPayroll]);

  // ── Render Payroll Card ──
  const renderPayrollCard = useCallback(({ item }: { item: PayrollEntry }) => {
    const statusCfg = getStatusConfig(item.status);
    const initials = item.guardName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const attendancePct = item.totalDays > 0 ? item.daysPresent / item.totalDays : 0;

    return (
      <TouchableOpacity activeOpacity={0.85} style={s.payrollCard}>
        {/* Card Header */}
        <View style={s.cardHeader}>
          <View style={s.guardInfo}>
            <View style={s.guardInitials}>
              <Text style={s.guardInitialsText}>{initials}</Text>
            </View>
            <View style={s.guardTexts}>
              <Text style={s.guardName} numberOfLines={1}>{item.guardName}</Text>
              <View style={s.guardMeta}>
                <Text style={s.guardIdText}>{item.guardId}</Text>
                <Text style={s.metaDot}>•</Text>
                <Text style={s.guardSiteText} numberOfLines={1}>{item.site}</Text>
              </View>
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <MaterialIcons name={statusCfg.icon} size={12} color={statusCfg.text} />
            <Text style={[s.statusText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Admin Override Banner */}
        {item.adminOverride != null && (
          <View style={s.overrideBanner}>
            <MaterialIcons name="admin-panel-settings" size={14} color="#7B1FA2" />
            <Text style={s.overrideBannerText}>
              Admin Override: {formatCurrency(item.adminOverride)}
            </Text>
          </View>
        )}

        {/* Salary Breakdown */}
        <View style={s.salaryBreakdown}>
          <View style={s.salaryItem}>
            <Text style={s.salaryItemLabel}>Base</Text>
            <Text style={s.salaryItemValue}>{formatCurrency(item.baseSalary)}</Text>
          </View>
          <View style={s.salaryDivider} />
          <View style={s.salaryItem}>
            <Text style={s.salaryItemLabel}>Overtime</Text>
            <Text style={s.salaryItemValue}>{formatCurrency(item.overtime)}</Text>
          </View>
          <View style={s.salaryDivider} />
          <View style={s.salaryItem}>
            <Text style={s.salaryItemLabel}>Deductions</Text>
            <Text style={[s.salaryItemValue, { color: Colors.dangerRed }]}>
              -{formatCurrency(item.deductions)}
            </Text>
          </View>
        </View>

        {/* Card Footer */}
        <View style={s.cardFooter}>
          <View style={s.attendanceRow}>
            <MaterialIcons name="event-available" size={14} color={Colors.onSurfaceVariant} />
            <Text style={s.attendanceText}>
              {item.daysPresent}/{item.totalDays} days
            </Text>
            <View style={s.attendanceBarBg}>
              <View
                style={[
                  s.attendanceBarFill,
                  {
                    width: `${Math.min(attendancePct * 100, 100)}%`,
                    backgroundColor: attendancePct >= 0.9 ? Colors.successGreen : attendancePct >= 0.7 ? Colors.warningAmber : Colors.dangerRed,
                  },
                ]}
              />
            </View>
          </View>
          <View style={s.netSalaryContainer}>
            <Text style={s.netLabel}>NET PAY</Text>
            <Text style={[s.netAmount, item.adminOverride != null && s.strikethrough]}>
              {formatCurrency(item.netSalary)}
            </Text>
            {item.adminOverride != null && (
              <Text style={[s.netAmount, { color: '#7B1FA2' }]}>
                {formatCurrency(item.adminOverride)}
              </Text>
            )}
          </View>
        </View>

        {/* Override Button */}
        <TouchableOpacity style={s.overrideBtn} activeOpacity={0.7} onPress={() => handleOpenOverride(item)}>
          <MaterialIcons name="edit" size={14} color={Colors.primary} />
          <Text style={s.overrideBtnText}>Set Final Salary</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [s, handleOpenOverride]);

  // ── Loading State ──
  if (loading && entries.length === 0) {
    return (
      <View style={[s.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.onSurfaceVariant, marginTop: 12 }}>Loading payroll...</Text>
      </View>
    );
  }

  // ── Render ──
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Top Bar ═══ */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View>
              <Text style={s.topBarTitle}>Payroll</Text>
              <Text style={s.topBarSubtitle}>{selectedCategory === 'all' ? 'All Workforce' : getLabel('plural')}</Text>
            </View>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity style={s.topBarIconBtn}>
              <MaterialIcons name="file-download" size={22} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity style={s.topBarIconBtn}>
              <MaterialIcons name="tune" size={22} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ═══ Month Selector ═══ */}
      <View style={s.monthSelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.monthScroll}
        >
          {MONTHS.map((month) => (
            <MonthPill
              key={month.key}
              month={month}
              isActive={selectedMonth === month.key}
              onPress={() => setSelectedMonth(month.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ═══ Search & Filters ═══ */}
      <View style={s.searchSection}>
        <View style={[s.searchBarWrapper, searchFocused && s.searchBarWrapperFocused]}>
          <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder={`Search ${getLabel('plural').toLowerCase()}...`}
            placeholderTextColor={Colors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={16} color={Colors.outline} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersScroll}
        >
          <FilterChipButton
            label="All"
            isActive={activeFilter === 'all'}
            onPress={() => setActiveFilter('all')}
          />
          <FilterChipButton
            label="Draft"
            isActive={activeFilter === 'draft'}
            onPress={() => setActiveFilter('draft')}
            dotColor={getStatusConfig('draft').dotColor}
          />
          <FilterChipButton
            label="Generated"
            isActive={activeFilter === 'generated'}
            onPress={() => setActiveFilter('generated')}
            dotColor={getStatusConfig('generated').dotColor}
          />
          <FilterChipButton
            label="Approved"
            isActive={activeFilter === 'approved'}
            onPress={() => setActiveFilter('approved')}
            dotColor={getStatusConfig('approved').dotColor}
          />
          <FilterChipButton
            label="Paid"
            isActive={activeFilter === 'paid'}
            onPress={() => setActiveFilter('paid')}
            dotColor={getStatusConfig('paid').dotColor}
          />
        </ScrollView>
      </View>

      {/* ═══ List content ═══ */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderPayrollCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View>
            {/* Summary Card */}
            <SalarySummaryCard entries={filteredEntries} />

            {/* Result Count */}
            <View style={s.listHeader}>
              <Text style={s.resultCount}>
                {filteredEntries.length} {selectedCategory === 'all' ? 'workforce' : getLabel('plural').toLowerCase()} payroll entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
              </Text>
              <TouchableOpacity style={s.sortBtn} activeOpacity={0.7}>
                <MaterialIcons name="sort" size={16} color={Colors.onSurfaceVariant} />
                <Text style={s.sortBtnText}>Sort</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={s.emptyState}>
            <MaterialIcons name="receipt-long" size={56} color={Colors.outlineVariant} />
            <Text style={s.emptyTitle}>No payroll entries</Text>
            <Text style={s.emptySubtitle}>
              No records match your current filters
            </Text>
          </View>
        )}
      />

      {/* ═══ Bottom Navigation (Floating pill style) ═══ */}
      <View style={s.bottomNav}>
        {navItems.map((item) => {
          const isActive = item.key === 'more';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ═══ Admin Override Modal ═══ */}
      <Modal visible={overrideModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setOverrideModal(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <MaterialIcons name="admin-panel-settings" size={24} color="#7B1FA2" />
              <Text style={s.modalTitle}>Set Final Salary</Text>
            </View>

            {overrideTarget && (
              <View style={s.modalBody}>
                <Text style={s.modalGuardName}>{overrideTarget.guardName}</Text>
                <Text style={s.modalGuardMeta}>{overrideTarget.guardId} • {overrideTarget.site}</Text>

                <View style={s.modalCalcRow}>
                  <Text style={s.modalCalcLabel}>Calculated Salary</Text>
                  <Text style={s.modalCalcValue}>{formatCurrency(overrideTarget.netSalary)}</Text>
                </View>
                <Text style={s.modalCalcBreakdown}>
                  Base {formatCurrency(overrideTarget.baseSalary)} + OT {formatCurrency(overrideTarget.overtime)} - Ded {formatCurrency(overrideTarget.deductions)}
                </Text>

                <View style={s.modalInputGroup}>
                  <Text style={s.modalInputLabel}>Final Salary (₹)</Text>
                  <View style={s.modalInputWrap}>
                    <Text style={s.modalCurrencyPrefix}>₹</Text>
                    <TextInput
                      style={s.modalInput}
                      placeholder="Enter final amount"
                      placeholderTextColor={Colors.outline}
                      keyboardType="numeric"
                      value={overrideAmount}
                      onChangeText={setOverrideAmount}
                      autoFocus
                    />
                  </View>
                  <Text style={s.modalHint}>This amount will override the calculated salary and become final.</Text>
                </View>

                <TouchableOpacity style={s.modalConfirmBtn} activeOpacity={0.8} onPress={handleConfirmOverride}>
                  <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={s.modalConfirmText}>Confirm Final Salary</Text>
                </TouchableOpacity>

                {overrideTarget.adminOverride != null && (
                  <TouchableOpacity style={s.modalRemoveBtn} activeOpacity={0.7} onPress={handleRemoveOverride}>
                    <MaterialIcons name="undo" size={16} color={Colors.dangerRed} />
                    <Text style={s.modalRemoveText}>Revert to Calculated Salary</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ── Header ──
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.screenPadding,
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
    padding: 4,
    borderRadius: BorderRadius.full,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  topBarSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    marginTop: -2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarIconBtn: {
    padding: 8,
    borderRadius: BorderRadius.full,
  },

  // ── Month Selector ──
  monthSelectorContainer: {
    backgroundColor: Colors.primary,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 40,
  },
  monthScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  monthPill: {
    width: 64,
    paddingVertical: 8,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPillActive: {
    backgroundColor: Colors.onPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  monthPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  monthPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  monthPillTextActive: {
    color: Colors.primary,
  },
  monthPillTextInactive: {
    color: 'rgba(255,255,255,0.85)',
  },
  monthPillYear: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  monthPillYearActive: {
    color: Colors.primaryContainer,
  },
  monthPillYearInactive: {
    color: 'rgba(255,255,255,0.5)',
  },

  // ── Search ──
  searchSection: {
    backgroundColor: Colors.surface,
    paddingTop: 14,
    paddingBottom: 6,
    zIndex: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195,198,208,0.3)',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.screenPadding,
    height: 48,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 12,
  },
  searchBarWrapperFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    height: '100%',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipInactive: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },
  filterChipTextInactive: {
    color: Colors.onSurfaceVariant,
  },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryGradientBar: {
    height: 4,
    backgroundColor: Colors.primary,
  },
  summaryContent: {
    padding: 16,
  },
  summaryMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.outline,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  summaryIconBg: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(0, 39, 82, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195,198,208,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195,198,208,0.3)',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 1,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  summaryStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // ── List ──
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 120,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.outline,
    letterSpacing: 0.3,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.full,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // ── Payroll Card ──
  payrollCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 12,
  },
  guardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  guardInitials: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardInitialsText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  guardTexts: {
    flex: 1,
  },
  guardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  guardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  guardIdText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
  },
  metaDot: {
    fontSize: 11,
    color: Colors.outline,
    marginHorizontal: 2,
  },
  guardSiteText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.outline,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.default,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Salary Breakdown Row ──
  salaryBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(195,198,208,0.25)',
  },
  salaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  salaryItemLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.outline,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  salaryItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  salaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.outlineVariant,
  },

  // ── Card Footer ──
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingTop: 10,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  attendanceText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  attendanceBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 2,
    maxWidth: 60,
    overflow: 'hidden',
  },
  attendanceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  netSalaryContainer: {
    alignItems: 'flex-end',
  },
  netLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.outline,
    letterSpacing: 0.5,
  },
  netAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
  },

  // ── Empty ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.outline,
    textAlign: 'center',
  },

  // ── Bottom Nav (Floating pill style) ──
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    width: '90%',
    height: 64,
    borderRadius: 32,
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

  // ── Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  modalBody: {
    gap: 12,
  },
  modalGuardName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalGuardMeta: {
    fontSize: 12,
    color: Colors.outline,
    marginTop: -4,
  },
  modalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  modalCalcLabel: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  modalCalcValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalCalcBreakdown: {
    fontSize: 11,
    color: Colors.outline,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  modalInputGroup: {
    marginTop: 8,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  modalCurrencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginRight: 6,
  },
  modalInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    padding: 0,
  },
  modalHint: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 6,
  },
  modalConfirmBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 10,
  },
  modalConfirmText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  modalRemoveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    gap: 6,
    marginTop: 4,
  },
  modalRemoveText: {
    color: Colors.dangerRed,
    fontSize: 13,
    fontWeight: '600',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  overrideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginHorizontal: 14,
    marginTop: 8,
    gap: 6,
  },
  overrideBannerText: {
    fontSize: 11,
    color: '#7B1FA2',
    fontWeight: '600',
  },
  overrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195,198,208,0.2)',
    gap: 6,
  },
  overrideBtnText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
});
