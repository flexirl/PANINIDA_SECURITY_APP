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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import * as payrollService from '../api/payrollService';
import SuccessModal from '../components/SuccessModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────
type PayrollStatus = 'draft' | 'generated' | 'approved' | 'paid';
type FilterChip = 'all' | PayrollStatus;

interface PayrollEntry {
  id: string;
  guardName: string;
  guardId: string;
  phone?: string;
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
  categoryId?: string; // For category filtering
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
      shortLabel: `${MONTH_NAMES[d.getMonth()].toUpperCase()} ${d.getFullYear()}`,
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
    guardId: (r as any).guards?.employee_id || r.guard_id,
    phone: (r as any).guards?.phone || (r as any).guards?.users?.phone,
    site: 'Assigned Site',
    baseSalary: r.base_salary || 0,
    overtime: r.overtime_amount || 0,
    deductions: (r.penalty_amount || 0) + (r.uniform_deduction || 0) + (r.advance_deduction || 0) + (r.other_deduction || 0),
    netSalary: r.final_salary || 0,
    status: r.status,
    daysPresent: r.days_present || 0,
    totalDays: r.total_working_days || 30,
    shift: 'day',
    categoryId: (r as any).guards?.category_id,
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
      <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '45%', backgroundColor: 'rgba(255,255,255,0.03)', borderTopLeftRadius: 100, borderBottomLeftRadius: 100 }} />
      <View style={s.summaryContent}>
        <View style={s.summaryMainRow}>
          <View>
            <Text style={s.summaryLabel}>Total Net Salary</Text>
            <Text style={s.summaryAmount}>{formatCurrency(totalNet)}</Text>
          </View>
        </View>

        <View style={s.summaryBreakdown}>
          <View style={{ flex: 1 }}>
            <Text style={s.breakdownLabel}>Base</Text>
            <Text style={s.breakdownValue}>{formatCurrency(totalBase)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.breakdownLabel}>Overtime</Text>
            <Text style={s.breakdownValue}>{formatCurrency(totalOT)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.breakdownLabel}>Deductions</Text>
            <Text style={[s.breakdownValue, { color: '#E53935' }]}>{formatCurrency(totalDed)}</Text>
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
    { key: 'dashboard', icon: 'grid-view' as const, label: 'Dashboard' },
    { key: 'personnel', icon: 'security' as const, label: 'Guards' },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ], []);

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
  const [generating, setGenerating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onSuccessClose, setOnSuccessClose] = useState<() => void>(() => () => {});

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
        filtered = filtered.filter(e => e.categoryId && categoryFilterIds.includes(e.categoryId));
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
      result = result.filter(e => e.categoryId && categoryFilterIds.includes(e.categoryId));
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
      case 'sites':
        navigation.navigate('SiteList');
        break;
      case 'more':
        navigation.navigate('MoreMenu');
        break;
    }
  }, [navigation]);

  // ── Action Handlers ──
  const handleGeneratePayroll = useCallback(async () => {
    try {
      setGenerating(true);
      await payrollService.generatePayroll(selectedMonth);
      setSuccessMessage('Payroll generated successfully for ' + selectedMonth);
      setOnSuccessClose(() => () => {});
      setShowSuccessModal(true);
      fetchPayroll();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  }, [selectedMonth, fetchPayroll]);

  const handleApprovePayroll = useCallback(async (entry: PayrollEntry) => {
    try {
      await payrollService.approvePayrollRecord(entry.id);
      setSuccessMessage(`Payroll approved for ${entry.guardName}`);
      setOnSuccessClose(() => () => {});
      setShowSuccessModal(true);
      fetchPayroll();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve payroll.');
    }
  }, [fetchPayroll]);

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

    return (
      <TouchableOpacity activeOpacity={0.85} style={s.payrollCard} onPress={() => handleOpenOverride(item)}>
        <View style={s.cardHeader}>
          <View style={s.guardInfo}>
            <View style={s.guardInitials}>
              <Text style={s.guardInitialsText}>{initials}</Text>
            </View>
            <View style={s.guardTexts}>
              <Text style={s.guardName} numberOfLines={1}>{item.guardName}</Text>
              <Text style={s.guardIdText}>{item.guardId} • {selectedCategory === 'all' ? 'Guard' : getLabel('singular')}</Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={s.netAmount}>
              {formatCurrency(item.adminOverride != null ? item.adminOverride : item.netSalary)}
            </Text>
            <View style={[s.statusBadge, { backgroundColor: statusCfg.bg === '#FFF3E0' ? '#FFF3E0' : 'rgba(39, 174, 96, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }]}>
              <Text style={[s.statusText, { color: statusCfg.text === '#E65100' ? '#E65100' : '#27AE60' }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        {item.adminOverride != null && (
          <View style={s.overrideBanner}>
            <MaterialIcons name="admin-panel-settings" size={12} color="#7B1FA2" />
            <Text style={s.overrideBannerText}>
              Admin Override applied
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.outlineVariant }}>
          <TouchableOpacity style={{ flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} activeOpacity={0.7} onPress={() => handleOpenOverride(item)}>
            <MaterialIcons name="edit" size={16} color={Colors.outline} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.outline }}>Set Final Salary</Text>
          </TouchableOpacity>
          {(item.status === 'draft' || item.status === 'generated') && (
            <>
              <View style={{ width: 1, backgroundColor: Colors.outlineVariant }} />
              <TouchableOpacity style={{ flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(39, 174, 96, 0.05)' }} activeOpacity={0.7} onPress={() => handleApprovePayroll(item)}>
                <MaterialIcons name="check-circle" size={16} color="#27AE60" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#27AE60' }}>Approve</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [s, handleOpenOverride, handleApprovePayroll, selectedCategory, getLabel]);

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
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

      {/* ═══ Top Bar ═══ */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <Text style={[s.topBarTitle, { textTransform: 'uppercase', letterSpacing: 1 }]}>Payroll</Text>
          </View>
          <View style={s.topBarRight}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRyhUcTQWkIXJhYfiYHNsCWBHbHW-BmdKstBO-GTXBU8GREShei1cC7zxtCgfILG4L14WEnclS8-skHvaUwmfBQ24vnZwIANui91FPIfw-PStCPxGYhYTt873ArflucH4XT1zX_J3gx43ROSeEJ2bPa1gbSTw8c5bcrmEkC36obgQe0Z0Wrlq7ODX_WCNqg-PdCBxe4CZZO3KsClAQ_LGoGJO9p_2uEFwdrMeaMPyNxGYJvT2hzczjcUAt081W7V5pJAsvlwUnaF0' }} 
              style={{ width: 40, height: 40, resizeMode: 'contain' }} 
            />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.outline, letterSpacing: 1, marginHorizontal: Spacing.screenPadding, marginTop: 16, marginBottom: 8 }}>FINANCIAL PERIOD</Text>

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: Spacing.screenPadding }}>
          <View style={[s.searchBarWrapper, { flex: 1, marginHorizontal: 0 }, searchFocused && s.searchBarWrapperFocused]}>
            <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or ID..."
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
          <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.outlineVariant, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainerLowest }}>
            <MaterialIcons name="tune" size={24} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
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

            {/* Bulk Generate Action */}
            <TouchableOpacity 
              style={[s.overrideBtn, { marginBottom: 24, alignSelf: 'stretch', backgroundColor: '#C62828', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderTopWidth: 0 }]} 
              activeOpacity={0.8}
              onPress={handleGeneratePayroll}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="receipt-long" size={20} color="#fff" />
              )}
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                {generating ? 'Generating...' : `Generate Payroll ${MONTHS.find(m => m.key === selectedMonth)?.shortLabel}`}
              </Text>
            </TouchableOpacity>

            {/* Result Count */}
            <View style={s.listHeader}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.onSurface }}>Employees</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.outline }}>{filteredEntries.length} Total</Text>
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
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
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
                color={isActive ? '#C62828' : Colors.onSurfaceVariant}
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
              <Text style={[s.modalTitle, { textAlign: 'right', flex: 1 }]}>Set Final Salary</Text>
            </View>

            {overrideTarget && (
              <View style={s.modalBody}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={s.modalGuardName}>{overrideTarget.guardName}</Text>
                  <Text style={s.modalGuardMeta}>{overrideTarget.guardId} • {overrideTarget.site}</Text>
                </View>

                <View style={s.modalCalcRow}>
                  <Text style={s.modalCalcLabel}>Calculated Salary</Text>
                  <Text style={s.modalCalcValue}>{formatCurrency(overrideTarget.netSalary)}</Text>
                </View>
                <Text style={s.modalCalcBreakdown}>
                  Base {formatCurrency(overrideTarget.baseSalary)} + OT {formatCurrency(overrideTarget.overtime)} - Ded {formatCurrency(overrideTarget.deductions)}
                </Text>

                <View style={s.modalInputGroup}>
                  <Text style={s.modalInputLabel}>FINAL SALARY (₹)</Text>
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

      <SuccessModal
        visible={showSuccessModal}
        description={successMessage}
        onClose={() => { setShowSuccessModal(false); onSuccessClose(); }}
      />
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
    backgroundColor: Colors.surfaceContainerLowest,
    paddingBottom: 12,
    zIndex: 40,
  },
  monthScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  monthPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPillActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthPillInactive: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  monthPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthPillTextActive: {
    color: Colors.primary,
  },
  monthPillTextInactive: {
    color: Colors.onSurfaceVariant,
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
    backgroundColor: '#07132F',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryGradientBar: {
    height: 0,
  },
  summaryContent: {
    padding: 24,
  },
  summaryMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
    letterSpacing: -1,
  },
  summaryIconBg: {
    display: 'none',
  },
  summaryBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    display: 'none',
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  summaryFooter: {
    display: 'none',
  },
  summaryStatChip: {
    display: 'none',
  },
  summaryStatText: {
    display: 'none',
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
    marginBottom: 8,
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
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  guardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  guardInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(195,198,208,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardInitialsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#07132F',
  },
  guardTexts: {
    flex: 1,
  },
  guardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  guardIdText: {
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
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
    color: '#C62828',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  modalBody: {
    gap: 12,
  },
  modalGuardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  modalGuardMeta: {
    fontSize: 13,
    color: Colors.outline,
    marginTop: 4,
  },
  modalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  modalCalcLabel: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '600',
  },
  modalCalcValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  modalCalcBreakdown: {
    fontSize: 12,
    color: Colors.outline,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  modalInputGroup: {
    marginTop: 8,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.outline,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#FFFFFF',
  },
  modalCurrencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    padding: 0,
  },
  modalHint: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 8,
  },
  modalConfirmBtn: {
    flexDirection: 'row',
    backgroundColor: '#07132F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
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
