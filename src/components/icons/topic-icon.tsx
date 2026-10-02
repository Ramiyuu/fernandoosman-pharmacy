import {
  Activity,
  Atom,
  BookOpenCheck,
  Brain,
  ChartBar,
  ChartLine,
  ChartScatter,
  ClipboardList,
  Database,
  Dna,
  FlaskConical,
  HeartPulse,
  Library,
  type LucideIcon,
  MessageSquareText,
  Microscope,
  Network,
  Pill,
  Presentation,
  Scale,
  ScrollText,
  ShieldCheck,
  Sigma,
  Stethoscope,
  Syringe,
  TestTubes,
} from 'lucide-react';

/**
 * Curated icon set selectable for topics in the admin panel. Keeping an
 * explicit registry avoids bundling the whole icon library and makes the
 * stored value (`topics.icon`) a known, safe key.
 */
export const TOPIC_ICONS: Record<string, LucideIcon> = {
  'clipboard-list': ClipboardList,
  sigma: Sigma,
  pill: Pill,
  scale: Scale,
  'message-square-text': MessageSquareText,
  'chart-line': ChartLine,
  'chart-bar': ChartBar,
  'chart-scatter': ChartScatter,
  'flask-conical': FlaskConical,
  microscope: Microscope,
  dna: Dna,
  'heart-pulse': HeartPulse,
  brain: Brain,
  syringe: Syringe,
  stethoscope: Stethoscope,
  'test-tubes': TestTubes,
  atom: Atom,
  activity: Activity,
  database: Database,
  network: Network,
  presentation: Presentation,
  'scroll-text': ScrollText,
  library: Library,
  'book-open-check': BookOpenCheck,
  'shield-check': ShieldCheck,
};

export const TOPIC_ICON_NAMES = Object.keys(TOPIC_ICONS);

export function TopicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TOPIC_ICONS[name] ?? FlaskConical;
  return <Icon className={className} aria-hidden="true" />;
}
