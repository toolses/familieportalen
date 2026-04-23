import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { X, Trash2, Check, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react-native';
import { useCalendarStore } from '../store/useCalendarStore';
import { useSchoolStore } from '../store/useSchoolStore';
import { useFamilyStore } from '../store/useFamilyStore';
import { toIsoDate } from '../utils/date-utils';
import type {
  ManualReminder,
  ManualCalendarEvent,
  TaggedSchoolEvent,
  AssignedTo,
  Child,
} from '../types/family.types';

export type EditTarget =
  | { kind: 'reminder'; data: ManualReminder }
  | { kind: 'event'; data: ManualCalendarEvent }
  | { kind: 'school'; data: TaggedSchoolEvent; onToggle?: () => void };

interface Props {
  target: EditTarget | null;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  reminder: 'Påminnelse',
  event: 'Hendelse',
  school: 'Skoleoppgave',
};

const NO_MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];
const DAY_SHORT = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

const RECURRENCE_OPTS = [
  { label: 'Ingen',         value: null                      },
  { label: 'Hver uke',      value: { type: 'weekly' as const }   },
  { label: 'Annenhver uke', value: { type: 'biweekly' as const } },
] as const;

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

// ── InlineDatePicker ──────────────────────────────────────────────────────────

function InlineDatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
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
            {DAY_SHORT.map((d) => (
              <Text key={d} className="w-8 text-center text-[10px] font-semibold text-gray-400">{d}</Text>
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
                    <Text className={`text-xs ${
                      selected ? 'font-bold text-white' : isToday ? 'font-semibold text-indigo-600' : 'text-gray-700'
                    }`}>
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

// ── AssigneeSelector ──────────────────────────────────────────────────────────

function AssigneeSelector({
  value,
  onChange,
  children,
}: {
  value: AssignedTo[];
  onChange: (v: AssignedTo[]) => void;
  children: Child[];
}) {
  const all: AssignedTo[] = [
    { type: 'parent', role: 'Mamma' },
    { type: 'parent', role: 'Pappa' },
    ...children.map((c): AssignedTo => ({ type: 'child', childId: c.id })),
  ];

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
      onChange(value.filter((v) => {
        if (v.type !== a.type) return true;
        if (v.type === 'parent' && a.type === 'parent') return v.role !== a.role;
        if (v.type === 'child' && a.type === 'child') return v.childId !== a.childId;
        return true;
      }));
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
        const color = colorFor(a);
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
            <Text className="text-sm font-medium" style={{ color: active ? color : '#6b7280' }}>
              {labelFor(a)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── RecurrencePicker ──────────────────────────────────────────────────────────

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
            <Text className={`text-xs font-semibold ${active ? 'text-indigo-600' : 'text-gray-500'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────

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

// ── Reminder edit form ────────────────────────────────────────────────────────

function ReminderForm({
  data,
  familyChildren,
  onClose,
}: {
  data: ManualReminder;
  familyChildren: Child[];
  onClose: () => void;
}) {
  const updateReminder = useCalendarStore((s) => s.updateReminder);
  const deleteReminder = useCalendarStore((s) => s.deleteReminder);

  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description);
  const [date, setDate] = useState(data.date);
  const [time, setTime] = useState(data.time ?? '');
  const [isSchoolRelated, setIsSchoolRelated] = useState(data.isSchoolRelated);
  const [assignedTo, setAssignedTo] = useState<AssignedTo[]>(data.assignedTo);
  const [recurrence, setRecurrence] = useState(data.recurrence);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(data.title);
    setDescription(data.description);
    setDate(data.date);
    setTime(data.time ?? '');
    setIsSchoolRelated(data.isSchoolRelated);
    setAssignedTo(data.assignedTo);
    setRecurrence(data.recurrence);
  }, [data.id]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updateReminder(data.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        time: time.trim() || null,
        isSchoolRelated,
        assignedTo,
        recurrence,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Slett påminnelse?', 'Handlingen kan ikke angres.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => { await deleteReminder(data.id); onClose(); },
      },
    ]);
  }

  return (
    <>
      <FormField label="Tittel">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />
      </FormField>

      <FormField label="Beskrivelse (valgfritt)">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 72 }}
        />
      </FormField>

      <FormField label="Dato">
        <InlineDatePicker value={date} onChange={setDate} />
      </FormField>

      <FormField label="Klokkeslett (valgfritt)">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={time}
          onChangeText={setTime}
          placeholder="HH:MM"
          keyboardType="numbers-and-punctuation"
        />
      </FormField>

      <FormField label="Skolerelatert">
        <View className="flex-row items-center gap-3">
          <Switch
            value={isSchoolRelated}
            onValueChange={setIsSchoolRelated}
            trackColor={{ true: '#6366f1', false: '#e5e7eb' }}
            thumbColor="white"
          />
          <Text className="text-sm text-gray-500">
            {isSchoolRelated ? 'Ja – vises på skole-siden' : 'Nei'}
          </Text>
        </View>
      </FormField>

      <FormField label="Gjelder">
        <AssigneeSelector value={assignedTo} onChange={setAssignedTo} children={familyChildren} />
      </FormField>

      <FormField label="Gjentagelse">
        <RecurrencePicker value={recurrence} onChange={setRecurrence} />
      </FormField>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving || !title.trim()}
        className={`mb-3 items-center rounded-2xl py-3.5 ${title.trim() ? 'bg-indigo-500' : 'bg-indigo-200'}`}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator size="small" color="white" /> : <Text className="font-semibold text-white">Lagre</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDelete}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-red-200 py-3"
        activeOpacity={0.8}
      >
        <Trash2 size={14} color="#ef4444" />
        <Text className="font-semibold text-red-500">Slett påminnelse</Text>
      </TouchableOpacity>
    </>
  );
}

// ── Calendar event edit form ──────────────────────────────────────────────────

function EventForm({
  data,
  familyChildren,
  onClose,
}: {
  data: ManualCalendarEvent;
  familyChildren: Child[];
  onClose: () => void;
}) {
  const updateCalendarEvent = useCalendarStore((s) => s.updateCalendarEvent);
  const deleteCalendarEvent = useCalendarStore((s) => s.deleteCalendarEvent);

  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description);
  const [startDate, setStartDate] = useState(data.startDate);
  const [endDate, setEndDate] = useState(data.endDate);
  const [startTime, setStartTime] = useState(data.startTime ?? '');
  const [endTime, setEndTime] = useState(data.endTime ?? '');
  const [isAllDay, setIsAllDay] = useState(data.isAllDay);
  const [assignedTo, setAssignedTo] = useState<AssignedTo[]>(data.assignedTo);
  const [recurrence, setRecurrence] = useState(data.recurrence);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(data.title);
    setDescription(data.description);
    setStartDate(data.startDate);
    setEndDate(data.endDate);
    setStartTime(data.startTime ?? '');
    setEndTime(data.endTime ?? '');
    setIsAllDay(data.isAllDay);
    setAssignedTo(data.assignedTo);
    setRecurrence(data.recurrence);
  }, [data.id]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updateCalendarEvent(data.id, {
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        startTime: isAllDay ? null : (startTime.trim() || null),
        endTime: isAllDay ? null : (endTime.trim() || null),
        isAllDay,
        assignedTo,
        recurrence,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Slett hendelse?', 'Handlingen kan ikke angres.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => { await deleteCalendarEvent(data.id); onClose(); },
      },
    ]);
  }

  return (
    <>
      <FormField label="Tittel">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />
      </FormField>

      <FormField label="Beskrivelse (valgfritt)">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 72 }}
        />
      </FormField>

      <FormField label="Heldagshendelse">
        <View className="flex-row items-center gap-3">
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ true: '#6366f1', false: '#e5e7eb' }}
            thumbColor="white"
          />
          <Text className="text-sm text-gray-500">
            {isAllDay ? 'Hele dagen' : 'Spesifikt tidspunkt'}
          </Text>
        </View>
      </FormField>

      <FormField label="Fra dato">
        <InlineDatePicker value={startDate} onChange={setStartDate} />
      </FormField>

      <FormField label="Til dato">
        <InlineDatePicker value={endDate} onChange={setEndDate} />
      </FormField>

      {!isAllDay && (
        <>
          <FormField label="Fra kl.">
            <TextInput
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
            />
          </FormField>

          <FormField label="Til kl.">
            <TextInput
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:MM"
              keyboardType="numbers-and-punctuation"
            />
          </FormField>
        </>
      )}

      <FormField label="Gjelder">
        <AssigneeSelector value={assignedTo} onChange={setAssignedTo} children={familyChildren} />
      </FormField>

      <FormField label="Gjentagelse">
        <RecurrencePicker value={recurrence} onChange={setRecurrence} />
      </FormField>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving || !title.trim()}
        className={`mb-3 items-center rounded-2xl py-3.5 ${title.trim() ? 'bg-indigo-500' : 'bg-indigo-200'}`}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator size="small" color="white" /> : <Text className="font-semibold text-white">Lagre</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDelete}
        className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-red-200 py-3"
        activeOpacity={0.8}
      >
        <Trash2 size={14} color="#ef4444" />
        <Text className="font-semibold text-red-500">Slett hendelse</Text>
      </TouchableOpacity>
    </>
  );
}

// ── School event edit form ────────────────────────────────────────────────────

function SchoolEventForm({ data, onClose }: { data: TaggedSchoolEvent; onClose: () => void }) {
  const updateSchoolEvent = useSchoolStore((s) => s.updateSchoolEvent);
  const toggleHomework = useSchoolStore((s) => s.toggleHomeworkCompletion);
  const isHomework = data.category === 'homework';

  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description);
  const [saving, setSaving] = useState(false);
  const originalTitle = useRef(data.title);

  useEffect(() => {
    setTitle(data.title);
    setDescription(data.description);
    originalTitle.current = data.title;
  }, [data.childId, data.date, data.title]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await updateSchoolEvent(data.childId, data.date, originalTitle.current, {
        title: title.trim(),
        description: description.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Child info row */}
      <View className="mb-4 flex-row items-center gap-2">
        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.childColor }} />
        <Text className="text-xs font-semibold" style={{ color: data.childColor }}>
          {data.childName}
        </Text>
        <Text className="text-xs text-gray-400">· {fmtDate(data.date)}</Text>
      </View>

      <FormField label="Tittel">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />
      </FormField>

      <FormField label="Beskrivelse (valgfritt)">
        <TextInput
          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 72 }}
        />
      </FormField>

      {isHomework && (
        <TouchableOpacity
          onPress={async () => {
            await toggleHomework(data.childId, data.date, data.title);
            onClose();
          }}
          className={`mb-3 items-center rounded-2xl py-3.5 ${data.completed ? 'bg-gray-200' : 'bg-blue-500'}`}
          activeOpacity={0.8}
        >
          <Text className={`font-semibold ${data.completed ? 'text-gray-600' : 'text-white'}`}>
            {data.completed ? 'Merk som ikke ferdig' : 'Merk som ferdig'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving || !title.trim()}
        className={`mb-3 items-center rounded-2xl py-3.5 ${title.trim() ? 'bg-indigo-500' : 'bg-indigo-200'}`}
        activeOpacity={0.8}
      >
        {saving ? <ActivityIndicator size="small" color="white" /> : <Text className="font-semibold text-white">Lagre</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onClose}
        className="items-center rounded-2xl border border-gray-200 py-3"
        activeOpacity={0.8}
      >
        <Text className="font-semibold text-gray-500">Lukk</Text>
      </TouchableOpacity>
    </>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function EventEditModal({ target, onClose }: Props) {
  const familyChildren = useFamilyStore((s) => s.children);

  const headerTitle = target ? target.data.title : '';
  const headerKind = target ? KIND_LABEL[target.kind] : '';

  return (
    <Modal
      visible={target !== null}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable onPress={() => {}} className="rounded-t-3xl bg-white" style={{ maxHeight: '92%' }}>
          {/* Handle */}
          <View className="items-center pt-3 pb-1">
            <View className="h-1 w-10 rounded-full bg-gray-200" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-3">
            <View className="flex-1 pr-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {headerKind}
              </Text>
              <Text className="mt-0.5 text-lg font-bold text-gray-900" numberOfLines={1}>
                {headerTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} className="rounded-full bg-gray-100 p-1.5">
              <X size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="mx-4 h-px bg-gray-100" />

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {target?.kind === 'reminder' && (
              <ReminderForm data={target.data} familyChildren={familyChildren} onClose={onClose} />
            )}
            {target?.kind === 'event' && (
              <EventForm data={target.data} familyChildren={familyChildren} onClose={onClose} />
            )}
            {target?.kind === 'school' && (
              <SchoolEventForm data={target.data} onClose={onClose} />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
