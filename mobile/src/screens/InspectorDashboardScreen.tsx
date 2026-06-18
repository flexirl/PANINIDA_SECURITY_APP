import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  TextInput,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { signOut } from '../api/authService';
import { getSites, SiteProfile } from '../api/siteService';
import { submitInspection } from '../api/inspectionService';
import { useFileUpload } from '../hooks/useFileUpload';
import LogoutModal from '../components/LogoutModal';

export default function InspectorDashboardScreen({ navigation }: any) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<SiteProfile[]>([]);
  const [selectedSite, setSelectedSite] = useState<SiteProfile | null>(null);
  const [isSitePickerVisible, setIsSitePickerVisible] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  
  const [remarks, setRemarks] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  const { upload, uploading, progress } = useFileUpload();

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const data = await getSites();
      // Filter active sites
      setSites(data.filter(site => site.is_active));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setIsLogoutModalVisible(false);
    try {
      await signOut();
      navigation.replace('Login');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedSite) {
      Alert.alert('Error', 'Please select a site to inspect.');
      return;
    }
    if (!remarks.trim()) {
      Alert.alert('Error', 'Please write a report/remarks.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Error', 'Please capture a photo for the inspection.');
      return;
    }

    try {
      setLoading(true);

      // 1. Upload photo
      const uploadResult = await upload({
        fileUri: photoUri,
        category: 'inspections',
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error?.message || 'Failed to upload photo');
      }

      // 2. Submit inspection
      // Simple flow: we just pass empty arrays for guards and treat any remark as a potential issue
      await submitInspection({
        site_id: selectedSite.id,
        remarks: remarks.trim(),
        guards_present: [],
        guards_absent: [],
        photos: [uploadResult.url],
        incident_reported: remarks.toLowerCase().includes('problem') || remarks.toLowerCase().includes('wrong'),
        incident_description: remarks.trim()
      });

      Alert.alert('Success', 'Inspection submitted successfully!', [
        { text: 'OK', onPress: resetForm }
      ]);

    } catch (err: any) {
      Alert.alert('Submit Failed', err.message || 'Could not submit inspection. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSite(null);
    setRemarks('');
    setPhotoUri(null);
  };

  return (
    <View style={s.container}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

      {/* Header */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuASwMEZT8CDQ1_Ypoi2gUs8PZOs1nQWdDNRtpECVXb22p8OtGBqCyYo0_mRF0189_x7Ga_nWBbqgzBUaq8MQ66EFjU122G7kIbk1GEKmym5yhJ9r0e3dlkL8gHXKfLd3fT9dZopV7ClFxkERBOSECQSHtI_rQXVAThT03yr_tI3AonoQaDe20RxIzotJYsyKaxUuILmFGFZ2pny35PDHsXHQXwXnr3e1e8Xgo1D22Vg1ZXAGDkHXZ0dUwzjz3DN4zH5XbZNpNbEAPo' }}
              style={s.brandLogo}
            />
            <Text style={s.topBarTitle} numberOfLines={1}>
              Inspector Dashboard
            </Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={handleLogout}>
              <MaterialIcons name="logout" size={24} color="#002752" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionHeader}>New Inspection</Text>
        <Text style={s.sectionSub}>Select a site, write your report, and upload a photo.</Text>

        <View style={s.formCard}>
          {/* Site Picker */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Select Site *</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.dropdownBtn}
              onPress={() => setIsSitePickerVisible(true)}
            >
              <Text style={[s.dropdownBtnText, !selectedSite && s.placeholderText]}>
                {selectedSite ? selectedSite.site_name : 'Tap to select site'}
              </Text>
              <MaterialIcons name="expand-more" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Remarks / Report */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Inspection Report *</Text>
            <TextInput
              style={[s.textInput, s.textArea]}
              placeholder="What is wrong? Which guard has a problem? Please describe."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={remarks}
              onChangeText={setRemarks}
            />
          </View>

          {/* Photo Upload */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldLabel}>Inspection Photo *</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.photoUploaderBox}
              onPress={handlePickImage}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.uploadedImage} />
              ) : (
                <View style={s.photoUploaderPlaceholder}>
                  <View style={s.photoIconCircle}>
                    <MaterialIcons name="camera-alt" size={28} color="#64748B" />
                  </View>
                  <Text style={s.photoUploadText}>Capture Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[s.submitBtn, (loading || uploading) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || uploading}
          >
            {(loading || uploading) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={s.submitBtnText}>Submit Inspection</Text>
              </>
            )}
          </TouchableOpacity>
          
          {uploading && (
             <Text style={s.progressText}>Uploading photo... {progress}%</Text>
          )}

        </View>
      </ScrollView>

      {/* Site Selection Modal */}
      <Modal
        visible={isSitePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSitePickerVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.sitePickerContent}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Site</Text>
              <TouchableOpacity onPress={() => setIsSitePickerVisible(false)} style={s.closeBtn}>
                <MaterialIcons name="close" size={24} color="#002752" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={sites}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={s.pickerOption}
                  onPress={() => {
                    setSelectedSite(item);
                    setIsSitePickerVisible(false);
                  }}
                >
                  <View style={s.pickerOptionLeft}>
                    <Text style={s.pickerOptionTitle}>{item.site_name}</Text>
                    <Text style={s.pickerOptionSub} numberOfLines={1}>{item.address}</Text>
                  </View>
                  {selectedSite?.id === item.id && (
                    <MaterialIcons name="check-circle" size={24} color="#002752" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <LogoutModal 
        visible={isLogoutModalVisible} 
        onCancel={() => setIsLogoutModalVisible(false)} 
        onConfirm={confirmLogout} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 56,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandLogo: {
    height: 32,
    width: 32,
    resizeMode: 'contain',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002752',
    flex: 1,
    letterSpacing: -0.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: '700',
    color: '#002752',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 24,
    gap: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#002752',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 14,
  },
  dropdownBtnText: {
    fontSize: 15,
    color: '#64748B',
  },
  placeholderText: {
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#64748B',
  },
  textArea: {
    minHeight: 100,
  },
  photoUploaderBox: {
    height: 160,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploaderPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  photoIconCircle: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  photoUploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitBtn: {
    backgroundColor: '#B02D21',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    shadowColor: '#B02D21',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginTop: -10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sitePickerContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002752',
  },
  closeBtn: {
    padding: 4,
  },
  pickerList: {
    padding: 16,
    gap: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  pickerOptionLeft: {
    flex: 1,
    gap: 4,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#002752',
  },
  pickerOptionSub: {
    fontSize: 12,
    color: '#64748B',
  },
});

