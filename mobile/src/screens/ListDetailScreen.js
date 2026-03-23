import React, { useState, useCallback } from 'react';
import {
  View, Text, SectionList, StyleSheet, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, statusLabels, statusColors } from '../utils/theme';
import ItemRow from '../components/ItemRow';
import StatusBadge from '../components/StatusBadge';

export default function ListDetailScreen({ route, navigation }) {
  const { listId } = route.params;
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/lists/${listId}`);
      setList(data);
      navigation.setOptions({ title: data.title });
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') return;
      Alert.alert('Σφάλμα', e.message);
    }
  }, [listId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadList();
    setRefreshing(false);
  }

  async function toggleItem(item) {
    try {
      const action = item.is_bought ? 'unbuy' : 'buy';
      await apiFetch(`/api/lists/${listId}/items/${item.id}/${action}`, { method: 'POST' });
      await loadList();
    } catch (e) {
      Alert.alert('Σφάλμα', e.message);
    }
  }

  async function claimList() {
    try {
      await apiFetch(`/api/lists/${listId}/claim`, { method: 'POST' });
      await loadList();
    } catch (e) {
      Alert.alert('Σφάλμα', e.message);
    }
  }

  async function unclaimList() {
    try {
      await apiFetch(`/api/lists/${listId}/unclaim`, { method: 'POST' });
      await loadList();
    } catch (e) {
      Alert.alert('Σφάλμα', e.message);
    }
  }

  async function completeList() {
    Alert.alert('Ολοκλήρωση', 'Ολοκλήρωση λίστας;', [
      { text: 'Ακύρωση', style: 'cancel' },
      {
        text: 'Ολοκλήρωση',
        onPress: async () => {
          try {
            await apiFetch(`/api/lists/${listId}/complete`, { method: 'POST' });
            navigation.goBack();
          } catch (e) {
            Alert.alert('Σφάλμα', e.message);
          }
        },
      },
    ]);
  }

  async function copyList() {
    try {
      const newList = await apiFetch(`/api/lists/${listId}/copy`, {
        method: 'POST',
        body: {},
      });
      Alert.alert('Επιτυχία', 'Η λίστα αντιγράφηκε!');
      navigation.replace('ListDetail', { listId: newList.id, title: newList.title });
    } catch (e) {
      Alert.alert('Σφάλμα', e.message);
    }
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Φόρτωση...</Text>
      </View>
    );
  }

  const isCompleted = list.status === 'completed';
  const isClaimer = list.claimed_by === user?.id;
  const bought = list.items.filter(i => i.is_bought).length;
  const total = list.items.length;
  const pct = total ? Math.round((bought / total) * 100) : 0;

  // Group items by category
  const grouped = {};
  for (const item of list.items) {
    const cat = item.category_name || 'Χωρίς κατηγορία';
    if (!grouped[cat]) grouped[cat] = { icon: item.category_icon || '📦', data: [] };
    grouped[cat].data.push(item);
  }
  const sections = Object.entries(grouped).map(([title, { icon, data }]) => ({
    title: `${icon} ${title}`,
    data,
  }));

  return (
    <View style={styles.container}>
      {/* Info Header */}
      <View style={styles.infoBar}>
        <View style={styles.infoRow}>
          <StatusBadge status={list.status} />
          <Text style={styles.infoText}>
            {list.claimed_by_name ? `🙋 ${list.claimed_by_name}` : 'Κανείς δεν ανέλαβε'}
          </Text>
        </View>
        {list.notes ? <Text style={styles.notes}>{list.notes}</Text> : null}

        {/* Progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{bought}/{total} ({pct}%)</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isCompleted && !list.claimed_by && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionClaim]} onPress={claimList}>
            <Text style={styles.actionText}>🙋 Ανάληψη</Text>
          </TouchableOpacity>
        )}
        {!isCompleted && (isClaimer || user?.role === 'admin') && list.claimed_by && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]} onPress={unclaimList}>
            <Text style={styles.actionTextSecondary}>↩ Ακύρωση</Text>
          </TouchableOpacity>
        )}
        {!isCompleted && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionComplete]} onPress={completeList}>
            <Text style={styles.actionText}>✓ Ολοκλήρωση</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]} onPress={copyList}>
          <Text style={styles.actionTextSecondary}>📋 Αντιγραφή</Text>
        </TouchableOpacity>
      </View>

      {/* Items */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ItemRow item={item} onToggle={toggleItem} disabled={isCompleted} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Η λίστα είναι κενή</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  infoBar: {
    backgroundColor: colors.s1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  notes: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.s2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
    minWidth: 70,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 10,
    backgroundColor: colors.s1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionClaim: {
    backgroundColor: colors.blue + '20',
    borderColor: colors.blue + '40',
  },
  actionComplete: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '40',
  },
  actionSecondary: {
    backgroundColor: colors.s2,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  actionTextSecondary: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  sectionHeader: {
    backgroundColor: colors.s2,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
