import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { colors } from '../utils/theme';
import ListCard from '../components/ListCard';

export default function HistoryScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiFetch('/api/lists?status=completed');
      setLists(data);
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') return;
      console.log('Error loading history:', e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }

  function renderItem({ item }) {
    return (
      <ListCard
        list={item}
        onPress={() => navigation.navigate('ListDetail', { listId: item.id, title: item.title })}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyText}>Δεν υπάρχει ιστορικό</Text>
          </View>
        }
        contentContainerStyle={lists.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', padding: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
