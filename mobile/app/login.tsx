import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';

export default function LoginScreen() {
  const { signInWithGoogle, isSigningIn, isReady, error } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-12 items-center">
          <Text className="text-4xl font-bold text-gray-900">Familieportalen</Text>
          <Text className="mt-3 text-center text-base text-gray-500">
            Logg inn for å komme i gang
          </Text>
        </View>

        {error && (
          <View className="mb-4 w-full rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-center text-sm text-red-600">
              Innlogging feilet. Prøv igjen.
            </Text>
          </View>
        )}

        <TouchableOpacity
          className="w-full flex-row items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm active:opacity-80"
          onPress={signInWithGoogle}
          disabled={!isReady || isSigningIn}
        >
          {isSigningIn ? (
            <>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text className="text-base font-semibold text-gray-500">Logger inn...</Text>
            </>
          ) : (
            <Text className="text-base font-semibold text-gray-700">
              Logg inn med Google
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
