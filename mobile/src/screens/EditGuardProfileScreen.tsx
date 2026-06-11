import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { useAuth } from '../hooks/useAuth';
import * as guardService from '../api/guardService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BLOOD_GROUPS = ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'];
const RELATIONSHIPS = [
  'Wife',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Friend',
  'Other',
];
const RELATIONSHIPS_HINDI: { [key: string]: string } = {
  Wife: 'पत्नी',
  Father: 'पिता',
  Mother: 'माता',
  Brother: 'भाई',
  Sister: 'बहन',
  Friend: 'मित्र',
  Other: 'अन्य',
};

export default function EditGuardProfileScreen({ navigation, route }: { navigation: any; route?: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();

  // Support admin passing guardId via route OR guard editing own profile
  const routeGuardId = route?.params?.guardId;
  const isAdminEdit = !!routeGuardId;
  const guardId = routeGuardId || user?.guard_id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardDetail, setGuardDetail] = useState<guardService.GuardProfile | null>(null);

  // ─── Form States ───
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [education, setEducation] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [shiftType, setShiftType] = useState('rotational');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Wife');

  // Bank Details
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  // Image Upload
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Dropdown Modal States
  const [bloodModalVisible, setBloodModalVisible] = useState(false);
  const [relationModalVisible, setRelationModalVisible] = useState(false);

  // Status pulse animation
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    loadProfileDetails();
  }, [guardId]);

  const loadProfileDetails = async () => {
    if (!guardId) {
      setLoading(false);
      return;
    }

    try {
      const detail = await guardService.getGuardDetail(guardId);
      setGuardDetail(detail);

      setName(detail.name || detail.users?.name || user?.name || '');
      setPhone(detail.phone || detail.users?.phone || user?.phone || '');
      setEmail((detail as any).email || '');

      if (detail.photo_url) {
        setAvatarUri(detail.photo_url);
      }

      if (detail.education && BLOOD_GROUPS.includes(detail.education)) {
        setBloodGroup(detail.education);
      }
      setEducation(detail.education && !BLOOD_GROUPS.includes(detail.education) ? detail.education : '');
      setAddress(detail.address || '');

      if (detail.joining_date) {
        try {
          const d = new Date(detail.joining_date);
          const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setJoiningDate(formatted);
        } catch {
          setJoiningDate(detail.joining_date);
        }
      }

      setHeight(detail.height ? String(detail.height) : '');
      setWeight(detail.weight ? String(detail.weight) : '');
      setBaseSalary(detail.base_salary ? String(detail.base_salary) : '');
      setShiftType(detail.shift_type || 'rotational');

      // Emergency Contact parsing
      let rawName = detail.emergency_contact_name || '';
      let parsedRelation = 'Wife';

      if (rawName.includes('(') && rawName.endsWith(')')) {
        const startIdx = rawName.lastIndexOf('(');
        const relStr = rawName.substring(startIdx + 1, rawName.length - 1).trim();
        rawName = rawName.substring(0, startIdx).trim();

        const matchedRel = RELATIONSHIPS.find(r => r.toLowerCase() === relStr.toLowerCase());
        if (matchedRel) {
          parsedRelation = matchedRel;
        } else {
          // Try matching with old format "Spouse / पति-पत्नी"
          const simpleMatch = RELATIONSHIPS.find(r => relStr.toLowerCase().includes(r.toLowerCase()));
          parsedRelation = simpleMatch || relStr;
        }
      }

      setEmergencyName(rawName);
      setEmergencyPhone(detail.emergency_contact_phone || '');
      setEmergencyRelation(parsedRelation);

      setBankName(detail.bank_name || '');
      setBankAccountNumber(detail.bank_account_number || '');
      setBankIfsc(detail.bank_ifsc || '');
    } catch (err) {
      console.error('Failed to load profile details in Edit Screen:', err);
      Alert.alert('Error', 'Failed to retrieve profile information.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!guardId) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is required to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setUploadingAvatar(true);
      try {
        const docResult = await guardService.uploadGuardDocument(
          guardId,
          'photo',
          selectedUri,
          `avatar_${Date.now()}.jpg`
        );

        await guardService.updateGuard(guardId, {
          photo_url: docResult.document_url,
        });

        if (!isAdminEdit) {
          await refreshProfile();
        }
        setAvatarUri(docResult.document_url);
        Alert.alert('Success', 'Profile photo updated successfully!');
      } catch (uploadErr) {
        console.error('Failed to upload avatar:', uploadErr);
        Alert.alert('Upload Failed', 'Could not update profile photo.');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!guardId) return;

    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter Full Name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter Phone Number.');
      return;
    }

    setSaving(true);

    try {
      const combinedEmergencyName = emergencyName.trim()
        ? `${emergencyName.trim()} (${emergencyRelation})`
        : '';

      const updates: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        emergency_contact_name: combinedEmergencyName || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        bank_name: bankName.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_ifsc: bankIfsc.trim() || undefined,
        shift_type: shiftType,
      };

      if (bloodGroup) {
        updates.education = bloodGroup;
      }

      if (joiningDate.trim()) {
        updates.joining_date = joiningDate.trim();
      }

      if (height.trim()) {
        updates.height = parseFloat(height);
      }
      if (weight.trim()) {
        updates.weight = parseFloat(weight);
      }
      if (baseSalary.trim()) {
        updates.base_salary = parseFloat(baseSalary);
      }

      if (email.trim()) {
        updates.email = email.trim();
      }

      await guardService.updateGuard(guardId, updates);

      if (!isAdminEdit) {
        await refreshProfile();
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to save profile changes:', err);
      Alert.alert('Save Failed', err.message || 'Unable to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const DEFAULT_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTiCH7H_sH3ZZJzckhG_6Uu4DxeAIinxdPFXHrqm9a0sTxDBsqKtnK8qyofOAcM5oK2-cSGXLwSq0MDcVw-OOZxsg3dnvw39bcUsjutgdw5sn4QONh-2M7J-V7D6a0Ykw5smzyKVhIAlTa6t10oGzftkCxrfy-I949HGtiWll2R_4KARxqJjHaZUTYsDg4NhjRTlPEKH4063o_riyNSlhra1eu4M9233NVdGka8qQX4qbzAVVW_rGbqY3Pd56_jekgsyZsyoPUjew';

  const navItems = [
    { key: 'home', icon: 'dashboard' as const, label: 'Home' },
    { key: 'attendance', icon: 'fingerprint' as const, label: 'Attendance' },
    { key: 'salary', icon: 'payments' as const, label: 'Salary' },
    { key: 'profile', icon: 'person' as const, label: 'Profile' },
  ];

  const handleNavPress = (key: string) => {
    if (key === 'home') navigation.navigate('GuardHome');
    else if (key === 'attendance') navigation.navigate('GuardAttendanceHistory');
    else if (key === 'salary') navigation.navigate('GuardSalarySlips');
    else if (key === 'profile') navigation.navigate('GuardProfile');
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={s.loadingText}>Accessing profile credentials...</Text>
      </View>
    );
  }

  // ─── Render a labeled input field ───
  const renderField = (
    labelEn: string,
    labelHi: string,
    value: string,
    onChange: (t: string) => void,
    opts?: {
      readOnly?: boolean;
      keyboard?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
      multiline?: boolean;
      placeholder?: string;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    }
  ) => (
    <View style={s.formGroup}>
      <View>
        <Text style={s.fieldLabelEn}>{labelEn}</Text>
        <Text style={s.fieldLabelHi}>{labelHi}</Text>
      </View>
      {opts?.readOnly ? (
        <View style={s.readOnlyInput}>
          <MaterialIcons name="lock" size={16} color={Colors.onSurfaceVariant} style={{ marginRight: 8 }} />
          <Text style={s.readOnlyText}>{value}</Text>
        </View>
      ) : (
        <TextInput
          style={[
            s.textInput,
            opts?.multiline && { height: 80, textAlignVertical: 'top', paddingTop: 12 },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={opts?.placeholder}
          placeholderTextColor={Colors.outline}
          keyboardType={opts?.keyboard || 'default'}
          autoCapitalize={opts?.autoCapitalize}
          multiline={opts?.multiline}
          editable={!saving}
        />
      )}
    </View>
  );

  // ─── Render a dropdown select field ───
  const renderSelect = (
    labelEn: string,
    labelHi: string,
    value: string,
    onPress: () => void
  ) => (
    <View style={s.formGroup}>
      <View>
        <Text style={s.fieldLabelEn}>{labelEn}</Text>
        <Text style={s.fieldLabelHi}>{labelHi}</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        style={s.selectTrigger}
        onPress={() => !saving && onPress()}
      >
        <Text style={[s.selectText, !value && { color: Colors.outline }]}>
          {value || 'Select'}
        </Text>
        <MaterialIcons name="expand-more" size={24} color={Colors.outline} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />

      {/* ═══ Top AppBar ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <View style={s.topBarLogoBg}>
              <MaterialIcons name="security" size={22} color="#ffffff" />
            </View>
            <Text style={s.brandText}>PAN INDIA SECURITY</Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('NotificationCenter')}
              style={s.topBarIconBtn}
            >
              <MaterialIcons name="notifications-none" size={24} color={Colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('GuardProfile')}
            >
              <View style={s.headerAvatar}>
                <Image
                  source={{ uri: avatarUri || user?.avatar_url || DEFAULT_AVATAR }}
                  style={s.headerAvatarImg as any}
                />
                {/* Status pulse dot */}
                <View style={s.headerStatusDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Page Header ─── */}
          <View style={s.pageHeader}>
            <Text style={s.pageTitle}>Edit Profile / प्रोफ़ाइल संपादित करें</Text>
            <Text style={s.pageSubtitle}>
              Update your personal and emergency information for system records.
            </Text>
          </View>

          {/* ─── Profile Photo Section ─── */}
          <View style={s.avatarSection}>
            <View style={s.avatarContainer}>
              <View style={s.avatarBorder}>
                {uploadingAvatar ? (
                  <View style={s.avatarSpinner}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : (
                  <Image
                    source={{ uri: avatarUri || user?.avatar_url || DEFAULT_AVATAR }}
                    style={s.avatarImg}
                  />
                )}
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={s.cameraBtn}
                onPress={handleUpdateAvatar}
                disabled={uploadingAvatar || saving}
              >
                <MaterialIcons name="photo-camera" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={s.avatarHelpText}>TAP CAMERA TO CHANGE PHOTO</Text>
          </View>

          {/* ─── Form Card ─── */}
          <View style={s.formCard}>
            {/* ── Personal Details Section ── */}
            <View style={s.sectionHeaderRow}>
              <MaterialIcons name="person" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Personal Details / व्यक्तिगत विवरण</Text>
            </View>
            <View style={s.sectionDivider} />

            {renderField('Full Name', 'पूरा नाम', name, setName, {
              placeholder: 'Enter Full Name',
            })}

            {renderField(
              'Phone Number (Read Only)',
              'फ़ोन नंबर (केवल पढ़ने के लिए)',
              phone || '+91 97777 77780',
              setPhone,
              { readOnly: true }
            )}

            {renderSelect('Blood Group', 'रक्त समूह', bloodGroup, () =>
              setBloodModalVisible(true)
            )}

            {renderField('Home Address', 'घर का पता', address, setAddress, {
              multiline: true,
              placeholder: 'Enter full address',
            })}

            {/* ── Emergency Contact Section ── */}
            <View style={[s.sectionHeaderRow, { marginTop: 24 }]}>
              <MaterialIcons name="emergency-share" size={20} color={Colors.primary} />
              <Text style={s.sectionTitle}>Emergency Contact / आपातकालीन संपर्क</Text>
            </View>
            <View style={s.sectionDivider} />

            {renderField('Emergency Contact Name', 'आपातकालीन संपर्क नाम', emergencyName, setEmergencyName, {
              placeholder: 'Enter Contact Name',
            })}

            {renderField('Emergency Phone', 'आपातकालीन फ़ोन', emergencyPhone, setEmergencyPhone, {
              keyboard: 'phone-pad',
              placeholder: 'Enter Emergency Phone',
            })}

            {renderSelect(
              'Relation',
              'संबंध',
              emergencyRelation,
              () => setRelationModalVisible(true)
            )}
          </View>

          {/* ─── Action Buttons ─── */}
          <View style={s.actionBtnGroup}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={handleSaveChanges}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={s.saveBtnText}>Save Changes / परिवर्तन सहेजें</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={s.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={s.cancelBtnText}>Cancel / रद्द करें</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ═══ Bottom Navigation Bar ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'profile';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
            >
              <MaterialIcons
                name={item.icon}
                size={24}
                color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ═══ Blood Group Selector Modal ═══ */}
      <Modal
        visible={bloodModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBloodModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setBloodModalVisible(false)}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Select Blood Group / रक्त समूह चुनें</Text>
              <TouchableOpacity onPress={() => setBloodModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={BLOOD_GROUPS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, bloodGroup === item && s.modalItemSelected]}
                  onPress={() => {
                    setBloodGroup(item);
                    setBloodModalVisible(false);
                  }}
                >
                  <Text style={[s.modalItemText, bloodGroup === item && s.modalItemTextSelected]}>
                    {item}
                  </Text>
                  {bloodGroup === item && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══ Relationship Selector Modal ═══ */}
      <Modal
        visible={relationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRelationModalVisible(false)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setRelationModalVisible(false)}
        >
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>Select Relation / संबंध चुनें</Text>
              <TouchableOpacity onPress={() => setRelationModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={RELATIONSHIPS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, emergencyRelation === item && s.modalItemSelected]}
                  onPress={() => {
                    setEmergencyRelation(item);
                    setRelationModalVisible(false);
                  }}
                >
                  <View>
                    <Text
                      style={[
                        s.modalItemText,
                        emergencyRelation === item && s.modalItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    <Text style={s.modalItemHindi}>
                      {RELATIONSHIPS_HINDI[item] || ''}
                    </Text>
                  </View>
                  {emergencyRelation === item && (
                    <MaterialIcons name="check" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.outline,
    fontWeight: '600',
    fontSize: 14,
  },

  /* ── Top Bar ── */
  topBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    flex: 1,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBarLogoBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
    overflow: 'hidden',
    position: 'relative',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.successGreen,
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
  },

  /* ── Page Header ── */
  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  pageSubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },

  /* ── Avatar Section ── */
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarBorder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: Colors.surfaceContainerHighest,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainer,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    elevation: 6,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  avatarHelpText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* ── Form Card ── */
  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: 20,
    gap: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.outlineVariant,
    marginBottom: 4,
  },

  /* ── Form Fields ── */
  formGroup: {
    gap: 6,
  },
  fieldLabelEn: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  fieldLabelHi: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
    backgroundColor: Colors.surface,
  },
  readOnlyInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  selectTrigger: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  selectText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },

  /* ── Action Buttons ── */
  actionBtnGroup: {
    gap: 12,
  },
  saveBtn: {
    height: 56,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelBtn: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },

  /* ── Bottom Nav ── */
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 36,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.85)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  navItemActive: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  navLabelActive: {
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
  },

  /* ── Modal ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.outlineVariant,
  },
  modalItemSelected: {
    backgroundColor: 'rgba(0, 39, 82, 0.05)',
  },
  modalItemText: {
    fontSize: 14,
    color: Colors.onSurface,
  },
  modalItemTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
  modalItemHindi: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
});
