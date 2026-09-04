import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { CITIES } from "../data/cities";
import { colors, fonts, formStyles, radius } from "../theme";

const MAX_SUGGESTIONS = 8;

export function CityAutocomplete({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  // Delay hiding the dropdown on blur so a tap on a suggestion has time to
  // register -- otherwise the list disappears before onPress fires.
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (query.length === 0) return [];
    return CITIES.filter((city) => city.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS);
  }, [value]);

  // Don't show a dropdown once the field already holds an exact match --
  // there's nothing left to pick.
  const showDropdown =
    focused && suggestions.length > 0 && !suggestions.some((c) => c === value);

  function handleBlur() {
    blurTimeout.current = setTimeout(() => setFocused(false), 150);
  }

  function selectCity(city: string) {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    onChangeText(city);
    setFocused(false);
  }

  return (
    <View>
      <TextInput
        style={formStyles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoCorrect={false}
      />
      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
            {suggestions.map((city) => (
              <Pressable key={city} style={styles.row} onPress={() => selectCity(city)}>
                <Text style={styles.rowText}>{city}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = {
  dropdown: {
    marginTop: 6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden" as const,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 14, fontFamily: fonts.regular, color: colors.ink },
};
