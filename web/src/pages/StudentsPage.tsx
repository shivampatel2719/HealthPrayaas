import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Group,
  Loader,
  Modal,
  NumberInput,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useNavigate } from 'react-router-dom';

import {
  createClass,
  createSection,
  createStudent,
  listClasses,
  listSectionsByClass,
  listStudentsBySection,
} from '@/db/academic';
import type { ClassRow, Gender, SectionRow, StudentRow } from '@/db/db';
import { useProfileStore } from '@/store/profile-store';

export function StudentsPage() {
  const navigate = useNavigate();
  const isAdmin = useProfileStore((s) => s.role) === 'admin';

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [classModalOpen, setClassModalOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  const refreshClasses = () => listClasses().then(setClasses);

  useEffect(() => {
    listClasses()
      .then((result) => {
        setClasses(result);
        setSelectedClassId(result[0]?.id ?? null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    listSectionsByClass(selectedClassId).then((result) => {
      setSections(result);
      setSelectedSectionId(result[0]?.id ?? null);
    });
  }, [selectedClassId]);

  const refreshStudents = () => {
    if (!selectedSectionId) return;
    listStudentsBySection(selectedSectionId).then(setStudents);
  };

  useEffect(refreshStudents, [selectedSectionId]);

  const handleSelectClass = (value: string) => {
    setSelectedClassId(value);
    setSections([]);
    setSelectedSectionId(null);
    setStudents([]);
  };

  const handleSelectSection = (value: string) => {
    setSelectedSectionId(value);
    setStudents([]);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" wrap="wrap">
        <Title order={2}>Students</Title>
        {isAdmin && (
          <Button variant="outline" size="xs" onClick={() => setClassModalOpen(true)}>
            + Class
          </Button>
        )}
      </Group>

      {isLoading ? (
        <Loader color="medblue" />
      ) : classes.length === 0 ? (
        <Alert color="gray">No classes yet. Add one to get started.</Alert>
      ) : (
        <>
          <Chip.Group value={selectedClassId} onChange={(value) => handleSelectClass(value as string)}>
            <Group gap="xs">
              {classes.map((cls) => (
                <Chip key={cls.id} value={cls.id}>
                  {cls.name}
                </Chip>
              ))}
            </Group>
          </Chip.Group>

          <Group gap="xs" align="center">
            <Chip.Group value={selectedSectionId} onChange={(value) => handleSelectSection(value as string)}>
              <Group gap="xs">
                {sections.map((section) => (
                  <Chip key={section.id} value={section.id}>
                    Section {section.name}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            {isAdmin && selectedClassId && (
              <Button variant="subtle" size="xs" onClick={() => setSectionModalOpen(true)}>
                + Section
              </Button>
            )}
          </Group>

          {selectedClassId && (
            <Button
              variant="light"
              size="xs"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => navigate(`/insights/${selectedClassId}`)}>
              View class insights →
            </Button>
          )}

          <Group justify="space-between">
            <Text fw={500}>Roster</Text>
            {isAdmin && selectedSectionId && (
              <Button size="xs" onClick={() => setStudentModalOpen(true)}>
                + Add Student
              </Button>
            )}
          </Group>

          <Table.ScrollContainer minWidth={320}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Roll No.</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Gender</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {students.map((student) => (
                  <Table.Tr key={student.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/students/${student.id}`)}>
                    <Table.Td>{student.rollNumber}</Table.Td>
                    <Table.Td>{student.fullName}</Table.Td>
                    <Table.Td>{student.gender}</Table.Td>
                  </Table.Tr>
                ))}
                {students.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text c="dimmed" ta="center" py="md">
                        No students in this section yet.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </>
      )}

      <AddClassModal
        opened={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        onCreated={(cls) => {
          refreshClasses();
          setSelectedClassId(cls.id);
        }}
      />
      {selectedClassId && (
        <AddSectionModal
          opened={sectionModalOpen}
          classId={selectedClassId}
          onClose={() => setSectionModalOpen(false)}
          onCreated={(section) => {
            listSectionsByClass(selectedClassId).then(setSections);
            setSelectedSectionId(section.id);
          }}
        />
      )}
      {selectedSectionId && (
        <AddStudentModal
          opened={studentModalOpen}
          sectionId={selectedSectionId}
          onClose={() => setStudentModalOpen(false)}
          onCreated={refreshStudents}
        />
      )}
    </Stack>
  );
}

function AddClassModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (cls: ClassRow) => void;
}) {
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number | string>('');

  const handleSubmit = async () => {
    if (!name.trim() || gradeLevel === '') return;
    const cls = await createClass(name.trim(), Number(gradeLevel));
    setName('');
    setGradeLevel('');
    onClose();
    onCreated(cls);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New class">
      <Stack>
        <TextInput label="Name" placeholder="e.g. Grade 7" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <NumberInput label="Grade level" value={gradeLevel} onChange={setGradeLevel} min={1} max={12} />
        <Button onClick={handleSubmit} disabled={!name.trim() || gradeLevel === ''}>
          Create
        </Button>
      </Stack>
    </Modal>
  );
}

function AddSectionModal({
  opened,
  classId,
  onClose,
  onCreated,
}: {
  opened: boolean;
  classId: string;
  onClose: () => void;
  onCreated: (section: SectionRow) => void;
}) {
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const section = await createSection(classId, name.trim());
    setName('');
    onClose();
    onCreated(section);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New section">
      <Stack>
        <TextInput label="Name" placeholder="e.g. C" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          Create
        </Button>
      </Stack>
    </Modal>
  );
}

function AddStudentModal({
  opened,
  sectionId,
  onClose,
  onCreated,
}: {
  opened: boolean;
  sectionId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [rollNumber, setRollNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender>('male');

  const handleSubmit = async () => {
    if (!rollNumber.trim() || !fullName.trim() || !dateOfBirth) return;
    await createStudent({
      sectionId,
      rollNumber: rollNumber.trim(),
      fullName: fullName.trim(),
      dateOfBirth,
      gender,
    });
    setRollNumber('');
    setFullName('');
    setDateOfBirth(null);
    setGender('male');
    onClose();
    onCreated();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New student">
      <Stack>
        <TextInput label="Roll number" value={rollNumber} onChange={(e) => setRollNumber(e.currentTarget.value)} />
        <TextInput label="Full name" value={fullName} onChange={(e) => setFullName(e.currentTarget.value)} />
        <DateInput label="Date of birth" value={dateOfBirth} onChange={setDateOfBirth} />
        <SegmentedControl
          value={gender}
          onChange={(value) => setGender(value as Gender)}
          data={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Button onClick={handleSubmit} disabled={!rollNumber.trim() || !fullName.trim() || !dateOfBirth}>
          Add Student
        </Button>
      </Stack>
    </Modal>
  );
}
