import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getCategories, updateCategory, deleteCategory } from '../api/workforceCategoryService';
import CategoryBadge from '../components/CategoryBadge';
import type { WorkforceCategory } from '../types/workforce';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkforceCategoryListScreenProps {
  navigation: any;
}

// ─── Major Group Definitions ────────────────────────
interface MajorGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  matchFn: (catName: string) => boolean;
}

const MAJOR_GROUPS: MajorGroup[] = [
  {
    id: 'guards',
    name: 'Guards',
    icon: 'verified-user',
    color: '#002752', // primary
    bgColor: '#ffffff',
    description: 'Security guard personnel',
    matchFn: (n) => ['Guard', 'Supervisor', 'Security Officer'].includes(n),
  },
  {
    id: 'gunmen',
    name: 'Gunmen',
    icon: 'verified',
    color: '#B91C1C', // accent-gunmen
    bgColor: '#ffffff',
    description: 'Armed security personnel',
    matchFn: (n) => ['Gunman', 'Rifleman', 'PSO'].includes(n),
  },
  {
    id: 'bouncers',
    name: 'Bouncers',
    icon: 'groups',
    color: '#581C87', // accent-bouncers
    bgColor: '#ffffff',
    description: 'Event & venue security',
    matchFn: (n) => n === 'Bouncer',
  },
  {
    id: 'helpers',
    name: 'Helpers',
    icon: 'home',
    color: '#C2410C', // accent-helpers
    bgColor: '#ffffff',
    description: 'Facility maintenance & support',
    matchFn: (n) => !['Guard', 'Supervisor', 'Security Officer', 'Gunman', 'Rifleman', 'PSO', 'Bouncer'].includes(n),
  },
];

// ─── Subcategory Card Component ─────────────────────
function SubcategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleAttendance,
  isUpdating,
}: {
  key?: React.Key;
  category: WorkforceCategory;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAttendance: (val: boolean) => void;
  isUpdating: boolean;
}) {
  const s = useScaledStyles(styles);

  return (
    <View style={s.subCard}>
      <View style={s.subCardHeader}>
        <View style={s.subCardNameRow}>
          <CategoryBadge categoryName={category.name} size="sm" />
          <Text style={s.prefixText}>({category.prefix_code})</Text>
          {category.is_system_defined && (
            <View style={s.systemBadge}>
              <Text style={s.systemBadgeText}>SYSTEM</Text>
            </View>
          )}
        </View>

        {/* Edit / Delete Actions */}
        <View style={s.subCardActions}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={18} color={Colors.primary} />
          </TouchableOpacity>
          {!category.is_system_defined && (
            <TouchableOpacity
              style={[s.actionBtn, s.deleteBtn]}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Attendance Toggle */}
      <View style={s.subCardBody}>
        <View style={s.infoColumn}>
          <Text style={s.label}>Attendance Enforcement</Text>
          <Text style={s.value}>
            {category.attendance_required ? 'Required (Geofence)' : 'Optional (Manual)'}
          </Text>
        </View>
        <View style={s.toggleContainer}>
          {isUpdating ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={category.attendance_required}
              onValueChange={onToggleAttendance}
              trackColor={{ false: Colors.surfaceDim, true: Colors.primaryFixedDim }}
              thumbColor={category.attendance_required ? Colors.primary : Colors.outline}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Major Group Card Component ─────────────────────
function MajorGroupCard({
  group,
  subcategories,
  isExpanded,
  onToggleExpand,
  onEditCategory,
  onDeleteCategory,
  onToggleAttendance,
  updatingId,
}: {
  group: MajorGroup;
  subcategories: WorkforceCategory[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditCategory: (cat: WorkforceCategory) => void;
  onDeleteCategory: (cat: WorkforceCategory) => void;
  onToggleAttendance: (cat: WorkforceCategory, val: boolean) => void;
  updatingId: string | null;
}) {
  const s = useScaledStyles(styles);
  const spinAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(spinAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const chevronRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={[s.groupCard, { borderLeftColor: group.color }]}>
      {/* Major Group Header */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggleExpand}
        style={s.groupHeader}
      >
        <View style={s.groupIconWrapper}>
          <MaterialIcons name={group.icon as any} size={24} color={group.color} />
        </View>

        <View style={s.groupInfo}>
          <Text style={[s.groupName, { color: group.id === 'guards' ? '#002752' : '#0f172a' }]}>{group.name}</Text>
          <Text style={s.groupDescription}>{group.description}</Text>
          <View style={s.subCountBadge}>
            <Text style={[s.subCountBadgeText, { color: group.color }]}>
              {subcategories.length} subcategor{subcategories.length !== 1 ? 'ies' : 'y'}
            </Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded Subcategories */}
      {isExpanded && (
        <View style={s.subList}>
          {subcategories.length === 0 ? (
            <View style={s.emptySubState}>
              <MaterialIcons name="info-outline" size={20} color={Colors.outline} />
              <Text style={s.emptySubText}>No subcategories in this group</Text>
            </View>
          ) : (
            subcategories.map((cat) => (
              <SubcategoryCard
                key={cat.id}
                category={cat}
                onEdit={() => onEditCategory(cat)}
                onDelete={() => onDeleteCategory(cat)}
                onToggleAttendance={(val) => onToggleAttendance(cat, val)}
                isUpdating={updatingId === cat.id}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────
export default function WorkforceCategoryListScreen({ navigation }: WorkforceCategoryListScreenProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [categories, setCategories] = useState<WorkforceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const fetchCategories = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve categories');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories(true);
  };

  // Group categories into the 4 major groups
  const groupedCategories = useMemo(() => {
    return MAJOR_GROUPS.map((group) => ({
      group,
      subcategories: categories.filter((cat) => group.matchFn(cat.name)).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [categories]);

  const handleToggleExpand = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleToggleAttendance = async (category: WorkforceCategory, newValue: boolean) => {
    try {
      setUpdatingId(category.id);
      const updated = await updateCategory(category.id, { attendance_required: newValue });
      setCategories((prev) =>
        prev.map((cat) => (cat.id === category.id ? updated : cat))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update category');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditCategory = (category: WorkforceCategory) => {
    navigation.navigate('AddWorkforceCategory', {
      editMode: true,
      categoryId: category.id,
      categoryName: category.name,
      prefixCode: category.prefix_code,
      attendanceRequired: category.attendance_required,
      isSystemDefined: category.is_system_defined,
      parentGroupId: MAJOR_GROUPS.find(g => g.matchFn(category.name))?.id || 'helpers',
    });
  };

  const handleDeleteCategory = (category: WorkforceCategory) => {
    if (category.is_system_defined) {
      Alert.alert('Cannot Delete', 'System-defined categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?\n\nThis will fail if any personnel are assigned to this category.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
              Alert.alert('Deleted', `"${category.name}" has been removed.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const totalCategories = categories.length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={s.headerInner}>
          <View style={s.headerCenter}>
            <View style={s.logoBox}>
              <MaterialIcons name="shield" size={20} color="#ffffff" />
            </View>
            <Text style={s.headerTitle}>Workforce</Text>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.absoluteBtnLeft}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="chevron-left" size={28} color="#000" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('AddWorkforceCategory')}
            style={s.absoluteBtnRight}
            accessibilityLabel="Add custom category"
          >
            <MaterialIcons name="add" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groupedCategories}
        keyExtractor={(item) => item.group.id}
        ListHeaderComponent={
          !loading ? (
            <View style={s.summaryCardContainer}>
              <View style={s.summaryCard}>
                <View style={s.summaryCol1}>
                  <Text style={s.summaryLabel}>Total Categories</Text>
                  <Text style={s.summaryValue}>{MAJOR_GROUPS.length}</Text>
                </View>
                <View style={s.summaryCol2}>
                  <Text style={s.summaryLabel}>Total Subcategories</Text>
                  <Text style={s.summaryValue}>{totalCategories}</Text>
                </View>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <MajorGroupCard
            group={item.group}
            subcategories={item.subcategories}
            isExpanded={expandedGroupId === item.group.id}
            onToggleExpand={() => handleToggleExpand(item.group.id)}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onToggleAttendance={handleToggleAttendance}
            updatingId={updatingId}
          />
        )}
        contentContainerStyle={[
          s.list,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#002752']}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#002752" />
              <Text style={s.loadingText}>Loading categories...</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  
  // ── Header ──
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // slate-200
  },
  headerInner: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#002752',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#002752',
    textTransform: 'uppercase',
  },
  absoluteBtnLeft: {
    position: 'absolute',
    left: 16,
    height: '100%',
    justifyContent: 'center',
    padding: 8, // increase hit area
  },
  absoluteBtnRight: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    padding: 8, // increase hit area
  },

  // ── Summary Card ──
  summaryCardContainer: {
    paddingBottom: 24,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#002752',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#1e3a8a', // blue-900 shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryCol1: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryCol2: {
    flex: 1,
    paddingLeft: 16,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },

  // ── Center / Loading / Empty ──
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },

  // ── List ──
  list: {
    padding: 16,
  },

  // ── Major Group Card ──
  groupCard: {
    backgroundColor: '#f4f3f7', // surface-container
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    marginBottom: 16,
    borderLeftWidth: 4,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
  },
  groupDescription: {
    fontSize: 12,
    color: '#64748b', // slate-500
    fontWeight: '500',
    marginTop: 2,
  },
  subCountBadge: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  subCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // ── Expanded Subcategory List ──
  subList: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0', // slate-200
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#faf9fd',
  },
  emptySubState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.outline,
    fontWeight: '500',
  },

  // ── Subcategory Card ──
  subCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  prefixText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.outline,
    marginLeft: 8,
  },
  systemBadge: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: BorderRadius.default,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  systemBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
  },
  subCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  subCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    paddingTop: 10,
  },
  infoColumn: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginBottom: 3,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  toggleContainer: {
    marginLeft: 16,
    height: 40,
    justifyContent: 'center',
  },
});
