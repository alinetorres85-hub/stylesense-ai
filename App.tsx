// StyleSense AI — guarda-roupa inteligente (MVP)
// Navegação em abas simples (sem biblioteca de router).

import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { theme } from './src/theme';
import { WardrobeProvider } from './src/store';
import { TodayScreen } from './src/screens/TodayScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { SudokuScreen } from './src/screens/SudokuScreen';
import { InspirationScreen } from './src/screens/InspirationScreen';
import { DiaryScreen } from './src/screens/DiaryScreen';
import { SavedLooksScreen } from './src/screens/SavedLooksScreen';

type Tab = 'today' | 'wardrobe' | 'sudoku' | 'inspo' | 'diary' | 'saved' | 'add';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Hoje', icon: '✨' },
  { id: 'wardrobe', label: 'Closet', icon: '🧺' },
  { id: 'sudoku', label: 'Sudoku', icon: '🧩' },
  { id: 'inspo', label: 'Inspira', icon: '💡' },
  { id: 'diary', label: 'Diário', icon: '📸' },
  { id: 'saved', label: 'Salvos', icon: '❤️' },
  { id: 'add', label: 'Add', icon: '＋' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [editingId, setEditingId] = useState<string | null>(null);

  function openEdit(id: string) {
    setEditingId(id);
    setTab('add');
  }

  function goToAdd(fresh = true) {
    if (fresh) setEditingId(null);
    setTab('add');
  }

  return (
    <WardrobeProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.screen}>
          {tab === 'today' && <TodayScreen onAdd={() => goToAdd()} />}
          {tab === 'wardrobe' && (
            <WardrobeScreen onAdd={() => goToAdd()} onEdit={openEdit} />
          )}
          {tab === 'sudoku' && <SudokuScreen onAdd={() => goToAdd()} />}
          {tab === 'inspo' && <InspirationScreen onAdd={() => goToAdd()} />}
          {tab === 'diary' && <DiaryScreen />}
          {tab === 'saved' && <SavedLooksScreen onAdd={() => goToAdd()} />}
          {tab === 'add' && (
            <AddItemScreen
              key={editingId ?? 'new'}
              editId={editingId}
              onDone={() => {
                setEditingId(null);
                setTab('wardrobe');
              }}
            />
          )}
        </View>

        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={styles.tab}
                onPress={() => {
                  if (t.id === 'add') setEditingId(null);
                  setTab(t.id);
                }}
              >
                <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                  <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{t.icon}</Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </WardrobeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 1 },
  tabIconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  tabIconWrapActive: { backgroundColor: theme.colors.accentSoft },
  tabIcon: { fontSize: 18, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 9.5, color: theme.colors.muted, fontWeight: '500' },
  tabLabelActive: { color: theme.colors.accent, fontWeight: '800' },
});
