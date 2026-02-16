# Color Tokens

Source of truth for the design system color mapping.

## Semantic Tokens

| Token | OKLCH | HEX | Usage |
|---|---|---|---|
| background | `oklch(0.9851 0 0)` | `#FAFAFA` | App background |
| foreground | `oklch(0 0 0)` | `#000000` | Primary text |
| primary | `oklch(0.5144 0.1605 267.44)` | `#3F5EC2` | Primary actions |
| primary-foreground | `oklch(0.97 0.014 254.604)` | `#EFF6FF` | Text on primary |
| secondary | `oklch(0.94 0 0)` | `#EBEBEB` | Secondary surfaces |
| secondary-foreground | `oklch(0.25 0 0)` | `#222222` | Text on secondary |
| accent | `oklch(0.9214 0.0248 257.65)` | `#DBE6F6` | Accent surfaces |
| accent-foreground | `oklch(0.2571 0.1161 272.24)` | `#14185A` | Accent text/icons |
| card | `oklch(1 0 0)` | `#FFFFFF` | Card background |
| card-foreground | `oklch(0.2046 0 0)` | `#171717` | Card text |
| popover | `oklch(1 0 0)` | `#FFFFFF` | Popover background |
| popover-foreground | `oklch(0 0 0)` | `#000000` | Popover text |
| muted | `oklch(0.97 0 0)` | `#F5F5F5` | Muted backgrounds |
| muted-foreground | `oklch(0.44 0 0)` | `#525252` | Muted text |
| border | `oklch(0.92 0 0)` | `#E4E4E4` | Borders |
| input | `oklch(0.94 0 0)` | `#EBEBEB` | Input backgrounds |
| ring | `oklch(0.5144 0.1605 267.44)` | `#3F5EC2` | Focus ring |
| destructive | `oklch(0.58 0.22 27)` | `#DF2225` | Error/destructive actions |
| destructive-foreground | `oklch(0.97 0.014 254.604)` | `#EFF6FF` | Text on destructive |

## Chart Tokens

| Token | OKLCH | HEX |
|---|---|---|
| chart-1 | `oklch(0.9214 0.0248 257.65)` | `#DBE6F6` |
| chart-2 | `oklch(0.7597 0.0804 267.01)` | `#9AB0E5` |
| chart-3 | `oklch(0.6083 0.1247 272.72)` | `#6A7CCD` |
| chart-4 | `oklch(0.5144 0.1605 267.44)` | `#3F5EC2` |
| chart-5 | `oklch(0.2571 0.1161 272.24)` | `#14185A` |

## Sidebar Tokens

| Token | OKLCH | HEX |
|---|---|---|
| sidebar-background | `oklch(1 0 0)` | `#FFFFFF` |
| sidebar-foreground | `oklch(0.2046 0 0)` | `#171717` |
| sidebar-primary | `oklch(0.5144 0.1605 267.44)` | `#3F5EC2` |
| sidebar-primary-foreground | `oklch(1 0 0)` | `#FFFFFF` |
| sidebar-accent | `oklch(0.9214 0.0248 257.65)` | `#DBE6F6` |
| sidebar-accent-foreground | `oklch(0.2571 0.1161 272.24)` | `#14185A` |
| sidebar-border | `oklch(0.92 0 0)` | `#E4E4E4` |
| sidebar-ring | `oklch(0.5144 0.1605 267.44)` | `#3F5EC2` |

## Notes

- Tailwind-like scales are available in `src/theme/palette.ts` under `scales`.
- Prefer semantic tokens in UI components (`primary`, `muted`, `destructive`, `success`, `warning`, `info`).
- Use chart tokens (`chart-1..5`) for data visualizations.
