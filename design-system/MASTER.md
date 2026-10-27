# Aditya Traders — Design System (MASTER)

Source of truth for every screen. Page-specific overrides go in `design-system/pages/<page>.md`.
Generated with the ui-ux-pro-max skill (`--design-system`, variance 4 / motion 3 / density 5), then corrected where the
database recommendation did not fit a single-store grocery PWA. Corrections are marked **Override**.

## Product
- One neighbourhood kirana store, ~50 households, India.
- Shoppers on low/mid Android phones, often on patchy 4G, often opening a link from WhatsApp.
- Three surfaces in one app: **Shop** (mobile-first), **Store console** (desktop/tablet-first), **Rider** (phone, one hand).

## Style
- Clean, block-based retail UI. Calm surfaces, product art carries colour.
- **Override:** the tool suggested "Enterprise SaaS (indigo/violet gradients)" and an "App Store landing" pattern.
  Neither fits — there is no app-store app, and gradients read as fintech, not groceries. No gradients on CTAs.
- Radius: 12px controls, 16px cards, 999px chips/steppers. Shadows only on floating things (cart bar, sheets).

## Colour tokens (see `src/app/globals.css`)
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F4F7F5` | `#0B1210` | page |
| `--surface` | `#FFFFFF` | `#121B18` | cards, sheets |
| `--surface-2` | `#EAF1ED` | `#1A2622` | inputs, wells |
| `--fg` | `#0F1A16` | `#E8EEEB` | body text |
| `--muted` | `#566259` | `#9AA8A2` | secondary text (≥4.5:1 on surface) |
| `--primary` | `#047857` | `#34D399` | CTA, active states |
| `--accent` | `#B45309` | `#FBBF24` | offers, savings, "after weighing" |
| `--danger` | `#B91C1C` | `#F87171` | errors, out of stock |

- **Override:** tool primary `#059669` is 3.8:1 on white — fails AA for small text. We use emerald-700 `#047857` (5.5:1).
- Semantic colour is never the only signal: every status also has an icon and a word.

## Typography
- Headings: **Rubik** 500/600/700. Body: **Nunito Sans** 400/600/700. Devanagari fallback: **Noto Sans Devanagari**.
- Base 16px, line-height 1.5. Prices use `tabular-nums`. Nothing under 12px.

## Interaction
- Touch targets ≥ 44×44px (steppers are 36px tall visually, 44px hit area via padding).
- Press feedback: `active:scale-[0.97]` + colour shift, 150ms. No layout shift on press.
- Motion 150–250ms ease-out; everything respects `prefers-reduced-motion`.
- Icons: Lucide only, 1.75–2px stroke, sizes 16/20/24. No emoji anywhere.

## Navigation
- Shop mobile: bottom nav (Home · Categories · Search · Orders · Account) + floating cart bar above it.
- Shop desktop: top header with search and cart; bottom nav hidden ≥ md.
- Console: left sidebar ≥ lg, top tabs below.
- Every screen deep-linkable; browser back always works.

## Grocery-specific patterns
- Loose items show price per kg, a weight stepper (250 g steps) and an amber "final price after weighing" note.
- MRP struck through next to price; discount as "12% off", never "SAVE BIG".
- Out of stock: greyed art, "Out of stock" label, add button replaced — never a silent disabled button.
- Free-delivery progress bar in the cart; minimum order warning before checkout, not at payment.

## Anti-patterns
- Emoji icons, gradient CTAs, placeholder-only labels, hover-only affordances, hidden fees revealed at payment,
  pre-ticked upsells, toasts as the only error signal.
