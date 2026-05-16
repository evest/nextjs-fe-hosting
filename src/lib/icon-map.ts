// Runtime icon renderer — maps `IconName` (the kebab-case slugs editors pick
// in the CMS) to the matching `lucide-react` component. React components only;
// the schema-side allowlist lives in `icons.ts` and must stay free of lucide
// imports so the CMS CLI can evaluate content type files without React deps.
//
// When adding/removing an icon, edit `icons.ts` and mirror the change here.

import {
  Activity,
  Award,
  BadgeCheck,
  Blocks,
  BookOpen,
  Calendar,
  ChartBar,
  ChartLine,
  Cloud,
  CodeXml,
  Compass,
  Eye,
  FileText,
  FlaskConical,
  Gauge,
  Globe,
  GraduationCap,
  Languages,
  LayoutTemplate,
  Lightbulb,
  Mail,
  Megaphone,
  MessageSquareText,
  PenTool,
  Phone,
  PlayCircle,
  Plug,
  Presentation,
  Rocket,
  Route,
  Search,
  Server,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Type,
  UserPlus,
  Users,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { IconName } from './icons';

export const ICON_MAP: Record<IconName, LucideIcon> = {
  // Strategy
  lightbulb: Lightbulb,
  compass: Compass,
  target: Target,
  sparkles: Sparkles,
  route: Route,

  // Content
  'file-text': FileText,
  'book-open': BookOpen,
  'pen-tool': PenTool,
  type: Type,
  'layout-template': LayoutTemplate,

  // Build
  'code-xml': CodeXml,
  settings: Settings,
  blocks: Blocks,
  plug: Plug,
  workflow: Workflow,
  wrench: Wrench,

  // Optimisation
  'trending-up': TrendingUp,
  'flask-conical': FlaskConical,
  gauge: Gauge,
  activity: Activity,
  zap: Zap,

  // Analytics
  'chart-bar': ChartBar,
  'chart-line': ChartLine,
  eye: Eye,
  search: Search,

  // Audience
  users: Users,
  'user-plus': UserPlus,
  megaphone: Megaphone,
  'message-square-text': MessageSquareText,

  // Training
  'graduation-cap': GraduationCap,
  presentation: Presentation,
  'play-circle': PlayCircle,

  // Trust
  'shield-check': ShieldCheck,
  'badge-check': BadgeCheck,
  award: Award,

  // Delivery
  rocket: Rocket,
  timer: Timer,

  // Global
  globe: Globe,
  languages: Languages,

  // Comms
  mail: Mail,
  phone: Phone,
  calendar: Calendar,

  // Architecture
  cloud: Cloud,
  server: Server,
  'share-2': Share2,
};

