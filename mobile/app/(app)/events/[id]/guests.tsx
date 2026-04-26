import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

const RSVP_COLORS: Record<string, string> = {
  pending: colors.warning,
  yes: colors.success,
  no: colors.danger,
  maybe: colors.purple,
};

export default function GuestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dietary, setDietary] = useState('');

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: guests = [], isLoading } = useQuery({ queryKey: ['guests', id], queryFn: () => api.getGuests(accessToken!, id), enabled: !!accessToken && !!id });

  const addMutation = useMutation({
    mutationFn: () => api.addGuest(accessToken!, id, { name, email, phone, dietaryRestrictions: dietary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', id] });
      setShowAdd(false); setName(''); setEmail(''); setPhone(''); setDietary('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (guestId: string) => api.deleteGuest(accessToken!, id, guestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guests', id] }),
  });

  const rsvpCounts = guests.reduce((acc: any, g: any) => {
    acc[g.rsvpStatus] = (acc[g.rsvpStatus] || 0) + 1;
    return acc;
  }, {});

  const copyRsvpLink = (token: string) => {
    const link = `http://localhost:8081/guest/${token}`;
    Alert.alert('RSVP Link', link, [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      <EventHeader title={event?.title || ''} eventDate={event?.eventDate} />
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[['Total', guests.length, colors.accentGlow], ['Yes', rsvpCounts.yes || 0, colors.success], ['No', rsvpCounts.no || 0, colors.danger], ['Pending', rsvpCounts.pending || 0, colors.warning]].map(([label, count, color]) => (
            <View key={label as string} style={styles.statCard}>
              <Text style={[styles.statNum, { color: color as string }]}>{count as number}</Text>
              <Text style={styles.statLabel}>{label as string}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add Guest</Text>
        </TouchableOpacity>

        {isLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : guests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No guests yet</Text>
            <Text style={styles.emptyText}>Add guests to send them invitations and track RSVPs.</Text>
          </View>
        ) : guests.map((guest: any) => (
          <View key={guest.guestId} style={styles.guestCard}>
            <View style={styles.guestAvatar}>
              <Text style={styles.guestInitial}>{guest.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{guest.name}</Text>
              {guest.email && <Text style={styles.guestEmail}>{guest.email}</Text>}
              {guest.dietaryRestrictions && <Text style={styles.guestDietary}>🥗 {guest.dietaryRestrictions}</Text>}
            </View>
            <View style={styles.guestActions}>
              <View style={[styles.rsvpBadge, { backgroundColor: (RSVP_COLORS[guest.rsvpStatus] || colors.textSecondary) + '22' }]}>
                <Text style={[styles.rsvpText, { color: RSVP_COLORS[guest.rsvpStatus] || colors.textSecondary }]}>{guest.rsvpStatus}</Text>
              </View>
              {guest.rsvpToken && (
                <TouchableOpacity onPress={() => copyRsvpLink(guest.rsvpToken)}>
                  <Text style={styles.linkIcon}>🔗</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => Alert.alert('Delete', `Remove ${guest.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(guest.guestId) }])}>
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Guest</Text>
            {[['Name *', name, setName, false], ['Email', email, setEmail, false], ['Phone', phone, setPhone, false], ['Dietary restrictions', dietary, setDietary, false]].map(([label, val, setter]) => (
              <View key={label as string} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label as string}</Text>
                <TextInput style={styles.input} value={val as string} onChangeText={setter as any} placeholderTextColor={colors.textDim} placeholder={label as string} />
              </View>
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => addMutation.mutate()} disabled={!name || addMutation.isPending}>
                {addMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: colors.accentDim, borderWidth: 1, borderColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center' },
  addBtnText: { color: colors.accentGlow, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  guestCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 12 },
  guestAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  guestInitial: { color: colors.accentGlow, fontWeight: '700', fontSize: 16 },
  guestInfo: { flex: 1, gap: 2 },
  guestName: { fontSize: 14, fontWeight: '600', color: colors.text },
  guestEmail: { fontSize: 12, color: colors.textSecondary },
  guestDietary: { fontSize: 11, color: colors.textSecondary },
  guestActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rsvpBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  rsvpText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  linkIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: colors.text },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
