import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";
import Feather from "@expo/vector-icons/Feather";
import { colors, fonts, formStyles, radius, spacing } from "../theme";
import { formatDate, formatDateRange as formatRange } from "../lib/dates";

type MarkedDates = Record<
  string,
  { startingDay?: boolean; endingDay?: boolean; color?: string; textColor?: string }
>;

function buildMarkedDates(start: string, end: string): MarkedDates {
  if (!start) return {};
  if (!end || end === start) {
    return {
      [start]: { startingDay: true, endingDay: true, color: colors.green, textColor: colors.ink },
    };
  }

  const marked: MarkedDates = {};
  const cursor = new Date(start);
  const endDate = new Date(end);
  while (cursor <= endDate) {
    const iso = cursor.toISOString().slice(0, 10);
    marked[iso] = { color: colors.sage, textColor: colors.ink };
    cursor.setDate(cursor.getDate() + 1);
  }
  marked[start] = { startingDay: true, color: colors.green, textColor: colors.ink };
  marked[end] = { ...marked[end], endingDay: true, color: colors.green, textColor: colors.ink };
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
        <Feather name="calendar" size={17} color={colors.muted} />
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
                todayTextColor: colors.forest,
                arrowColor: colors.forest,
                textMonthFontWeight: "600",
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
    borderRadius: radius.input,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  placeholderText: { fontFamily: fonts.regular, fontSize: 15, color: colors.mutedLight },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(32,33,31,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sheetTitle: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.ink },
  sheetSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginBottom: spacing.sm, marginTop: 2 },
});
