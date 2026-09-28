import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Divider, FAB, List, Text } from 'react-native-paper';

import { ChipRow } from '@/components/chip-row';
import {
  listClasses,
  listSectionsByClass,
  listStudentsBySection,
  type ClassDto,
  type SectionDto,
  type StudentDto,
} from '@/lib/academic-api';
import { useAuthStore } from '@/store/auth-store';

export default function StudentsScreen() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionDto[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    if (!token) return;
    listClasses(token)
      .then((result) => {
        setClasses(result);
        setSelectedClassId(result.length > 0 ? result[0].id : null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load classes'))
      .finally(() => setIsLoadingClasses(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedClassId) return;
    listSectionsByClass(token, selectedClassId)
      .then((result) => {
        setSections(result);
        const firstSectionId = result.length > 0 ? result[0].id : null;
        setSelectedSectionId(firstSectionId);
        if (firstSectionId) setIsLoadingStudents(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sections'));
  }, [token, selectedClassId]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !selectedSectionId) return;
      listStudentsBySection(token, selectedSectionId)
        .then(setStudents)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load students'))
        .finally(() => setIsLoadingStudents(false));
    }, [token, selectedSectionId]),
  );

  const handleSelectClass = (id: string) => {
    setSelectedClassId(id);
    setSections([]);
    setSelectedSectionId(null);
    setStudents([]);
  };

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
    setStudents([]);
    setIsLoadingStudents(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <View style={styles.pickers}>
        {isLoadingClasses ? (
          <ActivityIndicator style={styles.spacingTop} />
        ) : (
          <>
            <ChipRow
              items={classes.map((c) => ({ id: c.id, label: c.name }))}
              selectedId={selectedClassId}
              onSelect={handleSelectClass}
            />
            <ChipRow
              items={sections.map((s) => ({ id: s.id, label: `Section ${s.name}` }))}
              selectedId={selectedSectionId}
              onSelect={handleSelectSection}
            />
            {selectedClassId && (
              <Button
                mode="text"
                icon="chart-box-outline"
                onPress={() => router.push({ pathname: '/insights/[classId]', params: { classId: selectedClassId } })}
                style={styles.insightsButton}>
                View class insights
              </Button>
            )}
          </>
        )}

        {error && (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        )}
      </View>

      {isLoadingStudents ? (
        <ActivityIndicator style={styles.spacingTop} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Divider}
          ListEmptyComponent={
            selectedSectionId ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No students in this section yet.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <List.Item
              title={item.fullName}
              description={`Roll No. ${item.rollNumber}`}
              left={(props) => <List.Icon {...props} icon="account-circle-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push({ pathname: '/students/[studentId]', params: { studentId: item.id } })}
            />
          )}
        />
      )}

      {role === 'admin' && selectedSectionId && (
        <FAB
          icon="account-plus"
          label="Add Student"
          style={styles.fab}
          onPress={() => router.push({ pathname: '/students/create', params: { sectionId: selectedSectionId } })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pickers: { paddingHorizontal: 16 },
  spacingTop: { marginTop: 24 },
  error: { color: '#B3261E', marginTop: 8 },
  insightsButton: { alignSelf: 'flex-start', marginLeft: -12 },
  emptyText: { textAlign: 'center', marginTop: 24, opacity: 0.7 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
