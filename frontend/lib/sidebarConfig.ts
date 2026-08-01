import { Permission } from './permissions';

export interface SidebarItemConfig {
  name: string;
  href: string;
  iconName: string;
  requiredPermission: Permission;
  badge?: string;
  subtitle?: string;
}

/**
 * Guest / Unauthenticated Visitor Sidebar Configuration
 * Neutral Campus Information Links — does not assume student role
 */
export const GUEST_SIDEBAR_CONFIG: SidebarItemConfig[] = [
  { name: 'Home Overview', href: '/', iconName: 'GraduationCap', requiredPermission: 'guest.view' },
  { name: 'Admissions & Campus', href: '/campus', iconName: 'Compass', requiredPermission: 'guest.view' },
  { name: 'Courses & Programs', href: '/courses', iconName: 'BookOpen', requiredPermission: 'guest.view' },
  { name: 'Placements Overview', href: '/placements', iconName: 'Briefcase', requiredPermission: 'guest.view' },
  { name: 'Clubs & Activities', href: '/clubs', iconName: 'Users', requiredPermission: 'guest.view' },
  { name: 'Discipline & Rules', href: '/discipline', iconName: 'ShieldAlert', requiredPermission: 'guest.view' },
  { name: 'FAQ Hub', href: '/faqs', iconName: 'HelpCircle', requiredPermission: 'guest.view' },
  { name: 'Ask AI Chatbot', href: '/chat', iconName: 'MessageSquare', requiredPermission: 'student.chat', badge: 'AI' },
];

/**
 * Authenticated Student Sidebar Configuration
 */
export const STUDENT_SIDEBAR_CONFIG: SidebarItemConfig[] = [
  { name: 'Ask AI Chatbot', href: '/chat', iconName: 'MessageSquare', requiredPermission: 'student.chat', subtitle: 'AI Tutor & Academic Query Engine' },
  { name: 'Academics & Courses', href: '/courses', iconName: 'BookOpen', requiredPermission: 'student.academics' },
  { name: 'Campus Facilities', href: '/campus', iconName: 'Compass', requiredPermission: 'student.facilities' },
  { name: 'Placements & Internships', href: '/placements', iconName: 'Briefcase', requiredPermission: 'student.placements' },
  { name: 'Clubs & Societies', href: '/clubs', iconName: 'Users', requiredPermission: 'student.clubs' },
  { name: 'Discipline Rules', href: '/discipline', iconName: 'ShieldAlert', requiredPermission: 'student.discipline' },
  { name: 'FAQ Hub', href: '/faqs', iconName: 'HelpCircle', requiredPermission: 'student.faqs' },
  { name: 'Settings', href: '/settings', iconName: 'Sliders', requiredPermission: 'student.chat' }
];

/**
 * Authenticated Faculty Sidebar Configuration
 */
export const FACULTY_SIDEBAR_CONFIG: SidebarItemConfig[] = [
  { name: 'Faculty Dashboard', href: '/faculty/dashboard', iconName: 'LayoutDashboard', requiredPermission: 'faculty.dashboard', badge: 'Active' },
  { name: 'Ask AI Chatbot', href: '/chat', iconName: 'MessageSquare', requiredPermission: 'student.chat', subtitle: 'Test & Query RAG Engine' },
  { name: 'Student Queries', href: '/faculty/dashboard#queries', iconName: 'Sparkles', requiredPermission: 'faculty.queries', subtitle: 'Review Student RAG Inquiries' },
  { name: 'Knowledge Base', href: '/faculty/dashboard#knowledge-base', iconName: 'BookOpen', requiredPermission: 'admin.documents', badge: 'Manager' },
  { name: 'Chatbot Analytics', href: '/faculty/dashboard#analytics', iconName: 'Briefcase', requiredPermission: 'admin.analytics' },
  { name: 'Department Notices', href: '/faculty/dashboard#notices', iconName: 'Compass', requiredPermission: 'faculty.notices' },
  { name: 'Settings', href: '/settings', iconName: 'Sliders', requiredPermission: 'student.chat' }
];

/**
 * Authenticated Administrator Sidebar Configuration
 */
export const ADMIN_SIDEBAR_CONFIG: SidebarItemConfig[] = [
  { name: 'Admin Dashboard', href: '/dashboard', iconName: 'LayoutDashboard', requiredPermission: 'admin.dashboard', badge: 'Control' },
  { name: 'Ask AI Chatbot', href: '/chat', iconName: 'MessageSquare', requiredPermission: 'student.chat' },
  { name: 'Knowledge Base', href: '/dashboard#inspector', iconName: 'BookOpen', requiredPermission: 'admin.documents', badge: 'Vector Store' },
  { name: 'System Analytics', href: '/dashboard#analytics', iconName: 'Briefcase', requiredPermission: 'admin.analytics' },
  { name: 'Settings', href: '/settings', iconName: 'Sliders', requiredPermission: 'student.chat' }
];

export function getSidebarConfigForRole(role?: string): SidebarItemConfig[] {
  if (!role) return GUEST_SIDEBAR_CONFIG;
  const r = role.toLowerCase();
  if (r === 'admin' || r === 'administrator') return ADMIN_SIDEBAR_CONFIG;
  if (r === 'faculty') return FACULTY_SIDEBAR_CONFIG;
  if (r === 'student') return STUDENT_SIDEBAR_CONFIG;
  return GUEST_SIDEBAR_CONFIG;
}
