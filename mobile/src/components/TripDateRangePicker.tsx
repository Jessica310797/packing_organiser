import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import { colors, formStyles, radius, spacing } from "../theme";

type MarkedDates = Record<
  string,
  { startingDay?: boolean; endingDay?: boolean; color?: string; textColor?: string }
>;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

function formatRange(start: string, end: string): string {
  if (!start) return "";
  if (!end || end === start) return formatDate(start);
  const startYear = start.split("-")[0];
  const endYear = end.split("-")[0];
  if (startYear === endYear) {
    const [, m, d] = start.split("-").map(Number);
    const [ye, me, de] = end.split("-").map(Number);
    return `${d} ${MONTHS[(m ?? 1) - 1]} – ${de} ${MONTHS[(me ?? 1) - 1]} ${ye}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function buildMarkedDates(start: string, end: string): MarkedDates {
  if (!start) return {};
  if (!end || end === start) {
    return {
      [start]: { startingDay: true, endingDay: true, color: colors.accent, textColor: "#fff" },
    };
  }

  const marked: MarkedDates = {};
  const cursor = new Date(start);
  const endDate = new Date(end);
  while (cursor <= endDate) {
    const iso = cursor.toISOString().slice(0, 10);
    marked[iso] = { color: colors.accentSoft, textColor: colors.ink };
    cursor.setDate(cursor.getDate() + 1);
  }
  marked[start] = { startingDay: true, color: colors.accent, textColor: "#fff" };
  marked[end] = { ...marked[end], endingDay: true, color: colors.accent, textColor: "#fff" };
  return marked;
}

export function TripDateRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);

  function open() {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setModalVisible(true);
  }

  function handleDayPress(day: DateData) {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(day.dateString);
      setDraftEnd("");
    } else if (day.dateString < draftStart) {
      setDraftStart(day.dateString);
      setDraftEnd("");
    } else {
      setDraftEnd(day.dateString);
    }
  }

  function confirm() {
    if (draftStart) onChange(draftStart, draftEnd || draftStart);
    setModalVisible(false);
  }

  const displayText = formatRange(startDate, endDate);

  return (
    <View>
      <Pressable style={styles.select} onPress={open}>
        <Text style={displayText ? styles.selectText : styles.placeholderText}>
          {displayText || "Select trip dates"}
        </Text>
        <Text style={styles.chevron}>📅</Text>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Trip dates</Text>
            <Text style={styles.sheetSubtitle}>
              {draftStart && !draftEnd
                ? `${formatDate(draftStart)} – pick an end date`
                : formatRange(draftStart, draftEnd) || "Tap a start date, then an end date"}
            </Text>
            <Calendar
              current={draftStart || undefined}
              markingType="period"
              markedDates={buildMarkedDates(draftStart, draftEnd)}
              onDayPress={handleDayPress}
              enableSwipeMonths
              theme={{
                todayTextColor: colors.accent,
                arrowColor: colors.accent,
                textMonthFontWeight: "700",
                textDayFontSize: 14,
                textMonthFontSize: 15,
              }}
            />
            <Pressable
              style={[formStyles.button, !draftStart && { opacity: 0.5 }, { marginTop: spacing.md }]}
              onPress={confirm}
              disabled={!draftStart}
            >
              <Text style={formStyles.buttonLabel}>Confirm dates</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  select: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontSize: 15, color: colors.ink },
  placeholderText: { fontSize: 15, color: colors.mutedLight },
  chevron: { fontSize: 15 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  sheetSubtitle: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm, marginTop: 2 },
});
