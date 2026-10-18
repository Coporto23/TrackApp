// Iconos facetados (trazos rectos y uniones en ángulo) para mantener el estilo low-poly.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="miter"
      strokeLinecap="square"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

// Hoguera: espada clavada sobre las brasas.
export function BonfireIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.5 13 4.5V13h-2V4.5Z" fill="currentColor" stroke="none" />
      <path d="M8.5 13h7" />
      <path d="M6 21l3-5.5 1.6 2.5L12 14.5l1.4 3.5 1.6-2.5 3 5.5" />
      <path d="M4 21.5h16" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6.5 6 4.5h12l2 2V19l-2 2H6l-2-2Z" />
      <path d="M4 9.5h16M8.5 2.5v4M15.5 2.5v4" />
      <path d="m12 12.5 2 2.5-2 2.5-2-2.5Z" fill="currentColor" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 20.5h17" />
      <path d="m4.5 16.5 4.5-5 4 3 5.5-7" />
      <path d="m19.5 4 1.6 2.4-1.6 2.4-1.6-2.4Z" fill="currentColor" />
    </Icon>
  );
}

// Yelmo.
export function HelmIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.5 18.5 7v8l-3.5 6H9l-3.5-6V7Z" />
      <path d="M7.5 11h9M12 11v6" />
    </Icon>
  );
}

// Emblema de la marca: cristal facetado con una brasa en el centro.
export function CrestIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden {...props}>
      <path d="M32 2 58 20 50 56 14 56 6 20Z" fill="#1c1915" stroke="#c8a35e" strokeWidth="1.5" />
      <path d="M32 2 32 30 6 20Z" fill="#26221c" />
      <path d="M32 2 58 20 32 30Z" fill="#211d18" />
      <path d="M6 20 32 30 14 56Z" fill="#18150f" />
      <path d="M58 20 50 56 32 30Z" fill="#14120f" />
      <path d="M32 30 50 56H14Z" fill="#1f1b16" />
      <path d="M32 18 39 33 32 46 25 33Z" fill="#d9782b" />
      <path d="M32 18 39 33 32 30Z" fill="#f2a55a" />
      <path d="M25 33 32 30 32 46Z" fill="#7a3510" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4 20 1-5L15.5 4.5l4 4L9 19Z" />
      <path d="m13 7 4 4" />
    </Icon>
  );
}

// Archivar: cofre que se cierra.
export function ArchiveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5h17v4h-17Z" />
      <path d="M5 9v10.5h14V9" />
      <path d="M10 13h4" />
    </Icon>
  );
}

export function RestoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v5h5" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m10.5 3.5 5 2.5 1.5 5-3 4.5h-5L6 11l1-5Z" />
      <path d="m15 15.5 5 5" />
    </Icon>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 5 8 12l7 7" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}
