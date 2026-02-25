import * as React from 'react';
// PERFORMANCE: Import only icons actually used in the project (tree-shaking friendly)
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Clock,
  Edit,
  Euro,
  FileText,
  Folder,
  Gift,
  Heart,
  Mail,
  MapPin,
  Package,
  Palette,
  Percent,
  Printer,
  Scissors,
  Zap,
  Search,
  Share,
  Share2,
  Shield,
  ShieldCheck,
  Shirt,
  Square,
  Sun,
  Trophy,
  ShoppingCart,
  Truck,
  User,
  X,
  Circle, // Fallback icon
} from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Accept flexible names: 'Heart', 'heart', 'folder-open', etc.
  name: string;
  size?: number;
  strokeWidth?: number;
}

// PERFORMANCE: Explicit icon map for tree-shaking
// Only icons actually used in the project are included here
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  'arrow-left': ArrowLeft,
  ArrowLeft,
  'chevron-right': ChevronRight,
  ChevronRight,
  'credit-card': CreditCard,
  CreditCard,
  clock: Clock,
  Clock,
  edit: Edit,
  Edit,
  euro: Euro,
  Euro,
  'file-text': FileText,
  FileText,
  folder: Folder,
  Folder,
  gift: Gift,
  Gift,
  heart: Heart,
  Heart,
  mail: Mail,
  Mail,
  'map-pin': MapPin,
  MapPin,
  package: Package,
  Package,
  palette: Palette,
  Palette,
  percent: Percent,
  Percent,
  printer: Printer,
  Printer,
  scissors: Scissors,
  Scissors,
  zap: Zap,
  Zap,
  search: Search,
  Search,
  share: Share,
  Share,
  'share-2': Share2,
  Share2,
  shield: Shield,
  Shield,
  'shield-check': ShieldCheck,
  ShieldCheck,
  shirt: Shirt,
  Shirt,
  square: Square,
  Square,
  sun: Sun,
  Sun,
  trophy: Trophy,
  Trophy,
  'shopping-cart': ShoppingCart,
  ShoppingCart,
  truck: Truck,
  Truck,
  user: User,
  User,
  x: X,
  X,
  // Fallback
  circle: Circle,
  Circle,
};

function normalizeName(input: string): string {
  if (!input) return '';
  // Convert kebab/underscore/space case to PascalCase expected by lucide-react
  const cleaned = String(input).replace(/[-_]+/g, ' ').trim();
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

export default function Icon({ name, size = 20, strokeWidth = 2, className, ...rest }: IconProps) {
  const normalized = normalizeName(name);
  const LucideIcon = iconMap[name] || iconMap[normalized];
  const Comp = LucideIcon || Circle;

  if (!LucideIcon && import.meta.env.DEV) {
    // Útil para detectar nombres inválidos o no importados
    // Ej: name="folder-open" se normaliza a "FolderOpen"
    console.warn(
      `[Icon] Unknown icon: "${name}" (normalized: "${normalized}"). Add to iconMap in Icon.tsx`
    );
  }

  return <Comp size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}
