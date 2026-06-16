import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import ClientTopNav from '../components/ClientTopNav';
import ClientBottomNav from '../components/ClientBottomNav';
import VisitorLogView from '../components/VisitorLogView';
import { getClientSiteInfo } from '../api/clientPortalService';
import { getVisitorLogsForSite } from '../api/visitorLogService';
import { VisitorLog } from '../types/workforce';

export default function ClientVisitorLogScreen({ navigation }: { navigation: any }) {
  const s = useScaledStyles(styles);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const siteInfo = await getClientSiteInfo();
        if (siteInfo?.id) {
          const fetchedLogs = await getVisitorLogsForSite(siteInfo.id);
          setLogs(fetchedLogs);
        }
      } catch (err) {
        console.error('Error fetching visitor logs for client:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <View style={s.container}>
      <ClientTopNav showBack title="Visitor Log" />
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40, flex: 1 }} />
      ) : (
        <VisitorLogView logs={logs} showAddButton={false} />
      )}

      <ClientBottomNav activeTab="more" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
