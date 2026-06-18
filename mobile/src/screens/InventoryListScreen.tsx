import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { fetchInventoryItems, InventoryItem } from '../api/inventoryApi';
import Header from '../components/Header';

export default function InventoryListScreen({ navigation }: any) {
  const s = useScaledStyles(styles);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const loadItems = async () => {
    try {
      const data = await fetchInventoryItems();
      setItems(data);
      applyFilters(data, searchQuery, filterStatus);
    } catch (error) {
      console.error('Failed to load inventory', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const applyFilters = (data: InventoryItem[], query: string, status: string) => {
    let result = data;
    if (status !== 'All') {
      result = result.filter(i => i.status === status);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        i =>
          i.product_name.toLowerCase().includes(q) ||
          i.serial_number?.toLowerCase().includes(q) ||
          i.current_holder_name?.toLowerCase().includes(q)
      );
    }
    setFilteredItems(result);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(items, text, filterStatus);
  };

  const handleFilter = (status: string) => {
    setFilterStatus(status);
    applyFilters(items, searchQuery, status);
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

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.card}
      onPress={() => navigation.navigate('InventoryDetail', { id: item.id })}
    >
      <View style={s.cardHeader}>
        <View style={s.cardTitleRow}>
          <View style={s.iconWrapper}>
            <MaterialIcons 
              name={item.category === 'Scanner' ? 'scanner' : item.category === 'Vehicle' ? 'directions-car' : 'inventory'} 
              size={20} 
              color="#1A3D6D" 
            />
          </View>
          <View>
            <Text style={s.productName}>{item.product_name}</Text>
            <Text style={s.serialNumber}>SN: {item.serial_number || 'N/A'}</Text>
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[s.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={s.cardBody}>
        <View style={s.infoRow}>
          <MaterialIcons name="person" size={16} color="#747780" />
          <Text style={s.infoText}>{item.current_holder_name || 'Unassigned'}</Text>
        </View>
        <View style={s.infoRow}>
          <MaterialIcons name="location-on" size={16} color="#747780" />
          <Text style={s.infoText} numberOfLines={1}>{item.current_holder_address || 'Location Unknown'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <Header title="Inventory Management" onBack={() => navigation.goBack()} />

      <View style={s.searchContainer}>
        <View style={s.searchBar}>
          <MaterialIcons name="search" size={20} color="#747780" />
          <TextInput
            style={s.searchInput}
            placeholder="Search products, serials, or holders..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#747780"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <MaterialIcons name="close" size={20} color="#747780" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.filterScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', 'Active', 'In Repair', 'Lost', 'Decommissioned']}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: Spacing.screenPadding, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.filterPill, filterStatus === item && s.filterPillActive]}
              onPress={() => handleFilter(item)}
            >
              <Text style={[s.filterPillText, filterStatus === item && s.filterPillTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={s.centerContainer}>
          <MaterialIcons name="inventory-2" size={48} color="#C3C6D0" />
          <Text style={s.emptyText}>No inventory items found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />
          }
        />
      )}

      <TouchableOpacity
        style={s.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddEditInventory')}
      >
        <MaterialIcons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
  searchContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111C2C',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#1A3D6D',
    borderColor: '#1A3D6D',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#747780',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111C2C',
    marginBottom: 2,
  },
  serialNumber: {
    fontSize: 12,
    color: '#747780',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  emptyText: {
    fontSize: 15,
    color: '#747780',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A3D6D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#1A3D6D',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
