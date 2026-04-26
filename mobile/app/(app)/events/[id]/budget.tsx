import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

export default function BudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [actualVal, setActualVal] = useState('');

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: planning = [], isLoading } = useQuery({ queryKey: ['planning', id], queryFn: () => api.getPlanning(accessToken!, id), enabled: !!accessToken && !!id });

  const budgetData = planning.find((p: any) => p.category === 'BUDGET')?.content;
  const aiPlan = planning.find((p: any) => p.category === 'AI_PLAN')?.content;

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.savePlanning(accessToken!, id, { category: 'BUDGET', content: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planning', id] }),
  });

  const generateBudget = async () => {
    if (!event) return;
    setGenerating(true);
    try {
      const eventContext = { ...event, aiPlan };
      const res = await api.ai(accessToken!, 'generate-plan', { eventId: id, eventContext });
      const budget = res.plan?.budget;
      if (budget) await saveMutation.mutateAsync(budget);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const saveActual = async () => {
    if (editIdx === null || !budgetData) return;
    const updated = JSON.parse(JSON.stringify(budgetData));
    updated.breakdown[editIdx].actual = parseFloat(actualVal) || 0;
    await saveMutation.mutateAsync(updated);
    setEditIdx(null);
  };

  const totalEstimated = budgetData?.breakdown?.reduce((s: number, i: any) => s + (i.estimated || 0), 0) || 0;
  const totalActual = budgetData?.breakdown?.reduce((s: number, i: any) => s + (i.actual || 0), 0) || 0;
  const overBudget = totalActual > totalEstimated;

  return (
    <View style={styles.container}>
      <EventHeader title={event?.title || ''} eventDate={event?.eventDate} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !budgetData ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>No budget yet</Text>
            <Text style={styles.emptyText}>AI will generate a budget breakdown by category based on your event.</Text>
            <TouchableOpacity style={styles.genBtn} onPress={generateBudget} disabled={generating}>
              {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.genBtnText}>✨ Generate Budget</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={[styles.summaryCard, overBudget && styles.overBudgetCard]}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>ESTIMATED</Text>
                  <Text style={styles.summaryValue}>${totalEstimated.toFixed(0)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>ACTUAL</Text>
                  <Text style={[styles.summaryValue, { color: overBudget ? colors.danger : colors.success }]}>${totalActual.toFixed(0)}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{overBudget ? 'OVER' : 'REMAINING'}</Text>
                  <Text style={[styles.summaryValue, { color: overBudget ? colors.danger : colors.success }]}>
                    ${Math.abs(totalEstimated - totalActual).toFixed(0)}
                  </Text>
                </View>
              </View>
              {overBudget && <Text style={styles.overBudgetText}>⚠️ Over budget by ${(totalActual - totalEstimated).toFixed(0)}</Text>}
            </View>

            <TouchableOpacity style={styles.regenBtn} onPress={generateBudget} disabled={generating}>
              <Text style={styles.regenBtnText}>{generating ? 'Regenerating...' : '✨ Regenerate'}</Text>
            </TouchableOpacity>

            {/* Line items */}
            {budgetData.breakdown?.map((item: any, i: number) => {
              const pct = totalEstimated > 0 ? (item.estimated / totalEstimated) * 100 : 0;
              return (
                <TouchableOpacity key={i} style={styles.lineItem} onPress={() => { setEditIdx(i); setActualVal(String(item.actual || '')); }}>
                  <View style={styles.lineTop}>
                    <Text style={styles.lineCategory}>{item.category}</Text>
                    <View style={styles.lineAmounts}>
                      <Text style={styles.lineEstimated}>${item.estimated}</Text>
                      <Text style={styles.lineSep}>/</Text>
                      <Text style={[styles.lineActual, { color: (item.actual || 0) > item.estimated ? colors.danger : colors.success }]}>
                        ${item.actual || 0}
                      </Text>
                    </View>
                  </View>
                  {item.notes && <Text style={styles.lineNotes}>{item.notes}</Text>}
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal visible={editIdx !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Update Actual Spend</Text>
            <Text style={styles.modalCategory}>{editIdx !== null ? budgetData?.breakdown?.[editIdx]?.category : ''}</Text>
            <TextInput style={styles.modalInput} value={actualVal} onChangeText={setActualVal} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.textDim} autoFocus />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditIdx(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveActual}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  genBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  genBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  overBudgetCard: { borderColor: colors.danger },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 1 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },
  overBudgetText: { fontSize: 12, color: colors.danger, textAlign: 'center', marginTop: 10, fontWeight: '600' },
  regenBtn: { alignSelf: 'flex-end', backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  regenBtnText: { color: colors.accentGlow, fontSize: 12, fontWeight: '600' },
  lineItem: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineCategory: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  lineAmounts: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lineEstimated: { fontSize: 13, color: colors.textSecondary },
  lineSep: { fontSize: 13, color: colors.textDim },
  lineActual: { fontSize: 14, fontWeight: '700' },
  lineNotes: { fontSize: 11, color: colors.textSecondary },
  progressBg: { height: 4, backgroundColor: colors.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', gap: 14, borderWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalCategory: { fontSize: 13, color: colors.textSecondary },
  modalInput: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.borderBright, borderRadius: 10, padding: 14, fontSize: 24, color: colors.text, textAlign: 'center', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
});
