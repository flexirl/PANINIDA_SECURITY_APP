import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';
import * as roleAssignmentService from '../api/roleAssignmentService';
import type { RoleAssignment } from '../api/roleAssignmentService';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface RoleManagementScreenProps {
  navigation: any;
}

// Color palette for role cards
const ROLE_COLORS: Record<string, { bg: string; accent: string; iconBg: string; light: string }> = {
  manager: {
    bg: '#EEF2FF',
    accent: '#4F46E5',
    iconBg: '#4F46E5',
    light: '#C7D2FE',
  },
  operations_manager: {
    bg: '#ECFDF5',
    accent: '#059669',
    iconBg: '#059669',
    light: '#A7F3D0',
  },
  supervisor: {
    bg: '#FFF7ED',
    accent: '#EA580C',
    iconBg: '#EA580C',
    light: '#FED7AA',
  },
  client_user: {
    bg: '#FDF2F8',
    accent: '#DB2777',
    iconBg: '#DB2777',
    light: '#FBCFE8',
  },
  inspector: {
    bg: '#F0F9FF',
    accent: '#0284C7',
    iconBg: '#0284C7',
    light: '#BAE6FD',
  },
};

export default function RoleManagementScreen({ navigation }: RoleManagementScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardsSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(cardsSlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Load assignments
  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roleAssignmentService.getRoleAssignments();
      setAssignments(data);
    } catch (err: any) {
      console.error('Failed to load role assignments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [])
  );

  // Get assignments for a specific role
  const getAssignmentsForRole = (role: string) => {
    return assignments.filter((a) => a.assigned_role === role);
  };

  // Toggle expand/collapse
  const toggleExpand = (role: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedRole(expandedRole === role ? null : role);
  };

  // Open add modal for a specific role
  const openAddModal = (role: string) => {
    setSelectedRole(role);
    setPhoneInput('');
    setLabelInput('');
    setIsModalVisible(true);
  };

  // Handle add assignment
  const handleAddAssignment = async () => {
    if (phoneInput.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if the phone is already assigned to another role
      const existingRole = await roleAssignmentService.checkExistingUserRole(phoneInput);
      if (existingRole && existingRole !== selectedRole) {
        const roleDef = roleAssignmentService.ASSIGNABLE_ROLES.find(
          (r) => r.role === existingRole
        );
        const displayName = roleDef?.displayName || existingRole;

        Alert.alert(
          'Role Change',
          `This phone number is currently assigned as "${displayName}". Do you want to change it to the new role?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
            {
              text: 'Change Role',
              style: 'destructive',
              onPress: async () => {
                try {
                  await roleAssignmentService.addRoleAssignment(
                    phoneInput,
                    selectedRole,
                    labelInput || undefined,
                    user?.id
                  );
                  setIsModalVisible(false);
                  await loadAssignments();
                  Alert.alert('Success', 'Role assigned successfully!');
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'Failed to assign role');
                } finally {
                  setIsSubmitting(false);
                }
              },
            },
          ]
        );
        return;
      }

      await roleAssignmentService.addRoleAssignment(
        phoneInput,
        selectedRole,
        labelInput || undefined,
        user?.id
      );
      setIsModalVisible(false);
      await loadAssignments();
      Alert.alert('Success', 'Role assigned successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle remove assignment
  const handleRemoveAssignment = (assignment: RoleAssignment) => {
    const displayPhone = `+91 ${assignment.phone.slice(0, 5)} ${assignment.phone.slice(5)}`;
    Alert.alert(
      'Remove Assignment',
      `Remove ${assignment.label || displayPhone} from this role? They will lose access to this module.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(assignment.id);
            try {
              await roleAssignmentService.removeRoleAssignment(assignment.id);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              await loadAssignments();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove assignment');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhoneInput(cleaned);
    }
  };

  const selectedRoleDef = roleAssignmentService.ASSIGNABLE_ROLES.find(
    (r) => r.role === selectedRole
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle} numberOfLines={1}>
            Role & Access Management
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      {loading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Loading role assignments...</Text>
        </View>
      ) : (
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Info Banner ─── */}
          <Animated.View
            style={[
              s.infoBanner,
              { opacity: headerFade, transform: [{ translateY: cardsSlide }] },
            ]}
          >
            <View style={s.infoBannerIcon}>
              <MaterialIcons name="shield" size={22} color={Colors.primary} />
            </View>
            <View style={s.infoBannerTextWrap}>
              <Text style={s.infoBannerTitle}>Manage Access by Phone Number</Text>
              <Text style={s.infoBannerDesc}>
                Add phone numbers to roles below. When a user logs in with that number, they'll
                automatically get access to the corresponding module.
              </Text>
            </View>
          </Animated.View>

          {/* ─── Role Cards ─── */}
          <Animated.View style={{ transform: [{ translateY: cardsSlide }], opacity: headerFade }}>
            {roleAssignmentService.ASSIGNABLE_ROLES.map((roleDef, index) => {
              const roleAssigns = getAssignmentsForRole(roleDef.role);
              const isExpanded = expandedRole === roleDef.role;
              const colors = ROLE_COLORS[roleDef.role] || ROLE_COLORS.manager;
              const count = roleAssigns.length;

              return (
                <View
                  key={roleDef.role}
                  style={[
                    s.roleCard,
                    {
                      borderLeftColor: colors.accent,
                      borderLeftWidth: 4,
                    },
                  ]}
                >
                  {/* Role Header — Tap to expand */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={s.roleCardHeader}
                    onPress={() => toggleExpand(roleDef.role)}
                  >
                    <View
                      style={[s.roleIconCircle, { backgroundColor: colors.iconBg }]}
                    >
                      <MaterialIcons
                        name={roleDef.icon as any}
                        size={22}
                        color="#FFFFFF"
                      />
                    </View>
                    <View style={s.roleHeaderText}>
                      <View style={s.roleNameRow}>
                        <Text style={s.roleName}>{roleDef.displayName}</Text>
                        {count > 0 && (
                          <View style={[s.countBadge, { backgroundColor: colors.accent }]}>
                            <Text style={s.countBadgeText}>{count}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.roleDescription} numberOfLines={isExpanded ? 3 : 1}>
                        {roleDef.description}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color={Colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <View style={s.roleCardBody}>
                      {/* Separator */}
                      <View style={[s.bodySeparator, { backgroundColor: colors.light }]} />

                      {/* Assigned phone numbers */}
                      {roleAssigns.length === 0 ? (
                        <View style={s.emptyAssignments}>
                          <MaterialIcons
                            name="person-add-disabled"
                            size={32}
                            color={Colors.outlineVariant}
                          />
                          <Text style={s.emptyText}>
                            No phone numbers assigned yet
                          </Text>
                          <Text style={s.emptySubText}>
                            Tap the button below to add access
                          </Text>
                        </View>
                      ) : (
                        roleAssigns.map((assignment) => {
                          const displayPhone = `+91 ${assignment.phone.slice(0, 5)} ${assignment.phone.slice(5)}`;
                          const isRemoving = removingId === assignment.id;

                          return (
                            <View key={assignment.id} style={s.assignmentItem}>
                              <View style={s.assignmentLeft}>
                                <View
                                  style={[
                                    s.assignmentAvatar,
                                    { backgroundColor: colors.bg },
                                  ]}
                                >
                                  <MaterialIcons
                                    name="phone"
                                    size={16}
                                    color={colors.accent}
                                  />
                                </View>
                                <View>
                                  {assignment.label ? (
                                    <>
                                      <Text style={s.assignmentLabel}>
                                        {assignment.label}
                                      </Text>
                                      <Text style={s.assignmentPhone}>
                                        {displayPhone}
                                      </Text>
                                    </>
                                  ) : (
                                    <Text style={s.assignmentLabel}>
                                      {displayPhone}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <TouchableOpacity
                                activeOpacity={0.7}
                                style={s.removeBtn}
                                onPress={() => handleRemoveAssignment(assignment)}
                                disabled={isRemoving}
                              >
                                {isRemoving ? (
                                  <ActivityIndicator size="small" color="#EF4444" />
                                ) : (
                                  <MaterialIcons
                                    name="remove-circle-outline"
                                    size={22}
                                    color="#EF4444"
                                  />
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        })
                      )}

                      {/* Add Button */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[s.addPhoneBtn, { backgroundColor: colors.accent }]}
                        onPress={() => openAddModal(roleDef.role)}
                      >
                        <MaterialIcons name="add" size={20} color="#FFFFFF" />
                        <Text style={s.addPhoneBtnText}>
                          Add Phone Number
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.View>

          {/* ─── Summary ─── */}
          <View style={s.summaryCard}>
            <MaterialIcons name="info-outline" size={18} color={Colors.onSurfaceVariant} />
            <Text style={s.summaryText}>
              Total {assignments.length} phone number{assignments.length !== 1 ? 's' : ''} assigned
              across {roleAssignmentService.ASSIGNABLE_ROLES.length} roles
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ═══ Add Assignment Modal ═══ */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => !isSubmitting && setIsModalVisible(false)}
        >
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <View style={s.modalDragHandle} />
            </View>

            <View style={s.modalBody}>
              {/* Role indicator */}
              {selectedRoleDef && (
                <View style={s.modalRoleIndicator}>
                  <View
                    style={[
                      s.modalRoleIcon,
                      {
                        backgroundColor:
                          ROLE_COLORS[selectedRoleDef.role]?.iconBg || Colors.primary,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={selectedRoleDef.icon as any}
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text style={s.modalRoleName}>
                      Add {selectedRoleDef.displayName}
                    </Text>
                    <Text style={s.modalRoleDesc}>
                      {selectedRoleDef.description}
                    </Text>
                  </View>
                </View>
              )}

              {/* Phone Input */}
              <View style={s.modalFieldGroup}>
                <Text style={s.modalFieldLabel}>PHONE NUMBER</Text>
                <View style={s.modalInputRow}>
                  <View style={s.modalPrefix}>
                    <MaterialIcons name="call" size={18} color={Colors.primary} />
                    <Text style={s.modalPrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={s.modalInput}
                    value={phoneInput}
                    onChangeText={handlePhoneChange}
                    placeholder="10-digit number"
                    placeholderTextColor={Colors.outline}
                    keyboardType="number-pad"
                    maxLength={10}
                    autoFocus
                  />
                </View>
              </View>

              {/* Label Input */}
              <View style={s.modalFieldGroup}>
                <Text style={s.modalFieldLabel}>
                  NAME / LABEL{' '}
                  <Text style={s.modalFieldLabelOptional}>(optional)</Text>
                </Text>
                <View style={s.modalInputRow}>
                  <View style={s.modalPrefix}>
                    <MaterialIcons name="person" size={18} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={s.modalInput}
                    value={labelInput}
                    onChangeText={setLabelInput}
                    placeholder="e.g. Rajesh Kumar"
                    placeholderTextColor={Colors.outline}
                    maxLength={100}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  s.modalSubmitBtn,
                  {
                    backgroundColor:
                      ROLE_COLORS[selectedRole]?.accent || Colors.primary,
                  },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleAddAssignment}
                disabled={isSubmitting || phoneInput.length !== 10}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
                    <Text style={s.modalSubmitText}>Assign Role</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={s.modalCancelBtn}
                onPress={() => setIsModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.outline,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // ── Info Banner ──
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 12,
  },
  infoBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  infoBannerTextWrap: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 4,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: '#4338CA',
    lineHeight: 18,
  },

  // ── Role Cards ──
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  roleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  roleHeaderText: {
    flex: 1,
    gap: 2,
  },
  roleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C2B',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },

  // ── Role Card Body (Expanded) ──
  roleCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bodySeparator: {
    height: 1.5,
    borderRadius: 1,
    marginBottom: 14,
  },
  emptyAssignments: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  emptySubText: {
    fontSize: 11,
    color: Colors.outline,
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderColor: '#F0F0F5',
  },
  assignmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  assignmentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C2B',
  },
  assignmentPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  removeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  addPhoneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Summary ──
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  summaryText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    flex: 1,
  },

  // ═══ Modal ═══
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  modalBody: {
    padding: 24,
    paddingTop: 16,
    gap: 20,
  },
  modalRoleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalRoleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C2B',
  },
  modalRoleDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    maxWidth: 220,
  },
  modalFieldGroup: {
    gap: 8,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalFieldLabelOptional: {
    fontWeight: '400',
    color: Colors.outline,
    textTransform: 'lowercase',
    letterSpacing: 0,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  modalPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    gap: 6,
  },
  modalPrefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1C2B',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
});
