import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import { colors } from '../utils/theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert('Σφάλμα', 'Συμπλήρωσε όλα τα πεδία');
      return;
    }
    try {
      await apiFetch('/api/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      Alert.alert('Επιτυχία', 'Ο κωδικός άλλαξε');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      Alert.alert('Σφάλμα', e.message);
    }
  }

  function handleLogout() {
    Alert.alert('Αποσύνδεση', 'Θέλεις να αποσυνδεθείς;', [
      { text: 'Ακύρωση', style: 'cancel' },
      {
        text: 'Αποσύνδεση',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Προφίλ</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Χρήστης</Text>
          <Text style={styles.value}>{user?.displayName || user?.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Ρόλος</Text>
          <Text style={styles.value}>{user?.role === 'admin' ? 'Διαχειριστής' : 'Χρήστης'}</Text>
        </View>
      </View>

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Αλλαγή Κωδικού</Text>
        <TextInput
          style={styles.input}
          placeholder="Τρέχων κωδικός"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Νέος κωδικός"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity style={styles.btnPrimary} onPress={changePassword}>
          <Text style={styles.btnText}>Αλλαγή Κωδικού</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Αποσύνδεση</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Ώνια v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14 },
  card: {
    backgroundColor: colors.s1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 14, color: colors.textMuted },
  value: { fontSize: 14, color: colors.text, fontWeight: '500' },
  input: {
    backgroundColor: colors.s2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 10,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: colors.red + '15',
    borderWidth: 1,
    borderColor: colors.red + '30',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
  version: {
    textAlign: 'center',
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
  },
});
