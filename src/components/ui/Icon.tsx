import * as React from 'react';
// PERFORMANCE: Import only icons actually used in the project (tree-shaking friendly)
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Edit,
  FileText,
  Folder,
  Heart,
  Mail,
  MapPin,
  Package,
  Printer,
  Search,
  Share,
  Share2,
  Shield,
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
const iconMap: Record<string, React.ComponentType<any>> = {
  'arrow-left': ArrowLeft,
  ArrowLeft,
  'chevron-right': ChevronRight,
  ChevronRight,
  'credit-card': CreditCard,
  CreditCard,
  edit: Edit,
  Edit,
  'file-text': FileText,
  FileText,
  folder: Folder,
  Folder,
  heart: Heart,
  Heart,
  mail: Mail,
  Mail,
  'map-pin': MapPin,
  MapPin,
  package: Package,
  Package,
  printer: Printer,
  Printer,
  search: Search,
  Search,
  share: Share,
  Share,
  'share-2': Share2,
  Share2,
  shield: Shield,
  Shield,
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
    console.warn(`[Icon] Unknown icon: "${name}" (normalized: "${normalized}"). Add to iconMap in Icon.tsx`);
  }

  return <Comp size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}
