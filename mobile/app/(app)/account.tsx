import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme';

export default function AccountScreen() {
  const { username, signOut } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>USERNAME</Text>
        <Text style={styles.value}>{username}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>PLAN</Text>
        <Text style={styles.value}>Free — pay per event</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 24, paddingTop: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  card: { margin: 16, marginBottom: 0, backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 6 },
  label: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  value: { fontSize: 16, color: colors.text, fontWeight: '500' },
  logoutButton: { margin: 16, marginTop: 32, backgroundColor: '#1A0A0A', borderWidth: 1, borderColor: colors.danger, borderRadius: 10, padding: 16, alignItems: 'center' },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
