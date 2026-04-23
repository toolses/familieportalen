import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function KalenderScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Kalender</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Familiekalender og samværsplan kommer snart.
        </Text>
      </View>
    </SafeAreaView>
  );
}
