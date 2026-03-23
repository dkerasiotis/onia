import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { priorityColors, priorityLabels } from '../utils/theme';

export default function PriorityBadge({ priority }) {
  const color = priorityColors[priority] || priorityColors.normal;
  const label = priorityLabels[priority] || priority;

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
