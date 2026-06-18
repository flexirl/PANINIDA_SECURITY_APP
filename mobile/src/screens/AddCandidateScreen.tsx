import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';

interface AddCandidateScreenProps {
  navigation: any;
}

const EDUCATION_OPTIONS = [
  { label: '8th Pass', value: '8th' },
  { label: '10th Pass', value: '10th' },
  { label: '12th Pass', value: '12th' },
  { label: 'Graduate', value: 'graduate' },
];

export default function AddCandidateScreen({ navigation }: AddCandidateScreenProps) {
  const s = useScaledStyles(styles);
  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [notes, setNotes] = useState('');

  // UX State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isEducationModalVisible, setIsEducationModalVisible] = useState(false);

  // Field focus states for visual highlights
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleEducationSelect = (val: string) => {
    setEducation(val);
    setIsEducationModalVisible(false);
  };

  const getEducationLabel = (val: string) => {
    const found = EDUCATION_OPTIONS.find((opt) => opt.value === val);
    return found ? found.label : 'Select qualification';
  };

  const handleSubmit = () => {
    // Basic validation
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter candidate\'s full name.');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a phone number.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
      return;
    }

    // Begin processing interaction
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);

      setTimeout(() => {
        setSubmitSuccess(false);
        // Reset Form
        setFullName('');
        setPhoneNumber('');
        setHeight('');
        setWeight('');
        setEducation('');
        setExperience('');
        setPreferredLocation('');
        setSalaryExpectation('');
        setAvailabilityDate('');
        setNotes('');
        
        // Go back to candidate list
        navigation.goBack();
      }, 1500);
    }, 1500);
  };

  const getInputFieldStyle = (fieldName: string) => {
    return [
      s.inputContainer,
      focusedField === fieldName && s.inputContainerFocused,
    ];
  };

  const setShortcutJoiningDate = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    } else if (type === 'nextWeek') {
      d.setDate(d.getDate() + 7);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setAvailabilityDate(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <View style={s.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* ═══ Header ═══ */}
      <View style={s.topBar}>
        <View style={s.topBarLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            aria-label="Back"
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.onPrimary} />
          </TouchableOpacity>
          <Text style={s.topBarTitle} numberOfLines={1}>
            Add Candidate
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.keyboardView}
      >
        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Section 1: Basic Info ─── */}
          <View style={s.formSection}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="person" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Basic Information</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Full Name</Text>
              <View style={getInputFieldStyle('fullName')}>
                <TextInput
                  style={s.textInput}
                  placeholder="Enter candidate's full name"
                  placeholderTextColor={Colors.outline}
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Phone Number</Text>
              <View style={[getInputFieldStyle('phoneNumber'), s.phoneInputWrap]}>
                <View style={s.countryCodeWrap}>
                  <Text style={s.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[s.textInput, s.phoneInput]}
                  placeholder="9876543210"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numeric"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onFocus={() => setFocusedField('phoneNumber')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* ─── Section 2: Physical Details ─── */}
          <View style={s.formSection}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="straighten" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Physical Details</Text>
            </View>

            <View style={s.rowFields}>
              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={s.fieldLabel}>Height (cm)</Text>
                <View style={getInputFieldStyle('height')}>
                  <TextInput
                    style={s.textInput}
                    placeholder="e.g. 175"
                    placeholderTextColor={Colors.outline}
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                    onFocus={() => setFocusedField('height')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              <View style={[s.fieldGroup, { flex: 1 }]}>
                <Text style={s.fieldLabel}>Weight (kg)</Text>
                <View style={getInputFieldStyle('weight')}>
                  <TextInput
                    style={s.textInput}
                    placeholder="e.g. 70"
                    placeholderTextColor={Colors.outline}
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                    onFocus={() => setFocusedField('weight')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ─── Section 3: Education & Experience ─── */}
          <View style={s.formSection}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="school" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Education & Experience</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Education</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[s.inputContainer, s.dropdownSelectBtn]}
                onPress={() => setIsEducationModalVisible(true)}
              >
                <Text
                  style={[
                    s.dropdownSelectText,
                    !education && { color: Colors.outline },
                  ]}
                >
                  {education ? getEducationLabel(education) : 'Select qualification'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Experience (Years)</Text>
              <View style={getInputFieldStyle('experience')}>
                <TextInput
                  style={s.textInput}
                  placeholder="0"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numeric"
                  value={experience}
                  onChangeText={setExperience}
                  onFocus={() => setFocusedField('experience')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* ─── Section 4: Expectations ─── */}
          <View style={s.formSection}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="payments" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Expectations</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Preferred Location</Text>
              <View style={getInputFieldStyle('preferredLocation')}>
                <TextInput
                  style={s.textInput}
                  placeholder="Enter city or area"
                  placeholderTextColor={Colors.outline}
                  value={preferredLocation}
                  onChangeText={setPreferredLocation}
                  onFocus={() => setFocusedField('preferredLocation')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Salary Expectation (Monthly)</Text>
              <View style={getInputFieldStyle('salaryExpectation')}>
                <TextInput
                  style={s.textInput}
                  placeholder="Amount in ₹"
                  placeholderTextColor={Colors.outline}
                  keyboardType="numeric"
                  value={salaryExpectation}
                  onChangeText={setSalaryExpectation}
                  onFocus={() => setFocusedField('salaryExpectation')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* ─── Section 5: Availability ─── */}
          <View style={s.formSection}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="calendar-today" size={18} color={Colors.primary} />
              <Text style={s.sectionTitle}>Availability</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Earliest Joining Date</Text>
              <View style={[getInputFieldStyle('availabilityDate'), s.dateInputWrap]}>
                <TextInput
                  style={s.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.outline}
                  value={availabilityDate}
                  onChangeText={setAvailabilityDate}
                  onFocus={() => setFocusedField('availabilityDate')}
                  onBlur={() => setFocusedField(null)}
                />
                <MaterialIcons name="event" size={20} color={Colors.outline} style={s.dateIcon} />
              </View>

              {/* Date Shortcut chips for premium interaction */}
              <View style={s.shortcutChipsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.shortcutChip}
                  onPress={() => setShortcutJoiningDate('today')}
                >
                  <Text style={s.shortcutChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.shortcutChip}
                  onPress={() => setShortcutJoiningDate('tomorrow')}
                >
                  <Text style={s.shortcutChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.shortcutChip}
                  onPress={() => setShortcutJoiningDate('nextWeek')}
                >
                  <Text style={s.shortcutChipText}>Next Week</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ─── Section 6: Notes ─── */}
          <View style={s.formSection}>
            <View style={s.sectionHeader}>
              <MaterialIcons name="description" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Recruiter Notes</Text>
            </View>

            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Additional Comments</Text>
              <View style={[getInputFieldStyle('notes'), s.textAreaWrap]}>
                <TextInput
                  style={[s.textInput, s.textAreaInput]}
                  placeholder="Enter behavioral notes, verification status, etc."
                  placeholderTextColor={Colors.outline}
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                  onFocus={() => setFocusedField('notes')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Bottom Submit Action Bar ─── */}
      <View style={s.bottomBar}>
        {isSubmitting ? (
          <View style={[s.submitBtn, s.submitBtnDisabled]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={s.submitBtnText}>Processing...</Text>
          </View>
        ) : submitSuccess ? (
          <View style={[s.submitBtn, s.submitBtnSuccess]}>
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
            <Text style={s.submitBtnText}>Candidate Added Successfully</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.9}
            style={s.submitBtn}
            onPress={handleSubmit}
          >
            <MaterialIcons name="person-add" size={20} color="#FFFFFF" />
            <Text style={s.submitBtnText}>Add Candidate</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ═══ Education Options Modal ═══ */}
      <Modal
        visible={isEducationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEducationModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsEducationModalVisible(false)}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Qualification</Text>
              <TouchableOpacity onPress={() => setIsEducationModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={EDUCATION_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.optionItem}
                  onPress={() => handleEducationSelect(item.value)}
                >
                  <Text style={s.optionText}>{item.label}</Text>
                  {education === item.value && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    height: 56,
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 50,
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
    color: Colors.onPrimary,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
    gap: Spacing.stackLg,
  },
  formSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    gap: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  fieldGroup: {
    gap: 6,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    height: 48,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    height: '100%',
    padding: 0, // Reset default padding
  },
  phoneInputWrap: {
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  countryCodeWrap: {
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRightWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  phoneInput: {
    paddingHorizontal: 12,
  },
  dropdownSelectBtn: {
    justifyContent: 'space-between',
  },
  dropdownSelectText: {
    fontSize: 14,
    color: Colors.onSurface,
  },
  dateInputWrap: {
    justifyContent: 'space-between',
  },
  dateIcon: {
    marginLeft: 8,
  },
  shortcutChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  shortcutChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  shortcutChipText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  textAreaWrap: {
    height: 100,
    paddingVertical: 8,
  },
  textAreaInput: {
    textAlignVertical: 'top',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 40,
  },
  submitBtn: {
    backgroundColor: Colors.secondary, // Theme red: #b02d21
    borderRadius: BorderRadius.xl,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.outline,
    opacity: 0.8,
  },
  submitBtnSuccess: {
    backgroundColor: '#27AE60', // Emerald green
    shadowColor: '#27AE60',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
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
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderColor: '#F1F5F9',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
});
