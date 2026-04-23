import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useFamilyStore } from '../../src/store/useFamilyStore';
import { useSchoolStore } from '../../src/store/useSchoolStore';
import { toIsoDate, todayIso } from '../../src/utils/date-utils';
import type { SchoolEvent } from '../../src/types/family.types';

// ── date helpers ──────────────────────────────────────────────────────────────

function getMondayOfWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7; // ISO: Mon=1 … Sun=7
  const result = new Date(jan4);
  result.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7);
  return result;
}

const DAY_LABELS = ['man', 'tir', 'ons', 'tor', 'fre'] as const;

// ── sub-components ────────────────────────────────────────────────────────────

function ReminderItem({ event, isLast }: { event: SchoolEvent; isLast: boolean }) {
  return (
    <>
      <View className="flex-row items-start gap-3 p-4">
        <View className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-semibold text-gray-800">{event.title}</Text>
            <Text className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              Påminnelse
            </Text>
          </View>
          {!!event.description && (
            <Text className="mt-0.5 text-sm text-gray-500">{event.description}</Text>
          )}
        </View>
      </View>
      {!isLast && <View className="mx-4 h-px bg-amber-100" />}
    </>
  );
}

function HomeworkItem({
  event,
  onToggle,
  isLast,
}: {
  event: SchoolEvent;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <>
      <View className="flex-row items-start gap-3 p-4">
        <TouchableOpacity
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border-2 ${
            event.completed ? 'border-blue-500 bg-blue-500' : 'border-blue-300'
          }`}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          {event.completed && (
            <Text className="text-[10px] font-bold text-white">✓</Text>
          )}
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className={`font-semibold ${
              event.completed ? 'text-gray-400 line-through' : 'text-gray-800'
            }`}
          >
            {event.title}
          </Text>
          {!!event.description && (
            <Text
              className={`mt-0.5 text-sm ${
                event.completed ? 'text-gray-300' : 'text-gray-500'
              }`}
            >
              {event.description}
            </Text>
          )}
        </View>
      </View>
      {!isLast && <View className="mx-4 h-px bg-blue-100" />}
    </>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function SkoleScreen() {
  const isLoading = useFamilyStore((s) => s.isLoading);
  const familyChildren = useFamilyStore((s) => s.children);
  const plansMap = useFamilyStore((s) => s.plansMap);
  const toggleHomework = useSchoolStore((s) => s.toggleHomeworkCompletion);

  // ── local state ───────────────────────────────────────────────────────────

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const day = new Date().getDay(); // 0=Sun … 6=Sat
    return day >= 1 && day <= 5 ? day - 1 : 0; // default to today (Mon=0 … Fri=4)
  });
  const [infoExpanded, setInfoExpanded] = useState(true);

  // Select first child once children load
  useEffect(() => {
    if (selectedChildId === null && familyChildren.length > 0) {
      setSelectedChildId(familyChildren[0].id);
    }
  }, [familyChildren.length]);

  // ── derived data ──────────────────────────────────────────────────────────

  const childPlans = selectedChildId ? (plansMap[selectedChildId] ?? []) : [];
  const latestPlan = childPlans.length > 0 ? childPlans[childPlans.length - 1] : null;

  const weekDates = useMemo(() => {
    if (!latestPlan) return [] as string[];
    const monday = getMondayOfWeek(latestPlan.metadata.uke, latestPlan.metadata.aar);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return toIsoDate(d);
    });
  }, [latestPlan?.metadata.uke, latestPlan?.metadata.aar]);

  // When the plan changes: select today if it falls in this week, else Monday
  useEffect(() => {
    if (!weekDates.length) return;
    const today = todayIso();
    const idx = weekDates.indexOf(today);
    setSelectedDayIndex(idx !== -1 ? idx : 0);
  }, [weekDates]);

  const selectedDayIso = weekDates[selectedDayIndex] ?? null;

  const infoEvents = useMemo(
    () => (latestPlan ? latestPlan.events.filter((e) => e.category === 'information') : []),
    [latestPlan],
  );

  const dayEvents = useMemo(
    () =>
      latestPlan && selectedDayIso
        ? latestPlan.events.filter((e) => e.date === selectedDayIso)
        : [],
    [latestPlan, selectedDayIso],
  );

  const dayReminders = dayEvents.filter((e) => e.category === 'reminder');
  const dayHomework = dayEvents.filter((e) => e.category === 'homework');

  const daysWithReminders = useMemo(() => {
    if (!latestPlan) return new Set<string>();
    return new Set(
      latestPlan.events.filter((e) => e.category === 'reminder').map((e) => e.date),
    );
  }, [latestPlan]);

  // ── swipe to change day ───────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) setSelectedDayIndex((i) => Math.min(4, i + 1));
        else if (gs.dx > 50) setSelectedDayIndex((i) => Math.max(0, i - 1));
      },
    }),
  ).current;

  const todayStr = todayIso();

  // ── loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  // ── no children ───────────────────────────────────────────────────────────

  if (familyChildren.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-5xl">📅</Text>
        <Text className="mt-4 text-lg font-bold text-gray-800">Ingen barn registrert</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Legg til barn under Innstillinger for å se ukeplaner.
        </Text>
      </SafeAreaView>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ── Child selector ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {familyChildren.map((child) => {
          const isActive = child.id === selectedChildId;
          return (
            <TouchableOpacity
              key={child.id}
              className={`rounded-2xl px-4 py-2 ${isActive ? 'bg-white' : 'bg-gray-100'}`}
              style={isActive ? { borderWidth: 2, borderColor: child.color, elevation: 2 } : undefined}
              onPress={() => setSelectedChildId(child.id)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {child.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── No plan for this child ── */}
      {!latestPlan ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl">📅</Text>
          <Text className="mt-4 text-xl font-bold text-gray-800">Ingen ukeplan ennå</Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Skann en ukeplan for å komme i gang.
          </Text>
          <TouchableOpacity
            className="mt-6 flex-row items-center gap-2 rounded-2xl bg-gray-200 px-6 py-3.5 opacity-60"
            disabled
          >
            <Camera size={18} color="#6B7280" />
            <Text className="font-semibold text-gray-500">Skann ukeplan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1" {...panResponder.panHandlers}>
          {/* ── Week header ── */}
          <View className="flex-row items-center justify-between px-4 pb-2">
            <Text className="text-lg font-bold text-gray-900">
              Uke {latestPlan.metadata.uke}
              {latestPlan.metadata.trinn ? (
                <Text className="text-sm font-normal text-gray-400">
                  {' '}· {latestPlan.metadata.trinn}
                </Text>
              ) : null}
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2"
              onPress={() =>
                Alert.alert('Kommer snart', 'Skanner-funksjonaliteten er under utvikling.')
              }
              activeOpacity={0.8}
            >
              <Camera size={15} color="#6366F1" />
              <Text className="text-xs font-semibold text-indigo-600">Ny skann</Text>
            </TouchableOpacity>
          </View>

          {/* ── Day selector ── */}
          <View className="flex-row justify-between px-4 pb-3">
            {weekDates.map((isoDate, idx) => {
              const isSelected = idx === selectedDayIndex;
              const isToday = isoDate === todayStr;
              const hasReminder = daysWithReminders.has(isoDate);
              const dayNum = parseInt(isoDate.split('-')[2], 10);

              return (
                <TouchableOpacity
                  key={isoDate}
                  className={`mx-0.5 flex-1 items-center rounded-xl py-2 ${
                    isSelected ? 'bg-blue-500' : isToday ? 'bg-blue-50' : ''
                  }`}
                  onPress={() => setSelectedDayIndex(idx)}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-[11px] font-medium ${
                      isSelected ? 'text-white' : isToday ? 'text-blue-500' : 'text-gray-500'
                    }`}
                  >
                    {DAY_LABELS[idx]}
                  </Text>
                  <Text
                    className={`text-base font-bold ${
                      isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {dayNum}
                  </Text>
                  <View className="mt-1 h-1.5 w-1.5 items-center justify-center">
                    {hasReminder && (
                      <View className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Day content ── */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 100,
              paddingTop: 4,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* A: Information (week-wide, collapsible) */}
            {infoEvents.length > 0 && (
              <View className="mb-3 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">
                <TouchableOpacity
                  className="flex-row items-center justify-between p-4"
                  onPress={() => setInfoExpanded((v) => !v)}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">ℹ️</Text>
                    <Text className="font-semibold text-emerald-800">Informasjon</Text>
                    <Text className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      {infoEvents.length}
                    </Text>
                  </View>
                  {infoExpanded ? (
                    <ChevronUp size={16} color="#065F46" />
                  ) : (
                    <ChevronDown size={16} color="#065F46" />
                  )}
                </TouchableOpacity>

                {infoExpanded && (
                  <>
                    <View className="mx-4 h-px bg-emerald-200" />
                    {infoEvents.map((ev, i) => (
                      <View key={i}>
                        <View className="p-4">
                          <Text className="font-semibold text-emerald-900">{ev.title}</Text>
                          {!!ev.description && (
                            <Text className="mt-0.5 text-sm text-emerald-700">
                              {ev.description}
                            </Text>
                          )}
                        </View>
                        {i < infoEvents.length - 1 && (
                          <View className="mx-4 h-px bg-emerald-100" />
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* B: Reminders for selected day */}
            {dayReminders.length > 0 && (
              <View className="mb-3">
                <Text className="mb-2 text-sm font-semibold text-amber-600">Påminnelser</Text>
                <View className="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
                  {dayReminders.map((ev, i) => (
                    <ReminderItem
                      key={i}
                      event={ev}
                      isLast={i === dayReminders.length - 1}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* C: Homework for selected day */}
            {dayHomework.length > 0 && (
              <View className="mb-3">
                <Text className="mb-2 text-sm font-semibold text-blue-600">Lekser</Text>
                <View className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
                  {dayHomework.map((ev, i) => (
                    <HomeworkItem
                      key={i}
                      event={ev}
                      isLast={i === dayHomework.length - 1}
                      onToggle={() =>
                        selectedChildId &&
                        toggleHomework(selectedChildId, ev.date, ev.title)
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Empty day */}
            {dayReminders.length === 0 && dayHomework.length === 0 && (
              <View className="mb-3 items-center rounded-2xl bg-white py-10">
                <Text className="text-3xl">✅</Text>
                <Text className="mt-2 font-medium text-gray-600">
                  Ingen oppgaver denne dagen
                </Text>
              </View>
            )}

            {/* D: Original plan thumbnails (placeholder until scan flow is implemented) */}
            <View className="mb-3">
              <Text className="mb-2 text-sm font-semibold text-gray-400">Originalplan</Text>
              <View className="flex-row gap-3">
                <View className="flex-1 items-center rounded-2xl bg-gray-100 py-7">
                  <Text className="text-2xl">📄</Text>
                  <Text className="mt-1 text-xs font-medium text-gray-400">Ukeplan</Text>
                </View>
                <View className="flex-1 items-center rounded-2xl bg-gray-100 py-7 opacity-50">
                  <Text className="text-2xl">📄</Text>
                  <Text className="mt-1 text-xs font-medium text-gray-400">Timeplan</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}
