import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Switch,
  RefreshControl,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getClientPerformanceOverview, submitWorkforceRating, getClientSiteInfo } from '../api/clientPortalService';
import { signOut } from '../api/authService';
import ClientTopNav from '../components/ClientTopNav';
import ClientBottomNav from '../components/ClientBottomNav';
import type { WorkforcePersonnel } from '../types/workforce';

export default function ClientPerformanceScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  // Rating Modal State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<WorkforcePersonnel | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [appreciation, setAppreciation] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [clientSiteId, setClientSiteId] = useState<string | null>(null);

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const data = await getClientPerformanceOverview();
      setPerformanceData(data);
      // Also resolve the client's site ID for the Report button
      try {
        const siteInfo = await getClientSiteInfo();
        if (siteInfo) setClientSiteId(siteInfo.id);
      } catch (_) {}
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to retrieve performance metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };

  const handleOpenRatingModal = (personnel: WorkforcePersonnel, initialStars = 5, initialAppreciation = false) => {
    setSelectedPersonnel(personnel);
    setRatingValue(initialStars);
    setReviewText('');
    setAppreciation(initialAppreciation);
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedPersonnel) return;

    try {
      setSubmittingRating(true);
      await submitWorkforceRating({
        personnel_id: selectedPersonnel.id,
        rating: ratingValue,
        review_text: reviewText,
        appreciation: appreciation
      });
      setRatingModalVisible(false);
      Alert.alert('Success', `Review submitted successfully for ${selectedPersonnel.name}.`);
      loadData(true);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Unable to save review');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Render Star Rating
  const renderStars = (rating: number, size = 16, interactive = false, onPressStar?: (val: number) => void) => {
    const stars = [];
    const floor = Math.floor(rating);
    const hasHalf = !interactive && (rating - floor >= 0.4);

    for (let i = 1; i <= 5; i++) {
      let iconNameName: 'star' | 'star-half' | 'star-border' = 'star-border';
      let starColor = Colors.outlineVariant;

      if (i <= floor) {
        iconNameName = 'star';
        starColor = '#F39C12';
      } else if (i === floor + 1 && hasHalf) {
        iconNameName = 'star-half';
        starColor = '#F39C12';
      }

      const starIcon = (
        <MaterialIcons
          key={i}
          name={iconNameName}
          size={size}
          color={starColor}
          style={styles.starIcon}
        />
      );

      if (interactive && onPressStar) {
        stars.push(
          <TouchableOpacity key={i} onPress={() => onPressStar(i)}>
            {starIcon}
          </TouchableOpacity>
        );
      } else {
        stars.push(starIcon);
      }
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  // Calculate dynamic overall average site score
  const activeRatings = performanceData.map(p => p.rating_summary?.average_rating).filter(r => r > 0);
  const siteAverageScore = activeRatings.length > 0
    ? (activeRatings.reduce((sum, val) => sum + val, 0) / activeRatings.length).toFixed(1)
    : '4.2';

  const renderPersonnelItem = ({ item }: { item: WorkforcePersonnel & { rating_summary: any } }) => {
    const summary = item.rating_summary;
    const initials = getInitials(item.name);
    const isActive = item.employment_status === 'active';

    return (
      <View style={s.personnelCard}>
        {/* Card Header: Initials Avatar, Name & ID */}
        <View style={s.cardHeader}>
          <View style={s.avatarContainer}>
            <View style={s.initialsBg}>
              <Text style={s.initialsText}>{initials}</Text>
            </View>
            <View style={[s.avatarStatusDot, { backgroundColor: isActive ? Colors.successGreen : Colors.outline }]} />
          </View>
          <View style={s.headerMeta}>
            <Text style={s.nameText}>{item.name}</Text>
            <Text style={s.idText}>EMP ID: {item.employee_id}</Text>
          </View>
        </View>

        {/* Card Body: Interactive Star Picker */}
        <View style={s.cardBody}>
          <Text style={s.ratingLabel}>Live Performance Rating</Text>
          <View style={s.ratingStarsContainer}>
            {renderStars(summary?.average_rating || 0, 30, true, (starsCount) => {
              handleOpenRatingModal(item, starsCount, false);
            })}
          </View>

          {/* Deployed Personnel Card Action Row */}
          <View style={s.actionsRow}>
            {/* Appreciate */}
            <TouchableOpacity
              style={s.actionButton}
              activeOpacity={0.7}
              onPress={() => handleOpenRatingModal(item, 5, true)}
            >
              <MaterialIcons name="thumb-up" size={18} color={Colors.successGreen} style={s.actionIcon} />
              <Text style={s.actionBtnText}>APPRECIATE</Text>
            </TouchableOpacity>

            {/* Report */}
            <TouchableOpacity
              style={s.actionButton}
              activeOpacity={0.7}
              onPress={() => clientSiteId && navigation.navigate('ClientRaiseComplaint', { siteId: clientSiteId })}
            >
              <MaterialIcons name="report" size={18} color={Colors.secondary} style={s.actionIcon} />
              <Text style={s.actionBtnText}>REPORT</Text>
            </TouchableOpacity>

            {/* Review */}
            <TouchableOpacity
              style={s.actionButton}
              activeOpacity={0.7}
              onPress={() => handleOpenRatingModal(item, 5, false)}
            >
              <MaterialIcons name="rate-review" size={18} color={Colors.primary} style={s.actionIcon} />
              <Text style={s.actionBtnText}>REVIEW</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container]}>
      {/* Top App Bar */}
      <ClientTopNav showBack />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={performanceData}
          keyExtractor={(item) => item.id}
          renderItem={renderPersonnelItem}
          contentContainerStyle={[s.listContainer, { paddingBottom: 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Overall Site Rating Hero Section */}
              <View style={s.heroCard}>
                <View style={s.heroMain}>
                  <View style={s.scoreContainer}>
                    <Text style={s.scoreText}>{siteAverageScore}</Text>
                    <Text style={s.scoreTotal}>/ 5.0</Text>
                  </View>
                  <View style={s.heroStarsContainer}>
                    {renderStars(parseFloat(siteAverageScore), 32)}
                  </View>
                  <Text style={s.heroTitle}>Overall Site Performance</Text>
                  <Text style={s.heroSubtitle}>Analysis based on {performanceData.length} active personnel reviews</Text>
                </View>

                {/* Hero side elements (Response time & Compliance widgets) */}
                <View style={s.heroWidgets}>
                  <View style={s.heroWidget}>
                    <Text style={s.heroWidgetLabel}>Response Time</Text>
                    <Text style={s.heroWidgetValue}>98%</Text>
                  </View>
                  <View style={s.heroWidget}>
                    <Text style={s.heroWidgetLabel}>Compliance</Text>
                    <Text style={[s.heroWidgetValue, { color: Colors.successGreen }]}>100%</Text>
                  </View>
                </View>
              </View>

              {/* Deployed Personnel List Header */}
              <View style={s.sectionHeader}>
                <View style={s.sectionTitleContainer}>
                  <View style={s.titleBar} />
                  <Text style={s.sectionTitleText}>Deployed Personnel</Text>
                </View>
                <View style={s.headerOptions}>
                  <TouchableOpacity style={s.headerOptBtn}>
                    <MaterialIcons name="filter-list" size={16} color={Colors.onSurface} style={s.optIcon} />
                    <Text style={s.headerOptText}>Filter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.headerOptBtn}>
                    <MaterialIcons name="sort" size={16} color={Colors.onSurface} style={s.optIcon} />
                    <Text style={s.headerOptText}>Sort</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          }
          ListFooterComponent={
            <>
              {/* Bottom Audit Stats Grid */}
              <View style={s.statsGrid}>
                {/* Avg Response */}
                <View style={s.statCard}>
                  <Text style={s.statLabel}>Avg Response</Text>
                  <View style={s.statValueRow}>
                    <Text style={s.statValue}>2.4m</Text>
                    <Text style={[s.statBadge, { color: Colors.successGreen }]}>↓ 12%</Text>
                  </View>
                </View>

                {/* Resolved */}
                <View style={s.statCard}>
                  <Text style={s.statLabel}>Resolved</Text>
                  <View style={s.statValueRow}>
                    <Text style={s.statValue}>14</Text>
                    <Text style={[s.statBadge, { color: Colors.onSurfaceVariant, fontSize: 11 }]}>Weekly</Text>
                  </View>
                </View>

                {/* Coverage */}
                <View style={s.statCard}>
                  <Text style={s.statLabel}>Coverage</Text>
                  <View style={s.statValueRow}>
                    <Text style={s.statValue}>100%</Text>
                    <Text style={[s.statBadge, { color: Colors.successGreen }]}>Stable</Text>
                  </View>
                </View>

                {/* Compliance */}
                <View style={s.statCard}>
                  <Text style={s.statLabel}>Compliance</Text>
                  <View style={s.statValueRow}>
                    <Text style={s.statValue}>96%</Text>
                    <Text style={[s.statBadge, { color: Colors.secondary }]}>↑ 4%</Text>
                  </View>
                </View>
              </View>

              {/* Branded Footer */}
              <View style={s.footer}>
                <View style={s.footerLogoContainer}>
                  <Image
                    alt="PIS Logo"
                    style={s.footerLogo}
                    source={{
                      uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Er0KEhzi1SGHxy9tveR8S8Rv75AaVW4UOzQE3AJmfXJm6AVqQE7ilqzSqwZKr04wOplhfm29vGwqE9KcTt3DObEz98QZA-qL7PpXc34fmeN6Axa6LiksDqZjURzrjR6M0SR1IUVbEdVhWfLfjQgu2VmoWyKPwkg2r3eoxItrdEVIUL2EaCBQTQx4ZzcSzfbdPYtZFMjhAOQLfgDH3u5SzBXV8WrZF4CEGm473zRLTDvTOux2TUkm_NZZa0Eiu_TCfw'
                    }}
                  />
                  <Text style={s.footerLogoText}>PAN India Security</Text>
                </View>
                <Text style={s.copyrightText}>© 2026 PAN India Security. All rights reserved.</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <MaterialIcons name="star-outline" size={48} color={Colors.surfaceDim} />
              <Text style={s.emptyText}>No active personnel records found</Text>
            </View>
          }
        />
      )}

      {/* ═══ Bottom Navigation ═══ */}
      <ClientBottomNav activeTab="more" />

      {/* Submit Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>
                Review: {selectedPersonnel?.name}
              </Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Star Picker */}
            <Text style={s.formLabel}>Service Rating</Text>
            <View style={s.starPickerRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <TouchableOpacity key={val} onPress={() => setRatingValue(val)}>
                  <MaterialIcons
                    name={val <= ratingValue ? 'star' : 'star-border'}
                    size={36}
                    color="#F39C12"
                    style={s.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Switch appreciation */}
            <View style={s.switchRow}>
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={s.switchTitle}>Award Appreciation Badge</Text>
                <Text style={s.switchSubtitle}>Appreciate staff for excellent performance</Text>
              </View>
              <Switch
                value={appreciation}
                onValueChange={setAppreciation}
                trackColor={{ false: Colors.surfaceVariant, true: Colors.successGreen + '90' }}
                thumbColor={appreciation ? Colors.successGreen : Colors.surfaceDim}
              />
            </View>

            {/* Optional written review */}
            <Text style={s.formLabel}>Feedback/Review Note (Optional)</Text>
            <TextInput
              style={s.textArea}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Provide comments about their service..."
              placeholderTextColor={Colors.outline}
              multiline={true}
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[s.submitBtn, submittingRating && s.submitBtnDisabled]}
              onPress={handleSubmitRating}
              disabled={submittingRating}
            >
              {submittingRating ? (
                <ActivityIndicator size="small" color={Colors.onPrimary} />
              ) : (
                <Text style={s.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    borderBottomWidth: 4,
    borderBottomColor: Colors.secondary,
    padding: 24,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6
  },
  heroMain: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 20,
    marginBottom: 20
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8
  },
  scoreText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 56,
    color: '#ffffff',
    fontWeight: '800',
    lineHeight: 60
  },
  scoreTotal: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 6
  },
  heroStarsContainer: {
    marginBottom: 16
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center'
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 4
  },
  heroWidgets: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  heroWidget: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginHorizontal: 4
  },
  heroWidgetLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4
  },
  heroWidgetValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#ffffff'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  titleBar: {
    width: 6,
    height: 24,
    backgroundColor: Colors.secondary,
    borderRadius: 3,
    marginRight: 10
  },
  sectionTitleText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  headerOptions: {
    flexDirection: 'row',
    gap: 8
  },
  headerOptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  optIcon: {
    marginRight: 4
  },
  headerOptText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: Colors.onSurface,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  personnelCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 39, 82, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative'
  },
  initialsBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  initialsText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold'
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surfaceContainerLowest
  },
  headerMeta: {
    flex: 1
  },
  nameText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold'
  },
  idText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2
  },
  cardBody: {
    padding: 16
  },
  ratingLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    opacity: 0.7
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    marginBottom: 20
  },
  starsRow: {
    flexDirection: 'row'
  },
  starIcon: {
    marginRight: 6
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: Colors.surfaceContainerLowest
  },
  actionIcon: {
    marginBottom: 4
  },
  actionBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    letterSpacing: -0.2,
    fontWeight: '900'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    opacity: 0.6
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.primary,
    fontWeight: 'bold'
  },
  statBadge: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    fontWeight: '700'
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
    marginTop: 12
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.8,
    marginBottom: 8
  },
  footerLogo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 8
  },
  footerLogoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
    letterSpacing: -0.5
  },
  copyrightText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    opacity: 0.6
  },
  emptyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl * 2,
    borderTopRightRadius: BorderRadius.xl * 2,
    padding: 24,
    paddingBottom: 40
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 16
  },
  formLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 8
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    padding: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 20
  },
  switchTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.onSurface
  },
  switchSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.outline,
    marginTop: 2
  },
  textArea: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 12,
    color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 24
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnDisabled: {
    backgroundColor: Colors.outline
  },
  submitBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.onPrimary,
    fontWeight: 'bold'
  }
});
