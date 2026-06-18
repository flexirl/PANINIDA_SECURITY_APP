import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { createCategory, updateCategory } from '../api/workforceCategoryService';
import SuccessModal from '../components/SuccessModal';

interface AddWorkforceCategoryScreenProps {
  navigation: any;
  route: any;
}

// ─── Major Group Definitions for Parent Picker ──────
const PARENT_GROUPS = [
  { id: 'guards', name: 'Guards', icon: 'shield', color: '#002752', bgColor: 'rgba(0,39,82,0.08)' },
  { id: 'gunmen', name: 'Gunmen', icon: 'gpp-good', color: '#8B0000', bgColor: 'rgba(139,0,0,0.08)' },
  { id: 'bouncers', name: 'Bouncers', icon: 'sports-mma', color: '#3C1361', bgColor: 'rgba(60,19,97,0.08)' },
  { id: 'helpers', name: 'Helpers', icon: 'cleaning-services', color: '#E65100', bgColor: 'rgba(230,81,0,0.08)' },
];

export default function AddWorkforceCategoryScreen({ navigation, route }: AddWorkforceCategoryScreenProps) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  // Edit mode props
  const editMode = route?.params?.editMode ?? false;
  const editCategoryId = route?.params?.categoryId;
  const isSystemDefined = route?.params?.isSystemDefined ?? false;

  const [name, setName] = useState(route?.params?.categoryName || '');
  const [prefixCode, setPrefixCode] = useState(route?.params?.prefixCode || '');
  const [attendanceRequired, setAttendanceRequired] = useState(
    route?.params?.attendanceRequired ?? true
  );
  const [selectedParentGroup, setSelectedParentGroup] = useState<string>(
    route?.params?.parentGroupId || 'helpers'
  );
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [onSuccessClose, setOnSuccessClose] = useState<() => void>(() => () => {});

  const headerTitle = editMode ? 'Edit Category' : 'New Category';
  const submitLabel = editMode ? 'Save Changes' : 'Create Category';

  const handleSubmit = async () => {
    // 1. Client-side validation
    const trimmedName = name.trim();
    const trimmedPrefix = prefixCode.trim().toUpperCase();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }

    const prefixRegex = /^[A-Z]{2,5}$/;
    if (!prefixRegex.test(trimmedPrefix)) {
      Alert.alert(
        'Validation Error',
        'Prefix code must be 2 to 5 uppercase alphabetical characters (A-Z).'
      );
      return;
    }

    try {
      setSubmitting(true);

      if (editMode && editCategoryId) {
        // Update existing category
        const updates: any = { attendance_required: attendanceRequired };
        
        // Only update name/prefix if not system-defined
        if (!isSystemDefined) {
          updates.name = trimmedName;
          updates.prefix_code = trimmedPrefix;
        }

        await updateCategory(editCategoryId, updates);
        setSuccessMessage(`Category "${trimmedName}" updated successfully!`);
        setOnSuccessClose(() => () => navigation.goBack());
        setShowSuccessModal(true);
      } else {
        // Create new category
        await createCategory({
          name: trimmedName,
          prefix_code: trimmedPrefix,
          attendance_required: attendanceRequired,
        });
        setSuccessMessage(`Category "${trimmedName}" created successfully!`);
        setOnSuccessClose(() => () => navigation.goBack());
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || `Failed to ${editMode ? 'update' : 'create'} category`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <View style={[s.innerContainer, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backButton}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{headerTitle}</Text>
          <View style={s.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Parent Group Selector (only for create mode) */}
          {!editMode && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>Parent Category Group</Text>
              <Text style={s.cardDescription}>
                Select which major group this subcategory belongs to.
              </Text>

              <View style={s.parentGroupGrid}>
                {PARENT_GROUPS.map((group) => {
                  const isSelected = selectedParentGroup === group.id;
                  return (
                    <TouchableOpacity
                      key={group.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedParentGroup(group.id)}
                      style={[
                        s.parentGroupOption,
                        isSelected && [s.parentGroupOptionActive, { borderColor: group.color }],
                      ]}
                    >
                      <View
                        style={[
                          s.parentGroupIconWrapper,
                          { backgroundColor: isSelected ? group.bgColor : Colors.surfaceContainerLow },
                        ]}
                      >
                        <MaterialIcons
                          name={group.icon as any}
                          size={22}
                          color={isSelected ? group.color : Colors.onSurfaceVariant}
                        />
                      </View>
                      <Text
                        style={[
                          s.parentGroupLabel,
                          isSelected && { color: group.color, fontWeight: '800' },
                        ]}
                        numberOfLines={2}
                      >
                        {group.name}
                      </Text>
                      {isSelected && (
                        <View style={[s.selectedDot, { backgroundColor: group.color }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Edit Mode: Show which group this category belongs to */}
          {editMode && (
            <View style={s.editGroupBanner}>
              <MaterialIcons name="info-outline" size={18} color={Colors.primary} />
              <Text style={s.editGroupBannerText}>
                {isSystemDefined
                  ? 'This is a system-defined category. Name and prefix cannot be changed.'
                  : 'Editing subcategory details. Parent group is determined by category name.'}
              </Text>
            </View>
          )}

          {/* Form Card */}
          <View style={s.card}>
            <Text style={s.cardDescription}>
              {editMode
                ? 'Modify the category details below.'
                : 'Add a new staff classification. The prefix code will be used to generate employee IDs (e.g., HK-0001).'}
            </Text>

            {/* Category Name Input */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Category Name *</Text>
              <TextInput
                style={[s.input, (editMode && isSystemDefined) && s.inputDisabled]}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Housekeeping, Technician"
                placeholderTextColor={Colors.outline}
                autoCorrect={false}
                maxLength={50}
                editable={!(editMode && isSystemDefined)}
              />
              {editMode && isSystemDefined && (
                <Text style={s.inputHint}>System-defined name cannot be changed</Text>
              )}
            </View>

            {/* Prefix Code Input */}
            <View style={s.inputGroup}>
              <Text style={s.label}>Prefix Code (2-5 uppercase letters) *</Text>
              <TextInput
                style={[s.input, s.prefixInput, (editMode && isSystemDefined) && s.inputDisabled]}
                value={prefixCode}
                onChangeText={(val) => setPrefixCode(val.toUpperCase())}
                placeholder="e.g., HK, ELE"
                placeholderTextColor={Colors.outline}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                editable={!(editMode && isSystemDefined)}
              />
              {editMode && isSystemDefined && (
                <Text style={s.inputHint}>System-defined prefix cannot be changed</Text>
              )}
            </View>

            {/* Attendance Toggle */}
            <View style={s.toggleRow}>
              <View style={s.toggleLabelContainer}>
                <Text style={s.toggleLabel}>Attendance Enforced</Text>
                <Text style={s.toggleSublabel}>
                  Requires geofenced check-in/check-out.
                </Text>
              </View>
              <Switch
                value={attendanceRequired}
                onValueChange={setAttendanceRequired}
                trackColor={{ false: Colors.surfaceDim, true: Colors.primaryFixedDim }}
                thumbColor={attendanceRequired ? Colors.primary : Colors.outline}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.submitButton, submitting && s.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.onPrimary} />
            ) : (
              <>
                <MaterialIcons
                  name={editMode ? 'save' : 'check'}
                  size={20}
                  color={Colors.onPrimary}
                />
                <Text style={s.submitButtonText}>{submitLabel}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete Button (edit mode, non-system only) */}
          {editMode && !isSystemDefined && (
            <TouchableOpacity
              style={s.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Delete Category',
                  `Are you sure you want to delete "${name}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { deleteCategory } = await import('../api/workforceCategoryService');
                          await deleteCategory(editCategoryId);
                          Alert.alert('Deleted', `"${name}" has been removed.`, [
                            { text: 'OK', onPress: () => navigation.goBack() },
                          ]);
                        } catch (err: any) {
                          Alert.alert('Error', err?.message || 'Failed to delete category');
                        }
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="delete-outline" size={20} color={Colors.error} />
              <Text style={s.deleteButtonText}>Delete Category</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <SuccessModal
        visible={showSuccessModal}
        description={successMessage}
        onClose={() => { setShowSuccessModal(false); onSuccessClose(); }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  innerContainer: {
    flex: 1,
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
  scrollContent: {
    padding: Spacing.screenPadding,
  },

  // ── Section Title ──
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 4,
  },

  // ── Cards ──
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  cardDescription: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
  },

  // ── Parent Group Selector ──
  parentGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  parentGroupOption: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    gap: 10,
    position: 'relative',
  },
  parentGroupOptionActive: {
    borderWidth: 2,
    backgroundColor: Colors.surfaceContainerLow,
  },
  parentGroupIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentGroupLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Edit Mode Banner ──
  editGroupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFixed,
    padding: 14,
    borderRadius: BorderRadius.lg,
    marginBottom: 16,
    gap: 10,
  },
  editGroupBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.onPrimaryFixedVariant,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ── Inputs ──
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
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.surfaceDim,
  },
  inputHint: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 4,
    fontStyle: 'italic',
  },
  prefixInput: {
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── Toggle ──
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  toggleSublabel: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // ── Buttons ──
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: Spacing.buttonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.button,
    color: Colors.onPrimary,
    marginLeft: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: 8,
  },
});
