import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  House,
  ShoppingBag,
  Briefcase,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useListStore } from '../../../src/store/useListStore';
import type { ShoppingList } from '../../../src/store/useListStore';

function progressText(list: ShoppingList): string {
  const total = list.items.length;
  if (total === 0) return 'Tom liste';
  const done = list.items.filter((i) => i.completed).length;
  return `${done} av ${total} fullført`;
}

function FixedListCard({
  list,
  iconBg,
  icon,
}: {
  list: ShoppingList;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="mb-2 flex-row items-center rounded-2xl bg-white px-4 py-4 shadow-sm"
      onPress={() => router.push({ pathname: '/lister/[id]', params: { id: list.id } })}
      activeOpacity={0.7}
    >
      <View
        className={`mr-4 h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-gray-900">{list.title}</Text>
        <Text className="text-sm text-gray-400">{progressText(list)}</Text>
      </View>
      <ChevronRight size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function ListerScreen() {
  const lists = useListStore((s) => s.lists);
  const isLoading = useListStore((s) => s.isLoading);
  const addList = useListStore((s) => s.addList);
  const deleteList = useListStore((s) => s.deleteList);

  const [showModal, setShowModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [saving, setSaving] = useState(false);

  const bytteHus = lists.find((l) => l.type === 'bytte-hus');
  const handleliste = lists.find((l) => l.type === 'handleliste');
  const pakkelister = lists.filter((l) => l.type === 'pakkeliste');

  const handleAddList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    setSaving(true);
    await addList(trimmed, 'pakkeliste');
    setSaving(false);
    setNewListName('');
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewListName('');
  };

  const handleDeleteList = (list: ShoppingList) => {
    Alert.alert(`Slett "${list.title}"?`, 'Dette kan ikke angres.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: () => deleteList(list.id),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <Text className="text-2xl font-bold text-gray-900">Lister</Text>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="flex-row items-center gap-1.5 rounded-xl bg-indigo-500 px-3 py-2"
          activeOpacity={0.8}
        >
          <Plus size={15} color="white" />
          <Text className="text-sm font-semibold text-white">Ny pakkeliste</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          {/* Faste lister */}
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Faste lister
          </Text>

          {bytteHus && (
            <FixedListCard
              list={bytteHus}
              iconBg="bg-purple-100"
              icon={<House size={22} color="#7c3aed" />}
            />
          )}
          {handleliste && (
            <FixedListCard
              list={handleliste}
              iconBg="bg-green-100"
              icon={<ShoppingBag size={22} color="#16a34a" />}
            />
          )}

          {/* Pakkelister */}
          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Pakkelister
          </Text>

          {pakkelister.length === 0 ? (
            <View className="items-center rounded-2xl bg-white px-4 py-8">
              <Text className="text-center text-sm text-gray-400">
                Ingen pakkelister ennå. Trykk &quot;+ Ny pakkeliste&quot; for å
                komme i gang.
              </Text>
            </View>
          ) : (
            pakkelister.map((list) => (
              <TouchableOpacity
                key={list.id}
                className="mb-2 flex-row items-center rounded-2xl bg-white px-4 py-4 shadow-sm"
                onPress={() => router.push({ pathname: '/lister/[id]', params: { id: list.id } })}
                activeOpacity={0.7}
              >
                <View className="mr-4 h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                  <Briefcase size={22} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    {list.title}
                  </Text>
                  <Text className="text-sm text-gray-400">
                    {progressText(list)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteList(list)}
                  className="p-2"
                  hitSlop={8}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          <View className="h-8" />
        </ScrollView>
      )}

      {/* Ny pakkeliste – bottom sheet modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <Pressable className="flex-1 bg-black/40" onPress={handleCloseModal} />
          <View className="rounded-t-3xl bg-white px-4 pb-10 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900">
                Ny pakkeliste
              </Text>
              <TouchableOpacity onPress={handleCloseModal} hitSlop={8}>
                <X size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
              placeholder="Navn på liste..."
              placeholderTextColor="#9ca3af"
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddList}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCloseModal}
                className="flex-1 items-center rounded-xl border border-gray-200 py-3"
                activeOpacity={0.7}
              >
                <Text className="font-semibold text-gray-500">Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddList}
                disabled={saving || !newListName.trim()}
                className="flex-1 items-center rounded-xl bg-indigo-500 py-3"
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="font-semibold text-white">Opprett</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
