import { View, Text, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect, Polygon, Circle } from 'react-native-svg';
import { useAuthStore } from '../store/auth.store';

function FamilieportalenLogo() {
  return (
    <Svg width={28} height={28} viewBox="0 0 512 512" style={{ borderRadius: 6 }}>
      <Defs>
        <LinearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4f46e5" />
          <Stop offset="100%" stopColor="#7c3aed" />
        </LinearGradient>
      </Defs>
      <Rect width={512} height={512} rx={96} ry={96} fill="url(#hbg)" />
      <Polygon points="256,88 432,248 80,248" fill="white" opacity={0.95} />
      <Rect x={112} y={248} width={288} height={188} rx={4} fill="white" opacity={0.95} />
      <Rect x={210} y={320} width={92} height={116} rx={10} fill="#4f46e5" />
      <Circle cx={290} cy={382} r={7} fill="white" opacity={0.8} />
      <Rect x={136} y={284} width={68} height={60} rx={8} fill="#4f46e5" opacity={0.7} />
      <Rect x={308} y={284} width={68} height={60} rx={8} fill="#4f46e5" opacity={0.7} />
      <Rect x={316} y={126} width={40} height={80} rx={4} fill="white" opacity={0.9} />
    </Svg>
  );
}

export default function Header() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  return (
    <View
      className="bg-white shadow-sm"
      style={{ paddingTop: insets.top }}
    >
      <View className="mx-auto w-full max-w-2xl flex-row items-center justify-between px-4 py-3">
        {/* Logo + Title */}
        <View className="flex-row items-center gap-2">
          <FamilieportalenLogo />
          <Text className="text-lg font-bold text-gray-900">Familieportalen</Text>
        </View>

        {/* User avatar */}
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            className="h-8 w-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
            <Text className="text-sm font-semibold text-indigo-600">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
