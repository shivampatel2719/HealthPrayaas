import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { Navigate, Outlet, Route, BrowserRouter, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/app-layout';
import { ChatPage } from '@/pages/ChatPage';
import { ClassInsightsPage } from '@/pages/ClassInsightsPage';
import { NewHealthRecordPage } from '@/pages/NewHealthRecordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StudentProfilePage } from '@/pages/StudentProfilePage';
import { StudentsPage } from '@/pages/StudentsPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { useProfileStore } from '@/store/profile-store';
import { theme } from '@/theme';

function RequireProfile() {
  const name = useProfileStore((s) => s.name);
  if (!name) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route element={<RequireProfile />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<StudentsPage />} />
          <Route path="/students/:studentId" element={<StudentProfilePage />} />
          <Route path="/students/:studentId/new-record" element={<NewHealthRecordPage />} />
          <Route path="/students/:studentId/chat" element={<ChatPage />} />
          <Route path="/insights/:classId" element={<ClassInsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: 'en' }}>
        <Notifications position="top-right" />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DatesProvider>
    </MantineProvider>
  );
}
