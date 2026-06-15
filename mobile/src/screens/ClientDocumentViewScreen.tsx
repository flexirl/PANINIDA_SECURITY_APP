import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  Dimensions,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientDocuments, getClientWorkforceRoster } from '../api/clientPortalService';
import type { WorkforcePersonnel, WorkforceDocument } from '../types/workforce';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PERMITTED_DOC_TYPES = [
  { type: 'aadhaar_front', name: 'Aadhaar Front / आधार फ्रंट' },
  { type: 'aadhaar_back', name: 'Aadhaar Back / आधार बैक' },
  { type: 'pan', name: 'PAN Card / पैन कार्ड' },
  { type: 'police_verification', name: 'Police Verification / पुलिस सत्यापन' },
  { type: 'security_training_certificate', name: 'Security Training Certificate / सुरक्षा प्रशिक्षण प्रमाण पत्र' },
  { type: 'weapon_training_certificate', name: 'Weapon Training Certificate / हथियार प्रशिक्षण प्रमाण पत्र' },
  { type: 'gun_license', name: 'Gun License / गन लाइसेंस' },
  { type: 'ex_servicemen_proof', name: 'Ex-Servicemen Proof / पूर्व सैनिक प्रमाण' }
];

export default function ClientDocumentViewScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [loading, setLoading] = useState(true);
  const [personnelList, setPersonnelList] = useState<WorkforcePersonnel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<WorkforcePersonnel | null>(null);
  const [documents, setDocuments] = useState<WorkforceDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modal State for Image Viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerTitle, setViewerTitle] = useState('');

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const rosterData = await getClientWorkforceRoster();
      
      // Flatten the SectionList format into a single personnel array
      const flatList: WorkforcePersonnel[] = [];
      rosterData.forEach((section) => {
        section.data.forEach((p) => {
          flatList.push(p);
        });
      });
      
      setPersonnelList(flatList);

      // If personnelId passed in route params, pre-select it
      const paramPersonnelId = route?.params?.personnelId;
      if (paramPersonnelId) {
        const found = flatList.find(p => p.id === paramPersonnelId);
        if (found) handleSelectPersonnel(found);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load workforce list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnel();
  }, []);

  const handleSelectPersonnel = async (personnel: WorkforcePersonnel) => {
    setSelectedPersonnel(personnel);
    setLoadingDocs(true);
    try {
      const docs = await getClientDocuments(personnel.id);
      setDocuments(docs);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to fetch documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleOpenDoc = (doc: WorkforceDocument, typeName: string) => {
    // If it's a PDF, open via Linking, else open inside our image viewer modal
    const url = doc.file_url;
    if (url.toLowerCase().endsWith('.pdf')) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Unable to open PDF link');
      });
    } else {
      setViewerTitle(typeName);
      setViewerUrl(url);
      setViewerVisible(true);
    }
  };

  const filteredPersonnel = personnelList.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPersonnelRow = ({ item }: { item: WorkforcePersonnel }) => (
    <TouchableOpacity
      style={s.personnelCard}
      onPress={() => handleSelectPersonnel(item)}
    >
      <View style={s.personnelRow}>
        <View style={s.personnelAvatarBg}>
          <MaterialIcons name="person" size={24} color={Colors.primary} />
        </View>
        <View style={s.personnelInfo}>
          <Text style={s.personnelName}>{item.name}</Text>
          <Text style={s.personnelId}>{item.employee_id}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={Colors.outline} />
      </View>
    </TouchableOpacity>
  );

  const renderDocumentItem = ({ item }: { item: typeof PERMITTED_DOC_TYPES[0] }) => {
    const uploaded = documents.find(d => d.document_type === item.type);
    
    return (
      <View style={s.docCard}>
        <View style={s.docRow}>
          <View style={s.docMeta}>
            <Text style={s.docName}>{item.name}</Text>
            {uploaded ? (
              <View style={s.statusBadgeRow}>
                <View style={[s.badgeDot, { backgroundColor: uploaded.verified ? Colors.successGreen : Colors.warningAmber }]} />
                <Text style={[s.badgeText, { color: uploaded.verified ? Colors.successGreen : Colors.warningAmber }]}>
                  {uploaded.verified ? 'Verified Compliance' : 'Pending Verification'}
                </Text>
              </View>
            ) : (
              <Text style={s.missingText}>Not Provided / Missing</Text>
            )}
          </View>

          {uploaded ? (
            <TouchableOpacity
              style={s.viewBtn}
              onPress={() => handleOpenDoc(uploaded, item.name)}
            >
              <MaterialIcons name="visibility" size={18} color={Colors.onPrimary} style={s.btnIcon} />
              <Text style={s.viewBtnText}>View</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.disabledBtn}>
              <MaterialIcons name="warning" size={16} color={Colors.outline} />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        {selectedPersonnel ? (
          <TouchableOpacity
            onPress={() => setSelectedPersonnel(null)}
            style={s.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={s.headerTitle} numberOfLines={1}>
          {selectedPersonnel ? `Docs: ${selectedPersonnel.name}` : 'Verification Documents'}
        </Text>
        <View style={s.placeholder} />
      </View>

      {/* Main Content Area */}
      {!selectedPersonnel ? (
        // Roster selector view
        <View style={{ flex: 1 }}>
          <View style={s.searchSection}>
            <View style={s.searchContainer}>
              <MaterialIcons name="search" size={20} color={Colors.outline} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search staff members..."
                placeholderTextColor={Colors.outline}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredPersonnel}
              keyExtractor={(item) => item.id}
              renderItem={renderPersonnelRow}
              contentContainerStyle={[s.listContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyCenter}>
                  <MaterialIcons name="people-outline" size={48} color={Colors.surfaceDim} />
                  <Text style={s.emptyText}>No matching personnel found</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        // Document checklist view for selected personnel
        <View style={{ flex: 1 }}>
          <View style={s.personnelHeaderSummary}>
            <Text style={s.summaryTitle}>Compliance Status</Text>
            <Text style={s.summarySub}>
              Showing verified files permitted under security standards. ID: {selectedPersonnel.employee_id}
            </Text>
          </View>

          {loadingDocs ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={PERMITTED_DOC_TYPES}
              keyExtractor={(item) => item.type}
              renderItem={renderDocumentItem}
              contentContainerStyle={[s.listContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
              showsVerticalScrollIndicator={false}
            />
          )}
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  searchSection: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.onSurface,
    ...Typography.body,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
  },
  personnelCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  personnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personnelAvatarBg: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  personnelInfo: {
    flex: 1,
  },
  personnelName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  personnelId: {
    ...Typography.labelSm,
    color: Colors.outline,
    marginTop: 2,
  },
  personnelHeaderSummary: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 16,
  },
  summaryTitle: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
    fontSize: 16,
  },
  summarySub: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.outline,
    marginTop: 2,
  },
  docCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 16,
    marginBottom: 12,
  },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docMeta: {
    flex: 1,
    marginRight: 12,
  },
  docName: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
  missingText: {
    ...Typography.labelSm,
    fontSize: 11,
    color: Colors.outline,
    marginTop: 6,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
  },
  btnIcon: {
    marginRight: 4,
  },
  viewBtnText: {
    ...Typography.labelSm,
    color: Colors.onPrimary,
    fontWeight: 'bold',
  },
  disabledBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
});
