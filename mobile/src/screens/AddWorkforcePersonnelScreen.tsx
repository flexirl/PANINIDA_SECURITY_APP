import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Image,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { createPersonnel, getPersonnelById, updatePersonnel } from '../api/workforcePersonnelService';
import { getCategories } from '../api/workforceCategoryService';
import { getDocumentsForPersonnel } from '../api/workforceDocumentService';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFileUpload } from '../hooks/useFileUpload';
import type { WorkforceCategory, ShiftType } from '../types/workforce';

interface AddWorkforcePersonnelScreenProps {
  navigation: any;
  route: any;
}

// ─── Category-based document configuration ──────────
const GUNMEN_CATEGORIES = ['Gunman', 'Rifleman', 'PSO'];

function isGunmenCategory(categoryName: string): boolean {
  return GUNMEN_CATEGORIES.some(
    (g) => g.toLowerCase() === categoryName.toLowerCase()
  );
}

// ─── Major Group Definitions (same as WorkforceCategoryListScreen) ───
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
    icon: 'shield',
    color: '#002752',
    bgColor: 'rgba(0,39,82,0.08)',
    description: 'Security guard personnel',
    matchFn: (n) => ['Guard', 'Supervisor', 'Security Officer'].includes(n),
  },
  {
    id: 'gunmen',
    name: 'Gunmen',
    icon: 'gpp-good',
    color: '#8B0000',
    bgColor: 'rgba(139,0,0,0.08)',
    description: 'Armed security personnel',
    matchFn: (n) => ['Gunman', 'Rifleman', 'PSO'].includes(n),
  },
  {
    id: 'bouncers',
    name: 'Bouncers',
    icon: 'sports-mma',
    color: '#3C1361',
    bgColor: 'rgba(60,19,97,0.08)',
    description: 'Event & venue security',
    matchFn: (n) => n === 'Bouncer',
  },
  {
    id: 'helpers',
    name: 'Helpers',
    icon: 'cleaning-services',
    color: '#E65100',
    bgColor: 'rgba(230,81,0,0.08)',
    description: 'Facility maintenance & support',
    matchFn: (n) =>
      !['Guard', 'Supervisor', 'Security Officer', 'Gunman', 'Rifleman', 'PSO', 'Bouncer'].includes(n),
  },
];

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
      style={[s.docSlot, hasFile && s.docSlotUploaded]}
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
      <Text
        style={[
          s.docSlotUploadText,
          hasFile && { color: Colors.successGreen },
        ]}
      >
        {hasFile ? 'UPLOADED' : 'UPLOAD'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Component ─────────────────────────────────
export default function AddWorkforcePersonnelScreen({
  navigation,
  route,
}: AddWorkforcePersonnelScreenProps) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();

  const editMode = route?.params?.editMode || false;
  const personnelId = route?.params?.personnelId || null;

  // Category data
  const [categories, setCategories] = useState<WorkforceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form state — Personal Info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Form state — Employment
  const [categoryId, setCategoryId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [salary, setSalary] = useState('');
  const [shift, setShift] = useState<ShiftType>('day');
  const [education, setEducation] = useState('');
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Bank details
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  // Emergency / KYC
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [pvrChecked, setPvrChecked] = useState(false);

  // Document upload state
  const [docs, setDocs] = useState<{
    photo: string | null;
    aadhaarFront: string | null;
    aadhaarBack: string | null;
    gunLicense: string | null;
    pvr: string | null;
    bouncerPhoto1: string | null;
    bouncerPhoto2: string | null;
  }>({
    photo: null,
    aadhaarFront: null,
    aadhaarBack: null,
    gunLicense: null,
    pvr: null,
    bouncerPhoto1: null,
    bouncerPhoto2: null,
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { upload } = useFileUpload();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showEducationPicker, setShowEducationPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);

  // Success modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [createdEmployeeId, setCreatedEmployeeId] = useState('');
  const [createdPersonnelId, setCreatedPersonnelId] = useState('');

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  // ─── Derived state ───
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isGunman = selectedGroupId === 'gunmen';
  const isBouncer = selectedGroupId === 'bouncers';
  const selectedGroup = MAJOR_GROUPS.find((g) => g.id === selectedGroupId);

  // Group categories into 4 major groups
  const groupedCategories = useMemo(() => {
    return MAJOR_GROUPS.map((group) => ({
      group,
      subcategories: categories
        .filter((cat) => group.matchFn(cat.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [categories]);

  // Get subcategories for the currently selected group
  const activeGroupSubcategories = useMemo(() => {
    if (!selectedGroupId) return [];
    const found = groupedCategories.find((g) => g.group.id === selectedGroupId);
    return found?.subcategories || [];
  }, [selectedGroupId, groupedCategories]);

  // ─── Load categories ───
  useEffect(() => {
    (async () => {
      try {
        const catData = await getCategories();
        setCategories(catData);
      } catch (err: any) {
        Alert.alert(
          'Error',
          'Failed to retrieve categories: ' + err.message
        );
      } finally {
        setCategoriesLoading(false);
      }
    })();
  }, []);

  // ─── Load profile details for Edit Mode ───
  useEffect(() => {
    if (editMode && personnelId && categories.length > 0) {
      (async () => {
        try {
          setProfileLoading(true);
          const p = await getPersonnelById(personnelId) as any;
          if (p) {
            setFullName(p.name || '');
            setPhone(p.phone || '');
            setDob(p.dob || '');
            setGender(p.gender || '');
            setAddress(p.address || '');
            setHeight(p.height || '');
            setWeight(p.weight || '');
            setCategoryId(p.category_id || '');
            
            // Map group id by matching group categories
            const group = MAJOR_GROUPS.find(g => g.matchFn(p.category?.name || ''));
            if (group) {
              setSelectedGroupId(group.id);
            }
            
            setSalary(p.base_salary ? String(p.base_salary) : '');
            setShift(p.shift_type || 'day');
            setEducation(p.education || '');
            setJoiningDate(p.joining_date || '');
            setBankName(p.bank_name || '');
            setBankAccountNumber(p.bank_account_number || '');
            setBankIfsc(p.bank_ifsc || '');
            setEmergencyName(p.emergency_contact_name || '');
            setEmergencyPhone(p.emergency_contact_phone || '');
            setAadhaar(p.aadhaar_number ? formatAadhaar(p.aadhaar_number) : '');
            setPanNumber(p.pan_number || '');
            setPvrChecked(!!p.police_verification);
            setDocs(prev => ({
              ...prev,
              photo: p.photo_url || null,
            }));
            
            // Load existing uploaded files from workforce_documents
            try {
              const wpDocs = await getDocumentsForPersonnel(personnelId);
              const docsMap: any = {
                photo: p.photo_url || null,
                aadhaarFront: null,
                aadhaarBack: null,
                gunLicense: null,
                pvr: null,
                bouncerPhoto1: null,
                bouncerPhoto2: null,
              };
              wpDocs.forEach(d => {
                if (d.document_type === 'aadhaar_front') docsMap.aadhaarFront = d.file_url;
                if (d.document_type === 'aadhaar_back') docsMap.aadhaarBack = d.file_url;
                if (d.document_type === 'gun_license') docsMap.gunLicense = d.file_url;
                if (d.document_type === 'police_verification') docsMap.pvr = d.file_url;
                if (d.document_type === 'bouncer_photo_1') docsMap.bouncerPhoto1 = d.file_url;
                if (d.document_type === 'bouncer_photo_2') docsMap.bouncerPhoto2 = d.file_url;
              });
              setDocs(docsMap);
            } catch (docErr) {
              console.warn('Failed to load personnel documents (non-fatal):', docErr);
            }
          }
        } catch (err: any) {
          Alert.alert('Error', 'Failed to load personnel profile details: ' + err.message);
        } finally {
          setProfileLoading(false);
        }
      })();
    }
  }, [editMode, personnelId, categories]);

  // When a major group is selected, auto-select if only one subcategory
  useEffect(() => {
    if (selectedGroupId) {
      const subs = groupedCategories.find(
        (g) => g.group.id === selectedGroupId
      )?.subcategories || [];
      if (subs.length === 1) {
        setCategoryId(subs[0].id);
        setShowSubcategoryPicker(false);
      } else if (subs.length === 0) {
        setCategoryId('');
        setShowSubcategoryPicker(false);
      } else {
        // Multiple subcategories — reset and show picker
        setCategoryId('');
        setShowSubcategoryPicker(true);
      }
    } else {
      setCategoryId('');
    }
  }, [selectedGroupId, groupedCategories]);

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

  // ─── Formatters ───
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

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const handleDobChange = (text: string) => {
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
    if (!categoryId) {
      newErrors.category = 'Workforce category is required';
    }

    const aadhaarDigits = aadhaar.replace(/-/g, '');
    if (aadhaarDigits && aadhaarDigits.length !== 12) {
      newErrors.aadhaar = 'Aadhaar must be exactly 12 digits';
    }
    if (panNumber && panNumber.length !== 10) {
      newErrors.pan = 'PAN must be exactly 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadAdditionalDocs = async (targetPersonnelId: string) => {
    const docsToUpload = [
      { key: 'aadhaarFront', type: 'aadhaar_front' },
      { key: 'aadhaarBack', type: 'aadhaar_back' },
      { key: 'gunLicense', type: 'gun_license' },
      { key: 'pvr', type: 'police_verification' },
      { key: 'bouncerPhoto1', type: 'bouncer_photo_1' },
      { key: 'bouncerPhoto2', type: 'bouncer_photo_2' },
    ];

    for (const item of docsToUpload) {
      const fileUri = docs[item.key as keyof typeof docs];
      if (fileUri && !fileUri.startsWith('http')) {
        try {
          const res = await upload({
            fileUri,
            category: 'documents',
            personnelId: targetPersonnelId,
            documentType: item.type,
          });
          if (!res.success) {
            console.warn(`Failed to upload ${item.key}:`, res.error);
          }
        } catch (uploadErr) {
          console.warn(`Error uploading ${item.key}:`, uploadErr);
        }
      }
    }
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
      // ── Upload photo if it's a local URI (not a http URL) ──
      let uploadedPhotoUrl = docs.photo || undefined;
      if (docs.photo && !docs.photo.startsWith('http')) {
        const uploadRes = await upload({
          fileUri: docs.photo,
          category: 'profiles',
          personnelId: personnelId || undefined,
        });

        if (uploadRes.success && uploadRes.url) {
          uploadedPhotoUrl = uploadRes.url;
        } else {
          Alert.alert('Upload Failed / अपलोड विफल', uploadRes.error?.message || 'Could not upload profile photo. / प्रोफ़ाइल फ़ोटो अपलोड नहीं की जा सकी।');
          setIsSubmitting(false);
          return;
        }
      }

      const cleanAadhaar = aadhaar.replace(/-/g, '');
      const cleanPhone = phone.replace(/\D/g, '');

      const payload = {
        name: fullName.trim(),
        phone: cleanPhone,
        category_id: categoryId,
        base_salary: Number(salary),
        joining_date: joiningDate,
        shift_type: shift,
        emergency_contact_name: emergencyName.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_ifsc: bankIfsc.trim().toUpperCase() || undefined,
        bank_name: bankName.trim() || undefined,
        aadhaar_number: cleanAadhaar || undefined,
        pan_number: panNumber.trim().toUpperCase() || undefined,
        address: address.trim() || undefined,
        photo_url: uploadedPhotoUrl,
        dob: dob || undefined,
        gender: gender || undefined,
        height: height.trim() || undefined,
        weight: weight.trim() || undefined,
        education: education || undefined,
        police_verification: pvrChecked,
      };

      if (editMode && personnelId) {
        await updatePersonnel(personnelId, payload);
        await uploadAdditionalDocs(personnelId);
        Alert.alert(
          'Success',
          'Personnel profile updated successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        const newPersonnel = await createPersonnel(payload);
        setCreatedEmployeeId(newPersonnel.employee_id);
        setCreatedPersonnelId(newPersonnel.id);
        await uploadAdditionalDocs(newPersonnel.id);
        setSuccessModalVisible(true);
      }
    } catch (err: any) {
      Alert.alert(
        editMode ? 'Update Failed' : 'Registration Failed',
        err?.message || (editMode ? 'Failed to update personnel profile.' : 'Failed to create personnel profile.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Image Picker ───
  const pickImage = async (
    source: 'camera' | 'gallery'
  ): Promise<string | null> => {
    try {
      if (source === 'camera') {
        const { status } =
          await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Camera access is needed to take photos.'
          );
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
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Gallery access is needed to select photos.'
          );
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

  const handleModalClose = (action: 'checklist' | 'directory') => {
    setSuccessModalVisible(false);
    if (action === 'checklist') {
      navigation.replace('DocumentChecklist', {
        personnelId: createdPersonnelId,
      });
    } else {
      navigation.goBack();
    }
  };

  // ─── Dropdown data ───
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const educationOptions = [
    { value: '8th', label: '8th Pass' },
    { value: '10th', label: '10th Pass' },
    { value: '12th', label: '12th Pass' },
    { value: 'graduate', label: 'Graduate' },
  ];

  const shiftOptions = [
    { value: 'day', label: 'Day Shift', icon: 'wb-sunny' },
    { value: 'night', label: 'Night Shift', icon: 'dark-mode' },
    { value: 'rotational', label: 'Rotational', icon: 'sync' },
  ];

  const closeAllDropdowns = () => {
    setShowGenderPicker(false);
    setShowEducationPicker(false);
    setShowSubcategoryPicker(false);
  };

  const handleSelectGroup = (groupId: string) => {
    closeAllDropdowns();
    if (selectedGroupId === groupId) {
      // Toggle off
      setSelectedGroupId(null);
      setCategoryId('');
    } else {
      setSelectedGroupId(groupId);
      if (errors.category) setErrors((p) => ({ ...p, category: '' }));
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
        closeAllDropdowns();
      }}
    >
      <View style={s.container}>
        <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

        {/* ═══ Top App Bar ═══ */}
        <View
          style={[
            s.topBar,
            { paddingTop: insets.top, height: 60 + insets.top },
          ]}
        >
          <View style={s.topBarLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={s.topBarBackBtn}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>{editMode ? 'Edit Personnel' : 'Add Personnel'}</Text>
          </View>
          <View style={s.topBarRight}>
            <Text style={s.headerLabel}>PAN INDIA SECURITY</Text>
            <Image
              alt="Logo"
              style={s.logoMini}
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfF1m0ZWNHdEnzTWoe3t1CcJ_XDsXMaR3jnOuqXe4eeaTRsKkpgFAbsg9u5gChHkQUrxIW-VZocAfb2zdugguiMwRh_i3-OwOLSRB7Fj1NsvDRptY4_f6fkMQxWOlRjuviOjDmp-A7A8jMkKwZ-f2FAAxxtWO1So8GEwc-UYtlM00nPxMx1F5S4kiStIuLLZvDaLwmA2jj__CYKw3Dvuxz2d8R2da1siJl6UlIqXdE8nin3nQ81QTL6K7MoV1d4eok-ZYtjkAsLe4',
              }}
            />
          </View>
        </View>

        {/* ═══ Loading State ═══ */}
        {(categoriesLoading || profileLoading) ? (
          <View style={s.centerState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={s.loadingText}>
              {categoriesLoading ? 'Loading categories...' : 'Loading personnel profile...'}
            </Text>
          </View>
        ) : (
          <Animated.View
            style={[
              {
                flex: 1,
                opacity: fadeIn,
                transform: [{ translateY: slideUp }],
              },
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
                    <Image
                      source={{ uri: docs.photo }}
                      style={s.photoPreviewImage}
                    />
                  ) : (
                    <View style={s.photoPlaceholderWrap}>
                      <MaterialIcons
                        name="add-a-photo"
                        size={36}
                        color={Colors.outline}
                      />
                      <Text style={s.photoPlaceholderText}>
                        Upload Photo
                      </Text>
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

                <FormField
                  label="Full Name"
                  required
                  error={errors.fullName}
                >
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'fullName' &&
                        s.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={s.textInput}
                      placeholder="e.g. Rahul Kumar"
                      placeholderTextColor={Colors.outline}
                      value={fullName}
                      onChangeText={(t) => {
                        setFullName(t);
                        if (errors.fullName)
                          setErrors((p) => ({ ...p, fullName: '' }));
                      }}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </FormField>

                <FormField
                  label="Phone Number"
                  required
                  error={errors.phone}
                >
                  <View
                    style={[
                      s.phoneRow,
                      errors.phone && s.inputError,
                      focusedField === 'phone' && s.inputContainerFocused,
                    ]}
                  >
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
                      <View
                        style={[
                          s.inputContainer,
                          focusedField === 'dob' &&
                            s.inputContainerFocused,
                        ]}
                      >
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
                        <MaterialIcons
                          name="calendar-today"
                          size={18}
                          color={Colors.outline}
                        />
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
                           setShowSubcategoryPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            s.dropdownValue,
                            !gender && { color: Colors.outline },
                          ]}
                        >
                          {gender
                            ? genderOptions.find(
                                (o) => o.value === gender
                              )?.label
                            : 'Select Gender'}
                        </Text>
                        <MaterialIcons
                          name="arrow-drop-down"
                          size={24}
                          color={Colors.outline}
                        />
                      </TouchableOpacity>
                    </FormField>
                  </View>
                </View>

                {/* Gender Dropdown */}
                {showGenderPicker && (
                  <View style={s.embeddedDropdown}>
                    {genderOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          s.dropdownItem,
                          gender === opt.value && s.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setGender(opt.value);
                          setShowGenderPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            s.dropdownItemText,
                            gender === opt.value &&
                              s.dropdownItemTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {gender === opt.value && (
                          <MaterialIcons
                            name="check"
                            size={18}
                            color={Colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={s.rowFields}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Height (e.g. 5'9&quot;)">
                      <View
                        style={[
                          s.inputContainer,
                          focusedField === 'height' &&
                            s.inputContainerFocused,
                        ]}
                      >
                        <TextInput
                          style={s.textInput}
                          placeholder="Height"
                          placeholderTextColor={Colors.outline}
                          value={height}
                          onChangeText={setHeight}
                          onFocus={() => setFocusedField('height')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </FormField>
                  </View>

                  <View style={{ flex: 1 }}>
                    <FormField label="Weight (e.g. 75kg)">
                      <View
                        style={[
                          s.inputContainer,
                          focusedField === 'weight' &&
                            s.inputContainerFocused,
                        ]}
                      >
                        <TextInput
                          style={s.textInput}
                          placeholder="Weight"
                          placeholderTextColor={Colors.outline}
                          value={weight}
                          onChangeText={setWeight}
                          onFocus={() => setFocusedField('weight')}
                          onBlur={() => setFocusedField(null)}
                        />
                      </View>
                    </FormField>
                  </View>
                </View>

                <FormField label="Address">
                  <View
                    style={[
                      s.inputContainer,
                      s.textAreaContainer,
                      focusedField === 'address' &&
                        s.inputContainerFocused,
                    ]}
                  >
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

                {/* ─── Major Group Selector ─── */}
                <FormField
                  label="Personnel Type"
                  required
                  error={errors.category}
                >
                  <View style={s.groupGrid}>
                    {MAJOR_GROUPS.map((group) => {
                      const isActive = selectedGroupId === group.id;
                      const subCount =
                        groupedCategories.find((g) => g.group.id === group.id)
                          ?.subcategories.length || 0;
                      return (
                        <TouchableOpacity
                          key={group.id}
                          activeOpacity={0.7}
                          style={[
                            s.groupCard,
                            isActive && {
                              borderColor: group.color,
                              backgroundColor: group.bgColor,
                            },
                          ]}
                          onPress={() => handleSelectGroup(group.id)}
                        >
                          <View
                            style={[
                              s.groupCardIconWrap,
                              { backgroundColor: isActive ? group.color : group.bgColor },
                            ]}
                          >
                            <MaterialIcons
                              name={group.icon as any}
                              size={20}
                              color={isActive ? '#FFFFFF' : group.color}
                            />
                          </View>
                          <Text
                            style={[
                              s.groupCardName,
                              isActive && { color: group.color, fontWeight: '800' },
                            ]}
                            numberOfLines={1}
                          >
                            {group.name}
                          </Text>
                          {isActive && (
                            <View style={[s.groupCardCheck, { backgroundColor: group.color }]}>
                              <MaterialIcons name="check" size={12} color="#FFFFFF" />
                            </View>
                          )}
                          {subCount > 0 && (
                            <Text style={s.groupCardSubCount}>
                              {subCount} {subCount === 1 ? 'role' : 'roles'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </FormField>

                {/* ─── Subcategory Dropdown (if selected group has multiple) ─── */}
                {selectedGroupId && activeGroupSubcategories.length > 1 && (
                  <FormField label="Select Role" required>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[
                        s.dropdownTrigger,
                        selectedGroup && { borderColor: selectedGroup.color },
                      ]}
                      onPress={() => {
                        setShowSubcategoryPicker(!showSubcategoryPicker);
                        setShowGenderPicker(false);
                        setShowEducationPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          s.dropdownValue,
                          !categoryId && { color: Colors.outline },
                        ]}
                      >
                        {selectedCategory
                          ? `${selectedCategory.name} (${selectedCategory.prefix_code})`
                          : `Select ${selectedGroup?.name || ''} Role`}
                      </Text>
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={24}
                        color={selectedGroup?.color || Colors.outline}
                      />
                    </TouchableOpacity>
                  </FormField>
                )}

                {/* Subcategory Dropdown Items */}
                {showSubcategoryPicker && activeGroupSubcategories.length > 1 && (
                  <View style={s.embeddedDropdown}>
                    {activeGroupSubcategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          s.dropdownItem,
                          categoryId === cat.id && s.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setCategoryId(cat.id);
                          setShowSubcategoryPicker(false);
                        }}
                      >
                        <View style={s.catDropdownRow}>
                          <Text
                            style={[
                              s.dropdownItemText,
                              categoryId === cat.id &&
                                s.dropdownItemTextActive,
                            ]}
                          >
                            {cat.name}
                          </Text>
                          <Text style={s.catPrefixChip}>
                            {cat.prefix_code}
                          </Text>
                        </View>
                        {categoryId === cat.id && (
                          <MaterialIcons
                            name="check"
                            size={18}
                            color={selectedGroup?.color || Colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Auto-selected single subcategory info */}
                {selectedGroupId && activeGroupSubcategories.length === 1 && selectedCategory && (
                  <View style={s.autoSelectedChip}>
                    <MaterialIcons name="check-circle" size={16} color={Colors.successGreen} />
                    <Text style={s.autoSelectedText}>
                      Auto-selected: {selectedCategory.name} ({selectedCategory.prefix_code})
                    </Text>
                  </View>
                )}

                {/* No subcategories warning */}
                {selectedGroupId && activeGroupSubcategories.length === 0 && (
                  <View style={s.noSubcatWarning}>
                    <MaterialIcons name="info-outline" size={16} color={Colors.warningAmber} />
                    <Text style={s.noSubcatText}>
                      No roles configured for {selectedGroup?.name}. Ask admin to add subcategories.
                    </Text>
                  </View>
                )}

                {/* Dynamic badge showing selected category type */}
                {selectedGroupId && (
                  <View
                    style={[
                      s.categoryInfoChip,
                      isGunman && { backgroundColor: 'rgba(139,0,0,0.04)', borderColor: 'rgba(139,0,0,0.15)' },
                    ]}
                  >
                    <MaterialIcons
                      name={selectedGroup?.icon as any || 'shield'}
                      size={16}
                      color={selectedGroup?.color || Colors.primary}
                    />
                    <Text
                      style={[
                        s.categoryInfoText,
                        { color: selectedGroup?.color || Colors.primary },
                      ]}
                    >
                      {isGunman
                        ? 'Armed personnel — Gun License required'
                        : `${selectedGroup?.description || ''}`}
                    </Text>
                  </View>
                )}

                <FormField
                  label="Base Salary"
                  required
                  error={errors.salary}
                >
                  <View
                    style={[
                      s.currencyRow,
                      errors.salary && s.inputError,
                      focusedField === 'salary' &&
                        s.inputContainerFocused,
                    ]}
                  >
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
                        if (errors.salary)
                          setErrors((p) => ({ ...p, salary: '' }));
                      }}
                      keyboardType="number-pad"
                      onFocus={() => setFocusedField('salary')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </FormField>

                <FormField label="Shift Preference">
                  <View style={s.shiftRow}>
                    {shiftOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          s.shiftBtn,
                          shift === opt.value && s.shiftBtnActive,
                        ]}
                        onPress={() => setShift(opt.value as ShiftType)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={opt.icon as any}
                          size={16}
                          color={
                            shift === opt.value
                              ? Colors.onPrimary
                              : Colors.outline
                          }
                        />
                        <Text
                          style={[
                            s.shiftBtnText,
                            shift === opt.value && s.shiftBtnTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FormField>

                <FormField label="Education Detail">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={s.dropdownTrigger}
                    onPress={() => {
                       setShowEducationPicker(!showEducationPicker);
                       setShowGenderPicker(false);
                       setShowSubcategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        s.dropdownValue,
                        !education && { color: Colors.outline },
                      ]}
                    >
                      {education
                        ? educationOptions.find(
                            (o) => o.value === education
                          )?.label
                        : 'Select Education'}
                    </Text>
                    <MaterialIcons
                      name="school"
                      size={20}
                      color={Colors.outline}
                    />
                  </TouchableOpacity>
                </FormField>

                {/* Education Dropdown */}
                {showEducationPicker && (
                  <View style={s.embeddedDropdown}>
                    {educationOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          s.dropdownItem,
                          education === opt.value &&
                            s.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setEducation(opt.value);
                          setShowEducationPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            s.dropdownItemText,
                            education === opt.value &&
                              s.dropdownItemTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {education === opt.value && (
                          <MaterialIcons
                            name="check"
                            size={18}
                            color={Colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Bank Details Sub-Section */}
                <View style={s.bankSectionDivider}>
                  <Text style={s.bankSectionText}>BANK DETAILS</Text>
                </View>

                <FormField label="Bank Name">
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'bankName' &&
                        s.inputContainerFocused,
                    ]}
                  >
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
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'bankAccountNumber' &&
                        s.inputContainerFocused,
                    ]}
                  >
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
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'bankIfsc' &&
                        s.inputContainerFocused,
                    ]}
                  >
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

              {/* ═══ SECTION: Emergency Contact ═══ */}
              <View style={s.formCard}>
                <SectionHeader
                  icon="contact-phone"
                  title="Emergency Contact"
                />

                <FormField label="Emergency Contact Name">
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'emergencyName' &&
                        s.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={s.textInput}
                      placeholder="Contact name"
                      placeholderTextColor={Colors.outline}
                      value={emergencyName}
                      onChangeText={setEmergencyName}
                      onFocus={() => setFocusedField('emergencyName')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </FormField>

                <FormField label="Emergency Contact Phone">
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'emergencyPhone' &&
                        s.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={s.textInput}
                      placeholder="Contact phone"
                      placeholderTextColor={Colors.outline}
                      value={emergencyPhone}
                      onChangeText={setEmergencyPhone}
                      keyboardType="phone-pad"
                      maxLength={15}
                      onFocus={() => setFocusedField('emergencyPhone')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </FormField>
              </View>

              {/* ═══ SECTION: Identity Documents ═══ */}
              <View style={s.formCard}>
                <SectionHeader icon="badge" title="Identity Documents" />

                {/* Aadhaar — always shown */}
                <FormField
                  label="Aadhaar Number (12 digits)"
                  error={errors.aadhaar}
                >
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'aadhaar' &&
                        s.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={s.textInput}
                      placeholder="XXXX-XXXX-XXXX"
                      placeholderTextColor={Colors.outline}
                      value={aadhaar}
                      onChangeText={handleAadhaarChange}
                      keyboardType="number-pad"
                      maxLength={14}
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

                {/* PAN — always shown */}
                <FormField
                  label="PAN Card Number (10 characters)"
                  error={errors.pan}
                >
                  <View
                    style={[
                      s.inputContainer,
                      focusedField === 'pan' && s.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={[
                        s.textInput,
                        { textTransform: 'uppercase' },
                      ]}
                      placeholder="ABCDE1234F"
                      placeholderTextColor={Colors.outline}
                      value={panNumber}
                      onChangeText={(val) =>
                        setPanNumber(val.toUpperCase())
                      }
                      autoCapitalize="characters"
                      maxLength={10}
                      onFocus={() => setFocusedField('pan')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </FormField>

                {/* Gun License — only for gunmen categories */}
                {isGunman && (
                  <>
                    <View style={s.gunLicenseDivider}>
                      <View style={s.gunLicenseBadge}>
                        <MaterialIcons
                          name="gpp-good"
                          size={14}
                          color="#8B0000"
                        />
                        <Text style={s.gunLicenseBadgeText}>
                          FIREARM DOCUMENTATION
                        </Text>
                      </View>
                    </View>
                    <DocUploadSlot
                      label="Gun License / Arms License"
                      uploaded={docs.gunLicense}
                      onPress={() => handleDocUpload('gunLicense')}
                    />
                  </>
                )}

                {/* Bouncer Photos — only for bouncers */}
                {isBouncer && (
                  <>
                    <View style={s.gunLicenseDivider}>
                      <View style={[s.gunLicenseBadge, { backgroundColor: '#3C136115' }]}>
                        <MaterialIcons
                          name="sports-mma"
                          size={14}
                          color="#3C1361"
                        />
                        <Text style={[s.gunLicenseBadgeText, { color: '#3C1361' }]}>
                          BOUNCER FULL BODY PHOTOS
                        </Text>
                      </View>
                    </View>
                    <View style={s.documentsGrid}>
                      <DocUploadSlot
                        label="Full Body Photo 1"
                        uploaded={docs.bouncerPhoto1}
                        onPress={() => handleDocUpload('bouncerPhoto1')}
                      />
                      <DocUploadSlot
                        label="Full Body Photo 2"
                        uploaded={docs.bouncerPhoto2}
                        onPress={() => handleDocUpload('bouncerPhoto2')}
                      />
                    </View>
                  </>
                )}

                {/* PVR Checkbox */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={s.checkboxRow}
                  onPress={() => setPvrChecked(!pvrChecked)}
                >
                  <View
                    style={[
                      s.checkboxOutline,
                      pvrChecked && s.checkboxOutlineActive,
                    ]}
                  >
                    {pvrChecked && (
                      <MaterialIcons
                        name="check"
                        size={16}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  <Text style={s.checkboxLabel}>
                    Police Verification Record (PVR) Submitted
                  </Text>
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
                      color={
                        docs.pvr ? Colors.successGreen : Colors.primary
                      }
                    />
                    <Text
                      style={[
                        s.pvrUploadText,
                        !!docs.pvr && {
                          color: Colors.successGreen,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {docs.pvr
                        ? 'PVR Certificate Uploaded'
                        : 'Upload PVR Certificate (Optional)'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Info Hint */}
              <View style={s.hintCard}>
                <MaterialIcons
                  name="info"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={s.hintText}>
                  All submitted data is encrypted and compliant with PIS
                  security protocols.
                </Text>
              </View>

              <View style={{ height: 120 }} />
            </ScrollView>
          </Animated.View>
        )}

        {/* ═══ Fixed Action Submit Button ═══ */}
        {!categoriesLoading && !profileLoading && (
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
                  <MaterialIcons
                    name={editMode ? 'save' : 'person-add'}
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={s.submitBtnText}>
                    {editMode ? 'Save Changes' : 'Add Personnel to System'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ Success Modal ═══ */}
        <Modal
          visible={successModalVisible}
          transparent
          animationType="fade"
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.successCircle}>
                <MaterialIcons
                  name="check"
                  size={48}
                  color={Colors.onPrimary}
                />
              </View>
              <Text style={s.modalTitle}>Registration Successful!</Text>
              <Text style={s.modalText}>
                A workforce profile has been successfully created. The
                unique Employee ID is:
              </Text>

              <View style={s.idBox}>
                <Text style={s.idText}>{createdEmployeeId}</Text>
              </View>

              <Text style={s.modalSubtext}>
                Would you like to upload compliance documents for this
                employee now?
              </Text>

              <View style={s.modalButtonColumn}>
                <TouchableOpacity
                  style={s.modalPrimaryBtn}
                  onPress={() => handleModalClose('checklist')}
                >
                  <Text style={s.modalPrimaryBtnText}>
                    Upload Documents
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.modalSecondaryBtn}
                  onPress={() => handleModalClose('directory')}
                >
                  <Text style={s.modalSecondaryBtnText}>
                    Return to Directory
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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

  // ── Center / Loading ──
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
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

  // ── Form Cards ──
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

  // ── Phone / Currency Rows ──
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

  // ── Shift Buttons ──
  shiftRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  shiftBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  shiftBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  shiftBtnTextActive: {
    color: Colors.onPrimary,
    fontWeight: '700',
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
  catDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catPrefixChip: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // ── Major Group Grid ──
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  groupCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
  },
  groupCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  groupCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
    textAlign: 'center',
  },
  groupCardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCardSubCount: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.outline,
    marginTop: 4,
  },

  // ── Auto-selected / Warning chips ──
  autoSelectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(39, 174, 96, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  autoSelectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.successGreen,
  },
  noSubcatWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(243, 156, 18, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  noSubcatText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warningAmber,
    flex: 1,
  },

  // ── Category Info Chip ──
  categoryInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8F6',
    borderWidth: 1,
    borderColor: '#FFE0DB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  categoryInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
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
    overflow: 'hidden',
  },

  // ── Gun License Section ──
  gunLicenseDivider: {
    marginTop: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  gunLicenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  gunLicenseBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B0000',
    letterSpacing: 1,
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

  // ── Bottom Submit ──
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
    backgroundColor: Colors.secondary,
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

  // ── Success Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  idBox: {
    backgroundColor: Colors.primaryFixed,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primaryFixedDim,
    marginBottom: 20,
  },
  idText: {
    ...Typography.h1,
    color: Colors.primary,
    letterSpacing: 2,
  },
  modalSubtext: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 16,
  },
  modalButtonColumn: {
    width: '100%',
    gap: 12,
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalPrimaryBtnText: {
    ...Typography.button,
    color: Colors.onPrimary,
  },
  modalSecondaryBtn: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  modalSecondaryBtnText: {
    ...Typography.button,
    color: Colors.onSurfaceVariant,
  },
});
