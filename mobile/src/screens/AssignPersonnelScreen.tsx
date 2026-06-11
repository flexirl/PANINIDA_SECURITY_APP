import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getPersonnel } from '../api/workforcePersonnelService';
import { assignPersonnelToSite } from '../api/siteAssignmentService';
import { supabase } from '../api/supabase';
import CategoryBadge from '../components/CategoryBadge';
import type { WorkforcePersonnel, ShiftType } from '../types/workforce';

interface AssignPersonnelScreenProps {
  route: any;
  navigation: any;
}

export default function AssignPersonnelScreen({ route, navigation }: AssignPersonnelScreenProps) {
  const { siteId } = route.params || {};
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [siteName, setSiteName] = useState('');
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedPersonnel, setSelectedPersonnel] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Fetch site name
        if (siteId) {
          const { data: site } = await supabase
            .from('sites')
            .select('site_name')
            .eq('id', siteId)
            .single();
          if (site) setSiteName(site.site_name);
        }

        // Fetch all active personnel
        const rawPersonnel = await getPersonnel({ status: 'active' });

        // Fetch active assignments to see where they are deployed
        const { data: activeAssignments } = await supabase
          .from('site_assignments')
          .select(`
            personnel_id,
            site:sites(site_name)
          `)
          .eq('is_active', true);

        const assignmentMap = new Map<string, string>();
        activeAssignments?.forEach((a: any) => {
          if (a.site?.site_name) {
            assignmentMap.set(a.personnel_id, a.site.site_name);
          }
        });

        const formatted = rawPersonnel.map(p => ({
          ...p,
          currentSite: assignmentMap.get(p.id) || 'Unassigned'
        }));

        setPersonnelList(formatted);
      } catch (err: any) {
        Alert.alert('Error', 'Failed to retrieve deployment details: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [siteId]);

  const handleAssign = () => {
    if (!selectedPersonnel) {
      return Alert.alert('Error', 'Please select a workforce employee.');
    }

    const confirmMsg =
      selectedPersonnel.currentSite !== 'Unassigned'
        ? `Warning: ${selectedPersonnel.name} is currently assigned to "${selectedPersonnel.currentSite}". Deploying them to "${siteName}" will automatically deactivate their current assignment. Do you wish to proceed?`
        : `Confirm deployment of ${selectedPersonnel.name} to "${siteName}" on ${shiftType.toUpperCase()} shift starting ${startDate}?`;

    Alert.alert('Confirm Assignment', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Proceed',
        style: 'default',
        onPress: async () => {
          try {
            setSubmitting(true);
            await assignPersonnelToSite({
              site_id: siteId,
              personnel_id: selectedPersonnel.id,
              shift_type: shiftType,
              start_date: startDate
            });

            Alert.alert('Success', `${selectedPersonnel.name} has been successfully deployed.`, [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to complete deployment.');
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  const filteredPersonnel = personnelList.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          accessibilityLabel="Cancel assignment"
        >
          <MaterialIcons name="close" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Deploy Personnel</Text>
        <View style={s.placeholder} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            <Text style={s.cardSubtitle}>Target Location</Text>
            <Text style={s.siteName}>{siteName || 'Select a site'}</Text>

            <View style={s.divider} />

            {/* Search Dropdown Picker */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Select Employee *</Text>
              
              {selectedPersonnel ? (
                <View style={s.selectedPersonnelCard}>
                  <View style={s.selectedInfo}>
                    <Text style={s.selectedName}>{selectedPersonnel.name}</Text>
                    <Text style={s.selectedId}>
                      {selectedPersonnel.employee_id} • Current: {selectedPersonnel.currentSite}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedPersonnel(null)}
                    style={s.clearBtn}
                  >
                    <MaterialIcons name="close" size={20} color={Colors.outline} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={s.searchContainer}>
                    <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
                    <TextInput
                      style={s.searchInput}
                      value={searchQuery}
                      onChangeText={(val) => {
                        setSearchQuery(val);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder="Search by name or employee ID..."
                      placeholderTextColor={Colors.outline}
                    />
                  </View>

                  {dropdownOpen && searchQuery.length > 0 && (
                    <View style={s.dropdown}>
                      <FlatList
                        data={filteredPersonnel.slice(0, 5)}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={s.dropdownItem}
                            onPress={() => {
                              setSelectedPersonnel(item);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                          >
                            <View>
                              <Text style={s.dropName}>{item.name} ({item.employee_id})</Text>
                              <Text style={s.dropSub}>Current Assignment: {item.currentSite}</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                          <Text style={s.emptyDrop}>No matches found</Text>
                        }
                      />
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Shift Picker */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Deployment Shift *</Text>
              <View style={s.shiftRow}>
                {(['day', 'night', 'rotational'] as ShiftType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[s.shiftBtn, shiftType === type && s.shiftBtnActive]}
                    onPress={() => setShiftType(type)}
                  >
                    <Text style={[s.shiftBtnText, shiftType === type && s.shiftBtnTextActive]}>
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Input */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Effective Start Date *</Text>
              <TextInput
                style={s.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.outline}
              />
            </View>
          </View>

          {/* Confirm Deployment */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && s.disabledBtn]}
            onPress={handleAssign}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons name="done" size={20} color={Colors.onPrimary} />
                <Text style={s.submitText}>Deploy & Active Assignment</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.screenPadding,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  cardSubtitle: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginBottom: 4,
  },
  siteName: {
    ...Typography.h1,
    fontSize: 22,
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 16,
    height: 48,
    color: Colors.onSurface,
    ...Typography.body,
  },
  selectedPersonnelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.primaryFixedDim,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  selectedId: {
    ...Typography.labelSm,
    color: Colors.onPrimaryFixedVariant || Colors.outline,
    marginTop: 2,
  },
  clearBtn: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  dropdown: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  dropName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  dropSub: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  emptyDrop: {
    ...Typography.body,
    color: Colors.outline,
    padding: 16,
    textAlign: 'center',
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shiftBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  shiftBtnText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  shiftBtnTextActive: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: Spacing.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitText: {
    ...Typography.button,
    color: Colors.onPrimary,
    marginLeft: 8,
  },
});
