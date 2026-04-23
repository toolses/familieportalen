import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Bell,
  CalendarDays,
  X,
  Check,
} from 'lucide-react-native';
import { useFamilyStore } from '../../src/store/useFamilyStore';
import { useSchoolStore } from '../../src/store/useSchoolStore';
import { useCalendarStore } from '../../src/store/useCalendarStore';
import { toIsoDate, todayIso, formatDateShort } from '../../src/utils/date-utils';
import { EventCard } from '../../src/components/EventCard';
import { EventEditModal } from '../../src/components/EventEditModal';
import type { EditTarget } from '../../src/components/EventEditModal';
import type { EventCardAssignee } from '../../src/components/EventCard';
import type {
  ManualReminder,
  ManualCalendarEvent,
  TaggedSchoolEvent,
  AssignedTo,
  Child,
} from '../../src/types/family.types';

function resolveAssignees(assignedTo: AssignedTo[], familyChildren: Child[]): EventCardAssignee[] {
  return assignedTo.map((a) => {
    if (a.type === 'child') {
      const c = familyChildren.find((ch) => ch.id === a.childId);
      return c ? { label: c.name, color: c.color } : null;
    }
    return { label: a.role, color: a.role === 'Mamma' ? '#F43F5E' : '#3B82F6' };
  }).filter(Boolean) as EventCardAssignee[];
}

// ── constants ──────────────────────────────────────────────────────────────

const NO_MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];
const DAY_SHORT = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];
const DAY_FULL  = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
const RECURRENCE_OPTS = [
  { label: 'Ingen',         value: null                     },
  { label: 'Hver uke',      value: { type: 'weekly' as const }  },
  { label: 'Annenhver uke', value: { type: 'biweekly' as const } },
] as const;

// ── date helpers ───────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function addMonthsTo(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}
function getMondayOfWeek(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0);
  const dow = r.getDay(); // 0=Sun
  r.setDate(r.getDate() - ((dow + 6) % 7));
  return r;
}
function isoWeekNumber(d: Date): number {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}
function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
function weekRangeText(monday: Date): string {
  return `${formatDateShort(toIsoDate(monday))} – ${formatDateShort(toIsoDate(addDays(monday, 6)))}`;
}

// ── shared: residency badge ────────────────────────────────────────────────

function ResidencyBadge({ parent }: { parent: 'Mamma' | 'Pappa' | null }) {
  if (!parent) return null;
  return (
    <View
      className={`rounded-full px-3 py-1 ${
        parent === 'Mamma' ? 'bg-rose-100' : 'bg-blue-100'
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          parent === 'Mamma' ? 'text-rose-600' : 'text-blue-600'
        }`}
      >
        Hos {parent}
      </Text>
    </View>
  );
}

// ── shared: day residency strip ────────────────────────────────────────────

function ResidencyStrip({ date }: { date: Date }) {
  const getCurrentParent = useFamilyStore((s) => s.getCurrentParent);
  const parent = getCurrentParent(date);
  return (
    <View className="mb-1 flex-row items-center gap-2">
      <View
        className={`h-0.5 flex-1 rounded-full ${
          parent === 'Mamma' ? 'bg-rose-300' : parent === 'Pappa' ? 'bg-blue-300' : 'bg-gray-200'
        }`}
      />
      {parent && (
        <View
          className={`rounded-full px-1.5 py-px ${
            parent === 'Mamma' ? 'bg-rose-100' : 'bg-blue-100'
          }`}
        >
          <Text
            className={`text-[9px] font-semibold ${
              parent === 'Mamma' ? 'text-rose-500' : 'text-blue-500'
            }`}
          >
            {parent}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── shared: day events block ───────────────────────────────────────────────

type FilterType = 'alle' | 'lekser' | 'påminnelser' | 'hendelser';

function DayEventsBlock({
  isoDate,
  filter,
  children: familyChildren,
  onEdit,
}: {
  isoDate: string;
  filter: FilterType;
  children: Child[];
  onEdit: (target: EditTarget) => void;
}) {
  const getSchoolEvents = useSchoolStore((s) => s.getEventsForDate);
  const toggleHomework  = useSchoolStore((s) => s.toggleHomeworkCompletion);
  const getReminders    = useCalendarStore((s) => s.getRemindersForDate);
  const getEvents       = useCalendarStore((s) => s.getEventsForDate);

  const plansMap     = useFamilyStore((s) => s.plansMap);
  const remindersRaw = useFamilyStore((s) => s.manualReminders);
  const eventsRaw    = useFamilyStore((s) => s.calendarEvents);

  const schoolEvents = useMemo(
    () => getSchoolEvents(isoDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isoDate, plansMap],
  );
  const reminders = useMemo(
    () => getReminders(isoDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isoDate, remindersRaw],
  );
  const calEvents = useMemo(
    () => getEvents(isoDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isoDate, eventsRaw],
  );

  const schoolReminders = schoolEvents.filter((e) => e.category === 'reminder');
  const homework        = schoolEvents.filter((e) => e.category === 'homework');

  const showReminders = filter === 'alle' || filter === 'påminnelser';
  const showHomework  = filter === 'alle' || filter === 'lekser';
  const showEvents    = filter === 'alle' || filter === 'hendelser';

  const hasAny =
    (showReminders && (schoolReminders.length > 0 || reminders.length > 0)) ||
    (showHomework && homework.length > 0) ||
    (showEvents && calEvents.length > 0);

  if (!hasAny) {
    return <Text className="px-3 py-3 text-sm text-gray-400">Ingen hendelser</Text>;
  }

  return (
    <View className="px-3 pt-1">
      {showReminders && schoolReminders.map((e) => (
        <EventCard
          key={`sr-${e.childId}-${e.title}`}
          kind="reminder"
          title={e.title}
          description={e.description || undefined}
          assignees={[{ label: e.childName, color: e.childColor }]}
          onPress={() => onEdit({ kind: 'school', data: e })}
        />
      ))}

      {showReminders && reminders.map((r) => (
        <EventCard
          key={r.id}
          kind="reminder"
          title={r.title}
          description={r.description || undefined}
          time={r.time ?? undefined}
          assignees={resolveAssignees(r.assignedTo, familyChildren)}
          onPress={() => onEdit({ kind: 'reminder', data: r })}
        />
      ))}

      {showHomework && homework.map((e) => (
        <EventCard
          key={`hw-${e.childId}-${e.title}`}
          kind="homework"
          title={e.title}
          description={e.description || undefined}
          assignees={[{ label: e.childName, color: e.childColor }]}
          completed={e.completed}
          onToggleComplete={() => toggleHomework(e.childId, e.date, e.title)}
          onPress={() =>
            onEdit({
              kind: 'school',
              data: e,
              onToggle: () => toggleHomework(e.childId, e.date, e.title),
            })
          }
        />
      ))}

      {showEvents && calEvents.map((ev) => (
        <EventCard
          key={ev.id}
          kind="event"
          title={ev.title}
          description={ev.description || undefined}
          startDate={ev.startDate}
          endDate={ev.endDate}
          startTime={ev.startTime}
          endTime={ev.endTime}
          isAllDay={ev.isAllDay}
          assignees={resolveAssignees(ev.assignedTo, familyChildren)}
          onPress={() => onEdit({ kind: 'event', data: ev })}
        />
      ))}
    </View>
  );
}

// ── inline date picker ─────────────────────────────────────────────────────

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
  const TODAY = todayIso();

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
          {/* Month nav */}
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

          {/* Day headers */}
          <View className="mb-1 flex-row">
            {DAY_SHORT.map((d) => (
              <View key={d} className="flex-1 items-center">
                <Text className="text-[10px] font-semibold text-gray-400">{d}</Text>
              </View>
            ))}
          </View>

          {/* Grid */}
          {grid.map((row, ri) => (
            <View key={ri} className="mb-0.5 flex-row">
              {row.map((date, ci) => {
                if (!date) return <View key={ci} className="flex-1" />;
                const iso = toIsoDate(date);
                const isSelected = iso === value;
                const isToday    = iso === TODAY;
                return (
                  <TouchableOpacity
                    key={ci}
                    onPress={() => { onChange(iso); setOpen(false); }}
                    className={`mx-px flex-1 items-center rounded-full py-1 ${
                      isSelected
                        ? 'bg-indigo-500'
                        : isToday
                        ? 'bg-indigo-50'
                        : ''
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text
                      className={`text-xs ${
                        isSelected
                          ? 'font-bold text-white'
                          : isToday
                          ? 'font-semibold text-indigo-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {date.getDate()}
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

// ── assignee selector ──────────────────────────────────────────────────────

function AssigneeSelector({
  value,
  onChange,
  children,
}: {
  value: AssignedTo[];
  onChange: (v: AssignedTo[]) => void;
  children: Child[];
}) {
  const parents: AssignedTo[] = [
    { type: 'parent', role: 'Mamma' },
    { type: 'parent', role: 'Pappa' },
  ];
  const childAssignees: AssignedTo[] = children.map((c) => ({
    type: 'child',
    childId: c.id,
  }));
  const all = [...parents, ...childAssignees];

  function isActive(a: AssignedTo): boolean {
    return value.some((v) => {
      if (v.type !== a.type) return false;
      if (v.type === 'parent' && a.type === 'parent') return v.role === a.role;
      if (v.type === 'child' && a.type === 'child') return v.childId === a.childId;
      return false;
    });
  }

  function toggle(a: AssignedTo) {
    if (isActive(a)) {
      onChange(
        value.filter((v) => {
          if (v.type !== a.type) return true;
          if (v.type === 'parent' && a.type === 'parent') return v.role !== a.role;
          if (v.type === 'child' && a.type === 'child') return v.childId !== a.childId;
          return true;
        }),
      );
    } else {
      onChange([...value, a]);
    }
  }

  function labelFor(a: AssignedTo): string {
    if (a.type === 'parent') return a.role;
    const c = children.find((ch) => ch.id === a.childId);
    return c?.name ?? '';
  }

  function colorFor(a: AssignedTo): string {
    if (a.type === 'parent') return a.role === 'Mamma' ? '#f43f5e' : '#3b82f6';
    const c = children.find((ch) => ch.id === a.childId);
    return c?.color ?? '#6366f1';
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {all.map((a, i) => {
        const active = isActive(a);
        const color  = colorFor(a);
        return (
          <TouchableOpacity
            key={i}
            onPress={() => toggle(a)}
            className={`flex-row items-center gap-1 rounded-full border px-3 py-1.5 ${
              active ? 'border-transparent' : 'border-gray-200 bg-gray-50'
            }`}
            style={active ? { backgroundColor: color + '22', borderColor: color } : {}}
            activeOpacity={0.7}
          >
            {active && <Check size={11} color={color} strokeWidth={3} />}
            <Text
              className="text-sm font-medium"
              style={{ color: active ? color : '#6b7280' }}
            >
              {labelFor(a)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── recurrence picker ──────────────────────────────────────────────────────

function RecurrencePicker({
  value,
  onChange,
}: {
  value: ManualReminder['recurrence'];
  onChange: (v: ManualReminder['recurrence']) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {RECURRENCE_OPTS.map(({ label, value: optVal }) => {
        const active =
          (optVal === null && value === null) ||
          (optVal !== null && value?.type === optVal.type);
        return (
          <TouchableOpacity
            key={label}
            onPress={() => onChange(optVal)}
            className={`flex-1 items-center rounded-xl border py-2.5 ${
              active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-xs font-semibold ${
                active ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── form field wrapper ─────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </Text>
      {children}
    </View>
  );
}

// ── reminder form modal ────────────────────────────────────────────────────

interface ReminderFormState {
  title: string;
  description: string;
  date: string;
  time: string;
  isSchoolRelated: boolean;
  assignedTo: AssignedTo[];
  recurrence: ManualReminder['recurrence'];
}

function ReminderFormModal({
  visible,
  initialDate,
  familyChildren,
  onClose,
}: {
  visible: boolean;
  initialDate: string;
  familyChildren: Child[];
  onClose: () => void;
}) {
  const addReminder = useCalendarStore((s) => s.addReminder);
  const [saving, setSaving] = useState(false);

  const EMPTY: ReminderFormState = {
    title: '',
    description: '',
    date: initialDate,
    time: '',
    isSchoolRelated: false,
    assignedTo: [],
    recurrence: null,
  };
  const [form, setForm] = useState<ReminderFormState>(EMPTY);

  function set<K extends keyof ReminderFormState>(key: K, val: ReminderFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await addReminder({
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      time: form.time.trim() || null,
      isSchoolRelated: form.isSchoolRelated,
      assignedTo: form.assignedTo,
      recurrence: form.recurrence,
    });
    setSaving(false);
    setForm(EMPTY);
    onClose();
  }

  function handleClose() {
    setForm(EMPTY);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/40" onPress={handleClose} />
        <View className="max-h-[90%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
            <Text className="text-lg font-bold text-gray-900">Ny påminnelse</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
            <FormField label="Tittel">
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="Påminnelsestittel..."
                placeholderTextColor="#9ca3af"
                value={form.title}
                onChangeText={(v) => set('title', v)}
                autoFocus
              />
            </FormField>

            <FormField label="Beskrivelse (valgfritt)">
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="Mer detaljer..."
                placeholderTextColor="#9ca3af"
                value={form.description}
                onChangeText={(v) => set('description', v)}
                multiline
                numberOfLines={2}
              />
            </FormField>

            <FormField label="Dato">
              <InlineDatePicker value={form.date} onChange={(v) => set('date', v)} />
            </FormField>

            <FormField label="Klokkeslett (valgfritt)">
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="HH:MM"
                placeholderTextColor="#9ca3af"
                value={form.time}
                onChangeText={(v) => set('time', v)}
                keyboardType="numbers-and-punctuation"
              />
            </FormField>

            <FormField label="Skolerelatert">
              <View className="flex-row items-center gap-3">
                <Switch
                  value={form.isSchoolRelated}
                  onValueChange={(v) => set('isSchoolRelated', v)}
                  trackColor={{ true: '#6366f1', false: '#e5e7eb' }}
                  thumbColor="white"
                />
                <Text className="text-sm text-gray-500">
                  {form.isSchoolRelated ? 'Ja – vises på skole-siden' : 'Nei'}
                </Text>
              </View>
            </FormField>

            <FormField label="Gjelder">
              <AssigneeSelector
                value={form.assignedTo}
                onChange={(v) => set('assignedTo', v)}
                children={familyChildren}
              />
            </FormField>

            <FormField label="Gjentagelse">
              <RecurrencePicker
                value={form.recurrence}
                onChange={(v) => set('recurrence', v)}
              />
            </FormField>

            <View className="mb-8 flex-row gap-3">
              <TouchableOpacity
                onPress={handleClose}
                className="flex-1 items-center rounded-xl border border-gray-200 py-3"
                activeOpacity={0.7}
              >
                <Text className="font-semibold text-gray-500">Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !form.title.trim()}
                className={`flex-1 items-center rounded-xl py-3 ${
                  form.title.trim() ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text
                    className={`font-semibold ${form.title.trim() ? 'text-white' : 'text-gray-400'}`}
                  >
                    Lagre
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── event form modal ───────────────────────────────────────────────────────

interface EventFormState {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  assignedTo: AssignedTo[];
  recurrence: ManualCalendarEvent['recurrence'];
}

function EventFormModal({
  visible,
  initialDate,
  familyChildren,
  onClose,
}: {
  visible: boolean;
  initialDate: string;
  familyChildren: Child[];
  onClose: () => void;
}) {
  const addCalendarEvent = useCalendarStore((s) => s.addCalendarEvent);
  const [saving, setSaving] = useState(false);

  const EMPTY: EventFormState = {
    title: '',
    description: '',
    startDate: initialDate,
    endDate: initialDate,
    startTime: '',
    endTime: '',
    isAllDay: false,
    assignedTo: [],
    recurrence: null,
  };
  const [form, setForm] = useState<EventFormState>(EMPTY);

  function set<K extends keyof EventFormState>(key: K, val: EventFormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await addCalendarEvent({
      title: form.title.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      endDate: form.endDate < form.startDate ? form.startDate : form.endDate,
      startTime: form.isAllDay ? null : (form.startTime.trim() || null),
      endTime: form.isAllDay ? null : (form.endTime.trim() || null),
      isAllDay: form.isAllDay,
      assignedTo: form.assignedTo,
      recurrence: form.recurrence,
    });
    setSaving(false);
    setForm(EMPTY);
    onClose();
  }

  function handleClose() {
    setForm(EMPTY);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/40" onPress={handleClose} />
        <View className="max-h-[90%] rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
            <Text className="text-lg font-bold text-gray-900">Ny hendelse</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <X size={22} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5" keyboardShouldPersistTaps="handled">
            <FormField label="Tittel">
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="Hendelsestitel..."
                placeholderTextColor="#9ca3af"
                value={form.title}
                onChangeText={(v) => set('title', v)}
                autoFocus
              />
            </FormField>

            <FormField label="Beskrivelse (valgfritt)">
              <TextInput
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                placeholder="Mer detaljer..."
                placeholderTextColor="#9ca3af"
                value={form.description}
                onChangeText={(v) => set('description', v)}
                multiline
                numberOfLines={2}
              />
            </FormField>

            <FormField label="Heldagshendelse">
              <View className="flex-row items-center gap-3">
                <Switch
                  value={form.isAllDay}
                  onValueChange={(v) => set('isAllDay', v)}
                  trackColor={{ true: '#6366f1', false: '#e5e7eb' }}
                  thumbColor="white"
                />
                <Text className="text-sm text-gray-500">
                  {form.isAllDay ? 'Hele dagen' : 'Spesifikt tidspunkt'}
                </Text>
              </View>
            </FormField>

            <FormField label="Fra dato">
              <InlineDatePicker
                value={form.startDate}
                onChange={(v) => set('startDate', v)}
              />
            </FormField>

            <FormField label="Til dato">
              <InlineDatePicker
                value={form.endDate}
                onChange={(v) => set('endDate', v)}
              />
            </FormField>

            {!form.isAllDay && (
              <>
                <FormField label="Fra tid">
                  <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                    placeholder="HH:MM"
                    placeholderTextColor="#9ca3af"
                    value={form.startTime}
                    onChangeText={(v) => set('startTime', v)}
                    keyboardType="numbers-and-punctuation"
                  />
                </FormField>

                <FormField label="Til tid">
                  <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900"
                    placeholder="HH:MM"
                    placeholderTextColor="#9ca3af"
                    value={form.endTime}
                    onChangeText={(v) => set('endTime', v)}
                    keyboardType="numbers-and-punctuation"
                  />
                </FormField>
              </>
            )}

            <FormField label="Gjelder">
              <AssigneeSelector
                value={form.assignedTo}
                onChange={(v) => set('assignedTo', v)}
                children={familyChildren}
              />
            </FormField>

            <FormField label="Gjentagelse">
              <RecurrencePicker
                value={form.recurrence}
                onChange={(v) => set('recurrence', v)}
              />
            </FormField>

            <View className="mb-8 flex-row gap-3">
              <TouchableOpacity
                onPress={handleClose}
                className="flex-1 items-center rounded-xl border border-gray-200 py-3"
                activeOpacity={0.7}
              >
                <Text className="font-semibold text-gray-500">Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !form.title.trim()}
                className={`flex-1 items-center rounded-xl py-3 ${
                  form.title.trim() ? 'bg-indigo-500' : 'bg-gray-200'
                }`}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text
                    className={`font-semibold ${form.title.trim() ? 'text-white' : 'text-gray-400'}`}
                  >
                    Lagre
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── week view ──────────────────────────────────────────────────────────────

function WeekView({
  familyChildren,
  onOpenReminder,
  onOpenEvent,
  onEdit,
}: {
  familyChildren: Child[];
  onOpenReminder: (isoDate: string) => void;
  onOpenEvent: (isoDate: string) => void;
  onEdit: (target: EditTarget) => void;
}) {
  const TODAY = todayIso();
  const [anchorMonday, setAnchorMonday] = useState(() => getMondayOfWeek(new Date()));
  const [filter, setFilter] = useState<FilterType>('alle');

  const weekNum = isoWeekNumber(anchorMonday);
  const isCurrentWeek = toIsoDate(anchorMonday) === toIsoDate(getMondayOfWeek(new Date()));

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchorMonday, i)),
    [anchorMonday],
  );

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: 'alle', label: 'Alle' },
    { id: 'lekser', label: 'Lekser' },
    { id: 'påminnelser', label: 'Påminnelser' },
    { id: 'hendelser', label: 'Hendelser' },
  ];

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Navigation */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() => setAnchorMonday((m) => addDays(m, -7))}
          className="p-1"
          hitSlop={8}
        >
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold text-gray-900">Uke {weekNum}</Text>
          <Text className="text-xs text-gray-400">{weekRangeText(anchorMonday)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setAnchorMonday((m) => addDays(m, 7))}
          className="p-1"
          hitSlop={8}
        >
          <ChevronRight size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Today button */}
      {!isCurrentWeek && (
        <TouchableOpacity
          onPress={() => setAnchorMonday(getMondayOfWeek(new Date()))}
          className="mx-4 mb-2 items-center rounded-xl border border-indigo-200 bg-indigo-50 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-xs font-semibold text-indigo-600">I dag</Text>
        </TouchableOpacity>
      )}

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3 px-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            onPress={() => setFilter(id)}
            className={`rounded-full px-4 py-1.5 ${
              filter === id ? 'bg-indigo-500' : 'bg-gray-100'
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-sm font-semibold ${
                filter === id ? 'text-white' : 'text-gray-600'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Days */}
      {weekDays.map((date) => {
        const iso    = toIsoDate(date);
        const isToday = iso === TODAY;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const dayIdx = (date.getDay() + 6) % 7; // Mon=0 … Sun=6

        return (
          <View key={iso} className="mb-4 mx-4 overflow-hidden rounded-2xl bg-white shadow-sm">
            {/* Residency strip */}
            <View className="px-3 pt-3">
              <ResidencyStrip date={date} />
            </View>

            {/* Day header */}
            <View className="flex-row items-center justify-between px-3 pb-2">
              <View className="flex-row items-center gap-2">
                {isToday && (
                  <View className="h-2 w-2 rounded-full bg-blue-500" />
                )}
                <Text
                  className={`text-sm font-bold ${
                    isToday
                      ? 'text-blue-600'
                      : isWeekend
                      ? 'text-gray-400'
                      : 'text-gray-800'
                  }`}
                >
                  {DAY_FULL[dayIdx]} {formatDateShort(iso)}
                </Text>
              </View>
            </View>

            {/* Events */}
            <DayEventsBlock isoDate={iso} filter={filter} children={familyChildren} onEdit={onEdit} />
            <View className="h-2" />
          </View>
        );
      })}

      <View className="h-28" />
    </ScrollView>
  );
}

// ── month view ─────────────────────────────────────────────────────────────

function MonthView({
  familyChildren,
  onOpenReminder,
  onOpenEvent,
  onEdit,
}: {
  familyChildren: Child[];
  onOpenReminder: (isoDate: string) => void;
  onOpenEvent: (isoDate: string) => void;
  onEdit: (target: EditTarget) => void;
}) {
  const TODAY = todayIso();
  const [displayDate, setDisplayDate] = useState(() => new Date());
  const [selectedIso, setSelectedIso] = useState(TODAY);

  const year  = displayDate.getFullYear();
  const month = displayDate.getMonth();

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Dot indicators
  const getSchoolEvents = useSchoolStore((s) => s.getEventsForDate);
  const getReminders    = useCalendarStore((s) => s.getRemindersForDate);
  const getEvents       = useCalendarStore((s) => s.getEventsForDate);
  const plansMap        = useFamilyStore((s) => s.plansMap);
  const remindersRaw    = useFamilyStore((s) => s.manualReminders);
  const eventsRaw       = useFamilyStore((s) => s.calendarEvents);
  const getCurrentParent = useFamilyStore((s) => s.getCurrentParent);

  function getDotsForDate(iso: string): string[] {
    const school = getSchoolEvents(iso);
    const dots: string[] = [];
    if (school.some((e) => e.category === 'reminder' || e.category === 'information'))
      dots.push('#f59e0b');
    if (school.some((e) => e.category === 'homework'))
      dots.push('#3b82f6');
    if (getReminders(iso).length > 0 && !dots.includes('#f59e0b'))
      dots.push('#f59e0b');
    if (getEvents(iso).length > 0)
      dots.push('#6366f1');
    return dots.slice(0, 3);
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Month navigation */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() => setDisplayDate((d) => addMonthsTo(d, -1))}
          className="p-1"
          hitSlop={8}
        >
          <ChevronLeft size={22} color="#374151" />
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-base font-bold capitalize text-gray-900">
            {NO_MONTHS[month]} {year}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setDisplayDate((d) => addMonthsTo(d, 1))}
          className="p-1"
          hitSlop={8}
        >
          <ChevronRight size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Today button */}
      {toIsoDate(displayDate).slice(0, 7) !== TODAY.slice(0, 7) && (
        <TouchableOpacity
          onPress={() => { setDisplayDate(new Date()); setSelectedIso(TODAY); }}
          className="mx-4 mb-2 items-center rounded-xl border border-indigo-200 bg-indigo-50 py-2"
          activeOpacity={0.7}
        >
          <Text className="text-xs font-semibold text-indigo-600">I dag</Text>
        </TouchableOpacity>
      )}

      {/* Calendar grid */}
      <View className="mx-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Day headers */}
        <View className="flex-row border-b border-gray-100 px-1 py-2">
          {DAY_SHORT.map((d) => (
            <View key={d} className="flex-1 items-center">
              <Text className="text-xs font-semibold text-gray-400">{d}</Text>
            </View>
          ))}
        </View>

        {/* Grid rows */}
        {grid.map((row, ri) => (
          <View key={ri} className="flex-row px-1 py-0.5">
            {row.map((date, ci) => {
              if (!date) return <View key={ci} className="flex-1" />;
              const iso      = toIsoDate(date);
              const isToday  = iso === TODAY;
              const isSelected = iso === selectedIso;
              const dots     = getDotsForDate(iso);
              const parent   = getCurrentParent(date);

              return (
                <TouchableOpacity
                  key={ci}
                  onPress={() => setSelectedIso(iso)}
                  className={`flex-1 items-center rounded-xl py-1 ${
                    isSelected && !isToday ? 'bg-gray-800' : ''
                  } ${isToday ? 'bg-blue-500' : ''}`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isToday || isSelected ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {date.getDate()}
                  </Text>
                  {/* Dots */}
                  {dots.length > 0 && (
                    <View className="mt-0.5 flex-row gap-0.5">
                      {dots.map((color, di) => (
                        <View
                          key={di}
                          className="h-1 w-1 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </View>
                  )}
                  {/* Samvær strip */}
                  <View
                    className="mt-0.5 h-0.5 w-4 rounded-full"
                    style={{
                      backgroundColor:
                        parent === 'Mamma'
                          ? '#fda4af'
                          : parent === 'Pappa'
                          ? '#93c5fd'
                          : 'transparent',
                    }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Selected day events */}
      {selectedIso && (
        <View className="mx-4 mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
          <View className="flex-row items-center justify-between px-4 py-3">
            <View>
              <Text className="font-bold text-gray-900">
                {DAY_FULL[(new Date(selectedIso + 'T00:00:00').getDay() + 6) % 7]}{' '}
                {formatDateShort(selectedIso)}
              </Text>
            </View>
            <ResidencyBadge parent={getCurrentParent(new Date(selectedIso + 'T00:00:00'))} />
          </View>
          <View className="h-px bg-gray-100" />
          <DayEventsBlock
            isoDate={selectedIso}
            filter="alle"
            children={familyChildren}
            onEdit={onEdit}
          />
          <View className="h-2" />
        </View>
      )}

      <View className="h-28" />
    </ScrollView>
  );
}

// ── main screen ────────────────────────────────────────────────────────────

type ViewMode = 'Uke' | 'Måned';

export default function KalenderScreen() {
  const TODAY = todayIso();
  const [viewMode, setViewMode] = useState<ViewMode>('Uke');
  const [fabOpen, setFabOpen] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showEventForm, setShowEventForm]       = useState(false);
  const [formDate, setFormDate]                 = useState(TODAY);
  const [editTarget, setEditTarget]             = useState<EditTarget | null>(null);

  const isLoading      = useFamilyStore((s) => s.isLoading);
  const familyChildren = useFamilyStore((s) => s.children);

  function openReminderForm(isoDate: string) {
    setFormDate(isoDate);
    setFabOpen(false);
    setShowReminderForm(true);
  }
  function openEventForm(isoDate: string) {
    setFormDate(isoDate);
    setFabOpen(false);
    setShowEventForm(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={[]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-2xl font-bold text-gray-900">Kalender</Text>
        <View className="flex-row items-center gap-3">
          {/* Segment control */}
          <View className="flex-row overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            {(['Uke', 'Måned'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                className={`px-3 py-1.5 ${
                  viewMode === mode ? 'bg-white shadow-sm' : ''
                } rounded-xl`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-semibold ${
                    viewMode === mode ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : viewMode === 'Uke' ? (
        <WeekView
          familyChildren={familyChildren}
          onOpenReminder={openReminderForm}
          onOpenEvent={openEventForm}
          onEdit={setEditTarget}
        />
      ) : (
        <MonthView
          familyChildren={familyChildren}
          onOpenReminder={openReminderForm}
          onOpenEvent={openEventForm}
          onEdit={setEditTarget}
        />
      )}

      {/* FAB overlay / menu */}
      {fabOpen && (
        <Pressable
          className="absolute inset-0"
          onPress={() => setFabOpen(false)}
        />
      )}

      {/* FAB menu items */}
      {fabOpen && (
        <View className="absolute bottom-24 right-5 items-end gap-2">
          <TouchableOpacity
            onPress={() => openEventForm(TODAY)}
            className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg"
            activeOpacity={0.8}
          >
            <CalendarDays size={18} color="#6366f1" />
            <Text className="font-semibold text-gray-800">Hendelse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openReminderForm(TODAY)}
            className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lg"
            activeOpacity={0.8}
          >
            <Bell size={18} color="#f59e0b" />
            <Text className="font-semibold text-gray-800">Påminnelse</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB button */}
      <TouchableOpacity
        onPress={() => setFabOpen((v) => !v)}
        className={`absolute bottom-8 right-5 h-14 w-14 items-center justify-center rounded-full shadow-lg ${
          fabOpen ? 'bg-gray-700' : 'bg-indigo-500'
        }`}
        activeOpacity={0.85}
      >
        <Plus
          size={26}
          color="white"
          style={{ transform: [{ rotate: fabOpen ? '45deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {/* Forms */}
      <ReminderFormModal
        visible={showReminderForm}
        initialDate={formDate}
        familyChildren={familyChildren}
        onClose={() => setShowReminderForm(false)}
      />
      <EventFormModal
        visible={showEventForm}
        initialDate={formDate}
        familyChildren={familyChildren}
        onClose={() => setShowEventForm(false)}
      />

      {/* Edit existing event */}
      <EventEditModal target={editTarget} onClose={() => setEditTarget(null)} />
    </SafeAreaView>
  );
}
