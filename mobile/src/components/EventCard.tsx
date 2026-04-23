import { View, Text, TouchableOpacity } from 'react-native';

export type EventCardKind = 'reminder' | 'event' | 'homework' | 'info';

export interface EventCardAssignee {
  label: string;
  color: string;
}

export interface EventCardProps {
  kind: EventCardKind;
  title: string;
  description?: string;
  // Single-day items (reminders, homework, info)
  date?: string;
  time?: string;
  // Calendar events (may be multi-day)
  startDate?: string;
  endDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  isAllDay?: boolean;
  // Assignees
  assignees?: EventCardAssignee[];
  // Homework
  completed?: boolean;
  onToggleComplete?: () => void;
  // Edit
  onPress?: () => void;
}

// Background colors matching Kalender section containers
const BG: Record<EventCardKind, string> = {
  reminder: '#FFFBEB', // amber-50
  event:    '#EEF2FF', // indigo-50
  homework: '#EFF6FF', // blue-50
  info:     '#ECFDF5', // emerald-50
};

// Badge colors: slightly stronger than the background
const BADGE: Record<EventCardKind, { label: string; bg: string; fg: string }> = {
  reminder: { label: 'Påminnelse', bg: '#FDE68A', fg: '#92400E' }, // amber-200/800
  event:    { label: 'Hendelse',   bg: '#C7D2FE', fg: '#3730A3' }, // indigo-200/800
  homework: { label: 'Lekse',      bg: '#BFDBFE', fg: '#1E40AF' }, // blue-200/800
  info:     { label: 'Info',       bg: '#A7F3D0', fg: '#065F46' }, // emerald-200/800
};

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

/**
 * Build the time/date subtitle label:
 * - reminder: time only, e.g. "14:30"
 * - event (multi-day): "23.04 06:00 – 28.04 18:00" / "23.04 – 28.04"
 * - event (same-day): "14:00 – 15:30" / "14:30"
 * - homework / info: nothing
 */
function buildTimeLabel(
  kind: EventCardKind,
  time: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  isAllDay: boolean | undefined,
): string | null {
  if (kind === 'reminder') {
    return time || null;
  }
  if (kind === 'event') {
    const multiDay = !!(startDate && endDate && startDate !== endDate);
    if (multiDay) {
      const hasStart = !!(startTime && !isAllDay);
      const hasEnd   = !!(endTime && !isAllDay);
      if (hasStart && hasEnd)  return `${fmtDate(startDate!)} ${startTime} – ${fmtDate(endDate!)} ${endTime}`;
      if (hasStart)             return `${fmtDate(startDate!)} ${startTime} – ${fmtDate(endDate!)}`;
      return `${fmtDate(startDate!)} – ${fmtDate(endDate!)}`;
    }
    if (!isAllDay) {
      if (startTime && endTime) return `${startTime} – ${endTime}`;
      if (startTime)            return startTime;
    }
  }
  return null;
}

export function EventCard({
  kind,
  title,
  description,
  date,
  time,
  startDate,
  endDate,
  startTime,
  endTime,
  isAllDay,
  assignees = [],
  completed = false,
  onToggleComplete,
  onPress,
}: EventCardProps) {
  const badge    = BADGE[kind];
  const bgColor  = BG[kind];
  const timeLabel = buildTimeLabel(kind, time, startDate, endDate, startTime, endTime, isAllDay);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
      className="mb-2 rounded-2xl p-4"
      style={{ backgroundColor: bgColor, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}
    >
      {/* Row 1: title (+ checkbox for homework) + badge */}
      <View className="flex-row items-start gap-2">
        {kind === 'homework' && (
          <TouchableOpacity
            onPress={onToggleComplete}
            hitSlop={8}
            className={`mt-0.5 h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
              completed ? 'border-blue-500 bg-blue-500' : 'border-blue-300'
            }`}
            activeOpacity={0.7}
          >
            {completed && <Text className="text-[9px] font-bold text-white">✓</Text>}
          </TouchableOpacity>
        )}

        <Text
          className={`flex-1 text-[15px] font-semibold leading-snug ${
            completed ? 'text-gray-400 line-through' : 'text-gray-800'
          }`}
          numberOfLines={2}
        >
          {title}
        </Text>

        <View
          className="ml-1 flex-shrink-0 rounded-full px-2 py-0.5"
          style={{ backgroundColor: badge.bg }}
        >
          <Text className="text-[10px] font-semibold" style={{ color: badge.fg }}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Row 2: time / date-time label */}
      {!!timeLabel && (
        <Text className="mt-1 text-xs text-gray-500">{timeLabel}</Text>
      )}

      {/* Row 3: description */}
      {!!description && (
        <Text
          className={`mt-1 text-sm leading-snug ${completed ? 'text-gray-300' : 'text-gray-500'}`}
          numberOfLines={3}
        >
          {description}
        </Text>
      )}

      {/* Row 4: assignees */}
      {assignees.length > 0 && (
        <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
          {assignees.map((a, i) => (
            <View key={i} className="flex-row items-center gap-1">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
              <Text className="text-[11px] font-semibold" style={{ color: a.color }}>
                {a.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
