import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getPersonnelById } from '../api/workforcePersonnelService';
import { getDocumentChecklist, uploadDocument, verifyDocument } from '../api/workforceDocumentService';
import type { DocumentChecklistItem, WorkforcePersonnel } from '../types/workforce';

interface DocumentChecklistScreenProps {
  route: any;
  navigation: any;
}

export default function DocumentChecklistScreen({ route, navigation }: DocumentChecklistScreenProps) {
  const { personnelId } = route.params;
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [personnel, setPersonnel] = useState<WorkforcePersonnel | null>(null);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleUpload = async (docType: string) => {
    Alert.alert('Simulate Upload', 'Choose document image to upload:', [
      {
        text: 'Aadhaar Sample.jpg',
        onPress: () => processUpload(docType, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ1nR-azIGzwp04pulq6olrkEqAb1txijCpWpJdEUL2C84FKePxt77NS2Hn8UW9CsJPJkugrwhCY6hePFIXW5_Q-QVNBBn6MSXo1B9u6ZMjgAnSg1-NwcAR3o20ChzVMO1HVOKhcVesFsHMQxMqurEaMg2eAFs-TIcUJxxzrPgLm7OrFQ8uN_8-yGhkIuWrlny29UxzziSSj3K0H6JbXJHHXny9-KXM9ND_lQa4gSHSofs__S_66Zm6OCpDjMEmLi4lUm05ExxfXc')
      },
      {
        text: 'PAN Sample.jpg',
        onPress: () => processUpload(docType, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ1nR-azIGzwp04pulq6olrkEqAb1txijCpWpJdEUL2C84FKePxt77NS2Hn8UW9CsJPJkugrwhCY6hePFIXW5_Q-QVNBBn6MSXo1B9u6ZMjgAnSg1-NwcAR3o20ChzVMO1HVOKhcVesFsHMQxMqurEaMg2eAFs-TIcUJxxzrPgLm7OrFQ8uN_8-yGhkIuWrlny29UxzziSSj3K0H6JbXJHHXny9-KXM9ND_lQa4gSHSofs__S_66Zm6OCpDjMEmLi4lUm05ExxfXc')
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const processUpload = async (docType: string, fileUri: string) => {
    try {
      setActionLoading(true);
      await uploadDocument(personnelId, docType, fileUri);
      Alert.alert('Success', 'Document uploaded successfully. Awaiting admin verification.');
      loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Upload failed.');
    } finally {
      setActionLoading(false);
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
              onPress={() => Alert.alert('View Document', 'File URL: ' + item.document!.file_url)}
            >
              <MaterialIcons name="visibility" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {item.status === 'pending' && item.document && (
            <TouchableOpacity
              style={s.verifyBtn}
              onPress={() => handleVerify(item.document!.id)}
              disabled={actionLoading}
            >
              <Text style={s.verifyText}>Verify</Text>
            </TouchableOpacity>
          )}

          {item.status === 'missing' && (
            <TouchableOpacity
              style={s.uploadBtn}
              onPress={() => handleUpload(item.document_type)}
              disabled={actionLoading}
            >
              <MaterialIcons name="cloud-upload" size={16} color={Colors.onPrimary} />
              <Text style={s.uploadText}>Upload</Text>
            </TouchableOpacity>
          )}

          {item.status === 'pending' && (
            <TouchableOpacity
              style={[s.uploadBtn, s.reuploadBtn]}
              onPress={() => handleUpload(item.document_type)}
              disabled={actionLoading}
            >
              <Text style={s.reuploadText}>Re-upload</Text>
            </TouchableOpacity>
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
});
