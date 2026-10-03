import { ICON_GLYPHS, type IconName } from '@/lib/icons';

export type { IconName };

/**
 * Renders a Material Symbols Rounded glyph.
 *
 * The app used to hand-draw SVG paths for every pictogram. That was a losing
 * battle: stroke widths drifted between files, corner joins disagreed, and a
 * dozen bespoke paths never look like a set. Material Symbols is one font with
 * one grid and one weight, so every icon in the product now shares a stroke, a
 * optical size and a corner radius.
 *
 * Icons are decorative by default (`aria-hidden`); pass `title` when an icon is
 * the only label on a control.
 */
type IconProps = {
  name: IconName;
  /** Rendered box in px. Material Symbols scales cleanly from 16 to 48. */
  size?: number;
  /** Give the icon an accessible name. Leave unset for decorative icons. */
  title?: string;
  className?: string;
};

export function Icon({ name, size = 20, title, className }: IconProps) {
  return (
    <span
      className={['material-symbols-rounded', className].filter(Boolean).join(' ')}
      style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      {ICON_GLYPHS[name]}
    </span>
  );
}
