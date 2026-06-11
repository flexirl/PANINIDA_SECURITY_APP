import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { raiseComplaint } from '../api/complaintService';
import { getCategories } from '../api/workforceCategoryService';
import type { ComplaintSeverity } from '../types/workforce';

interface RaiseComplaintScreenProps {
  route: any;
  navigation: any;
}

export default function RaiseComplaintScreen({ route, navigation }: RaiseComplaintScreenProps) {
  const { siteId } = route.params || {};
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ComplaintSeverity>('low');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const catData = await getCategories();
        // Extract unique names
        const names = catData.map(c => c.name);
        setCategories(names);
        if (names.length > 0) {
          setSelectedCategory(names[0]);
        }
      } catch (err) {
        console.warn('Failed to load categories, using defaults:', err);
        const defaults = ['Service Quality', 'Absence', 'Uniform Issues', 'Behavior', 'Other'];
        setCategories(defaults);
        setSelectedCategory(defaults[0]);
      } finally {
        setCategoriesLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!siteId) {
      return Alert.alert('Error', 'No deployment site specified for this complaint.');
    }
    if (!description.trim()) {
      return Alert.alert('Validation Error', 'Description is required.');
    }

    try {
      setSubmitting(true);
      await raiseComplaint({
        site_id: siteId,
        category: selectedCategory,
        description: description.trim(),
        severity,
        incident_reported: false
      });

      Alert.alert('Complaint Filed', 'Your complaint has been logged and assigned to the supervisor.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to file complaint.');
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
            accessibilityLabel="Cancel complaint"
          >
            <MaterialIcons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>File Complaint</Text>
          <View style={s.placeholder} />
        </View>

        {categoriesLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              <Text style={s.cardDescription}>
                Submit feedback or flag performance issues regarding staff deployed at your site. A Level 1 ticket will be assigned automatically.
              </Text>

              {/* Category selector */}
              <View style={s.inputGroup}>
                <Text style={s.label}>Complaint Category *</Text>
                <View style={s.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          s.pickerItem,
                          selectedCategory === cat && s.pickerItemActive
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                      >
                        <Text
                          style={[
                            s.pickerItemText,
                            selectedCategory === cat && s.pickerItemTextActive
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Severity Selector */}
              <View style={s.inputGroup}>
                <Text style={s.label}>Severity Level *</Text>
                <View style={s.severityRow}>
                  {(['low', 'medium', 'high', 'critical'] as ComplaintSeverity[]).map((level) => {
                    const getLvlColor = () => {
                      if (level === 'critical') return Colors.dangerRed;
                      if (level === 'high') return Colors.warningAmber;
                      if (level === 'medium') return Colors.infoBlue;
                      return Colors.outline;
                    };

                    const isActive = severity === level;

                    return (
                      <TouchableOpacity
                        key={level}
                        style={[
                          s.severityBtn,
                          isActive && { backgroundColor: getLvlColor(), borderColor: getLvlColor() }
                        ]}
                        onPress={() => setSeverity(level)}
                      >
                        <Text style={[s.severityBtnText, isActive && s.severityBtnTextActive]}>
                          {level.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Description Input */}
              <View style={s.inputGroup}>
                <Text style={s.label}>Describe the issue *</Text>
                <TextInput
                  style={[s.input, s.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Provide details about the issue or incident..."
                  placeholderTextColor={Colors.outline}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && s.disabledBtn]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <>
                  <MaterialIcons name="report-problem" size={20} color={Colors.onPrimary} />
                  <Text style={s.submitText}>Submit Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
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
  cardDescription: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
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
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  pickerItemActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerItemText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  pickerItemTextActive: {
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  severityBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityBtnText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 11,
  },
  severityBtnTextActive: {
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
