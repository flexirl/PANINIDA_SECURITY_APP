import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { raiseComplaint } from '../api/complaintService';
import ClientTopNav from '../components/ClientTopNav';
import type { ComplaintSeverity } from '../types/workforce';

const CATEGORIES = [
  'Guard Behavior',
  'Absenteeism',
  'Sleeping on Duty',
  'Uniform & Grooming',
  'Property Damage',
  'Security Breach',
  'Cleanliness',
  'Other',
];

export default function ClientRaiseComplaintScreen({ route, navigation }: any) {
  const { siteId } = route.params || {};
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [severity, setSeverity] = useState<ComplaintSeverity>('medium');
  const [description, setDescription] = useState('');
  const [incidentReported, setIncidentReported] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please provide a detailed description of the complaint.');
      return;
    }
    if (!siteId) {
      Alert.alert('Error', 'Missing site ID. Please try again from the dashboard.');
      return;
    }

    try {
      setLoading(true);
      await raiseComplaint({
        site_id: siteId,
        category,
        description: description.trim(),
        severity,
        incident_reported: incidentReported,
      });
      Alert.alert('Success', 'Complaint raised successfully. SLA is 24 hours.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to raise complaint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ClientTopNav showBack />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>File a Complaint</Text>
        <Text style={styles.pageSubtitle}>Report an issue at your site. A 24-hour SLA will be automatically assigned.</Text>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Severity</Text>
          <View style={styles.severityContainer}>
            {(['low', 'medium', 'high', 'critical'] as ComplaintSeverity[]).map((sev) => {
              const isActive = severity === sev;
              let bg = '#f4f3f7';
              let activeBg = '#002752';
              let activeText = '#ffffff';

              if (sev === 'critical') activeBg = '#B02021';
              if (sev === 'high') activeBg = '#d97706';

              return (
                <TouchableOpacity
                  key={sev}
                  style={[styles.severityBox, isActive && { backgroundColor: activeBg, borderColor: activeBg }]}
                  onPress={() => setSeverity(sev)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.severityText, isActive && { color: activeText }]}>
                    {sev.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Description <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Please describe the issue in detail..."
              placeholderTextColor="#747780"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </View>

        {/* Incident Reported Toggle */}
        <View style={[styles.section, styles.rowSection]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.sectionTitle}>Reported to Police?</Text>
            <Text style={styles.hintText}>Toggle if an FIR or official police report has been filed regarding this incident.</Text>
          </View>
          <Switch
            value={incidentReported}
            onValueChange={setIncidentReported}
            trackColor={{ false: '#e6ebf0', true: '#002752' }}
            thumbColor={'#ffffff'}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </Text>
          {!loading && <MaterialIcons name="send" size={20} color="#ffffff" />}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fd',
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00132d',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#43474f',
    marginTop: -16,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  rowSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00132d',
  },
  required: {
    color: '#B02021',
  },
  hintText: {
    fontSize: 12,
    color: '#747780',
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
  },
  chipActive: {
    backgroundColor: '#002752',
    borderColor: '#002752',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#43474f',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  severityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBox: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.4)',
    alignItems: 'center',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#43474f',
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.3)',
    padding: 16,
  },
  textArea: {
    fontSize: 16,
    color: '#00132d',
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#002752',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
