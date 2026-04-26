import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';
import { colors } from '../../src/theme';

export default function DashboardScreen() {
  const { accessToken, username } = useAuthStore();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(accessToken!),
    enabled: !!accessToken,
  });

  const getEventEmoji = (type: string) => {
    const map: Record<string, string> = {
      birthday: '🎂', wedding: '💍', anniversary: '💑',
      graduation: '🎓', babyshower: '👶', custom: '🎊',
    };
    return map[type] || '🎉';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, <Text style={styles.username}>{username}</Text></Text>
          <Text style={styles.subtitle}>Your events</Text>
        </View>
        <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(app)/events/new')}>
          <Text style={styles.newButtonText}>+ New Event</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 80 }} />
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎊</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>Let AI help you plan your perfect event from scratch</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(app)/events/new')}>
            <Text style={styles.createButtonText}>Plan an Event →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.eventCard} onPress={() => router.push(`/(app)/events/${item.eventId}`)}>
              <Text style={styles.eventEmoji}>{getEventEmoji(item.type)}</Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDate}>{item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'Date TBD'}</Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'planning' ? '#1E3A5F' : '#064E3B' }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'planning' ? colors.accentGlow : colors.success }]}>
                    ● {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  greeting: { fontSize: 18, color: colors.text, fontWeight: '600' },
  username: { color: colors.accentGlow },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, letterSpacing: 0.5 },
  newButton: { backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newButtonText: { color: colors.accentGlow, fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 10 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 36, lineHeight: 22 },
  createButton: { backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  createButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  eventCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  eventEmoji: { fontSize: 32, marginRight: 14 },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  eventDate: { fontSize: 12, color: colors.textSecondary },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  arrow: { fontSize: 24, color: colors.textSecondary },
});
