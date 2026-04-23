import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Calendar, DateData } from 'react-native-calendars';
import {
  Check,
  Copy,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Bell,
  UserCheck,
  CalendarDays,
} from 'lucide-react-native';
import { useFamilyStore, residencyForDate } from '../../src/store/useFamilyStore';
import { useUserStore } from '../../src/store/useUserStore';
import { useAuthStore } from '../../src/store/auth.store';
import { toIsoDate } from '../../src/utils/date-utils';
import type { Child, HouseholdMember } from '../../src/types/family.types';

// ── constants ─────────────────────────────────────────────────────────────────

const CHILD_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
];

const NO_MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  title,
  adminOnly = false,
  children,
}: {
  title: string;
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      <View className="flex-row items-center gap-2 border-b border-gray-100 px-4 py-3">
        <Text className="flex-1 text-base font-semibold text-gray-800">{title}</Text>
        {adminOnly && (
          <View className="rounded-full bg-indigo-100 px-2 py-0.5">
            <Text className="text-[10px] font-semibold text-indigo-600">Admin</Text>
          </View>
        )}
      </View>
      <View className="p-4">{children}</View>
    </View>
  );
}

// ── InlineDatePicker ──────────────────────────────────────────────────────────

function InlineDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => parseInt(value.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => parseInt(value.split('-')[1]) - 1);
  const TODAY = toIsoDate(new Date());
  const grid = buildMonthGrid(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
        activeOpacity={0.7}
      >
        <CalendarDays size={16} color="#6366f1" />
        <Text className="flex-1 text-sm text-gray-800">{isoToDisplay(value)}</Text>
        <ChevronRight
          size={14}
          color="#9ca3af"
          style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}
        />
      </TouchableOpacity>
      {open && (
        <View className="mt-1 rounded-xl border border-gray-100 bg-white p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <TouchableOpacity onPress={prevMonth} hitSlop={8}>
              <ChevronLeft size={18} color="#374151" />
            </TouchableOpacity>
            <Text className="text-sm font-semibold text-gray-800">
              {NO_MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={8}>
              <ChevronRight size={18} color="#374151" />
            </TouchableOpacity>
          </View>
          <View className="mb-1 flex-row justify-around">
            {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((d) => (
              <Text key={d} className="w-8 text-center text-[10px] font-semibold text-gray-400">
                {d}
              </Text>
            ))}
          </View>
          {grid.map((row, ri) => (
            <View key={ri} className="flex-row justify-around">
              {row.map((cell, ci) => {
                if (!cell) return <View key={ci} className="h-8 w-8" />;
                const iso = toIsoDate(cell);
                const selected = iso === value;
                const isToday = iso === TODAY;
                return (
                  <TouchableOpacity
                    key={iso}
                    onPress={() => { onChange(iso); setOpen(false); }}
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      selected ? 'bg-indigo-500' : isToday ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        selected
                          ? 'font-bold text-white'
                          : isToday
                          ? 'font-semibold text-indigo-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {cell.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── ChildModal ────────────────────────────────────────────────────────────────

function ChildModal({
  visible,
  child,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  child: Child | null;
  onClose: () => void;
  onSave: (data: Omit<Child, 'id'>) => void;
  onDelete?: () => void;
}) {
  const isEdit = child !== null;
  const [name, setName] = useState(child?.name ?? '');
  const [grade, setGrade] = useState(child?.grade ?? '');
  const [color, setColor] = useState(child?.color ?? CHILD_COLORS[0]);

  useMemo(() => {
    setName(child?.name ?? '');
    setGrade(child?.grade ?? '');
    setColor(child?.color ?? CHILD_COLORS[0]);
  }, [child]);

  const initial = name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="rounded-t-3xl bg-white p-6">
          <View className="mb-5 h-1 w-10 self-center rounded-full bg-gray-200" />
          <Text className="mb-5 text-lg font-bold text-gray-900">
            {isEdit ? `Rediger ${child!.name}` : 'Legg til barn'}
          </Text>

          {/* Avatar preview */}
          <View className="mb-5 items-center">
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <Text className="text-2xl font-bold text-white">{initial}</Text>
            </View>
          </View>

          <Text className="mb-1 text-sm font-semibold text-gray-700">Navn</Text>
          <TextInput
            className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
            value={name}
            onChangeText={setName}
            placeholder="Barnets navn"
            autoCapitalize="words"
          />

          <Text className="mb-1 text-sm font-semibold text-gray-700">Trinn</Text>
          <TextInput
            className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
            value={grade}
            onChangeText={setGrade}
            placeholder="f.eks. 3. trinn"
          />

          <Text className="mb-2 text-sm font-semibold text-gray-700">Farge</Text>
          <View className="mb-6 flex-row gap-3">
            {CHILD_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: c }}
              >
                {c === color && <Check size={14} color="white" />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), grade: grade.trim(), color });
            }}
            className="mb-3 items-center rounded-2xl bg-indigo-500 py-3.5"
            activeOpacity={0.8}
          >
            <Text className="font-semibold text-white">
              {isEdit ? 'Lagre endringer' : 'Legg til'}
            </Text>
          </TouchableOpacity>

          {isEdit && onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              className="items-center rounded-2xl border border-red-200 py-3"
              activeOpacity={0.8}
            >
              <Text className="font-semibold text-red-500">Fjern {child!.name}</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── GoogleCalendarSection ─────────────────────────────────────────────────────

function GoogleCalendarSection() {
  const [connected] = useState(false);

  return (
    <SectionCard title="Google Kalender" adminOnly>
      {connected ? (
        <View>
          <View className="mb-3 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-green-500" />
            <Text className="text-sm font-medium text-green-700">
              Familiekalender tilkoblet – delt med alle
            </Text>
          </View>
          <TouchableOpacity onPress={() => console.log('disconnect google calendar')}>
            <Text className="text-sm text-red-500">Koble fra kalender</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="mb-3 text-sm text-gray-500">
            Koble til én gang – alle familiemedlemmer ser hendelsene automatisk.
          </Text>
          <TouchableOpacity
            onPress={() => console.log('connect google calendar')}
            className="flex-row items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5"
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold" style={{ color: '#4285F4' }}>G</Text>
            <Text className="text-sm font-medium text-gray-700">Koble til Google Kalender</Text>
          </TouchableOpacity>
        </View>
      )}
    </SectionCard>
  );
}

// ── HouseholdSection ──────────────────────────────────────────────────────────

function HouseholdSection({
  isAdmin,
  inviteCode,
  members,
  currentUid,
}: {
  isAdmin: boolean;
  inviteCode: string | null;
  members: HouseholdMember[];
  currentUid: string | null;
}) {
  const setMemberParentRole = useFamilyStore((s) => s.setMemberParentRole);
  const makeAdmin = useFamilyStore((s) => s.makeAdmin);
  const removeMember = useFamilyStore((s) => s.removeMember);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  async function handleCopy() {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRemove(member: HouseholdMember) {
    Alert.alert(
      `Fjern ${member.displayName ?? 'medlem'}?`,
      'Personen mister tilgang til husstanden.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Fjern', style: 'destructive', onPress: () => removeMember(member.uid) },
      ],
    );
  }

  return (
    <SectionCard title="Husstand">
      {inviteCode && (
        <View className="mb-4">
          <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Invitasjonskode
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="flex-1 font-mono text-2xl font-bold tracking-widest text-indigo-600">
              {inviteCode}
            </Text>
            <TouchableOpacity
              onPress={handleCopy}
              className={`flex-row items-center gap-1.5 rounded-xl px-3 py-2 ${
                copied ? 'bg-green-50' : 'bg-gray-100'
              }`}
              activeOpacity={0.7}
            >
              {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#6b7280" />}
              <Text className={`text-xs font-medium ${copied ? 'text-green-700' : 'text-gray-600'}`}>
                {copied ? 'Kopiert' : 'Kopier'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="mt-1 text-xs text-gray-400">Del denne koden med familiemedlemmer.</Text>
        </View>
      )}

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Medlemmer
      </Text>
      <View className="gap-3">
        {members.map((m) => (
          <View key={m.uid} className="flex-row items-start gap-3">
            {m.photoURL ? (
              <Image source={{ uri: m.photoURL }} className="h-10 w-10 rounded-full" />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <Text className="text-sm font-bold text-indigo-600">
                  {m.displayName?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-semibold text-gray-800">{m.displayName ?? 'Ukjent'}</Text>
                <View
                  className={`rounded-full px-1.5 py-0.5 ${
                    m.role === 'Admin' ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${
                      m.role === 'Admin' ? 'text-indigo-600' : 'text-gray-500'
                    }`}
                  >
                    {m.role}
                  </Text>
                </View>
              </View>
              {isAdmin && (
              <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                {(['Mamma', 'Pappa'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() =>
                      setMemberParentRole(m.uid, m.parentRole === role ? null : role)
                    }
                    className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${
                      m.parentRole === role
                        ? role === 'Mamma'
                          ? 'bg-pink-100'
                          : 'bg-blue-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        m.parentRole === role
                          ? role === 'Mamma'
                            ? 'text-pink-700'
                            : 'text-blue-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {role}
                    </Text>
                    {m.parentRole === role && (
                      <X size={10} color={role === 'Mamma' ? '#be185d' : '#1d4ed8'} />
                    )}
                  </TouchableOpacity>
                ))}
                {m.uid !== currentUid && (
                  <>
                    {m.role !== 'Admin' && (
                      <TouchableOpacity
                        onPress={() => makeAdmin(m.uid)}
                        className="flex-row items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1"
                      >
                        <UserCheck size={10} color="#6366f1" />
                        <Text className="text-xs font-medium text-indigo-600">Gjør admin</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleRemove(m)}
                      className="flex-row items-center gap-1 rounded-full bg-red-50 px-2.5 py-1"
                    >
                      <X size={10} color="#ef4444" />
                      <Text className="text-xs font-medium text-red-500">Fjern</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            </View>
          </View>
        ))}
        {members.length === 0 && (
          <Text className="text-sm text-gray-400">Ingen medlemmer ennå.</Text>
        )}
      </View>

      <View className="mt-4 border-t border-gray-100 pt-4">
        {showJoin ? (
          <View className="gap-2">
            <TextInput
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Skriv inn invitasjonskode"
              autoCapitalize="characters"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => console.log('join household:', joinCode)}
                className="flex-1 items-center rounded-xl bg-indigo-500 py-2.5"
              >
                <Text className="text-sm font-semibold text-white">Bli med</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowJoin(false); setJoinCode(''); }}
                className="flex-1 items-center rounded-xl border border-gray-200 py-2.5"
              >
                <Text className="text-sm text-gray-600">Avbryt</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowJoin(true)}>
            <Text className="text-sm text-indigo-500">Bli med i en annen husstand</Text>
          </TouchableOpacity>
        )}
      </View>
    </SectionCard>
  );
}

const WEEKDAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

// ── ResidencySection ──────────────────────────────────────────────────────────

function ResidencySection() {
  const baseRotation = useFamilyStore((s) => s.baseRotation);
  const residencyOverrides = useFamilyStore((s) => s.residencyOverrides);
  const householdLabel = useFamilyStore((s) => s.householdLabel);
  const setResidencyOverride = useFamilyStore((s) => s.setResidencyOverride);
  const setBaseRotation = useFamilyStore((s) => s.setBaseRotation);
  const clearBaseRotation = useFamilyStore((s) => s.clearBaseRotation);
  const setHouseholdLabel = useFamilyStore((s) => s.setHouseholdLabel);

  const today = toIsoDate(new Date());
  const [calendarMonth, setCalendarMonth] = useState(`${today.slice(0, 8)}01`);
  const [showRotationForm, setShowRotationForm] = useState(false);
  const [rotStartDate, setRotStartDate] = useState(today);
  const [rotStarter, setRotStarter] = useState<'Mamma' | 'Pappa'>('Mamma');
  const [rotFrequency, setRotFrequency] = useState<'weekly' | 'bi-weekly'>('bi-weekly');
  const [rotSwitchDay, setRotSwitchDay] = useState<number>(0); // 0=Man
  const [rotPrimaryParent, setRotPrimaryParent] = useState<'Mamma' | 'Pappa'>('Mamma');
  const [saving, setSaving] = useState(false);

  // Pre-fill form from existing rotation when opening
  function openRotationForm() {
    if (baseRotation) {
      setRotStartDate(baseRotation.startDate);
      setRotStarter(baseRotation.startLabel);
      setRotFrequency(baseRotation.frequency ?? 'bi-weekly');
      setRotSwitchDay(baseRotation.switchDay ?? 0);
      setRotPrimaryParent(baseRotation.primaryParent ?? baseRotation.startLabel);
    } else {
      setRotStartDate(today);
      setRotStarter('Mamma');
      setRotFrequency('bi-weekly');
      setRotSwitchDay(0);
      setRotPrimaryParent('Mamma');
    }
    setShowRotationForm(true);
  }

  const markedDates = useMemo(() => {
    const result: Record<string, object> = {};
    const [yearStr, monthStr] = calendarMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let delta = -7; delta <= daysInMonth + 7; delta++) {
      const d = new Date(year, month, 1 + delta);
      const dateStr = toIsoDate(d);
      const parent = residencyForDate(dateStr, residencyOverrides, baseRotation, householdLabel);
      const isOverridden = dateStr in residencyOverrides;
      const isToday = dateStr === today;

      result[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: isToday
              ? '#4f46e5'
              : parent === 'Mamma'
              ? '#fce7f3'
              : parent === 'Pappa'
              ? '#dbeafe'
              : 'transparent',
            borderRadius: 6,
          },
          text: {
            color: isToday
              ? '#ffffff'
              : parent === 'Mamma'
              ? '#9d174d'
              : parent === 'Pappa'
              ? '#1d4ed8'
              : '#374151',
            fontWeight: (isToday ? '700' : '400') as '700' | '400',
          },
        },
        ...(isOverridden ? { marked: true, dotColor: '#f97316' } : {}),
      };
    }
    return result;
  }, [baseRotation, residencyOverrides, householdLabel, calendarMonth, today]);

  function handleDayPress(day: DateData) {
    const current = residencyForDate(day.dateString, residencyOverrides, baseRotation, householdLabel);
    if (day.dateString in residencyOverrides) {
      setResidencyOverride(day.dateString, null);
    } else {
      const opposite: 'Mamma' | 'Pappa' = current === 'Mamma' ? 'Pappa' : 'Mamma';
      setResidencyOverride(day.dateString, opposite);
    }
  }

  async function handleSaveRotation() {
    setSaving(true);
    try {
      await setBaseRotation({
        startDate: rotStartDate,
        startLabel: rotStarter,
        frequency: rotFrequency,
        switchDay: rotSwitchDay,
        primaryParent: rotPrimaryParent,
      });
      setShowRotationForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Samværsplan">
      {baseRotation ? (
        <View className="mb-4 rounded-xl bg-green-50 p-3">
          <View className="mb-1 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full bg-green-500" />
            <Text className="text-sm font-semibold text-green-800">
              Rotasjon aktiv – {baseRotation.frequency === 'weekly' ? 'ukentlig' : 'annenhver uke'}
            </Text>
          </View>
          <Text className="text-xs text-green-700">
            Starter {isoToDisplay(baseRotation.startDate)} med {baseRotation.startLabel}
          </Text>
          {baseRotation.switchDay !== undefined && (
            <Text className="text-xs text-green-700">
              Byttedag: {WEEKDAY_LABELS[baseRotation.switchDay]}
            </Text>
          )}
          {baseRotation.primaryParent && (
            <Text className="text-xs text-green-700">
              Hovedforelder: {baseRotation.primaryParent}
            </Text>
          )}
          <View className="mt-2 flex-row gap-3">
            <TouchableOpacity onPress={openRotationForm}>
              <Text className="text-xs font-medium text-green-700 underline">Endre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Fjern rotasjon',
                  'Velg hvem som skal ha barna som standard etter fjerning. Manuelle overstyringer beholdes.',
                  [
                    { text: 'Avbryt', style: 'cancel' },
                    { text: 'Ingen fast plan', onPress: () => clearBaseRotation() },
                    {
                      text: 'Mamma har alle dager',
                      onPress: async () => {
                        await clearBaseRotation();
                        await setHouseholdLabel('Mamma');
                      },
                    },
                    {
                      text: 'Pappa har alle dager',
                      onPress: async () => {
                        await clearBaseRotation();
                        await setHouseholdLabel('Pappa');
                      },
                    },
                  ],
                )
              }
            >
              <Text className="text-xs font-medium text-red-500 underline">Fjern</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="mb-4 rounded-xl bg-amber-50 p-3">
          <Text className="text-sm text-amber-700">
            {householdLabel
              ? `Ingen fast rotasjon – ${householdLabel} har alle dager som standard.`
              : 'Ingen fast rotasjon satt opp ennå.'}
          </Text>
          <TouchableOpacity onPress={openRotationForm} className="mt-1">
            <Text className="text-xs font-medium text-amber-700 underline">Sett opp rotasjon</Text>
          </TouchableOpacity>
        </View>
      )}

      {showRotationForm && (
        <View className="mb-4 gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <Text className="text-sm font-semibold text-gray-800">
            {baseRotation ? 'Endre rotasjon' : 'Sett opp rotasjon'}
          </Text>

          {/* Startdato */}
          <View>
            <Text className="mb-1 text-xs font-semibold text-gray-600">
              Startdato (endringer påvirker kun dager etter denne)
            </Text>
            <InlineDatePicker value={rotStartDate} onChange={setRotStartDate} />
          </View>

          {/* Frekvens */}
          <View>
            <Text className="mb-1.5 text-xs font-semibold text-gray-600">Rotasjon</Text>
            <View className="flex-row gap-2">
              {([
                { value: 'weekly', label: '7 dager' },
                { value: 'bi-weekly', label: '14 dager' },
              ] as const).map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setRotFrequency(value)}
                  className={`flex-1 items-center rounded-xl py-2.5 ${
                    rotFrequency === value ? 'bg-indigo-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      rotFrequency === value ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Byttedag */}
          <View>
            <Text className="mb-1.5 text-xs font-semibold text-gray-600">Byttedag</Text>
            <View className="flex-row gap-1">
              {WEEKDAY_LABELS.map((label, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setRotSwitchDay(idx)}
                  className={`flex-1 items-center rounded-lg py-2 ${
                    rotSwitchDay === idx ? 'bg-indigo-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-semibold ${
                      rotSwitchDay === idx ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hvem starter */}
          <View>
            <Text className="mb-1.5 text-xs font-semibold text-gray-600">
              Hvem starter (første periode)?
            </Text>
            <View className="flex-row gap-2">
              {(['Mamma', 'Pappa'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setRotStarter(p)}
                  className={`flex-1 items-center rounded-xl py-2.5 ${
                    rotStarter === p
                      ? p === 'Mamma' ? 'bg-pink-500' : 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      rotStarter === p ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Hvem er Hovedforelder */}
          <View>
            <Text className="mb-1.5 text-xs font-semibold text-gray-600">
              Hvem er Hovedforelder?
            </Text>
            <Text className="mb-2 text-[11px] text-gray-400">
              Den som har flest dager, f.eks. ved en 60/40-deling.
            </Text>
            <View className="flex-row gap-2">
              {(['Mamma', 'Pappa'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setRotPrimaryParent(p)}
                  className={`flex-1 items-center rounded-xl py-2.5 ${
                    rotPrimaryParent === p
                      ? p === 'Mamma' ? 'bg-pink-500' : 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      rotPrimaryParent === p ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleSaveRotation}
              disabled={saving}
              className="flex-1 items-center rounded-xl bg-indigo-500 py-2.5"
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-sm font-semibold text-white">Lagre rotasjon</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRotationForm(false)}
              className="flex-1 items-center rounded-xl border border-gray-200 py-2.5"
            >
              <Text className="text-sm text-gray-600">Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Calendar
        current={calendarMonth}
        markingType="custom"
        markedDates={markedDates}
        onDayPress={handleDayPress}
        onMonthChange={(month) =>
          setCalendarMonth(`${month.year}-${String(month.month).padStart(2, '0')}-01`)
        }
        firstDay={1}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#9ca3af',
          dayTextColor: '#374151',
          textDisabledColor: '#d1d5db',
          arrowColor: '#6366f1',
          monthTextColor: '#111827',
          textMonthFontSize: 14,
          textMonthFontWeight: '600',
          textDayFontSize: 12,
          textDayHeaderFontSize: 11,
        }}
        style={{ borderRadius: 12 }}
      />

      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="flex-row items-center gap-1.5">
          <View className="h-3 w-3 rounded-sm bg-pink-100" />
          <Text className="text-xs text-gray-500">Mamma</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-3 w-3 rounded-sm bg-blue-100" />
          <Text className="text-xs text-gray-500">Pappa</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full bg-orange-400" />
          <Text className="text-xs text-gray-500">Overstyrt dag</Text>
        </View>
      </View>
      <Text className="mt-1 text-xs text-gray-400">
        Trykk på en dag for å overstyre hvem som har barna den dagen.
      </Text>
    </SectionCard>
  );
}

// ── ChildrenSection ───────────────────────────────────────────────────────────

function ChildrenSection({ isAdmin, children }: { isAdmin: boolean; children: Child[] }) {
  const addChild = useFamilyStore((s) => s.addChild);
  const updateChild = useFamilyStore((s) => s.updateChild);
  const deleteChild = useFamilyStore((s) => s.deleteChild);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  function openEdit(child: Child) {
    setEditingChild(child);
    setModalVisible(true);
  }

  function handleSave(data: Omit<Child, 'id'>) {
    if (editingChild) {
      updateChild(editingChild.id, data);
    } else {
      addChild(data);
    }
    setModalVisible(false);
  }

  function handleDelete() {
    if (!editingChild) return;
    Alert.alert(
      `Fjern ${editingChild.name}?`,
      'Barnets data vil bli slettet fra husstanden.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: () => { deleteChild(editingChild.id); setModalVisible(false); },
        },
      ],
    );
  }

  return (
    <>
      <SectionCard title="Barn" adminOnly>
        <View className="gap-3">
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              onPress={() => isAdmin && openEdit(child)}
              className="flex-row items-center gap-3"
              activeOpacity={isAdmin ? 0.7 : 1}
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: child.color }}
              >
                <Text className="text-base font-bold text-white">
                  {child.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-800">{child.name}</Text>
                {child.grade ? <Text className="text-xs text-gray-400">{child.grade}</Text> : null}
              </View>
              {isAdmin && <ChevronRight size={16} color="#d1d5db" />}
            </TouchableOpacity>
          ))}
          {children.length === 0 && (
            <Text className="text-sm text-gray-400">Ingen barn lagt til ennå.</Text>
          )}
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => { setEditingChild(null); setModalVisible(true); }}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 py-3"
            activeOpacity={0.7}
          >
            <Plus size={16} color="#6366f1" />
            <Text className="text-sm font-medium text-indigo-500">Legg til barn</Text>
          </TouchableOpacity>
        )}
      </SectionCard>

      <ChildModal
        visible={modalVisible}
        child={editingChild}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={editingChild ? handleDelete : undefined}
      />
    </>
  );
}

// ── PushNotificationsSection ──────────────────────────────────────────────────

function PushNotificationsSection() {
  const [enabled, setEnabled] = useState(false);

  return (
    <SectionCard title="Push-varsler">
      {enabled ? (
        <View className="flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-green-500" />
          <Text className="text-sm text-green-700">Push-varsler er aktivert på denne enheten</Text>
        </View>
      ) : (
        <View>
          <Text className="mb-3 text-sm text-gray-500">
            Få beskjed om byttedager og viktige hendelser direkte på telefonen.
          </Text>
          <TouchableOpacity
            onPress={() => { console.log('activate push notifications'); setEnabled(true); }}
            className="flex-row items-center gap-2 self-start rounded-xl bg-indigo-500 px-4 py-2.5"
            activeOpacity={0.8}
          >
            <Bell size={16} color="white" />
            <Text className="text-sm font-semibold text-white">Aktiver Push-varsler</Text>
          </TouchableOpacity>
        </View>
      )}
    </SectionCard>
  );
}

// ── DataSection ───────────────────────────────────────────────────────────────

function DataSection({ childrenCount }: { childrenCount: number }) {
  const deleteAllData = useFamilyStore((s) => s.deleteAllData);

  function handleDelete() {
    Alert.alert(
      'Slett all data?',
      'Dette vil slette alle barn, planer, påminnelser og hendelser. Handlingen kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Slett alt', style: 'destructive', onPress: deleteAllData },
      ],
    );
  }

  return (
    <SectionCard title="Data" adminOnly>
      <Text className="mb-3 text-sm text-gray-500">
        {childrenCount} {childrenCount === 1 ? 'barn' : 'barn'} registrert.
      </Text>
      <TouchableOpacity onPress={handleDelete}>
        <Text className="text-sm font-medium text-red-500">Slett all data</Text>
      </TouchableOpacity>
    </SectionCard>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function InnstillingerScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const userData = useUserStore((s) => s.userData);
  const children = useFamilyStore((s) => s.children);
  const members = useFamilyStore((s) => s.members);
  const inviteCode = useFamilyStore((s) => s.inviteCode);

  const currentUid = user?.uid ?? null;
  const isAdmin =
    userData?.role === 'Admin' ||
    members.find((m) => m.uid === currentUid)?.role === 'Admin';

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="px-4 pb-3 pt-4">
        <Text className="text-2xl font-bold text-gray-900">Innstillinger</Text>
      </View>

      {/* User profile */}
      <View className="mx-4 mb-4 flex-row items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} className="h-14 w-14 rounded-full" />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
            <Text className="text-xl font-bold text-indigo-600">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">{user?.displayName ?? '–'}</Text>
          <Text className="text-sm text-gray-400">{user?.email ?? ''}</Text>
          {userData?.role && (
            <View className="mt-1 self-start rounded-full bg-indigo-100 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-indigo-600">{userData.role}</Text>
            </View>
          )}
        </View>
      </View>

      {isAdmin && <GoogleCalendarSection />}
      <HouseholdSection
        isAdmin={isAdmin}
        inviteCode={inviteCode}
        members={members}
        currentUid={currentUid}
      />
      <ResidencySection />
      <ChildrenSection isAdmin={isAdmin} children={children} />
      <PushNotificationsSection />
      {isAdmin && <DataSection childrenCount={children.length} />}

      {/* Sign out */}
      <View className="mx-4 mt-2">
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Logg ut?', 'Du vil bli sendt tilbake til innloggingssiden.', [
              { text: 'Avbryt', style: 'cancel' },
              { text: 'Logg ut', style: 'destructive', onPress: signOut },
            ])
          }
          className="items-center rounded-2xl border border-red-200 bg-white py-3.5"
          activeOpacity={0.8}
        >
          <Text className="font-semibold text-red-500">Logg ut</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

