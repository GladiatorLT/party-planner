import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';

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
          <Text style={styles.greeting}>Hello, {username}! 👋</Text>
          <Text style={styles.subtitle}>Your events</Text>
        </View>
        <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(app)/events/new')}>
          <Text style={styles.newButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#7C3AED" style={{ marginTop: 60 }} />
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎊</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyText}>Create your first event and let AI help you plan it!</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(app)/events/new')}>
            <Text style={styles.createButtonText}>Plan an Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => router.push(`/(app)/events/${item.eventId}`)}
            >
              <Text style={styles.eventEmoji}>{getEventEmoji(item.type)}</Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventDate}>{item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'Date TBD'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'planning' ? '#EDE9FE' : '#D1FAE5' }]}>
                  <Text style={[styles.statusText, { color: item.status === 'planning' ? '#7C3AED' : '#059669' }]}>
                    {item.status}
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  newButton: { backgroundColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  newButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  createButton: { backgroundColor: '#7C3AED', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  eventCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  eventEmoji: { fontSize: 36, marginRight: 12 },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  eventDate: { fontSize: 13, color: '#6B7280' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  arrow: { fontSize: 24, color: '#9CA3AF' },
});
