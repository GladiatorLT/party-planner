import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../../src/store/authStore';
import { api } from '../../../../src/services/api';
import { colors } from '../../../../src/theme';
import EventHeader from '../../../../src/components/EventHeader';

export default function MenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: event } = useQuery({ queryKey: ['event', id], queryFn: () => api.getEvent(accessToken!, id), enabled: !!accessToken && !!id });
  const { data: planning = [], isLoading } = useQuery({ queryKey: ['planning', id], queryFn: () => api.getPlanning(accessToken!, id), enabled: !!accessToken && !!id });

  const menuData = planning.find((p: any) => p.category === 'MENU')?.content;
  const aiPlan = planning.find((p: any) => p.category === 'AI_PLAN')?.content;

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.savePlanning(accessToken!, id, { category: 'MENU', content: data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planning', id] }),
  });

  const generateMenu = async () => {
    if (!event) return;
    setGenerating(true);
    try {
      const eventContext = { ...event, aiPlan };
      const res = await api.ai(accessToken!, 'generate-menu', { eventId: id, eventContext });
      await saveMutation.mutateAsync(res.menu);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <EventHeader title={event?.title || ''} eventDate={event?.eventDate} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : !menuData ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No menu yet</Text>
            <Text style={styles.emptyText}>Let AI create a full menu with recipes and shopping list based on your event details.</Text>
            <TouchableOpacity style={styles.genBtn} onPress={generateMenu} disabled={generating}>
              {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.genBtnText}>✨ Generate Menu</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.regenBtn} onPress={generateMenu} disabled={generating}>
              <Text style={styles.regenBtnText}>{generating ? 'Regenerating...' : '✨ Regenerate'}</Text>
            </TouchableOpacity>

            {menuData.menu && (
              <>
                {['appetizers', 'mainCourse', 'desserts', 'drinks', 'babyFriendly'].map(cat => {
                  const items = menuData.menu[cat];
                  if (!items || items.length === 0) return null;
                  return (
                    <View key={cat} style={styles.section}>
                      <Text style={styles.sectionTitle}>{cat.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text>
                      {items.map((item: any, i: number) => (
                        <View key={i} style={styles.menuItem}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          {item.recipe && <Text style={styles.itemRecipe}>{item.recipe}</Text>}
                          {item.servings && <Text style={styles.itemMeta}>Serves {item.servings} • {item.prepTime}</Text>}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </>
            )}

            {menuData.shoppingList && menuData.shoppingList.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🛒 SHOPPING LIST</Text>
                {menuData.shoppingList.map((item: any, i: number) => (
                  <View key={i} style={styles.shopItem}>
                    <Text style={styles.shopName}>{item.item}</Text>
                    <Text style={styles.shopQty}>{item.quantity} • ${item.estimatedCost?.toFixed(2) || '?'}</Text>
                  </View>
                ))}
                {menuData.totalEstimatedCost && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalValue}>${menuData.totalEstimatedCost.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 14, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  genBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8, shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  genBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  regenBtn: { alignSelf: 'flex-end', backgroundColor: colors.surfaceHigh, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  regenBtnText: { color: colors.accentGlow, fontSize: 12, fontWeight: '600' },
  section: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  sectionTitle: { fontSize: 11, color: colors.accentGlow, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  menuItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 4 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemRecipe: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  itemMeta: { fontSize: 11, color: colors.textDim },
  shopItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  shopName: { fontSize: 13, color: colors.text, flex: 1 },
  shopQty: { fontSize: 12, color: colors.textSecondary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 2, borderTopColor: colors.accent },
  totalLabel: { fontSize: 12, fontWeight: '700', color: colors.accentGlow, letterSpacing: 1 },
  totalValue: { fontSize: 16, fontWeight: '700', color: colors.accentGlow },
});
