import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReportOption {
  key: string;
  titleKey: 'directory' | 'attendance' | 'deployment' | 'payroll' | 'recruitment' | 'inspection';
  description: string;
  icon: string;
}

const SITE_OPTIONS = [
  'All Sites',
  'Cyber City Hub',
  'Corporate HQ',
  'Warehouse District B',
];

export default function ReportsScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { getLabel, selectedCategory, categoryFilterIds, categoryFilterError } = usePersonnelCategory();

  // Generate report cards dynamically based on category context
  const getReportCards = (): ReportOption[] => {
    const plural = getLabel('plural');
    
    return [
      {
        key: 'daily-attendance',
        titleKey: 'attendance',
        description: `Detailed log of ${plural.toLowerCase()} check-ins and check-outs for the current cycle.`,
        icon: 'calendar-today',
      },
      {
        key: 'monthly-attendance',
        titleKey: 'attendance',
        description: `Consolidated monthly view of ${plural.toLowerCase()} presence across all sites.`,
        icon: 'event-note',
      },
      {
        key: 'payroll-summary',
        titleKey: 'payroll',
        description: `Financial overview of ${plural.toLowerCase()} wages, bonuses, and deductions.`,
        icon: 'receipt-long',
      },
      {
        key: 'recruitment-pipeline',
        titleKey: 'recruitment',
        description: `Status of new ${plural.toLowerCase()} applications and training completion rates.`,
        icon: 'group-add',
      },
      {
        key: 'inspection-history',
        titleKey: 'inspection',
        description: 'Logs of supervisor inspections and field compliance audits.',
        icon: 'fact-check',
      },
      {
        key: 'personnel-directory',
        titleKey: 'directory',
        description: `Complete database of active ${plural.toLowerCase()} with ranking and site assignments.`,
        icon: 'admin-panel-settings',
      },
    ];
  };

  const REPORT_CARDS = getReportCards();

  // Helper function to get report title based on titleKey
  const getReportTitle = (titleKey: ReportOption['titleKey']): string => {
    const plural = getLabel('plural');
    
    switch (titleKey) {
      case 'directory':
        return `${plural} Directory Report`;
      case 'attendance':
        return `${plural} Attendance Report`;
      case 'deployment':
        return `${plural} Deployment Report`;
      case 'payroll':
        return `${plural} Payroll Summary Report`;
      case 'recruitment':
        return `${plural} Recruitment Pipeline`;
      case 'inspection':
        return 'Inspection History Report';
      default:
        return 'Report';
    }
  };

  // Helper function to get category group name for report header
  const getCategoryGroupName = (): string => {
    switch (selectedCategory) {
      case 'guards':
        return 'Guards';
      case 'gunmen':
        return 'Gunman Personnel';
      case 'bouncers':
        return 'Bouncers';
      case 'helpers':
        return 'Helpers';
      case 'all':
        return 'All Personnel';
      default:
        return 'All Personnel';
    }
  };
  // Bottom Sheet Visibility
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportOption | null>(null);

  // Form Fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSite, setSelectedSite] = useState('All Sites');
  const [isSitePickerVisible, setIsSitePickerVisible] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');

  // Generation Simulation Status
  // 'idle' | 'generating' | 'ready'
  const [genStatus, setGenStatus] = useState<'idle' | 'generating' | 'ready'>('idle');

  // Animations
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Spin rotation for loading icon in sheet
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (genStatus === 'generating') {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [genStatus]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const openBottomSheet = (report: ReportOption) => {
    setSelectedReport(report);
    setSheetVisible(true);
    setGenStatus('idle');
    setStartDate('');
    setEndDate('');
    setSelectedSite('All Sites');
    setFormat('pdf');

    // Slide up bottom sheet and fade in backdrop
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.4,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeBottomSheet = () => {
    // Slide down bottom sheet and fade out backdrop
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSheetVisible(false);
    });
  };

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      Alert.alert('Required Fields', 'Please enter both Start Date and End Date.');
      return;
    }

    setGenStatus('generating');

    // Simulate generation workflow with category filtering
    // In a real implementation, this would pass categoryFilterIds to the report generation service
    const reportMetadata = {
      reportType: selectedReport?.key,
      reportTitle: selectedReport ? getReportTitle(selectedReport.titleKey) : 'Report',
      categoryGroup: getCategoryGroupName(),
      categoryFilterIds: categoryFilterIds,
      startDate,
      endDate,
      site: selectedSite,
      format,
      generatedAt: new Date().toISOString(),
    };

    console.log('Generating report with metadata:', reportMetadata);

    setTimeout(() => {
      setGenStatus('ready');

      setTimeout(() => {
        closeBottomSheet();
        setTimeout(() => {
          Alert.alert(
            'Download Completed',
            `Your ${reportMetadata.reportTitle} (${format.toUpperCase()}) for ${reportMetadata.categoryGroup} was generated and downloaded successfully.`
          );
        }, 300);
      }, 1000);
    }, 1500);
  };

  const handleNavPress = (key: string) => {
    if (key === 'dashboard') {
      navigation.navigate('AdminDashboard');
    } else if (key === 'guards') {
      navigation.navigate('GuardList');
    } else if (key === 'sites') {
      navigation.navigate('SiteList');
    } else if (key === 'more') {
      navigation.navigate('MoreMenu');
    }
  };

  const navItems = useMemo(() => [
    { key: 'dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
    { key: 'guards', icon: 'security' as const, label: getLabel('plural') },
    { key: 'sites', icon: 'location-on' as const, label: 'Sites' },
    { key: 'more', icon: 'menu' as const, label: 'More' },
  ], [getLabel]);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceContainerLowest} />

      {/* ═══ Header ═══ */}
      <View style={[s.topBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <View style={s.topBarInner}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              aria-label="Back"
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={s.topBarTitle}>Reports</Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity activeOpacity={0.7} style={s.topBarIconBtn} onPress={() => navigation.navigate('NotificationCenter')}>
              <MaterialIcons name="notifications-none" size={24} color={Colors.primary} />
            </TouchableOpacity>
            <View style={s.avatarSmall}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWhrWwW4AtcfrCgaWWmnt53nDdNj3G4OPSHVrKl2EKKTqSgdlR1X45VrrBCaYd7jveVVxMYHUeLGnLtg-rXq1iy6ThXwNzMTUeSjXthuRFrBfZp7_1pGra3axVXd9lwdctexvDfexJtHdNV9Pvnkf76v76pvYrQ4rZJ4Dn7vip7FqkxqdpD2mzIxikKy03cxWWPAAhkD2zeBp_kO9Vd7phNPjv3Pwi52fhEJ0Sn3snF8A8xqtYSvrAxUT_pgRp0WR4I-9DA1L4xlw' }}
                style={s.avatarSmallImage as any}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Intro ─── */}
        <View style={s.introBlock}>
          <Text style={s.introTitle}>Intelligence Hub</Text>
          <Text style={s.introSub}>
            Generate high-fidelity operational reports and analytical data exports.
          </Text>
        </View>

        {/* ─── Bento Grid Layout ─── */}
        <View style={s.bentoGrid}>
          {REPORT_CARDS.map((report) => (
            <TouchableOpacity
              key={report.key}
              activeOpacity={0.8}
              style={s.reportCard}
              onPress={() => openBottomSheet(report)}
            >
              <View style={s.cardHeader}>
                <View style={s.iconContainer}>
                  <MaterialIcons name={report.icon as any} size={28} color={Colors.primary} />
                </View>
                <View style={s.cardTextWrap}>
                  <Text style={s.cardTitle}>{getReportTitle(report.titleKey)}</Text>
                  <Text style={s.cardDesc}>{report.description}</Text>
                </View>
              </View>
              <View style={s.cardFooter}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={s.generateBtn}
                  onPress={() => openBottomSheet(report)}
                >
                  <Text style={s.generateBtnText}>GENERATE</Text>
                  <MaterialIcons name="download" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ Parameter Bottom Sheet / Modal ═══ */}
      {sheetVisible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Dimmed Backdrop */}
          <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={genStatus === 'idle' ? closeBottomSheet : undefined}
            />
          </Animated.View>

          {/* Bottom Sheet Wrap */}
          <Animated.View
            style={[
              s.bottomSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={s.sheetHandle} />

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
                <Text style={s.sheetTitle}>{getReportTitle(selectedReport.titleKey)}</Text>
                <Text style={s.sheetSub}>
                  Select parameters to generate the official document for {getCategoryGroupName()}.
                </Text>

                <View style={s.sheetForm}>
                  {/* Category Info Badge */}
                  <View style={s.categoryInfoBadge}>
                    <MaterialIcons name="filter-list" size={16} color={Colors.primary} />
                    <Text style={s.categoryInfoText}>
                      Category: {getCategoryGroupName()}
                    </Text>
                  </View>
                  {/* Start Date & End Date */}
                  <View style={s.dateRow}>
                    <View style={s.formGroup}>
                      <Text style={s.formLabel}>Start Date</Text>
                      <View style={s.inputContainer}>
                        <TextInput
                          style={s.dateInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={Colors.outline}
                          value={startDate}
                          onChangeText={setStartDate}
                          editable={genStatus === 'idle'}
                        />
                        <MaterialIcons name="event" size={16} color={Colors.outline} />
                      </View>
                    </View>

                    <View style={s.formGroup}>
                      <Text style={s.formLabel}>End Date</Text>
                      <View style={s.inputContainer}>
                        <TextInput
                          style={s.dateInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={Colors.outline}
                          value={endDate}
                          onChangeText={setEndDate}
                          editable={genStatus === 'idle'}
                        />
                        <MaterialIcons name="event" size={16} color={Colors.outline} />
                      </View>
                    </View>
                  </View>

                  {/* Select Site Dropdown */}
                  <View style={s.formGroup}>
                    <Text style={s.formLabel}>Select Site</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[s.dropdownBtn, genStatus !== 'idle' && { opacity: 0.6 }]}
                      onPress={genStatus === 'idle' ? () => setIsSitePickerVisible(true) : undefined}
                    >
                      <Text style={s.dropdownBtnText}>{selectedSite}</Text>
                      <MaterialIcons name="expand-more" size={24} color={Colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>

                  {/* Format */}
                  <View style={s.formGroup}>
                    <Text style={s.formLabel}>Format</Text>
                    <View style={s.formatRow}>
                      {/* PDF Option */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          s.formatCard,
                          format === 'pdf' && s.formatCardActive,
                          genStatus !== 'idle' && { opacity: 0.6 },
                        ]}
                        onPress={genStatus === 'idle' ? () => setFormat('pdf') : undefined}
                      >
                        <MaterialIcons name="picture-as-pdf" size={20} color="#E74C3C" />
                        <Text style={s.formatCardText}>PDF</Text>
                      </TouchableOpacity>

                      {/* Excel Option */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          s.formatCard,
                          format === 'excel' && s.formatCardActive,
                          genStatus !== 'idle' && { opacity: 0.6 },
                        ]}
                        onPress={genStatus === 'idle' ? () => setFormat('excel') : undefined}
                      >
                        <MaterialIcons name="table-chart" size={20} color="#27AE60" />
                        <Text style={s.formatCardText}>Excel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Submit / Generate Button */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      s.actionBtn,
                      genStatus === 'generating' && s.actionBtnGenerating,
                      genStatus === 'ready' && s.actionBtnReady,
                    ]}
                    onPress={genStatus === 'idle' ? handleGenerate : undefined}
                  >
                    {genStatus === 'idle' ? (
                      <>
                        <Text style={s.actionBtnText}>Generate Report</Text>
                        <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                      </>
                    ) : genStatus === 'generating' ? (
                      <>
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <MaterialIcons name="sync" size={20} color="#FFFFFF" />
                        </Animated.View>
                        <Text style={s.actionBtnText}>Processing...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={20} color="#10B981" />
                        <Text style={[s.actionBtnText, { color: '#10B981' }]}>Download Ready</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Animated.View>

          {/* Selector Dropdown Modal */}
          <Modal
            visible={isSitePickerVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsSitePickerVisible(false)}
          >
            <TouchableOpacity
              style={s.modalBackdrop}
              activeOpacity={1}
              onPress={() => setIsSitePickerVisible(false)}
            >
              <View style={s.sitePickerContent}>
                <View style={s.pickerHeader}>
                  <Text style={s.pickerTitle}>Select Site</Text>
                  <TouchableOpacity onPress={() => setIsSitePickerVisible(false)}>
                    <MaterialIcons name="close" size={22} color={Colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={SITE_OPTIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={s.pickerOption}
                      onPress={() => {
                        setSelectedSite(item);
                        setIsSitePickerVisible(false);
                      }}
                    >
                      <Text style={s.pickerOptionText}>{item}</Text>
                      {selectedSite === item && (
                        <MaterialIcons name="check" size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      )}

      {/* ═══ Bottom Navigation (Floating pill style) ═══ */}
      <View style={[s.bottomNav, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        {navItems.map((item) => {
          const isActive = item.key === 'more';
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.navItem, isActive && s.navItemActive]}
              activeOpacity={0.7}
              onPress={() => handleNavPress(item.key)}
            >
              <MaterialIcons
                name={item.icon as any}
                size={24}
                color={isActive ? '#ffffff' : Colors.onSurfaceVariant}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  topBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.screenPadding,
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
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatarSmallImage: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
    gap: Spacing.stackLg,
  },
  introBlock: {
    gap: 6,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  introSub: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  bentoGrid: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.xl,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  featuredCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    height: 256,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,39,82,0.85)',
  },
  featuredContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  featuredText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    maxWidth: 280,
  },
  trendsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.default,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trendsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
    marginVertical: 12,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 6,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  sheetSub: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 16,
  },
  sheetForm: {
    gap: 20,
  },
  categoryInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.default,
    alignSelf: 'flex-start',
  },
  categoryInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
    gap: 8,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    height: 48,
    paddingHorizontal: 14,
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    padding: 0,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    height: 48,
    paddingHorizontal: 14,
  },
  dropdownBtnText: {
    fontSize: 14,
    color: Colors.onSurface,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.lg,
    height: 48,
    backgroundColor: '#ffffff',
  },
  formatCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0,39,82,0.05)',
  },
  formatCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  actionBtnGenerating: {
    backgroundColor: Colors.primaryContainer,
  },
  actionBtnReady: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sitePickerContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '50%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderColor: '#F1F5F9',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  // ── Bottom Nav (Floating pill style) ──
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: '5%',
    right: '5%',
    width: '90%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 208, 0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    zIndex: 100,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
  },
  navItemActive: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
