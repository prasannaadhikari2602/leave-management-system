import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { GuestRoute, ProtectedRoute, RoleRoute } from "./components/guards/Guards";
import { Spinner } from "./components/ui";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const SetPasswordPage = lazy(() => import("./pages/auth/SetPasswordPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/leave/ProfilePage"));
const NotificationsPage = lazy(() => import("./pages/leave/NotificationsPage"));
const ApplyLeavePage = lazy(() => import("./pages/leave/ApplyLeavePage"));
const MyLeavesPage = lazy(() => import("./pages/leave/MyLeavesPage"));
const MyBalancePage = lazy(() => import("./pages/leave/MyBalancePage"));
const CalendarPage = lazy(() => import("./pages/leave/CalendarPage"));
const ReviewRequestsPage = lazy(() => import("./pages/leave/ReviewRequestsPage"));
const MyTeamPage = lazy(() => import("./pages/team/MyTeamPage"));
const DepartmentsPage = lazy(() => import("./pages/admin/DepartmentsPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const LeaveTypesPage = lazy(() => import("./pages/admin/LeaveTypesPage"));
const LeaveRulesPage = lazy(() => import("./pages/admin/LeaveRulesPage"));
const AllRequestsPage = lazy(() => import("./pages/admin/AllRequestsPage"));
const BalancesPage = lazy(() => import("./pages/admin/BalancesPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
      <Routes>
        {/* Public */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/set-password" element={<SetPasswordPage />} />

        {/* Signed in */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/apply-leave" element={<ApplyLeavePage />} />
            <Route path="/my-leaves" element={<MyLeavesPage />} />
            <Route path="/my-balance" element={<MyBalancePage />} />
            <Route path="/calendar" element={<CalendarPage />} />

            <Route element={<RoleRoute roles={["manager", "admin"]} />}>
              <Route path="/leave-requests" element={<ReviewRequestsPage />} />
            </Route>
            <Route element={<RoleRoute roles={["manager"]} />}>
              <Route path="/my-team" element={<MyTeamPage />} />
            </Route>

            <Route element={<RoleRoute roles={["admin"]} />}>
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/managers" element={<UsersPage role="manager" />} />
              <Route path="/employees" element={<UsersPage role="employee" />} />
              <Route path="/leave-types" element={<LeaveTypesPage />} />
              <Route path="/leave-rules" element={<LeaveRulesPage />} />
              <Route path="/all-leave-requests" element={<AllRequestsPage />} />
              <Route path="/leave-balances" element={<BalancesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
