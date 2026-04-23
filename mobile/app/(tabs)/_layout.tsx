import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, CalendarDays, BookOpen, List, Settings } from 'lucide-react-native';
import Header from '../../src/components/Header';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Header />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#ffffff',
            borderTopWidth: 0,
            elevation: 0,
            paddingBottom: insets.bottom,
            height: 56 + insets.bottom,
          },
          tabBarBlurEffect: 'systemChromeMaterial',
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Hjem',
            tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="kalender"
          options={{
            title: 'Kalender',
            tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="skole"
          options={{
            title: 'Skole',
            tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="lister"
          options={{
            title: 'Lister',
            tabBarIcon: ({ color, size }) => <List color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="innstillinger"
          options={{
            title: 'Innstillinger',
            tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          }}
        />
      </Tabs>
    </View>
  );
}
