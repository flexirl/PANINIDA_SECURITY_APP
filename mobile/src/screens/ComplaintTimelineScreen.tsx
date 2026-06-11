import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { getComplaintById } from '../api/complaintService';

interface ComplaintTimelineScreenProps {
  route: any;
  navigation: any;
}

interface TimelineItem {
  id: string;
  type: 'comment' | 'escalation';
  timestamp: string;
  title: string;
  subtitle: string;
  description: string;
  extra?: string;
}

export default function ComplaintTimelineScreen({ route, navigation }: ComplaintTimelineScreenProps) {
  const { complaintId } = route.params;
  const insets = useSafeAreaInsets();
  const s = useScaledStyles(styles);

  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getComplaintById(complaintId);
        
        // Combine comments and escalations into a single chronological timeline
        const items: TimelineItem[] = [];

        // Add comments
        data.comments.forEach((c) => {
          items.push({
            id: c.id,
            type: 'comment',
            timestamp: c.created_at,
            title: c.author?.name || 'User',
            subtitle: c.author?.role || 'Staff',
            description: c.comment_text,
            extra: c.action_taken || undefined
          });
        });

        // Add escalations
        data.escalations.forEach((e) => {
          items.push({
            id: e.id,
            type: 'escalation',
            timestamp: e.escalated_at,
            title: 'System Escalation',
            subtitle: 'Escalation Engine',
            description: `Ticket escalated automatically from L${e.from_level} to L${e.to_level}.`,
            extra: e.reason || undefined
          });
        });

        // Sort chronologically ascending (oldest first)
        items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setTimelineData(items);

      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to retrieve timeline.');
      } finally {
        setLoading(false);
      }
    })();
  }, [complaintId]);

  const renderItem = ({ item, index }: { item: TimelineItem; index: number }) => {
    const isEscalation = item.type === 'escalation';
    const formattedTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <View style={s.timelineRow}>
        {/* Left axis tracker line */}
        <View style={s.axisContainer}>
          <View style={[s.dot, isEscalation && s.escalationDot]} />
          {index < timelineData.length - 1 && <View style={s.line} />}
        </View>

        {/* Right card */}
        <View style={[s.timelineCard, isEscalation && s.escalationCard]}>
          <View style={s.cardHeader}>
            <View>
              <Text style={[s.titleText, isEscalation && s.escalationTitleText]}>{item.title}</Text>
              <Text style={s.subtitleText}>{item.subtitle.toUpperCase()}</Text>
            </View>
            <Text style={s.timeText}>{formattedDate}, {formattedTime}</Text>
          </View>
          
          <Text style={s.descText}>{item.description}</Text>

          {item.extra ? (
            <View style={[s.extraBadge, isEscalation ? s.escalationExtraBadge : s.commentExtraBadge]}>
              <Text style={s.extraBadgeText}>
                {isEscalation ? `Reason: ${item.extra}` : `Action: ${item.extra}`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Complaint Timeline</Text>
        <View style={s.placeholder} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : timelineData.length === 0 ? (
        <View style={s.center}>
          <MaterialIcons name="history" size={64} color={Colors.surfaceDim} />
          <Text style={s.emptyText}>Timeline log is empty</Text>
        </View>
      ) : (
        <FlatList
          data={timelineData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[s.list, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
          showsVerticalScrollIndicator={false}
        />
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
  emptyText: {
    ...Typography.bodyBold,
    color: Colors.onSurfaceVariant,
    marginTop: 12,
  },
  list: {
    padding: Spacing.screenPadding,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  axisContainer: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    zIndex: 2,
    marginTop: 4,
  },
  escalationDot: {
    backgroundColor: Colors.secondary,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.surfaceContainerHigh,
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.xl,
    padding: 14,
    marginLeft: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  escalationCard: {
    backgroundColor: Colors.secondaryFixed,
    borderColor: Colors.secondaryFixedDim || Colors.outlineVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleText: {
    ...Typography.bodyBold,
    color: Colors.onSurface,
  },
  escalationTitleText: {
    color: Colors.onSecondaryFixed || Colors.secondary,
  },
  subtitleText: {
    ...Typography.labelSm,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.outline,
    marginTop: 2,
  },
  timeText: {
    ...Typography.labelSm,
    fontSize: 10,
    color: Colors.outline,
  },
  descText: {
    ...Typography.body,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  extraBadge: {
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.default,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  commentExtraBadge: {
    backgroundColor: Colors.primaryFixed,
  },
  escalationExtraBadge: {
    backgroundColor: Colors.secondaryFixedDim + '40',
  },
  extraBadgeText: {
    ...Typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.onSurface,
  },
});
