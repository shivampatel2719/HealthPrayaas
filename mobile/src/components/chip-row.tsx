import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

type ChipItem = { id: string; label: string };

type ChipRowProps = {
  items: ChipItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ChipRow({ items, selectedId, onSelect }: ChipRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => (
        <Chip
          key={item.id}
          selected={item.id === selectedId}
          mode={item.id === selectedId ? 'flat' : 'outlined'}
          onPress={() => onSelect(item.id)}
          style={styles.chip}>
          {item.label}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 8,
  },
  chip: {
    marginRight: 4,
  },
});
