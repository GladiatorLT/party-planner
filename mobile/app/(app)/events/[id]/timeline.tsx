import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

export default function TimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: planning = [], isLoading } = useQuery({ queryKey: ['planning', id], queryFn: () => api.getPlanning(accessToken!, id), enabled: !!accessToken && !!id });

  const timelineData = planning.find((p: any) => p.category === 'TIMELINE')?.content;
  const aiPlan = planning.find((p: any) => p.category === 'AI_PLAN')?.content;

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.savePlanning(accessToken!, id, { category: 'TIMELINE', content: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planning', id] }),
  });

  const generateTimeline = async () => {
    if (!event) return;
    setGenerating(true);
    try {
      const eventContext = { ...event, aiPlan };
      const res = await api.ai(accessToken!, 'generate-timeline', { eventId: id, eventContext });
      await saveMutation.mutateAsync(res.timeline);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = async (phaseIdx: number, taskIdx: number) => {
    if (!timelineData) return;
    const updated = JSON.parse(JSON.stringify(timelineData));
    updated.phases[phaseIdx].tasks[taskIdx].completed = !updated.phases[phaseIdx].tasks[taskIdx].completed;
    await saveMutation.mutateAsync(updated);
  };

  const priorityColor = (p: string) => p === 'high' ? colors.danger : p === 'medium' ? colors.warning : colors.success;

  return (
    <View style={styles.container}>
      <EventHeader title={event?.title || ''} eventDate={event?.eventDate} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !timelineData ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No timeline yet</Text>
            <Text style={styles.emptyText}>Let AI generate a full planning timeline with tasks and deadlines based on your event date.</Text>
            <TouchableOpacity style={styles.genBtn} onPress={generateTimeline} disabled={generating}>
              {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.genBtnText}>✨ Generate Timeline</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.regenBtn} onPress={generateTimeline} disabled={generating}>
              <Text style={styles.regenBtnText}>{generating ? 'Regenerating...' : '✨ Regenerate'}</Text>
            </TouchableOpacity>
            {timelineData.phases?.map((phase: any, pi: number) => (
              <View key={pi} style={styles.phase}>
                <Text style={styles.phaseTitle}>{phase.name}</Text>
                <Text style={styles.phaseDates}>{phase.startDate} → {phase.endDate}</Text>
                {phase.tasks?.map((task: any, ti: number) => (
                  <TouchableOpacity key={ti} style={styles.task} onPress={() => toggleTask(pi, ti)}>
                    <View style={[styles.checkbox, task.completed && styles.checkboxDone]}>
                      {task.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, task.completed && styles.taskDone]}>{task.title}</Text>
                      <Text style={styles.taskDesc}>{task.description}</Text>
                      <View style={styles.taskMeta}>
                        <View style={[styles.priorityBadge, { backgroundColor: priorityColor(task.priority) + '22' }]}>
                          <Text style={[styles.priorityText, { color: priorityColor(task.priority) }]}>{task.priority}</Text>
                        </View>
                        {task.dueDate && <Text style={styles.dueDate}>Due: {task.dueDate}</Text>}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  genBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  genBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  regenBtn: { alignSelf: 'flex-end', backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  regenBtnText: { color: colors.accentGlow, fontSize: 12, fontWeight: '600' },
  phase: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  phaseTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  phaseDates: { fontSize: 11, color: colors.textSecondary, marginTop: -6 },
  task: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskContent: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  taskDone: { textDecorationLine: 'line-through', color: colors.textSecondary },
  taskDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  taskMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  priorityText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dueDate: { fontSize: 11, color: colors.textSecondary },
});
