import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getAssignedSites, submitIncidentReport } from '../api/supervisorService';
import type { Site } from '../types/workforce';

type Severity = 'low' | 'medium' | 'high' | 'critical';

export default function IncidentReportScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const preselectedSiteId = route?.params?.siteId || null;

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(preselectedSiteId);
  const [category, setCategory] = useState('Security Incident');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getAssignedSites();
        setSites(data);
        if (data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(data[0].id);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to load assigned sites.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!selectedSiteId) {
      Alert.alert('Validation Error', 'Please select the incident site.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please provide a detailed description of the incident.');
      return;
    }

    try {
      setSubmitting(true);
      await submitIncidentReport({
        site_id: selectedSiteId,
        category: category.trim(),
        description: description.trim(),
        severity: severity
      });
      Alert.alert('Report Filed', 'Incident report filed successfully. The operations team has been notified.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Failed to File Report', err.message || 'Unable to submit incident report');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (val: Severity) => {
    switch (val) {
      case 'low': return '#9E9E9E';
      case 'medium': return Colors.warningAmber;
      case 'high': return '#E67E22';
      case 'critical': return Colors.dangerRed;
    }
  };

  const getSelectedSiteName = () => {
    const found = sites.find(s => s.id === selectedSiteId);
    return found ? found.site_name : 'Select Site Location';
  };

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Incident Report Form</Text>
        <View style={s.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.banner}>
          <MaterialIcons name="security" size={20} color={Colors.primary} style={s.bannerIcon} />
          <Text style={s.bannerText}>
            Incident reports automatically file L1 complaints and notify the site operations manager for immediate action.
          </Text>
        </View>

        {/* Site Picker Selector */}
        <Text style={s.formLabel}>Incident Location *</Text>
        <TouchableOpacity
          style={s.pickerBtn}
          onPress={() => setPickerVisible(true)}
          disabled={sites.length <= 1 && !!selectedSiteId}
        >
          <MaterialIcons name="place" size={20} color={Colors.primary} style={s.fieldIcon} />
          <Text style={s.pickerBtnText}>{getSelectedSiteName()}</Text>
          {sites.length > 1 && (
            <MaterialIcons name="arrow-drop-down" size={24} color={Colors.outline} />
          )}
        </TouchableOpacity>

        {/* Category Input */}
        <Text style={s.formLabel}>Incident Category *</Text>
        <View style={s.inputContainer}>
          <MaterialIcons name="category" size={20} color={Colors.primary} style={s.fieldIcon} />
          <TextInput
            style={s.input}
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Theft, Gate Damage, Absenteeism..."
            placeholderTextColor={Colors.outline}
          />
        </View>

        {/* Severity Selector */}
        <Text style={s.formLabel}>Incident Severity *</Text>
        <View style={s.severityRow}>
          {(['low', 'medium', 'high', 'critical'] as Severity[]).map((val) => {
            const isSelected = severity === val;
            const color = getSeverityColor(val);
            return (
              <TouchableOpacity
                key={val}
                style={[
                  s.severityCard,
                  isSelected && { borderColor: color, backgroundColor: color + '15' }
                ]}
                onPress={() => setSeverity(val)}
              >
                <View style={[s.severityDot, { backgroundColor: color }]} />
                <Text style={[s.severityText, isSelected && { color, fontWeight: 'bold' }]}>
                  {val.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description TextArea */}
        <Text style={s.formLabel}>Detailed Description *</Text>
        <TextInput
          style={s.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Please describe what happened, who was involved, and any immediate actions taken..."
          placeholderTextColor={Colors.outline}
          multiline={true}
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[s.submitBtn, submitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.onPrimary} />
          ) : (
            <Text style={s.submitBtnText}>Submit Incident Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Site Selector Modal */}
      <Modal
        visible={pickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Site Location</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sites}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, selectedSiteId === item.id && s.modalItemActive]}
                  onPress={() => {
                    setSelectedSiteId(item.id);
                    setPickerVisible(false);
                  }}
                >
                  <MaterialIcons name="business" size={20} color={Colors.primary} style={s.modalItemIcon} />
                  <Text style={s.modalItemText}>{item.site_name}</Text>
                  {selectedSiteId === item.id && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
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
  banner: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryFixed,
    padding: 12,
    borderRadius: BorderRadius.xl,
    alignItems: 'flex-start',
    marginBottom: 20,
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
  formLabel: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 8,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  pickerBtnText: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  fieldIcon: {
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  severityCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  severityText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.onSurface,
  },
  textArea: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 12,
    color: Colors.onSurface,
    ...Typography.body,
    height: 120,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.outline,
  },
  submitBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl * 2,
    borderTopRightRadius: BorderRadius.xl * 2,
    padding: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.onSurface,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
  },
  modalItemActive: {
    backgroundColor: Colors.primaryFixed + '20',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 8,
  },
  modalItemIcon: {
    marginRight: 12,
  },
  modalItemText: {
    ...Typography.body,
    color: Colors.onSurface,
    flex: 1,
  },
});
