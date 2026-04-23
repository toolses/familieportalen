import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useFamilyStore } from '../../src/store/useFamilyStore';
import { useSchoolStore } from '../../src/store/useSchoolStore';
import { useCalendarStore } from '../../src/store/useCalendarStore';
import { toIsoDate, todayIso, formatDateShort, dayName } from '../../src/utils/date-utils';
import type {
  Child,
  TaggedSchoolEvent,
  ManualReminder,
  ManualCalendarEvent,
} from '../../src/types/family.types';

// ── helpers ───────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── sub-components ────────────────────────────────────────────────────────────

function RowDivider({ amber }: { amber?: boolean }) {
  return <View className={`h-px mx-4 ${amber ? 'bg-amber-100' : 'bg-blue-100'}`} />;
}

function SchoolReminderRow({
  event,
  isLast,
}: {
  event: TaggedSchoolEvent;
  isLast: boolean;
}) {
  return (
    <>
      <View className="flex-row items-start gap-3 p-4">
        <View
          className="mt-1 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: event.childColor }}
        />
        <View className="flex-1">
          <Text className="font-semibold text-gray-800">{event.title}</Text>
          {!!event.description && (
            <Text className="mt-0.5 text-sm text-gray-500">{event.description}</Text>
          )}
          <Text className="mt-1 text-[11px] font-semibold" style={{ color: event.childColor }}>
            {event.childName}
          </Text>
        </View>
      </View>
      {!isLast && <RowDivider amber />}
    </>
  );
}

function ManualReminderRow({
  reminder,
  familyChildren,
  isLast,
}: {
  reminder: ManualReminder;
  familyChildren: Child[];
  isLast: boolean;
}) {
  const assignees = reminder.assignedTo
    .map((a) => {
      if (a.type === 'child') {
        const child = familyChildren.find((c) => c.id === a.childId);
        return child ? { label: child.name, color: child.color } : null;
      }
      return { label: a.role, color: a.role === 'Mamma' ? '#F43F5E' : '#3B82F6' };
    })
    .filter(Boolean) as { label: string; color: string }[];

  return (
    <>
      <View className="flex-row items-start gap-3 p-4">
        <View className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-gray-800">{reminder.title}</Text>
            {!!reminder.time && (
              <Text className="text-xs text-amber-600">{reminder.time}</Text>
            )}
          </View>
          {!!reminder.description && (
            <Text className="mt-0.5 text-sm text-gray-500">{reminder.description}</Text>
          )}
          {assignees.length > 0 && (
            <View className="mt-1 flex-row flex-wrap gap-1">
              {assignees.map((a, i) => (
                <Text key={i} className="text-[11px] font-semibold" style={{ color: a.color }}>
                  {a.label}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
      {!isLast && <RowDivider amber />}
    </>
  );
}

function HomeworkRow({
  event,
  isLast,
  onToggle,
}: {
  event: TaggedSchoolEvent;
  isLast: boolean;
  onToggle: () => void;
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
            className={`font-semibold ${event.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}
          >
            {event.title}
          </Text>
          {!!event.description && (
            <Text
              className={`mt-0.5 text-sm ${event.completed ? 'text-gray-300' : 'text-gray-500'}`}
            >
              {event.description}
            </Text>
          )}
          <Text className="mt-1 text-[11px] font-semibold" style={{ color: event.childColor }}>
            {event.childName}
          </Text>
        </View>
      </View>
      {!isLast && <RowDivider />}
    </>
  );
}

function CalendarEventRow({
  event,
  isLast,
}: {
  event: ManualCalendarEvent;
  isLast: boolean;
}) {
  const timeLabel = event.isAllDay
    ? 'Hele dagen'
    : event.startTime && event.endTime
    ? `${event.startTime}–${event.endTime}`
    : (event.startTime ?? '');

  return (
    <>
      <View className="flex-row items-start gap-3 p-4">
        <View className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-semibold text-gray-800">{event.title}</Text>
            {!!timeLabel && (
              <Text className="text-xs text-indigo-500">{timeLabel}</Text>
            )}
          </View>
          {!!event.description && (
            <Text className="mt-0.5 text-sm text-gray-500">{event.description}</Text>
          )}
        </View>
      </View>
      {!isLast && <View className="h-px mx-4 bg-gray-100" />}
    </>
  );
}

function OverrideModal({
  visible,
  isoDate,
  currentParent,
  hasOverride,
  onSelect,
  onClose,
}: {
  visible: boolean;
  isoDate: string;
  currentParent: 'Mamma' | 'Pappa' | null;
  hasOverride: boolean;
  onSelect: (value: 'Mamma' | 'Pappa' | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-end bg-black/40"
        onPress={onClose}
      >
        <Pressable className="w-full rounded-t-3xl bg-white p-6" onPress={() => {}}>
          <Text className="mb-4 text-center text-base font-bold text-gray-900">
            Samvær for {dayName(isoDate)} {formatDateShort(isoDate)}
          </Text>

          <TouchableOpacity
            className={`mb-2 rounded-2xl p-4 ${
              currentParent === 'Mamma' ? 'bg-rose-500' : 'bg-rose-50'
            }`}
            onPress={() => onSelect('Mamma')}
          >
            <Text
              className={`text-center font-semibold ${
                currentParent === 'Mamma' ? 'text-white' : 'text-rose-700'
              }`}
            >
              Hos Mamma
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`mb-2 rounded-2xl p-4 ${
              currentParent === 'Pappa' ? 'bg-blue-500' : 'bg-blue-50'
            }`}
            onPress={() => onSelect('Pappa')}
          >
            <Text
              className={`text-center font-semibold ${
                currentParent === 'Pappa' ? 'text-white' : 'text-blue-700'
              }`}
            >
              Hos Pappa
            </Text>
          </TouchableOpacity>

          {hasOverride && (
            <TouchableOpacity
              className="mb-2 rounded-2xl bg-gray-100 p-4"
              onPress={() => onSelect(null)}
            >
              <Text className="text-center font-semibold text-gray-600">
                Standard rotasjon
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity className="mt-1 p-3" onPress={onClose}>
            <Text className="text-center text-gray-400">Avbryt</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Reactive subscriptions — ensure re-render when Firestore data changes
  const isLoading = useFamilyStore((s) => s.isLoading);
  const familyChildren = useFamilyStore((s) => s.children);
  const getCurrentParent = useFamilyStore((s) => s.getCurrentParent);
  const residencyOverrides = useFamilyStore((s) => s.residencyOverrides);
  const setResidencyOverride = useFamilyStore((s) => s.setResidencyOverride);
  const plansMap = useFamilyStore((s) => s.plansMap);
  const manualRemindersRaw = useFamilyStore((s) => s.manualReminders);
  const calendarEventsRaw = useFamilyStore((s) => s.calendarEvents);

  const getSchoolEventsForDate = useSchoolStore((s) => s.getEventsForDate);
  const toggleHomework = useSchoolStore((s) => s.toggleHomeworkCompletion);
  const getRemindersForDate = useCalendarStore((s) => s.getRemindersForDate);
  const getCalendarEventsForDate = useCalendarStore((s) => s.getEventsForDate);

  // ── date ────────────────────────────────────────────────────────────────────

  const selectedIso = toIsoDate(selectedDate);
  const isToday = selectedIso === todayIso();

  const tomorrowDate = useMemo(() => addDays(selectedDate, 1), [selectedDate]);
  const tomorrowIsoStr = toIsoDate(tomorrowDate);

  const currentParent = getCurrentParent(selectedDate);
  const tomorrowParent = getCurrentParent(tomorrowDate);
  const isSwitchDay =
    currentParent !== null && tomorrowParent !== null && currentParent !== tomorrowParent;

  const isPast18 = isToday && new Date().getHours() >= 18;

  // ── computed data (useMemo deps include reactive slices to stay fresh) ───────

  const schoolEvents = useMemo(
    () => getSchoolEventsForDate(selectedIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIso, plansMap],
  );
  const schoolReminders = useMemo(
    () => schoolEvents.filter((e) => e.category === 'reminder'),
    [schoolEvents],
  );
  const homework = useMemo(
    () => schoolEvents.filter((e) => e.category === 'homework'),
    [schoolEvents],
  );
  const manualReminders = useMemo(
    () => getRemindersForDate(selectedIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIso, manualRemindersRaw],
  );
  const calendarEvents = useMemo(
    () => getCalendarEventsForDate(selectedIso),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIso, calendarEventsRaw],
  );

  const visibleSchoolReminders = isPast18 ? [] : schoolReminders;
  const hasTodayReminders =
    visibleSchoolReminders.length > 0 || manualReminders.length > 0;
  const hasAnyContent = hasTodayReminders || homework.length > 0 || calendarEvents.length > 0;

  const tomorrowSchoolReminders = useMemo(
    () => getSchoolEventsForDate(tomorrowIsoStr).filter((e) => e.category === 'reminder'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tomorrowIsoStr, plansMap],
  );
  const tomorrowManualReminders = useMemo(
    () => getRemindersForDate(tomorrowIsoStr),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tomorrowIsoStr, manualRemindersRaw],
  );
  const hasTomorrowReminders =
    tomorrowSchoolReminders.length > 0 || tomorrowManualReminders.length > 0;

  // ── swipe ───────────────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) setSelectedDate((d) => addDays(d, 1));
        else if (gs.dx > 50) setSelectedDate((d) => addDays(d, -1));
      },
    }),
  ).current;

  // ── badge ───────────────────────────────────────────────────────────────────

  const badge =
    currentParent === 'Mamma'
      ? { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Hos Mamma' }
      : currentParent === 'Pappa'
      ? { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hos Pappa' }
      : { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sett samvær' };

  // ── loading / onboarding ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-3 text-sm text-gray-400">Laster familiedata…</Text>
      </SafeAreaView>
    );
  }

  if (familyChildren.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-indigo-50">
            <Text className="text-4xl">👨‍👩‍👧‍👦</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900">Velkommen!</Text>
          <Text className="mt-3 text-center text-base text-gray-500">
            Kom i gang: Legg til ditt første barn for å bruke Familieportalen.
          </Text>
          <TouchableOpacity
            className="mt-8 rounded-2xl bg-indigo-500 px-8 py-3.5"
            onPress={() => router.push('/(tabs)/innstillinger')}
          >
            <Text className="font-semibold text-white">Legg til barn</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ── Header ── */}
      <View className="px-4 pb-2 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Hjem</Text>
          <TouchableOpacity
            className={`rounded-2xl px-3 py-1.5 ${badge.bg}`}
            onPress={() => setShowOverrideModal(true)}
          >
            <Text className={`text-xs font-bold ${badge.text}`}>{badge.label}</Text>
          </TouchableOpacity>
        </View>

        {/* Date navigation */}
        <View className="mt-1 flex-row items-center gap-2">
          <TouchableOpacity
            className="p-1"
            onPress={() => setSelectedDate((d) => addDays(d, -1))}
          >
            <ChevronLeft size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={!isToday ? () => setSelectedDate(new Date()) : undefined}
            disabled={isToday}
          >
            <Text
              className={`text-sm font-semibold ${
                isToday ? 'text-gray-500' : 'text-indigo-500'
              }`}
            >
              {dayName(selectedIso)} {formatDateShort(selectedIso)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-1"
            onPress={() => setSelectedDate((d) => addDays(d, 1))}
          >
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content with horizontal swipe ── */}
      <View className="flex-1" {...panResponder.panHandlers}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Byttedag-varsel */}
          {isSwitchDay && (
            <TouchableOpacity
              className="mb-3 flex-row items-center gap-3 rounded-2xl bg-indigo-500 p-4"
              onPress={() => router.push('/(tabs)/lister')}
              activeOpacity={0.85}
            >
              <Text className="text-2xl">🔄</Text>
              <View className="flex-1">
                <Text className="font-bold text-white">Byttedag i morgen!</Text>
                <Text className="mt-0.5 text-sm text-indigo-100">Sjekk pakkelisten.</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* A: Husk i dag */}
          {hasTodayReminders && (
            <View className="mb-3">
              <Text className="mb-2 text-sm font-semibold text-amber-600">Husk i dag!</Text>
              <View className="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
                {visibleSchoolReminders.map((ev, i) => (
                  <SchoolReminderRow
                    key={`school-${ev.childId}-${i}`}
                    event={ev}
                    isLast={
                      i === visibleSchoolReminders.length - 1 &&
                      manualReminders.length === 0
                    }
                  />
                ))}
                {manualReminders.map((r, i) => (
                  <ManualReminderRow
                    key={r.id}
                    reminder={r}
                    familyChildren={familyChildren}
                    isLast={i === manualReminders.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {/* B: Hendelser */}
          {calendarEvents.length > 0 && (
            <View className="mb-3">
              <Text className="mb-2 text-sm font-semibold text-indigo-600">Hendelser</Text>
              <View className="overflow-hidden rounded-2xl border border-indigo-50 bg-white">
                {calendarEvents.map((ev, i) => (
                  <CalendarEventRow
                    key={ev.id}
                    event={ev}
                    isLast={i === calendarEvents.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {/* C: Lekser */}
          {homework.length > 0 && (
            <View className="mb-3">
              <Text className="mb-2 text-sm font-semibold text-blue-600">Lekser</Text>
              <View className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
                {homework.map((hw, i) => (
                  <HomeworkRow
                    key={`${hw.childId}-${hw.date}-${i}`}
                    event={hw}
                    isLast={i === homework.length - 1}
                    onToggle={() => toggleHomework(hw.childId, hw.date, hw.title)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* D: I morgen / Husk i morgen */}
          {hasTomorrowReminders && (
            <View className="mb-3">
              <Text
                className={`mb-2 text-sm font-semibold ${
                  isPast18 ? 'text-amber-600' : 'text-gray-400'
                }`}
              >
                {isPast18 ? 'Husk i morgen!' : 'I morgen'}
              </Text>
              <View
                className={`overflow-hidden rounded-2xl ${
                  isPast18
                    ? 'border border-amber-100 bg-amber-50'
                    : 'border border-gray-100 bg-gray-50'
                }`}
              >
                {tomorrowSchoolReminders.map((ev, i) => (
                  <SchoolReminderRow
                    key={`tomorrow-school-${ev.childId}-${i}`}
                    event={ev}
                    isLast={
                      i === tomorrowSchoolReminders.length - 1 &&
                      tomorrowManualReminders.length === 0
                    }
                  />
                ))}
                {tomorrowManualReminders.map((r, i) => (
                  <ManualReminderRow
                    key={r.id}
                    reminder={r}
                    familyChildren={familyChildren}
                    isLast={i === tomorrowManualReminders.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {/* E: Empty state */}
          {!hasAnyContent && !hasTomorrowReminders && (
            <View className="items-center rounded-2xl bg-white py-12">
              <Text className="text-4xl">📅</Text>
              <Text className="mt-3 font-medium text-gray-700">Ingen hendelser i dag.</Text>
              <TouchableOpacity
                className="mt-4 rounded-xl bg-indigo-50 px-4 py-2"
                onPress={() => router.push('/(tabs)/skole')}
              >
                <Text className="font-semibold text-indigo-600">Gå til Skole</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Samvær override modal */}
      <OverrideModal
        visible={showOverrideModal}
        isoDate={selectedIso}
        currentParent={currentParent}
        hasOverride={selectedIso in residencyOverrides}
        onSelect={async (value) => {
          await setResidencyOverride(selectedIso, value);
          setShowOverrideModal(false);
        }}
        onClose={() => setShowOverrideModal(false)}
      />
    </SafeAreaView>
  );
}
