import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { colors } from '../utils/theme';
import ListCard from '../components/ListCard';

export default function ListsScreen({ navigation }) {
  const [lists, setLists] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      const data = await apiFetch('/api/lists');
      setLists(data);
    } catch (e) {
      if (e.message === 'AUTH_EXPIRED') return;
      console.log('Error loading lists:', e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [loadLists])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadLists();
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

  function renderEmpty() {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>Δεν υπάρχουν ενεργές λίστες αγορών.</Text>
        <Text style={styles.emptyHint}>Δημιούργησε μια λίστα από το web app</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
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
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    padding: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textDim,
  },
});
