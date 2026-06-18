import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { usePersonnelCategory } from '../context/PersonnelCategoryContext';
import { useNotifications } from '../context/NotificationContext';

const getIconForType = (type: string) => {
  switch (type) {
    case 'shift_reminder': return 'schedule';
    case 'attendance_alert': return 'access-time';
    case 'salary_generated': return 'payments';
    case 'inspection_reminder': return 'fact-check';
    case 'recruitment_update': return 'group-add';
    case 'complaint_raised': return 'report-problem';
    case 'complaint_escalated_l2': return 'trending-up';
    case 'complaint_escalated_l3': return 'warning';
    case 'replacement_assigned': return 'person-add';
    case 'vacancy_escalated': return 'alarm-on';
    default: return 'notifications';
  }
};

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function NotificationCenterScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const insets = useSafeAreaInsets();
  const { getLabel } = usePersonnelCategory();

  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications, isLoading } = useNotifications();

  const [listOpacity] = useState(new Animated.Value(1));

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleItemPress = (id: string) => {
    markAsRead(id);
  };

  const handleRefreshFeed = () => {
    refreshNotifications();
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

  const navItems = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'guards', icon: 'security', label: getLabel('plural') },
    { key: 'sites', icon: 'location-on', label: 'Sites' },
    { key: 'more', icon: 'menu', label: 'More' },
  ];

  return (
    <View style={s.container}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />

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
            <Text style={s.topBarTitle} numberOfLines={1}>
              Notifications
            </Text>
          </View>
          {unreadCount > 0 && notifications.length > 0 && (
            <TouchableOpacity activeOpacity={0.7} onPress={handleMarkAllRead}>
              <Text style={s.markReadText}>MARK ALL READ</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && notifications.length === 0 ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : notifications.length > 0 ? (
          <Animated.View style={[s.listContainer, { opacity: listOpacity }]}>
            {notifications.map((item) => {
              const isUnread = !item.is_read;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  style={[
                    s.notificationItem,
                    isUnread ? s.itemUnread : s.itemRead,
                  ]}
                  onPress={() => handleItemPress(item.id)}
                >
                  {/* Left blue unread dot */}
                  {isUnread && <View style={s.unreadDot} />}

                  {/* Icon wrap */}
                  <View
                    style={[
                      s.iconCircle,
                      isUnread ? s.iconCircleUnread : s.iconCircleRead,
                    ]}
                  >
                    <MaterialIcons
                      name={getIconForType(item.type) as any}
                      size={22}
                      color={isUnread ? Colors.primary : Colors.outline}
                    />
                  </View>

                  {/* Body text */}
                  <View style={s.itemTextWrap}>
                    <View style={s.itemHeader}>
                      <Text
                        style={[
                          s.itemTitle,
                          isUnread ? s.titleUnread : s.titleRead,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={s.itemTime}>{formatTime(item.created_at)}</Text>
                    </View>
                    <Text
                      style={[
                        s.itemBody,
                        isUnread ? s.bodyUnread : s.bodyRead,
                      ]}
                      numberOfLines={2}
                    >
                      {item.body}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <MaterialIcons name="notifications-off" size={48} color={Colors.outline} />
            </View>
            <Text style={s.emptyTitle}>You're all caught up! 🎉</Text>
            <Text style={s.emptySub}>No new notifications</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s.refreshBtn}
              onPress={handleRefreshFeed}
            >
              <Text style={s.refreshBtnText}>REFRESH FEED</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

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
    flex: 1,
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.stackMd,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listContainer: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  itemUnread: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: 'rgba(195,198,208,0.3)',
  },
  itemRead: {
    backgroundColor: 'rgba(250,249,253,0.5)',
    borderColor: 'transparent',
  },
  unreadDot: {
    position: 'absolute',
    left: 4,
    top: '50%',
    transform: [{ translateY: -4 }],
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3f5f91',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleUnread: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  iconCircleRead: {
    backgroundColor: Colors.surfaceContainer,
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 13,
  },
  titleUnread: {
    fontWeight: '700',
    color: Colors.onSurface,
  },
  titleRead: {
    fontWeight: '500',
    color: Colors.onSurface,
    opacity: 0.8,
  },
  itemTime: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    opacity: 0.6,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bodyUnread: {
    color: Colors.onSurfaceVariant,
  },
  bodyRead: {
    color: Colors.onSurfaceVariant,
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emptySub: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  refreshBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
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
