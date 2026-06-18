import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { fetchInventoryItemById, fetchInventoryLogs, deleteInventoryItem, InventoryItem, InventoryLog } from '../api/inventoryApi';
import Header from '../components/Header';

export default function InventoryDetailScreen({ route, navigation }: any) {
  const s = useScaledStyles(styles);
  const itemId = route.params?.id;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemData, logsData] = await Promise.all([
        fetchInventoryItemById(itemId),
        fetchInventoryLogs(itemId)
      ]);
      setItem(itemData);
      setLogs(logsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load item details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [itemId])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this inventory item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInventoryItem(itemId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#059669'; // Green
      case 'In Repair': return '#D97706'; // Orange
      case 'Lost': return '#DC2626'; // Red
      case 'Decommissioned': return '#6B7280'; // Gray
      default: return '#3B82F6'; // Blue
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading || !item) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Header 
        title="Item Details" 
        onBack={() => navigation.goBack()} 
        rightComponent={
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate('AddEditInventory', { id: itemId })}>
              <MaterialIcons name="edit" size={24} color="#1A3D6D" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <MaterialIcons name="delete" size={24} color="#DC2626" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Card */}
        <View style={s.headerCard}>
          <View style={s.iconWrapper}>
            <MaterialIcons 
              name={item.category === 'Scanner' ? 'scanner' : item.category === 'Vehicle' ? 'directions-car' : 'inventory'} 
              size={32} 
              color="#1A3D6D" 
            />
          </View>
          <Text style={s.productName}>{item.product_name}</Text>
          <Text style={s.categoryText}>{item.category} • SN: {item.serial_number || 'N/A'}</Text>
          
          <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[s.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>

        {/* Assignment Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Current Assignment</Text>
          
          <View style={s.infoRow}>
            <View style={s.infoIconWrapper}>
              <MaterialIcons name="person" size={20} color="#747780" />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Holder Name</Text>
              <Text style={s.infoValue}>{item.current_holder_name || 'Unassigned'}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.infoRow}>
            <View style={s.infoIconWrapper}>
              <MaterialIcons name="phone" size={20} color="#747780" />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Contact</Text>
              <Text style={s.infoValue}>{item.current_holder_contact || 'N/A'}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.infoRow}>
            <View style={s.infoIconWrapper}>
              <MaterialIcons name="location-on" size={20} color="#747780" />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Location</Text>
              <Text style={s.infoValue}>{item.current_holder_address || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Audit Logs */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Activity History</Text>
          {logs.length === 0 ? (
            <Text style={s.emptyText}>No activity recorded yet.</Text>
          ) : (
            logs.map((log, index) => (
              <View key={log.id} style={s.logItem}>
                <View style={s.logTimeline}>
                  <View style={s.logDot} />
                  {index !== logs.length - 1 && <View style={s.logLine} />}
                </View>
                <View style={s.logContent}>
                  <Text style={s.logAction}>
                    {log.action === 'CREATED' && 'Item added to inventory'}
                    {log.action === 'UPDATED_HOLDER' && `Reassigned to ${log.new_holder_name}`}
                    {log.action === 'STATUS_CHANGED' && `Status changed to ${log.new_status}`}
                  </Text>
                  <Text style={s.logDate}>
                    {formatDate(log.created_at || '')}
                    {log.users?.name && ` • by ${log.users.name}`}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screenPadding,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E7EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111C2C',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#747780',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111C2C',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#747780',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#111C2C',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#747780',
    fontStyle: 'italic',
  },
  logItem: {
    flexDirection: 'row',
  },
  logTimeline: {
    width: 24,
    alignItems: 'center',
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A3D6D',
    marginTop: 4,
  },
  logLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 4,
  },
  logContent: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  logAction: {
    fontSize: 14,
    color: '#111C2C',
    fontWeight: '500',
    marginBottom: 4,
  },
  logDate: {
    fontSize: 12,
    color: '#747780',
  },
});
