import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  StatusBar,
  Animated,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import * as guardService from '../api/guardService';
import * as siteService from '../api/siteService';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AddGuardScreenProps {
  navigation: any;
}

// ─── Section Header Component ───────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  const s = useScaledStyles(styles);
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}>
        <MaterialIcons name={icon as any} size={20} color={Colors.primary} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Form Field Component ───────────────────────────
function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  const s = useScaledStyles(styles);
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>
        {label}
        {required && <Text style={s.requiredStar}> *</Text>}
      </Text>
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

// ─── Document Upload Slot ───────────────────────────
function DocUploadSlot({
  label,
  uploaded,
  onPress,
}: {
  label: string;
  uploaded: string | null;
  onPress: () => void;
}) {
  const s = useScaledStyles(styles);
  const hasFile = !!uploaded;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        s.docSlot,
        hasFile && s.docSlotUploaded,
      ]}
    >
      <View style={s.docSlotContent}>
        <MaterialIcons
          name={hasFile ? 'check-circle' : 'upload-file'}
          size={22}
          color={hasFile ? Colors.successGreen : Colors.outline}
        />
        <Text
          style={[
            s.docSlotLabel,
            hasFile && { color: Colors.successGreen, fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text style={[s.docSlotUploadText, hasFile && { color: Colors.successGreen }]}>
        {hasFile ? 'UPLOADED' : 'UPLOAD'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────
export default function AddGuardScreen({ navigation }: AddGuardScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState('day');
  const [address, setAddress] = useState('');
  const [education, setEducation] = useState('');
  
  // Bank details
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  // Site assignment
  const [sites, setSites] = useState<any[]>([]);
  const [assignedSiteId, setAssignedSiteId] = useState('');

  const [aadhaar, setAadhaar] = useState('');
  const [pvrChecked, setPvrChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document upload state
  const [docs, setDocs] = useState<{
    aadhaarFront: string | null;
    aadhaarBack: string | null;
    photo: string | null;
    pvr: string | null;
  }>({
    aadhaarFront: null,
    aadhaarBack: null,
    photo: null,
    pvr: null,
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dropdown states
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showEducationPicker, setShowEducationPicker] = useState(false);
  const [showSitePicker, setShowSitePicker] = useState(false);

  // Focus states for input styling
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  // Load active sites
  useEffect(() => {
    async function loadSites() {
      try {
        const list = await siteService.getSites();
        setSites(list || []);
      } catch (err) {
        console.warn('Failed to load sites:', err);
        // Fallback default sites as shown in the HTML mockup
        setSites([
          { id: 'patna_office', site_name: 'Patna Office' },
          { id: 'mall_site', site_name: 'Mall Site, Delhi' },
          { id: 'bank_fraser', site_name: 'Bank Site, Fraser Road' },
          { id: 'factory_danapur', site_name: 'Factory Site, Danapur' },
        ]);
      }
    }
    loadSites();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ─── Aadhaar formatting ───
  const formatAadhaar = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    return parts.join('-');
  };

  const handleAadhaarChange = (text: string) => {
    const formatted = formatAadhaar(text);
    setAadhaar(formatted);
    if (errors.aadhaar) {
      setErrors((prev) => ({ ...prev, aadhaar: '' }));
    }
  };

  // ─── Phone formatting ───
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  // ─── Date of Birth formatting ───
  const handleDobChange = (text: string) => {
    // Basic automatic hyphen inserting for YYYY-MM-DD
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}`;
      if (cleaned.length > 6) {
        formatted = `${formatted}-${cleaned.slice(6, 8)}`;
      }
    }
    setDob(formatted);
  };

  // ─── Validation ───
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }

    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.length !== 10) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!salary) {
      newErrors.salary = 'Base Salary is required';
    }

    const aadhaarDigits = aadhaar.replace(/-/g, '');
    if (!aadhaarDigits) {
      newErrors.aadhaar = 'Aadhaar number is required';
    } else if (aadhaarDigits.length !== 12) {
      newErrors.aadhaar = 'Enter a valid 12-digit Aadhaar number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Submit ───
  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const cleanAadhaar = aadhaar.replace(/-/g, '');
      const cleanPhone = phone.replace(/\D/g, '');

      const newGuard = {
        name: fullName,
        phone: cleanPhone,
        base_salary: Number(salary),
        shift_type: shift as 'day' | 'night' | 'rotational',
        address: address || 'N/A',
        education: education || '10th Pass',
        police_verification: pvrChecked,
        employment_status: 'active' as const,
        photo_url: docs.photo || undefined,
        aadhaar_number: cleanAadhaar,
        // Bank details
        bank_account_number: bankAccountNumber || undefined,
        bank_ifsc: bankIfsc ? bankIfsc.toUpperCase() : undefined,
        bank_name: bankName || undefined,
        // Document URIs for viewing
        _doc_aadhaar_front: docs.aadhaarFront || undefined,
        _doc_aadhaar_back: docs.aadhaarBack || undefined,
        _doc_pvr: docs.pvr || undefined,
      };

      const createdGuard = await guardService.createGuard(newGuard);
      const guardId = createdGuard?.id;

      // Assign to site if selected
      if (guardId && assignedSiteId) {
        try {
          await siteService.assignGuard({
            guard_id: guardId,
            site_id: assignedSiteId,
            shift_type: (shift === 'night' ? 'night' : 'day') as 'day' | 'night',
          });
          console.log(`[ASSIGN] Guard assigned to site: ${assignedSiteId}`);
        } catch (assignErr) {
          console.warn('[ASSIGN] Auto-assignment failed:', assignErr);
        }
      }

      // Upload documents to Supabase Storage if guard was created and we have files
      if (guardId) {
        const uploadTasks: { type: 'photo' | 'aadhaar' | 'police_verification'; uri: string; name: string }[] = [];

        if (docs.photo) uploadTasks.push({ type: 'photo', uri: docs.photo, name: 'profile_photo.jpg' });
        if (docs.aadhaarFront) uploadTasks.push({ type: 'aadhaar', uri: docs.aadhaarFront, name: 'aadhaar_front.jpg' });
        if (docs.aadhaarBack) uploadTasks.push({ type: 'aadhaar', uri: docs.aadhaarBack, name: 'aadhaar_back.jpg' });
        if (docs.pvr) uploadTasks.push({ type: 'police_verification', uri: docs.pvr, name: 'pvr_certificate.jpg' });

        for (const task of uploadTasks) {
          try {
            await guardService.uploadGuardDocument(guardId, task.type, task.uri, task.name);
          } catch (uploadErr: any) {
            console.warn(`[UPLOAD] ${task.name} failed:`, uploadErr?.message);
          }
        }
      }

      setIsSubmitting(false);
      Alert.alert(
        'Guard Onboarded Successfully ✅',
        `${fullName} has been successfully registered and active in Pan India Security.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Registration Failed', err.message || 'Unable to onboard guard. Check phone formatting.');
    }
  };

  const pickImage = async (source: 'camera' | 'gallery'): Promise<string | null> => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return null;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets?.length > 0) {
          return result.assets[0].uri;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery access is needed to select photos.');
          return null;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
        if (!result.canceled && result.assets?.length > 0) {
          return result.assets[0].uri;
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
    return null;
  };

  const handleDocUpload = (docKey: keyof typeof docs) => {
    Alert.alert('Upload Document', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const uri = await pickImage('camera');
          if (uri) setDocs((prev) => ({ ...prev, [docKey]: uri }));
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const uri = await pickImage('gallery');
          if (uri) setDocs((prev) => ({ ...prev, [docKey]: uri }));
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const shiftOptions = [
    { value: 'day', label: 'Day Shift', icon: 'wb-sunny' },
    { value: 'night', label: 'Night Shift', icon: 'dark-mode' },
    { value: 'rotational', label: 'Rotational', icon: 'sync' },
  ];

  const educationOptions = [
    { value: '8th', label: '8th Pass' },
    { value: '10th', label: '10th Pass' },
    { value: '12th', label: '12th Pass' },
    { value: 'graduate', label: 'Graduate' },
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ═══ Top App Bar ═══ */}
        <View style={[s.topBar, { paddingTop: insets.top, height: 60 + insets.top }]}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={s.topBarBackBtn}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Add Guard</Text>
          </View>
          <View style={s.topBarRight}>
            <Text style={s.headerLabel}>PAN INDIA SECURITY</Text>
            <Image
              alt="Logo"
              style={s.logoMini}
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfF1m0ZWNHdEnzTWoe3t1CcJ_XDsXMaR3jnOuqXe4eeaTRsKkpgFAbsg9u5gChHkQUrxIW-VZocAfb2zdugguiMwRh_i3-OwOLSRB7Fj1NsvDRptY4_f6fkMQxWOlRjuviOjDmp-A7A8jMkKwZ-f2FAAxxtWO1So8GEwc-UYtlM00nPxMx1F5S4kiStIuLLZvDaLwmA2jj__CYKw3Dvuxz2d8R2da1siJl6UlIqXdE8nin3nQ81QTL6K7MoV1d4eok-ZYtjkAsLe4' }}
            />
          </View>
        </View>

        {/* ═══ Scrollable Form ═══ */}
        <Animated.View
          style={[
            { flex: 1, opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <ScrollView
            style={s.scrollView}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Profile Photo Upload ─── */}
            <View style={s.photoUploadSection}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={s.photoUploadBox}
                onPress={() => handleDocUpload('photo')}
              >
                {docs.photo ? (
                  <Image source={{ uri: docs.photo }} style={s.photoPreviewImage} />
                ) : (
                  <View style={s.photoPlaceholderWrap}>
                    <MaterialIcons
                      name="add-a-photo"
                      size={36}
                      color={Colors.outline}
                    />
                    <Text style={s.photoPlaceholderText}>Upload Guard Photo</Text>
                  </View>
                )}
                <View style={s.photoEditBadge}>
                  <MaterialIcons name="edit" size={14} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text style={s.photoSectionLabel}>PROFILE IDENTITY</Text>
            </View>

            {/* ═══ SECTION: Personal Information ═══ */}
            <View style={s.formCard}>
              <SectionHeader icon="person" title="Personal Information" />

              <FormField label="Full Name" required error={errors.fullName}>
                <View style={[s.inputContainer, focusedField === 'fullName' && s.inputContainerFocused]}>
                  <TextInput
                    style={s.textInput}
                    placeholder="e.g. Rahul Kumar"
                    placeholderTextColor={Colors.outline}
                    value={fullName}
                    onChangeText={(t) => {
                      setFullName(t);
                      if (errors.fullName) setErrors((p) => ({ ...p, fullName: '' }));
                    }}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>

              <FormField label="Phone Number" required error={errors.phone}>
                <View style={[
                  s.phoneRow, 
                  errors.phone && s.inputError,
                  focusedField === 'phone' && s.inputContainerFocused
                ]}>
                  <View style={s.phonePrefix}>
                    <Text style={s.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={s.phoneInput}
                    placeholder="9999999999"
                    placeholderTextColor={Colors.outline}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={10}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>

              <View style={s.rowFields}>
                <View style={{ flex: 1 }}>
                  <FormField label="Date of Birth">
                    <View style={[s.inputContainer, focusedField === 'dob' && s.inputContainerFocused]}>
                      <TextInput
                        style={s.textInput}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.outline}
                        value={dob}
                        onChangeText={handleDobChange}
                        keyboardType="number-pad"
                        maxLength={10}
                        onFocus={() => setFocusedField('dob')}
                        onBlur={() => setFocusedField(null)}
                      />
                      <MaterialIcons name="calendar-today" size={18} color={Colors.outline} />
                    </View>
                  </FormField>
                </View>

                <View style={{ flex: 1 }}>
                  <FormField label="Gender">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={s.dropdownTrigger}
                      onPress={() => {
                        setShowGenderPicker(!showGenderPicker);
                        setShowEducationPicker(false);
                        setShowSitePicker(false);
                      }}
                    >
                      <Text style={[s.dropdownValue, !gender && { color: Colors.outline }]}>
                        {gender ? genderOptions.find(o => o.value === gender)?.label : 'Select Gender'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={Colors.outline} />
                    </TouchableOpacity>
                  </FormField>
                </View>
              </View>

              {/* Gender Dropdown Menu Options */}
              {showGenderPicker && (
                <View style={s.embeddedDropdown}>
                  {genderOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.dropdownItem, gender === opt.value && s.dropdownItemActive]}
                      onPress={() => {
                        setGender(opt.value);
                        setShowGenderPicker(false);
                      }}
                    >
                      <Text style={[s.dropdownItemText, gender === opt.value && s.dropdownItemTextActive]}>
                        {opt.label}
                      </Text>
                      {gender === opt.value && <MaterialIcons name="check" size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <FormField label="Address">
                <View style={[s.inputContainer, s.textAreaContainer, focusedField === 'address' && s.inputContainerFocused]}>
                  <TextInput
                    style={[s.textInput, s.textAreaInput]}
                    placeholder="Enter full permanent address"
                    placeholderTextColor={Colors.outline}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    onFocus={() => setFocusedField('address')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>
            </View>

            {/* ═══ SECTION: Employment Details ═══ */}
            <View style={s.formCard}>
              <SectionHeader icon="work" title="Employment Details" />

              <FormField label="Employee ID">
                <View style={[s.inputContainer, s.inputDisabled]}>
                  <TextInput
                    style={[s.textInput, { color: Colors.outline }]}
                    value="PIS-7842"
                    editable={false}
                  />
                </View>
              </FormField>

              <FormField label="Base Salary" required error={errors.salary}>
                <View style={[
                  s.currencyRow, 
                  errors.salary && s.inputError,
                  focusedField === 'salary' && s.inputContainerFocused
                ]}>
                  <View style={s.currencySymbolWrap}>
                    <Text style={s.currencySymbolText}>₹</Text>
                  </View>
                  <TextInput
                    style={s.currencyInput}
                    placeholder="25,000"
                    placeholderTextColor={Colors.outline}
                    value={salary}
                    onChangeText={(t) => {
                      setSalary(t.replace(/\D/g, ''));
                      if (errors.salary) setErrors((p) => ({ ...p, salary: '' }));
                    }}
                    keyboardType="number-pad"
                    onFocus={() => setFocusedField('salary')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>

              <FormField label="Shift Preference">
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.dropdownTrigger}
                  onPress={() => {
                    Alert.alert('Shift Selection', 'Select shift assignment', shiftOptions.map(opt => ({
                      text: opt.label,
                      onPress: () => setShift(opt.value)
                    })));
                  }}
                >
                  <Text style={s.dropdownValue}>
                    {shiftOptions.find(o => o.value === shift)?.label || 'Day Shift'}
                  </Text>
                  <MaterialIcons name="swap-vert" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </FormField>

              <FormField label="Assigned Site">
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.dropdownTrigger}
                  onPress={() => {
                    setShowSitePicker(!showSitePicker);
                    setShowEducationPicker(false);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={[s.dropdownValue, !assignedSiteId && { color: Colors.outline }]}>
                    {assignedSiteId ? (sites.find(s => s.id === assignedSiteId)?.site_name || 'Assigned Site') : 'Select a Site'}
                  </Text>
                  <MaterialIcons name="location-on" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </FormField>

              {/* Site Dropdown Menu Options */}
              {showSitePicker && (
                <View style={s.embeddedDropdown}>
                  <TouchableOpacity
                    style={[s.dropdownItem, !assignedSiteId && s.dropdownItemActive]}
                    onPress={() => {
                      setAssignedSiteId('');
                      setShowSitePicker(false);
                    }}
                  >
                    <Text style={[s.dropdownItemText, !assignedSiteId && s.dropdownItemTextActive]}>
                      None (Buffer Force)
                    </Text>
                    {!assignedSiteId && <MaterialIcons name="check" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                  {sites.map((site) => (
                    <TouchableOpacity
                      key={site.id}
                      style={[s.dropdownItem, assignedSiteId === site.id && s.dropdownItemActive]}
                      onPress={() => {
                        setAssignedSiteId(site.id);
                        setShowSitePicker(false);
                      }}
                    >
                      <Text style={[s.dropdownItemText, assignedSiteId === site.id && s.dropdownItemTextActive]}>
                        {site.site_name}
                      </Text>
                      {assignedSiteId === site.id && <MaterialIcons name="check" size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <FormField label="Education Detail">
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.dropdownTrigger}
                  onPress={() => {
                    setShowEducationPicker(!showEducationPicker);
                    setShowSitePicker(false);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={[s.dropdownValue, !education && { color: Colors.outline }]}>
                    {education ? educationOptions.find(o => o.value === education)?.label : 'Select Education'}
                  </Text>
                  <MaterialIcons name="school" size={20} color={Colors.outline} />
                </TouchableOpacity>
              </FormField>

              {/* Education Dropdown Menu Options */}
              {showEducationPicker && (
                <View style={s.embeddedDropdown}>
                  {educationOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.dropdownItem, education === opt.value && s.dropdownItemActive]}
                      onPress={() => {
                        setEducation(opt.value);
                        setShowEducationPicker(false);
                      }}
                    >
                      <Text style={[s.dropdownItemText, education === opt.value && s.dropdownItemTextActive]}>
                        {opt.label}
                      </Text>
                      {education === opt.value && <MaterialIcons name="check" size={18} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Sub-Header: Bank Accounts */}
              <View style={s.bankSectionDivider}>
                <Text style={s.bankSectionText}>BANK DETAILS</Text>
              </View>

              <FormField label="Bank Name">
                <View style={[s.inputContainer, focusedField === 'bankName' && s.inputContainerFocused]}>
                  <TextInput
                    style={s.textInput}
                    placeholder="e.g. State Bank of India"
                    placeholderTextColor={Colors.outline}
                    value={bankName}
                    onChangeText={setBankName}
                    onFocus={() => setFocusedField('bankName')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>

              <FormField label="Account Number">
                <View style={[s.inputContainer, focusedField === 'bankAccountNumber' && s.inputContainerFocused]}>
                  <TextInput
                    style={s.textInput}
                    placeholder="Enter Account Number"
                    placeholderTextColor={Colors.outline}
                    value={bankAccountNumber}
                    onChangeText={setBankAccountNumber}
                    keyboardType="number-pad"
                    onFocus={() => setFocusedField('bankAccountNumber')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>

              <FormField label="IFSC Code">
                <View style={[s.inputContainer, focusedField === 'bankIfsc' && s.inputContainerFocused]}>
                  <TextInput
                    style={[s.textInput, { textTransform: 'uppercase' }]}
                    placeholder="e.g. SBIN0001234"
                    placeholderTextColor={Colors.outline}
                    value={bankIfsc}
                    onChangeText={setBankIfsc}
                    autoCapitalize="characters"
                    onFocus={() => setFocusedField('bankIfsc')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>
            </View>

            {/* ═══ SECTION: Identity Documents ═══ */}
            <View style={s.formCard}>
              <SectionHeader icon="badge" title="Identity Documents" />

              <FormField label="Aadhaar Number" required error={errors.aadhaar}>
                <View style={[s.inputContainer, focusedField === 'aadhaar' && s.inputContainerFocused]}>
                  <TextInput
                    style={s.textInput}
                    placeholder="XXXX-XXXX-XXXX"
                    placeholderTextColor={Colors.outline}
                    value={aadhaar}
                    onChangeText={handleAadhaarChange}
                    keyboardType="number-pad"
                    maxLength={14} // 12 digits + 2 hyphens
                    onFocus={() => setFocusedField('aadhaar')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </FormField>

              <View style={s.documentsGrid}>
                <DocUploadSlot
                  label="Aadhaar Card Front"
                  uploaded={docs.aadhaarFront}
                  onPress={() => handleDocUpload('aadhaarFront')}
                />
                <DocUploadSlot
                  label="Aadhaar Card Back"
                  uploaded={docs.aadhaarBack}
                  onPress={() => handleDocUpload('aadhaarBack')}
                />
              </View>

              {/* Custom Checkbox Design for Police Verification Submitted */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={s.checkboxRow}
                onPress={() => setPvrChecked(!pvrChecked)}
              >
                <View style={[s.checkboxOutline, pvrChecked && s.checkboxOutlineActive]}>
                  {pvrChecked && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
                </View>
                <Text style={s.checkboxLabel}>Police Verification Record (PVR) Submitted</Text>
              </TouchableOpacity>

              {pvrChecked && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDocUpload('pvr')}
                  style={[
                    s.pvrUploadSlot,
                    !!docs.pvr && s.pvrUploadSlotDone,
                  ]}
                >
                  <MaterialIcons
                    name={docs.pvr ? 'check-circle' : 'upload-file'}
                    size={20}
                    color={docs.pvr ? Colors.successGreen : Colors.primary}
                  />
                  <Text
                    style={[
                      s.pvrUploadText,
                      !!docs.pvr && { color: Colors.successGreen, fontWeight: '700' },
                    ]}
                  >
                    {docs.pvr ? 'PVR Certificate Uploaded' : 'Upload PVR Certificate (Optional)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info Hint Compliance Box */}
            <View style={s.hintCard}>
              <MaterialIcons name="info" size={18} color={Colors.primary} />
              <Text style={s.hintText}>
                All submitted data is encrypted and compliant with PIS security protocols.
              </Text>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>
        </Animated.View>

        {/* ═══ Fixed Action Submit Button ═══ */}
        <View style={s.submitContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[s.submitBtn, isSubmitting && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="person-add" size={22} color="#FFFFFF" />
                <Text style={s.submitBtnText}>Add Guard to System</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Matches body bg in web mock
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 50,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.5,
  },
  logoMini: {
    width: 32,
    height: 32,
    borderRadius: 6,
    resizeMode: 'contain',
  },

  // ── Scroll ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackLg,
  },

  // ── Photo Upload Box ──
  photoUploadSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoUploadBox: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.outline,
    backgroundColor: '#E7EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.xl - 2,
  },
  photoPlaceholderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoPlaceholderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.outline,
    textAlign: 'center',
    marginTop: 6,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Colors.secondary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  photoSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 1.5,
    marginTop: 10,
  },

  // ── Form Cards (Matches web form-card style) ──
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.outline,
    marginBottom: 6,
  },
  requiredStar: {
    color: Colors.error,
  },
  fieldError: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 16,
  },
  inputContainerFocused: {
    borderColor: Colors.primaryContainer,
    borderWidth: 1.5,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#000000',
  },
  textAreaContainer: {
    height: 80,
    paddingVertical: 10,
  },
  textAreaInput: {
    textAlignVertical: 'top',
  },

  // ── Prefixed/Custom Inputs ──
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  phonePrefix: {
    height: '100%',
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phonePrefixText: {
    fontSize: 14,
    color: Colors.outline,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#000000',
  },

  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  currencySymbolWrap: {
    height: '100%',
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  currencySymbolText: {
    fontSize: 16,
    color: Colors.outline,
    fontWeight: '700',
  },
  currencyInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#000000',
  },

  inputError: {
    borderColor: Colors.error,
  },

  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Custom Dropdowns ──
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    fontSize: 14,
    color: '#000000',
  },
  embeddedDropdown: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.outline,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // ── Bank Divider ──
  bankSectionDivider: {
    marginTop: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
  },
  bankSectionText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.outline,
    letterSpacing: 1.5,
  },

  // ── Document slots ──
  documentsGrid: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  docSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C3C6D0',
    borderRadius: 6,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  docSlotUploaded: {
    borderStyle: 'solid',
    borderColor: Colors.successGreen,
    backgroundColor: 'rgba(39, 174, 96, 0.03)',
  },
  docSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docSlotLabel: {
    fontSize: 13,
    color: '#000000',
  },
  docSlotUploadText: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: '#E8E7EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#000000',
  },

  // ── Checkbox ──
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  checkboxOutline: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: Colors.outline,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOutlineActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.outline,
  },

  pvrUploadSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C3C6D0',
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    marginTop: 8,
  },
  pvrUploadSlotDone: {
    borderStyle: 'solid',
    borderColor: Colors.successGreen,
    backgroundColor: 'rgba(39, 174, 96, 0.03)',
  },
  pvrUploadText: {
    fontSize: 13,
    color: Colors.outline,
  },

  // ── Hint Card ──
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 32,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: Colors.outline,
    lineHeight: 16,
  },

  // ── Bottom Submit Container ──
  submitContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: Colors.secondary, // Premium vibrant red: #b02d21
    borderRadius: BorderRadius.xl,
    elevation: 3,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitBtnDisabled: {
    opacity: 0.8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
