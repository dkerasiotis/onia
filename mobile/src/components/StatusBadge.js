import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColors, statusLabels } from '../utils/theme';

export default function StatusBadge({ status }) {
  const color = statusColors[status] || statusColors.open;
  const label = statusLabels[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 50,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
