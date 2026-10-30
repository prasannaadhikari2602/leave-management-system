import type { IconType } from "react-icons";
import {
  FiBarChart2, FiBell, FiBriefcase, FiCalendar, FiCheckSquare, FiClipboard, FiFileText,
  FiGrid, FiLayers, FiList, FiPieChart, FiSend, FiSettings, FiSliders, FiUser, FiUserCheck, FiUsers,
} from "react-icons/fi";
import type { Role } from "../../types";

export interface NavItem {
  to: string;
  label: string;
  icon: IconType;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

const overview: NavItem = { to: "/dashboard", label: "Overview", icon: FiGrid };

const myLeave: NavGroup = {
  title: "My Leave",
  items: [
    { to: "/apply-leave", label: "Apply Leave", icon: FiSend },
    { to: "/my-leaves", label: "My Leave Requests", icon: FiList },
    { to: "/my-balance", label: "Leave Balance", icon: FiPieChart },
  ],
};

export const NAV: Record<Role, NavGroup[]> = {
  admin: [
    { items: [overview] },
    {
      title: "Company",
      items: [
        { to: "/departments", label: "Departments", icon: FiBriefcase },
        { to: "/managers", label: "Managers", icon: FiUserCheck },
        { to: "/employees", label: "Employees", icon: FiUsers },
      ],
    },
    {
      title: "Leave Management",
      items: [
        { to: "/leave-types", label: "Leave Types", icon: FiLayers },
        { to: "/leave-rules", label: "Leave Rules", icon: FiSliders },
        { to: "/all-leave-requests", label: "All Leave Requests", icon: FiFileText },
        { to: "/leave-requests", label: "HR Approvals", icon: FiCheckSquare },
        { to: "/leave-balances", label: "Leave Balances", icon: FiClipboard },
        { to: "/calendar", label: "Leave Calendar", icon: FiCalendar },
      ],
    },
    { title: "Insights", items: [
      { to: "/reports", label: "Reports", icon: FiBarChart2 },
      { to: "/settings", label: "Settings", icon: FiSettings },
    ] },
    myLeave,
  ],
  manager: [
    { items: [overview] },
    {
      title: "My Team",
      items: [
        { to: "/my-team", label: "My Team", icon: FiUsers },
        { to: "/leave-requests", label: "Leave Requests", icon: FiCheckSquare },
        { to: "/calendar", label: "Team Leave Calendar", icon: FiCalendar },
      ],
    },
    myLeave,
  ],
  employee: [
    { items: [overview, { to: "/profile", label: "My Profile", icon: FiUser }] },
    {
      items: [
        { to: "/apply-leave", label: "Apply Leave", icon: FiSend },
        { to: "/my-leaves", label: "My Leave Requests", icon: FiList },
        { to: "/my-balance", label: "Leave Balance", icon: FiPieChart },
        { to: "/calendar", label: "Leave Calendar", icon: FiCalendar },
        { to: "/notifications", label: "Notifications", icon: FiBell },
      ],
    },
  ],
};
