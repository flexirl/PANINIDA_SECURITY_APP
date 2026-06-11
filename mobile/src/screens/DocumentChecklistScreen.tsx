import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getPersonnelById } from '../api/workforcePersonnelService';
import { getDocumentChecklist, verifyDocument } from '../api/workforceDocumentService';
import type { DocumentChecklistItem, WorkforcePersonnel } from '../types/workforce';
import { useFileUpload } from '../hooks/useFileUpload';
import { useAuth } from '../hooks/useAuth';

interface DocumentChecklistScreenProps {
  route: any;
  navigation: any;
}

export default function DocumentChecklistScreen({ route, navigation }: DocumentChecklistScreenProps) {
  const { personnelId } = route.params;
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [personnel, setPersonnel] = useState<WorkforcePersonnel | null>(null);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const { upload, uploading, progress } = useFileUpload();

  // Image Viewer Modal State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Fetch personnel details
      const pData = await getPersonnelById(personnelId);
      setPersonnel(pData);

      // Fetch document checklist status
      const checklistData = await getDocumentChecklist(personnelId);
      setChecklist(checklistData);

    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to retrieve checklist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [personnelId]);

  const pickAndUpload = async (docType: string, useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required / अनुमति आवश्यक', 'Camera access is needed. / कैमरा एक्सेस आवश्यक है।');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission Required / अनुमति आवश्यक', 'Gallery access is needed. / गैलरी एक्सेस आवश्यक है।');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      }

      if (!result.canceled && result.assets?.length > 0) {
        processUpload(docType, result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error / त्रुटि', err?.message || 'Could not pick image. / छवि चुनने में विफल।');
    }
  };

  const handleUpload = (docType: string) => {
    Alert.alert(
      'Upload Document / दस्तावेज़ अपलोड करें',
      'Choose how to upload: / अपलोड कैसे करें चुनें:',
      [
        { text: '📷 Camera / कैमरा', onPress: () => pickAndUpload(docType, true) },
        { text: '🖼️ Gallery / गैलरी', onPress: () => pickAndUpload(docType, false) },
        { text: 'Cancel / रद्द करें', style: 'cancel' },
      ]
    );
  };

  const processUpload = async (docType: string, fileUri: string) => {
    try {
      setActionLoading(true);
      setUploadingDocType(docType);
      const uploadRes = await upload({
        fileUri,
        category: docType === 'photo' ? 'profiles' : 'documents',
        personnelId: personnelId,
        documentType: docType,
      });

      if (uploadRes.success) {
        Alert.alert('Success / सफलता', 'Document uploaded successfully. Awaiting admin verification. / दस्तावेज़ सफलतापूर्वक अपलोड किया गया। व्यवस्थापक सत्यापन की प्रतीक्षा है।');
        loadData(true);
      } else {
        Alert.alert('Upload Failed / अपलोड विफल', uploadRes.error?.message || 'Could not save document. Please try again. / दस्तावेज़ सहेज नहीं सके। कृपया पुनः प्रयास करें।');
      }
    } catch (err: any) {
      Alert.alert('Error / त्रुटि', err?.message || 'Upload failed. / अपलोड विफल।');
    } finally {
      setActionLoading(false);
      setUploadingDocType(null);
    }
  };

  const handleVerify = async (docId: string) => {
    try {
      setActionLoading(true);
      await verifyDocument(docId);
      Alert.alert('Success', 'Document marked as verified.');
      loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Verification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }: { item: DocumentChecklistItem }) => {
    const getStatusColor = () => {
      switch (item.status) {
        case 'verified':
          return Colors.successGreen;
        case 'pending':
          return Colors.warningAmber;
        default:
          return Colors.dangerRed;
      }
    };

    return (
      <View style={s.itemCard}>
        <View style={s.itemInfo}>
          <Text style={s.displayName}>{item.display_name}</Text>
          <View style={s.statusRow}>
            <View style={[s.dot, { backgroundColor: getStatusColor() }]} />
            <Text style={[s.statusText, { color: getStatusColor() }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={s.actions}>
          {item.status !== 'missing' && item.document?.file_url && (
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => {
                setViewerTitle(item.display_name);
                setViewerUrl(item.document!.file_url);
                setViewerVisible(true);
              }}
            >
              <MaterialIcons name="visibility" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {item.status === 'pending' && item.document && isAdmin && (
            <TouchableOpacity
              style={s.verifyBtn}
              onPress={() => handleVerify(item.document!.id)}
              disabled={actionLoading}
            >
              <Text style={s.verifyText}>Verify</Text>
            </TouchableOpacity>
          )}

          {item.status === 'missing' && (
            uploadingDocType === item.document_type ? (
              <View style={s.uploadProgressContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={s.uploadProgressText}>{progress}%</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.uploadBtn}
                onPress={() => handleUpload(item.document_type)}
                disabled={actionLoading}
              >
                <MaterialIcons name="cloud-upload" size={16} color={Colors.onPrimary} />
                <Text style={s.uploadText}>Upload</Text>
              </TouchableOpacity>
            )
          )}

          {item.status === 'pending' && (
            uploadingDocType === item.document_type ? (
              <View style={s.uploadProgressContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={s.uploadProgressText}>{progress}%</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.uploadBtn, s.reuploadBtn]}
                onPress={() => handleUpload(item.document_type)}
                disabled={actionLoading}
              >
                <Text style={s.reuploadText}>Re-upload</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Compliance Checklist</Text>
        <View style={s.placeholder} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={s.content}>
          <View style={s.personnelSummary}>
            <Text style={s.personName}>{personnel?.name}</Text>
            <Text style={s.personMeta}>
              ID: {personnel?.employee_id} • Category: {personnel?.category?.name}
            </Text>
          </View>

          {actionLoading && (
            <View style={s.actionProgress}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={s.progressText}>Processing...</Text>
            </View>
          )}

          <FlatList
            data={checklist}
            keyExtractor={(item) => item.document_type}
            renderItem={renderItem}
            contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Image Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        onRequestClose={() => setViewerVisible(false)}
        animationType="fade"
      >
        <View style={s.modalOverlay}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} numberOfLines={1}>{viewerTitle}</Text>
            <TouchableOpacity
              onPress={() => setViewerVisible(false)}
              style={s.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={s.imageContainer}>
            {viewerUrl ? (
              <Image
                source={{ uri: viewerUrl }}
                style={s.viewerImage}
                resizeMode="contain"
              />
            ) : null}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  personnelSummary: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    marginBottom: 8,
  },
  personName: {
    ...Typography.h1,
    fontSize: 20,
    color: Colors.onSurface,
  },
  personMeta: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  actionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    padding: 8,
    marginHorizontal: Spacing.screenPadding,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  progressText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  list: {
    padding: Spacing.screenPadding,
  },
  itemCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginRight: 16,
  },
  displayName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    ...Typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    backgroundColor: Colors.surfaceContainerLow,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.default,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  verifyBtn: {
    backgroundColor: Colors.successGreen + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.successGreen,
  },
  verifyText: {
    ...Typography.labelSm,
    color: Colors.successGreen,
    fontWeight: '700',
  },
  uploadBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  reuploadBtn: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  reuploadText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
  },
  uploadProgressText: {
    ...Typography.labelSm,
    color: Colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
  },
  modalTitle: {
    ...Typography.h2,
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 120,
  },
});
