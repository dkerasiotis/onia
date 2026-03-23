import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';
import PriorityBadge from './PriorityBadge';

export default function ItemRow({ item, onToggle, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.row, item.is_bought && styles.rowBought]}
      onPress={() => !disabled && onToggle?.(item)}
      activeOpacity={disabled ? 1 : 0.6}
    >
      <View style={[styles.check, item.is_bought && styles.checkChecked]}>
        {item.is_bought ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, item.is_bought && styles.nameBought]}>
          {item.product_name}
        </Text>
        <View style={styles.detailRow}>
          <Text style={styles.qty}>{item.quantity} {item.unit}</Text>
          <PriorityBadge priority={item.priority} />
        </View>
      </View>

      {item.bought_by_name ? (
        <Text style={styles.buyer}>{item.bought_by_name}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  rowBought: {
    opacity: 0.45,
  },
  check: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  nameBought: {
    textDecorationLine: 'line-through',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qty: {
    fontSize: 12,
    color: colors.textMuted,
  },
  buyer: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
