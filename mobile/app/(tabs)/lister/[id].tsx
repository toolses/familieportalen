import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  House,
  ShoppingBag,
  Briefcase,
  RotateCcw,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react-native';
import { useListStore } from '../../../src/store/useListStore';
import type { ShoppingList, ListItem } from '../../../src/store/useListStore';

function listIcon(type: ShoppingList['type']) {
  if (type === 'bytte-hus') return <House size={20} color="#7c3aed" />;
  if (type === 'handleliste') return <ShoppingBag size={20} color="#16a34a" />;
  return <Briefcase size={20} color="#f97316" />;
}

function listIconBg(type: ShoppingList['type']) {
  if (type === 'bytte-hus') return 'bg-purple-100';
  if (type === 'handleliste') return 'bg-green-100';
  return 'bg-orange-100';
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lists = useListStore((s) => s.lists);
  const isLoading = useListStore((s) => s.isLoading);
  const addItem = useListStore((s) => s.addItem);
  const deleteItem = useListStore((s) => s.deleteItem);
  const toggleItemStatus = useListStore((s) => s.toggleItemStatus);
  const resetList = useListStore((s) => s.resetList);
  const removeCompletedItems = useListStore((s) => s.removeCompletedItems);

  const list = lists.find((l) => l.id === id);

  const [newItemText, setNewItemText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  // Items visually marked as done but not yet written to Firestore
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set());
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Cancel all pending timers on unmount
  useEffect(() => {
    return () => {
      for (const t of Object.values(timers.current)) clearTimeout(t);
    };
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (!list) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-center text-gray-500">
          Listen ble ikke funnet.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="font-semibold text-indigo-500">
            Tilbake til lister
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const activeItems = list.items.filter((i) => !i.completed);
  const completedItems = list.items.filter((i) => i.completed);
  const totalCount = list.items.length;
  const doneCount = completedItems.length;

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleTapActiveItem = (item: ListItem) => {
    if (pendingItems.has(item.id)) {
      // Undo: cancel the pending commit
      clearTimeout(timers.current[item.id]);
      delete timers.current[item.id];
      setPendingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    } else {
      // Mark as pending and start 1-second commit timer
      setPendingItems((prev) => new Set(prev).add(item.id));
      timers.current[item.id] = setTimeout(() => {
        toggleItemStatus(list.id, item.id, true);
        setPendingItems((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        delete timers.current[item.id];
      }, 1000);
    }
  };

  const handleDeleteItem = (item: ListItem) => {
    // Cancel any pending timer before deleting
    if (pendingItems.has(item.id)) {
      clearTimeout(timers.current[item.id]);
      delete timers.current[item.id];
      setPendingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
    deleteItem(list.id, item.id);
  };

  const handleAddItem = async () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    await addItem(list.id, trimmed);
    setNewItemText('');
  };

  const handleReset = () => {
    Alert.alert(
      'Nullstille listen?',
      'Dette vil fjerne avhukingen på alle elementene slik at listen er klar til neste gang. Er du sikker?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Nullstill',
          style: 'destructive',
          onPress: () => resetList(list.id),
        },
      ],
    );
  };

  const handleRemoveCompleted = () => {
    Alert.alert(
      'Fjerne fullførte?',
      'Dette sletter alle fullførte punkter permanent.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Fjern alle',
          style: 'destructive',
          onPress: () => removeCompletedItems(list.id),
        },
      ],
    );
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-4">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View
          className={`h-9 w-9 items-center justify-center rounded-xl ${listIconBg(list.type)}`}
        >
          {listIcon(list.type)}
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold leading-tight text-gray-900">
            {list.title}
          </Text>
          <Text className="text-xs text-gray-400">
            {totalCount === 0
              ? 'Tom liste'
              : `${doneCount} av ${totalCount} fullført`}
          </Text>
        </View>
        {doneCount > 0 && (
          <TouchableOpacity
            onPress={handleReset}
            className="rounded-xl bg-white p-2 shadow-sm"
            hitSlop={4}
          >
            <RotateCcw size={19} color="#6366f1" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {totalCount === 0 ? (
            <View className="mt-10 items-center">
              <Text className="text-center text-gray-400">
                Listen er tom. Legg til punkter nedenfor.
              </Text>
            </View>
          ) : (
            <>
              {/* Active items */}
              {activeItems.length > 0 && (
                <View className="mb-3 overflow-hidden rounded-2xl bg-white shadow-sm">
                  {activeItems.map((item, idx) => {
                    const isPending = pendingItems.has(item.id);
                    return (
                      <View key={item.id}>
                        <View className="flex-row items-center gap-3 px-4 py-3.5">
                          {/* Check circle */}
                          <TouchableOpacity
                            onPress={() => handleTapActiveItem(item)}
                            className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                              isPending
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}
                            activeOpacity={0.7}
                          >
                            {isPending && (
                              <Check
                                size={12}
                                color="white"
                                strokeWidth={3}
                              />
                            )}
                          </TouchableOpacity>

                          {/* Label */}
                          <TouchableOpacity
                            onPress={() => handleTapActiveItem(item)}
                            className="flex-1"
                            activeOpacity={0.7}
                          >
                            <Text
                              className={`text-base ${
                                isPending
                                  ? 'text-gray-400 line-through'
                                  : 'text-gray-800'
                              }`}
                            >
                              {item.text}
                            </Text>
                          </TouchableOpacity>

                          {/* Delete */}
                          <TouchableOpacity
                            onPress={() => handleDeleteItem(item)}
                            hitSlop={8}
                            className="p-1"
                          >
                            <X size={16} color="#9ca3af" />
                          </TouchableOpacity>
                        </View>
                        {idx < activeItems.length - 1 && (
                          <View className="mx-4 h-px bg-gray-100" />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Completed items – collapsible */}
              {completedItems.length > 0 && (
                <View className="mb-3 overflow-hidden rounded-2xl bg-white shadow-sm">
                  {/* Section header */}
                  <TouchableOpacity
                    onPress={() => setShowCompleted((v) => !v)}
                    className="flex-row items-center justify-between px-4 py-3.5"
                    activeOpacity={0.7}
                  >
                    <Text className="font-semibold text-gray-500">
                      {completedItems.length} fullført
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {showCompleted && completedItems.length > 1 && (
                        <TouchableOpacity
                          onPress={handleRemoveCompleted}
                          className="rounded-lg bg-red-50 px-2 py-1"
                          activeOpacity={0.7}
                        >
                          <Text className="text-xs font-semibold text-red-500">
                            Fjern alle
                          </Text>
                        </TouchableOpacity>
                      )}
                      {showCompleted ? (
                        <ChevronUp size={18} color="#9ca3af" />
                      ) : (
                        <ChevronDown size={18} color="#9ca3af" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Completed items list */}
                  {showCompleted &&
                    completedItems.map((item) => (
                      <View key={item.id}>
                        <View className="mx-4 h-px bg-gray-100" />
                        <View className="flex-row items-center gap-3 px-4 py-3.5">
                          <TouchableOpacity
                            onPress={() =>
                              toggleItemStatus(list.id, item.id, false)
                            }
                            className="h-6 w-6 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-500"
                            activeOpacity={0.7}
                          >
                            <Check size={12} color="white" strokeWidth={3} />
                          </TouchableOpacity>
                          <Text className="flex-1 text-base text-gray-400 line-through">
                            {item.text}
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}

          <View className="h-24" />
        </ScrollView>

        {/* Fixed input at bottom */}
        <View className="border-t border-gray-100 bg-white px-4 py-3">
          <View className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 pl-4 pr-1.5 py-1">
            <TextInput
              className="flex-1 py-2 text-base text-gray-800"
              placeholder="Legg til nytt punkt..."
              placeholderTextColor="#9ca3af"
              value={newItemText}
              onChangeText={setNewItemText}
              returnKeyType="done"
              onSubmitEditing={handleAddItem}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleAddItem}
              disabled={!newItemText.trim()}
              className={`h-9 w-9 items-center justify-center rounded-lg ${
                newItemText.trim() ? 'bg-indigo-500' : 'bg-gray-200'
              }`}
              activeOpacity={0.7}
            >
              <Plus
                size={18}
                color={newItemText.trim() ? 'white' : '#9ca3af'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
