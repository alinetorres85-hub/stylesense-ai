// StyleSense AI — guarda-roupa inteligente (MVP)
// Navegação em abas simples (sem biblioteca de router).

import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { theme } from './src/theme';
import { fontMap, patchDefaultFont } from './src/fonts';
import { WardrobeProvider } from './src/store';
import { TodayScreen } from './src/screens/TodayScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { SudokuScreen } from './src/screens/SudokuScreen';
import { InspirationScreen } from './src/screens/InspirationScreen';
import { DiaryScreen } from './src/screens/DiaryScreen';
import { SavedLooksScreen } from './src/screens/SavedLooksScreen';
import { registerPwa } from './src/webPwa';

// Aplica a fonte moderna globalmente, antes do primeiro render.
patchDefaultFont();

type Tab = 'today' | 'wardrobe' | 'sudoku' | 'inspo' | 'diary' | 'saved' | 'add';
type IonName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { id: Tab; label: string; icon: IonName; iconActive: IonName }[] = [
  { id: 'today', label: 'Hoje', icon: 'sparkles-outline', iconActive: 'sparkles' },
  { id: 'wardrobe', label: 'Closet', icon: 'shirt-outline', iconActive: 'shirt' },
  { id: 'sudoku', label: 'Sudoku', icon: 'grid-outline', iconActive: 'grid' },
  { id: 'inspo', label: 'Inspira', icon: 'bulb-outline', iconActive: 'bulb' },
  { id: 'diary', label: 'Diário', icon: 'camera-outline', iconActive: 'camera' },
  { id: 'saved', label: 'Salvos', icon: 'heart-outline', iconActive: 'heart' },
  { id: 'add', label: 'Novo', icon: 'add', iconActive: 'add' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fontsLoaded] = useFonts(fontMap);

  useEffect(() => {
    registerPwa();
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.splash} />;
  }

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
            const isAdd = t.id === 'add';
            return (
              <Pressable
                key={t.id}
                style={styles.tab}
                onPress={() => {
                  if (isAdd) setEditingId(null);
                  setTab(t.id);
                }}
              >
                {isAdd ? (
                  <View style={styles.addButton}>
                    <Ionicons name="add" size={26} color="#FFFFFF" />
                  </View>
                ) : (
                  <Ionicons
                    name={active ? t.iconActive : t.icon}
                    size={23}
                    color={active ? theme.colors.accent : theme.colors.muted}
                  />
                )}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    active && styles.tabLabelActive,
                    isAdd && styles.tabLabelAdd,
                  ]}
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
  splash: { flex: 1, backgroundColor: theme.colors.bg },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 1 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    ...theme.shadow.accent,
  },
  tabLabel: {
    fontSize: 9.5,
    color: theme.colors.muted,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabLabelActive: { color: theme.colors.accent, fontWeight: '800' },
  tabLabelAdd: { color: theme.colors.accent, fontWeight: '700' },
});
