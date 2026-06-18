import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getAvailableReplacementPersonnel, assignReplacement } from '../api/replacementService';
import CategoryBadge from '../components/CategoryBadge';
import SuccessModal from '../components/SuccessModal';

export default function AssignReplacementScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const { replacementId, siteId, shiftDate } = route.params;

  const [loading, setLoading] = useState(true);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onSuccessClose, setOnSuccessClose] = useState<() => void>(() => () => {});

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAvailableReplacementPersonnel(siteId, shiftDate);
      setAvailableStaff(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load available replacement personnel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [siteId, shiftDate]);

  const handleAssign = async () => {
    if (!selectedStaffId) {
      Alert.alert('Selection Required', 'Please select a staff member to assign.');
      return;
    }

    const selected = availableStaff.find(p => p.id === selectedStaffId);
    if (!selected) return;

    Alert.alert(
      'Confirm Assignment',
      `Are you sure you want to assign ${selected.name} as the replacement for this shift?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setSubmitting(true);
              await assignReplacement(replacementId, selectedStaffId);
              
              setSuccessMessage('Replacement staff assigned successfully.');
              setOnSuccessClose(() => () => {
                if (route.params?.onRefresh) {
                  route.params.onRefresh();
                }
                navigation.goBack();
              });
              setShowSuccessModal(true);
            } catch (err: any) {
              Alert.alert('Assignment Failed', err.message || 'Could not complete assignment');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const filteredStaff = availableStaff.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStaffRow = ({ item }: { item: any }) => {
    const isSelected = selectedStaffId === item.id;
    return (
      <TouchableOpacity
        style={[s.staffCard, isSelected && s.staffCardSelected]}
        onPress={() => setSelectedStaffId(item.id)}
      >
        <View style={s.staffRow}>
          <View style={s.radioCircle}>
            {isSelected && <View style={s.radioCircleInner} />}
          </View>
          <View style={s.staffMeta}>
            <Text style={s.staffName}>{item.name}</Text>
            <Text style={s.staffId}>{item.employee_id}</Text>
            <View style={s.badgeRow}>
              <CategoryBadge categoryName={item.category?.name || 'Staff'} size="sm" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Select Replacement</Text>
        <View style={s.placeholder} />
      </View>

      <View style={s.infoBanner}>
        <MaterialIcons name="info" size={16} color={Colors.primary} style={s.bannerIcon} />
        <Text style={s.bannerText}>
          Showing active staff who are not currently assigned to this site and do not have replacement conflicts on {new Date(shiftDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}.
        </Text>
      </View>

      <View style={s.searchSection}>
        <View style={s.searchContainer}>
          <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or employee ID..."
            placeholderTextColor={Colors.outline}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item.id}
          renderItem={renderStaffRow}
          contentContainerStyle={[s.listContainer, { paddingBottom: Math.max(insets.bottom, 16) + 70 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <MaterialIcons name="person-search" size={48} color={Colors.surfaceDim} />
              <Text style={s.emptyText}>No available replacement staff</Text>
              <Text style={s.emptySubText}>All qualified personnel are currently occupied on this shift date.</Text>
            </View>
          }
        />
      )}

      {/* Confirm Button Overlay */}
      {!loading && availableStaff.length > 0 && (
        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[s.confirmBtn, !selectedStaffId && s.confirmBtnDisabled]}
            onPress={handleAssign}
            disabled={!selectedStaffId || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <Text style={s.confirmBtnText}>Assign Selection</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <SuccessModal
        visible={showSuccessModal}
        description={successMessage}
        onClose={() => { setShowSuccessModal(false); onSuccessClose(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.onBackground,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryFixed,
    padding: 12,
    marginHorizontal: Spacing.screenPadding,
    borderRadius: BorderRadius.xl,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bannerIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  bannerText: {
    ...Typography.labelSm,
    color: Colors.onPrimaryFixed,
    flex: 1,
    lineHeight: 16,
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
  },
  staffCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 16,
    marginBottom: 12,
  },
  staffCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed + '20',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  staffMeta: {
    flex: 1,
  },
  staffName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  staffId: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.outline,
  },
  confirmBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 20,
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginTop: 12,
  },
  emptySubText: {
    ...Typography.body,
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
  },
});
