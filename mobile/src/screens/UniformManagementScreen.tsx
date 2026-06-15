import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Switch,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import * as uniformService from '../api/uniformService';
import * as guardService from '../api/guardService';

interface UniformRecord {
  id: string;
  guardId: string;
  guardName: string;
  item: string;
  cost: number;
  paidAmount: number;
  issuedDate: string;
  status: 'pending' | 'partial' | 'paid' | 'deducted';
  remarks?: string;
}

const ITEM_COSTS: Record<string, number> = {
  'Uniform Set': 2500,
};

/** Maps backend UniformItem to screen's UniformRecord */
function mapToRecord(u: uniformService.UniformItem): UniformRecord {
  const itemLabel = u.item_name === 'uniform_set' ? 'Uniform Set'
    : u.item_name.charAt(0).toUpperCase() + u.item_name.slice(1).replace(/_/g, ' ');
  const dateStr = u.issued_date
    ? new Date(u.issued_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  return {
    id: u.id,
    guardId: u.guard_id,
    guardName: (u as any).guards?.users?.name || (u as any).guards?.name || 'Unknown',
    item: itemLabel,
    cost: u.item_cost,
    paidAmount: u.amount_paid,
    issuedDate: dateStr,
    status: u.payment_status,
    remarks: u.remarks,
  };
}

type FilterType = 'all' | 'pending' | 'partial' | 'paid' | 'deducted';

export default function UniformManagementScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { getLabel } = usePersonnelCategory();
  const [records, setRecords] = useState<UniformRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  // Guard options for issue modal (fetched from backend)
  const [guardOptions, setGuardOptions] = useState<{ id: string; name: string }[]>([]);
  
  // Interaction modals
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UniformRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isFullPayment, setIsFullPayment] = useState(false);

  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [selectedItem, setSelectedItem] = useState('Uniform Set');
  const [costInput, setCostInput] = useState(String(ITEM_COSTS['Uniform Set']));
  const [remarksInput, setRemarksInput] = useState('');

  const [isGuardDropdownVisible, setIsGuardDropdownVisible] = useState(false);

  // Fetch data from backend
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const [uniformsData, guardsData] = await Promise.all([
        uniformService.getUniformIssues(),
        guardService.getGuards({ status: 'active' }),
      ]);
      setRecords(uniformsData.map(mapToRecord));
      const opts = guardsData.map((g) => ({
        id: g.id,
        name: g.users?.name || g.name || 'Unknown',
      }));
      setGuardOptions(opts);
      if (opts.length > 0 && !selectedGuard.id) {
        setSelectedGuard(opts[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch uniform data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const navItems = [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'guards', icon: 'security' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'guards') {
      navigation.navigate('GuardList');
    } else if (key === 'sites') {
      navigation.navigate('SiteList');
    } else if (key === 'more') {
      navigation.navigate('MoreMenu');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Dynamic calculations
  const stats = useMemo(() => {
    let totalUnits = records.length;
    let pending = 0;
    let collected = 0;

    records.forEach((rec) => {
      collected += rec.paidAmount;
      if (rec.status !== 'paid' && rec.status !== 'deducted') {
        pending += (rec.cost - rec.paidAmount);
      }
    });

    return {
      totalUnits,
      pendingAmount: pending,
      collectedAmount: collected,
    };
  }, [records]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (activeFilter === 'all') return records;
    return records.filter((rec) => rec.status === activeFilter);
  }, [records, activeFilter]);

  // Group records by guard
  const groupedRecords = useMemo(() => {
    const groups: Record<string, { guardName: string; guardId: string; data: UniformRecord[] }> = {};
    filteredRecords.forEach((rec) => {
      const key = `${rec.guardName}_${rec.guardId}`;
      if (!groups[key]) {
        groups[key] = {
          guardName: rec.guardName,
          guardId: rec.guardId,
          data: [],
        };
      }
      groups[key].data.push(rec);
    });
    return Object.values(groups);
  }, [filteredRecords]);

  // Record Payment
  const openPaymentModal = (record: UniformRecord) => {
    setSelectedRecord(record);
    const remaining = record.cost - record.paidAmount;
    setPaymentAmount(String(remaining));
    setIsFullPayment(true);
    setPaymentModalVisible(true);
  };

  const handleFullPaymentToggle = (val: boolean) => {
    setIsFullPayment(val);
    if (val && selectedRecord) {
      setPaymentAmount(String(selectedRecord.cost - selectedRecord.paidAmount));
    }
  };

  const handleSavePayment = async () => {
    if (!selectedRecord) return;
    const inputAmt = parseFloat(paymentAmount);
    
    if (isNaN(inputAmt) || inputAmt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    const remaining = selectedRecord.cost - selectedRecord.paidAmount;
    if (inputAmt > remaining) {
      Alert.alert('Overpayment Warning', `Maximum payable amount is ₹${remaining}.`);
      return;
    }

    const newPaidAmount = selectedRecord.paidAmount + inputAmt;
    let newStatus: UniformRecord['status'] = 'partial';
    if (newPaidAmount === selectedRecord.cost) {
      newStatus = 'paid';
    }

    try {
      await uniformService.updateUniformPayment(selectedRecord.id, {
        payment_status: newStatus,
        amount_paid: newPaidAmount,
      });
      setRecords((prev) =>
        prev.map((rec) =>
          rec.id === selectedRecord.id
            ? { ...rec, paidAmount: newPaidAmount, status: newStatus }
            : rec
        )
      );
      setPaymentModalVisible(false);
      setSelectedRecord(null);
      Alert.alert('Payment Recorded', `Recorded payment of ₹${inputAmt.toLocaleString('en-IN')} successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record payment');
    }
  };

  // Issue Uniform

  const handleIssueItemSubmit = async () => {
    const cost = parseFloat(costInput);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid Cost', 'Please enter a valid cost.');
      return;
    }

    if (!selectedGuard.id) {
      Alert.alert('Select Guard', 'Please select a guard to issue the uniform to.');
      return;
    }

    try {
      const issued = await uniformService.issueUniform({
        guard_id: selectedGuard.id,
        item_name: 'uniform_set',
        item_cost: cost,
        remarks: remarksInput || undefined,
      });

      const newRecord = mapToRecord({
        ...issued,
        guards: { name: selectedGuard.name, phone: '' } as any,
      });
      setRecords((prev) => [newRecord, ...prev]);
      setIssueModalVisible(false);
      setRemarksInput('');
      Alert.alert('Uniform Issued', `${selectedItem} has been successfully issued to ${selectedGuard.name}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to issue uniform');
    }
  };

  const getStatusBadgeConfig = (status: UniformRecord['status']) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', bg: '#FEF3C7', text: '#92400E' };
      case 'partial':
        return { label: 'Partial', bg: '#DBEAFE', text: '#1E40AF' };
      case 'paid':
        return { label: 'Paid', bg: '#D1FAE5', text: '#065F46' };
      case 'deducted':
        return { label: 'Deducted', bg: '#E2E8F0', text: '#475569' };
    }
  };

  const getItemIconName = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes('uniform') || lower.includes('jacket') || lower.includes('shirt')) {
      return 'apparel';
    }
    if (lower.includes('shoe') || lower.includes('boot')) {
      return 'ice-skating'; // closest footwear representation in standard package
    }
    if (lower.includes('id card') || lower.includes('badge')) {
      return 'badge';
    }
    if (lower.includes('torch') || lower.includes('flashlight')) {
      return 'flashlight-on';
    }
    if (lower.includes('belt')) {
      return 'remove';
    }
    return 'shield';
  };

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
            <Text style={s.topBarTitle} numberOfLines={1}>
              Uniforms
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn}>
              <MaterialIcons name="search" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={s.avatarSmall}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZGQQYMOnhjw24-o4h0v6-33nocj0vn9NBS8e_LqLsJevDxIyw2-JqOatBHqi1oKh8zaxYVVMvHZpZDZdPuS-MAMzfd86DwqUfDJpNENkrAbAhyj3VM4OS_cmReEGe9xMNzxEuQzxlaMKzhETyxlnEpqJLImco0PzhT-Q6fsLK9Lw9OqrClNaTNtjwlelBodKKT9sSE5Uk4zBzsTKNxcNNbuUJi2owu3geCbECqXzmewq7y2oT-AAXUQxf2OQmYRVJCVOJTBc6gZI' }}
                style={s.avatarSmallImage}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Summary Stats Section ─── */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <View style={s.statHeader}>
              <MaterialIcons name="inventory-2" size={16} color={Colors.primary} />
              <Text style={s.statLabel}>Total Issued</Text>
            </View>
            <Text style={s.statValue}>
              {stats.totalUnits} <Text style={s.statUnit}>Units</Text>
            </Text>
          </View>

          <View style={s.statCard}>
            <View style={s.statHeader}>
              <MaterialIcons name="payments" size={16} color={Colors.secondary} />
              <Text style={s.statLabel}>Pending Amount</Text>
            </View>
            <Text style={[s.statValue, { color: Colors.secondary }]}>
              ₹{stats.pendingAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={s.statCard}>
            <View style={s.statHeader}>
              <MaterialIcons name="check-circle" size={16} color="#065F46" />
              <Text style={s.statLabel}>Collected</Text>
            </View>
            <Text style={[s.statValue, { color: '#065F46' }]}>
              ₹{stats.collectedAmount.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ─── Filter Chips ─── */}
        <View style={s.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtersScroll}
          >
            {(['all', 'pending', 'partial', 'paid', 'deducted'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.7}
                  onPress={() => setActiveFilter(filter)}
                  style={[s.filterChip, isActive && s.filterChipActive]}
                >
                  <Text style={[s.filterText, isActive && s.filterTextActive]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Records Grouped List ─── */}
        <View style={s.recordsList}>
          {groupedRecords.length > 0 ? (
            groupedRecords.map((group) => (
              <View key={`${group.guardName}_${group.guardId}`} style={s.groupContainer}>
                <Text style={s.groupHeader}>
                  Guard: {group.guardName} (ID: {group.guardId})
                </Text>
                <View style={s.groupCards}>
                  {group.data.map((record) => {
                    const badge = getStatusBadgeConfig(record.status);
                    const remaining = record.cost - record.paidAmount;
                    const canPay = record.status === 'pending' || record.status === 'partial';

                    return (
                      <View key={record.id} style={s.recordCard}>
                        <View style={s.cardInfo}>
                          <View style={s.iconCircle}>
                            <MaterialIcons
                              name={getItemIconName(record.item) as any}
                              size={28}
                              color={Colors.primary}
                            />
                          </View>
                          <View style={s.cardDetails}>
                            <Text style={s.itemName}>{record.item}</Text>
                            <Text style={s.itemMeta}>
                              Issued: {record.issuedDate}
                            </Text>
                            {record.paidAmount > 0 && record.paidAmount < record.cost && (
                              <Text style={s.itemMeta}>
                                Paid: ₹{record.paidAmount} / ₹{record.cost}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={s.cardActions}>
                          <View style={s.priceCol}>
                            <Text style={s.itemCost}>
                              ₹{record.cost.toLocaleString('en-IN')}
                            </Text>
                            <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[s.statusText, { color: badge.text }]}>
                                {badge.label}
                              </Text>
                            </View>
                          </View>
                          {canPay ? (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={s.actionBtn}
                              onPress={() => openPaymentModal(record)}
                            >
                              <Text style={s.actionBtnText}>Record Payment</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              style={s.actionBtnOutline}
                              onPress={() =>
                                Alert.alert('Receipt', `Receipt details for ${record.item}. Dues paid in full.`)
                              }
                            >
                              <Text style={s.actionBtnOutlineText}>View Receipt</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={s.emptyState}>
              <MaterialIcons name="inventory" size={48} color={Colors.outlineVariant} />
              <Text style={s.emptyTitle}>No uniform items found</Text>
              <Text style={s.emptySubtitle}>Try changing your filter settings</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ═══ Issue Uniform FAB ═══ */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={s.fab}
        onPress={() => setIssueModalVisible(true)}
      >
        <MaterialIcons name="add" size={24} color="#FFFFFF" />
        <Text style={s.fabText}>Issue Uniform</Text>
      </TouchableOpacity>

      {/* ═══ Record Payment Modal ═══ */}
      <Modal
        visible={paymentModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.modalContainer}
          >
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            {selectedRecord && (
              <View style={s.modalBody}>
                <Text style={s.modalSub}>
                  Recording payment for <Text style={s.bold}>{selectedRecord.item}</Text> issued to {selectedRecord.guardName}.
                </Text>
                
                <View style={s.modalSummary}>
                  <Text style={s.summaryLabel}>Total Cost: ₹{selectedRecord.cost}</Text>
                  <Text style={s.summaryLabel}>Dues: ₹{selectedRecord.cost - selectedRecord.paidAmount}</Text>
                </View>

                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>Amount Paid (₹)</Text>
                  <View style={s.inputContainer}>
                    <TextInput
                      style={s.textInput}
                      keyboardType="numeric"
                      value={paymentAmount}
                      onChangeText={(val) => {
                        setPaymentAmount(val);
                        setIsFullPayment(parseFloat(val) === (selectedRecord.cost - selectedRecord.paidAmount));
                      }}
                      editable={!isFullPayment}
                    />
                  </View>
                </View>

                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Full Payment</Text>
                  <Switch
                    value={isFullPayment}
                    onValueChange={handleFullPaymentToggle}
                    trackColor={{ false: '#CBD5E1', true: Colors.primaryFixedDim }}
                    thumbColor={isFullPayment ? Colors.primary : '#F4F4F5'}
                  />
                </View>

                <View style={s.modalActions}>
                  <TouchableOpacity
                    style={s.modalCancelBtn}
                    onPress={() => setPaymentModalVisible(false)}
                  >
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.modalSaveBtn} onPress={handleSavePayment}>
                    <Text style={s.modalSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ═══ Issue Uniform Modal ═══ */}
      <Modal
        visible={issueModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIssueModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={s.issueModalContainer}
          >
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Issue Uniform Item</Text>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              {/* Select Guard */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Select Guard</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={s.modalDropdown}
                  onPress={() => setIsGuardDropdownVisible(true)}
                >
                  <Text style={s.modalDropdownText}>
                    {selectedGuard.name} ({selectedGuard.id})
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color={Colors.outline} />
                </TouchableOpacity>
              </View>

              {/* Select Item (Read-only as only Uniform Set is supported) */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Item</Text>
                <View style={[s.modalDropdown, { backgroundColor: Colors.surfaceContainerLow, borderColor: Colors.outlineVariant }]}>
                  <Text style={[s.modalDropdownText, { color: Colors.onSurfaceVariant }]}>Uniform Set</Text>
                </View>
              </View>

              {/* Cost input */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Cost (₹)</Text>
                <View style={s.inputContainer}>
                  <TextInput
                    style={s.textInput}
                    keyboardType="numeric"
                    value={costInput}
                    onChangeText={setCostInput}
                  />
                </View>
              </View>

              {/* Remarks */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Remarks</Text>
                <View style={[s.inputContainer, s.remarksContainer]}>
                  <TextInput
                    style={[s.textInput, s.remarksInput]}
                    placeholder="Size, condition, etc."
                    placeholderTextColor={Colors.outline}
                    value={remarksInput}
                    onChangeText={setRemarksInput}
                  />
                </View>
              </View>

              <View style={[s.modalActions, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={s.modalCancelBtn}
                  onPress={() => setIssueModalVisible(false)}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalSaveBtn} onPress={handleIssueItemSubmit}>
                  <Text style={s.modalSaveText}>Issue Item</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Inner Dropdown Guard Modal */}
            <Modal
              visible={isGuardDropdownVisible}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsGuardDropdownVisible(false)}
            >
              <TouchableOpacity
                style={s.innerDropdownBackdrop}
                activeOpacity={1}
                onPress={() => setIsGuardDropdownVisible(false)}
              >
                <View style={s.innerDropdownContent}>
                  <FlatList
                    data={guardOptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={s.innerOptionItem}
                        onPress={() => {
                          setSelectedGuard(item);
                          setIsGuardDropdownVisible(false);
                        }}
                      >
                        <Text style={s.innerOptionText}>{item.name} ({item.id})</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

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
                name={item.icon as any}
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
    gap: 8,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
    letterSpacing: 1.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatarSmallImage: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
  },
  filtersWrapper: {
    marginBottom: 16,
  },
  filtersScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  recordsList: {
    gap: 16,
  },
  groupContainer: {
    gap: 10,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingBottom: 4,
    marginTop: 6,
  },
  groupCards: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    gap: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: Colors.surfaceContainer,
    paddingTop: 12,
  },
  priceCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 2,
  },
  itemCost: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.outline,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.outline,
  },
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 16,
    backgroundColor: Colors.secondary, // theme red: #b02d21
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 70,
  },
  fabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  issueModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
  },
  modalSummary: {
    backgroundColor: Colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  remarksContainer: {
    height: 72,
    paddingVertical: 8,
  },
  textInput: {
    fontSize: 14,
    color: Colors.onSurface,
    width: '100%',
    height: '100%',
    padding: 0,
  },
  remarksInput: {
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  modalDropdownText: {
    fontSize: 14,
    color: Colors.onSurface,
  },
  innerDropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerDropdownContent: {
    width: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: '40%',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  innerOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: '#eeedf2',
  },
  innerOptionText: {
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '500',
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
});
