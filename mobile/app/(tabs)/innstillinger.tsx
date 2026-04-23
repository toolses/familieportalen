import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth.store';

export default function InnstillingerScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Innstillinger</Text>
      </View>

      {/* Brukerprofil */}
      <View className="mx-4 mb-4 flex-row items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            className="h-14 w-14 rounded-full"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <Text className="text-xl font-bold text-indigo-600">
              {user?.displayName?.[0] ?? '?'}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">{user?.displayName ?? '–'}</Text>
          <Text className="text-sm text-gray-400">{user?.email ?? ''}</Text>
        </View>
      </View>

      {/* Seksjoner – kommer snart */}
      <View className="mx-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        {[
          'Google Kalender',
          'Husstand',
          'Push-varsler',
          'Samværsplan',
          'Barn',
          'Data',
        ].map((label, i, arr) => (
          <View
            key={label}
            className={`px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <Text className="text-gray-400">{label} – kommer snart</Text>
          </View>
        ))}
      </View>

      <View className="mx-4 mt-4">
        <TouchableOpacity
          onPress={signOut}
          className="items-center rounded-2xl border border-red-200 bg-white py-3.5"
        >
          <Text className="font-semibold text-red-500">Logg ut</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
