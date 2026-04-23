import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronDown, ChevronUp, X, ZoomIn } from 'lucide-react-native';
import { useFamilyStore } from '../../src/store/useFamilyStore';
import { useSchoolStore } from '../../src/store/useSchoolStore';
import { toIsoDate, todayIso } from '../../src/utils/date-utils';
import { EventCard } from '../../src/components/EventCard';
import { EventEditModal } from '../../src/components/EventEditModal';
import type { EditTarget } from '../../src/components/EventEditModal';
import type { SchoolEvent, TaggedSchoolEvent } from '../../src/types/family.types';

// ── date helpers ──────────────────────────────────────────────────────────────

function getMondayOfWeek(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const result = new Date(jan4);
  result.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7);
  return result;
}

const DAY_LABELS = ['man', 'tir', 'ons', 'tor', 'fre'] as const;

// ── FullscreenImageModal ──────────────────────────────────────────────────────

function FullscreenImageModal({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  const { width: screenWidth } = Dimensions.get('window');

  return (
    <Modal
      visible={uri !== null}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 52,
            right: 20,
            zIndex: 10,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            padding: 8,
          }}
          hitSlop={12}
        >
          <X size={22} color="white" />
        </TouchableOpacity>

        {uri && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            maximumZoomScale={4}
            minimumZoomScale={1}
            bouncesZoom
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Image
              source={{ uri }}
              style={{ width: screenWidth, height: screenWidth * 1.5 }}
              resizeMode="contain"
            />
          </ScrollView>
        )}

        <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingBottom: 24, fontSize: 11 }}>
          Klyp for å zoome · Trykk for å lukke
        </Text>
      </View>
    </Modal>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function SkoleScreen() {
  const isLoading = useFamilyStore((s) => s.isLoading);
  const familyChildren = useFamilyStore((s) => s.children);
  const plansMap = useFamilyStore((s) => s.plansMap);
  const toggleHomework = useSchoolStore((s) => s.toggleHomeworkCompletion);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const day = new Date().getDay();
    return day >= 1 && day <= 5 ? day - 1 : 0;
  });
  const [infoExpanded, setInfoExpanded] = useState(false); // closed by default
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [fullscreenImageUri, setFullscreenImageUri] = useState<string | null>(null);

  // Select first child once children load
  useEffect(() => {
    if (selectedChildId === null && familyChildren.length > 0) {
      setSelectedChildId(familyChildren[0].id);
    }
  }, [familyChildren.length]);

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

  useEffect(() => {
    if (!weekDates.length) return;
    const today = todayIso();
    const idx = weekDates.indexOf(today);
    setSelectedDayIndex(idx !== -1 ? idx : 0);
  }, [weekDates]);

  const selectedDayIso = weekDates[selectedDayIndex] ?? null;

  const selectedChild = familyChildren.find((c) => c.id === selectedChildId) ?? null;

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

  // Build a TaggedSchoolEvent for a SchoolEvent so we can open the edit modal
  function tagEvent(ev: SchoolEvent): TaggedSchoolEvent {
    return {
      ...ev,
      childName: selectedChild?.name ?? '',
      childColor: selectedChild?.color ?? '#6366f1',
      childId: selectedChildId ?? '',
    };
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
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
            {/* A: Information (week-wide, collapsible, closed by default) */}
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
                      <TouchableOpacity
                        key={i}
                        onPress={() => setEditTarget({ kind: 'school', data: tagEvent(ev) })}
                        activeOpacity={0.75}
                      >
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
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* B: Reminders for selected day */}
            {dayReminders.length > 0 && (
              <View className="mb-3">
                <Text className="mb-2 text-sm font-semibold text-amber-600">Påminnelser</Text>
                <View>
                  {dayReminders.map((ev, i) => (
                    <EventCard
                      key={i}
                      kind="reminder"
                      title={ev.title}
                      description={ev.description || undefined}
                      date={ev.date}
                      assignees={
                        selectedChild
                          ? [{ label: selectedChild.name, color: selectedChild.color }]
                          : []
                      }
                      onPress={() => setEditTarget({ kind: 'school', data: tagEvent(ev) })}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* C: Homework for selected day */}
            {dayHomework.length > 0 && (
              <View className="mb-3">
                <Text className="mb-2 text-sm font-semibold text-blue-600">Lekser</Text>
                <View>
                  {dayHomework.map((ev, i) => (
                    <EventCard
                      key={i}
                      kind="homework"
                      title={ev.title}
                      description={ev.description || undefined}
                      date={ev.date}
                      assignees={
                        selectedChild
                          ? [{ label: selectedChild.name, color: selectedChild.color }]
                          : []
                      }
                      completed={ev.completed}
                      onToggleComplete={() =>
                        selectedChildId &&
                        toggleHomework(selectedChildId, ev.date, ev.title)
                      }
                      onPress={() =>
                        setEditTarget({
                          kind: 'school',
                          data: tagEvent(ev),
                          onToggle: () =>
                            selectedChildId &&
                            toggleHomework(selectedChildId, ev.date, ev.title),
                        })
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

            {/* D: Original plan thumbnails */}
            <View className="mb-3">
              <Text className="mb-2 text-sm font-semibold text-gray-400">Originalplan</Text>
              <View className="flex-row gap-3">
                {/* Ukeplan */}
                <TouchableOpacity
                  className="flex-1 items-center overflow-hidden rounded-2xl bg-gray-100 py-7"
                  activeOpacity={latestPlan.imageUrls?.weekPlan ? 0.7 : 1}
                  onPress={() => {
                    if (latestPlan.imageUrls?.weekPlan) {
                      setFullscreenImageUri(latestPlan.imageUrls.weekPlan);
                    }
                  }}
                >
                  {latestPlan.imageUrls?.weekPlan ? (
                    <View className="items-center">
                      <Image
                        source={{ uri: latestPlan.imageUrls.weekPlan }}
                        style={{ width: '100%', height: 72, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                      <View className="mt-1.5 flex-row items-center gap-1">
                        <ZoomIn size={11} color="#6366f1" />
                        <Text className="text-xs font-medium text-indigo-500">Ukeplan</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text className="text-2xl">📄</Text>
                      <Text className="mt-1 text-xs font-medium text-gray-400">Ukeplan</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Timeplan */}
                <TouchableOpacity
                  className={`flex-1 items-center overflow-hidden rounded-2xl bg-gray-100 py-7 ${
                    latestPlan.imageUrls?.schedule ? '' : 'opacity-50'
                  }`}
                  activeOpacity={latestPlan.imageUrls?.schedule ? 0.7 : 1}
                  onPress={() => {
                    if (latestPlan.imageUrls?.schedule) {
                      setFullscreenImageUri(latestPlan.imageUrls.schedule);
                    }
                  }}
                >
                  {latestPlan.imageUrls?.schedule ? (
                    <View className="items-center">
                      <Image
                        source={{ uri: latestPlan.imageUrls.schedule }}
                        style={{ width: '100%', height: 72, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                      <View className="mt-1.5 flex-row items-center gap-1">
                        <ZoomIn size={11} color="#6366f1" />
                        <Text className="text-xs font-medium text-indigo-500">Timeplan</Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text className="text-2xl">📄</Text>
                      <Text className="mt-1 text-xs font-medium text-gray-400">Timeplan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Event edit modal */}
      <EventEditModal target={editTarget} onClose={() => setEditTarget(null)} />

      {/* Fullscreen image viewer */}
      <FullscreenImageModal
        uri={fullscreenImageUri}
        onClose={() => setFullscreenImageUri(null)}
      />
    </SafeAreaView>
  );
}
