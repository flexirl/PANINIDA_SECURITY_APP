import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useScaledStyles } from '../context/FontSizeContext';
import { createInventoryItem, updateInventoryItem, fetchInventoryItemById, InventoryItem } from '../api/inventoryApi';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';

export default function AddEditInventoryScreen({ route, navigation }: any) {
  const s = useScaledStyles(styles);
  const { user } = useAuth();
  const editId = route.params?.id;
  const isEditing = !!editId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    product_name: '',
    category: 'Scanner',
    serial_number: '',
    status: 'Active',
    current_holder_name: '',
    current_holder_contact: '',
    current_holder_address: '',
    notes: '',
  });

  const [previousItem, setPreviousItem] = useState<InventoryItem | null>(null);

  const categories = ['Scanner', 'Communication', 'Vehicle', 'Uniform', 'Other'];
  const statuses = ['Active', 'In Repair', 'Lost', 'Decommissioned'];

  useEffect(() => {
    if (isEditing) {
      loadItemDetails();
    }
  }, [isEditing]);

  const loadItemDetails = async () => {
    try {
      const data = await fetchInventoryItemById(editId);
      setFormData({
        product_name: data.product_name,
        category: data.category,
        serial_number: data.serial_number || '',
        status: data.status,
        current_holder_name: data.current_holder_name || '',
        current_holder_contact: data.current_holder_contact || '',
        current_holder_address: data.current_holder_address || '',
        notes: data.notes || '',
      });
      setPreviousItem(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load item details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.product_name) {
      Alert.alert('Validation', 'Product name is required');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && previousItem) {
        await updateInventoryItem(editId, formData, previousItem, user?.id);
        Alert.alert('Success', 'Inventory item updated');
      } else {
        await createInventoryItem(formData, user?.id);
        Alert.alert('Success', 'Inventory item created');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save inventory item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Header title={isEditing ? 'Edit Item' : 'Add Item'} onBack={() => navigation.goBack()} />

      <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Product Details</Text>
          
          <View style={s.inputGroup}>
            <Text style={s.label}>Product Name *</Text>
            <TextInput
              style={s.input}
              value={formData.product_name}
              onChangeText={text => setFormData({ ...formData, product_name: text })}
              placeholder="e.g. Metal Detector"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Category</Text>
            <View style={s.chipContainer}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.chip, formData.category === cat && s.chipActive]}
                  onPress={() => setFormData({ ...formData, category: cat })}
                >
                  <Text style={[s.chipText, formData.category === cat && s.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Serial Number</Text>
            <TextInput
              style={s.input}
              value={formData.serial_number}
              onChangeText={text => setFormData({ ...formData, serial_number: text })}
              placeholder="e.g. SN-123456"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Status</Text>
            <View style={s.chipContainer}>
              {statuses.map(st => (
                <TouchableOpacity
                  key={st}
                  style={[s.chip, formData.status === st && s.chipActive]}
                  onPress={() => setFormData({ ...formData, status: st })}
                >
                  <Text style={[s.chipText, formData.status === st && s.chipTextActive]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Assignment Details</Text>
          
          <View style={s.inputGroup}>
            <Text style={s.label}>Current Holder Name</Text>
            <TextInput
              style={s.input}
              value={formData.current_holder_name}
              onChangeText={text => setFormData({ ...formData, current_holder_name: text })}
              placeholder="e.g. Rahul Sharma"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Holder Contact</Text>
            <TextInput
              style={s.input}
              value={formData.current_holder_contact}
              onChangeText={text => setFormData({ ...formData, current_holder_contact: text })}
              placeholder="+91 "
              keyboardType="phone-pad"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Location / Address</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={formData.current_holder_address}
              onChangeText={text => setFormData({ ...formData, current_holder_address: text })}
              placeholder="Current location of item"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Additional Information</Text>
          <View style={s.inputGroup}>
            <Text style={s.label}>Notes</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={formData.notes}
              onChangeText={text => setFormData({ ...formData, notes: text })}
              placeholder="Any additional details..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="save" size={20} color="#FFFFFF" />
              <Text style={s.saveButtonText}>Save Item</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111C2C',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    backgroundColor: '#1A3D6D',
    borderColor: '#1A3D6D',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.screenPadding,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#1A3D6D',
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
