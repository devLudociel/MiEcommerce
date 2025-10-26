import * as React from 'react';
import * as Icons from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  // Accept flexible names: 'Heart', 'heart', 'folder-open', etc.
  name: string;
  size?: number;
  strokeWidth?: number;
}

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
  const LucideIcon = (Icons as any)[normalized] || (Icons as any)[name];
  const Fallback = (Icons as any)['Circle'] as React.ComponentType<any>;
  const Comp = (LucideIcon as React.ComponentType<any>) || Fallback;

  if (!LucideIcon && typeof console !== 'undefined') {
    // Útil para detectar nombres inválidos o no importados
    // Ej: name="folder-open" se normaliza a "FolderOpen"
    console.warn(`[Icon] Unknown icon: "${name}" (normalized: "${normalized}")`);
  }

  return <Comp size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}
