import {
  Apple, Ban, Banana, Bath, Bean, Bike, Brush, Carrot, Cherry, CircleAlert, CircleCheck, CircleX, Citrus, Coffee,
  CookingPot, Cookie, Croissant, CupSoda, Droplet, Droplets, Egg, Flame, GlassWater, Grape, Hourglass, LeafyGreen,
  Milk, Package, PackageCheck, Popcorn, Salad, ShoppingBasket, ShowerHead, Soup, Sparkles, SprayCan, Sprout, Store,
  Undo2, Wheat, type LucideIcon, type LucideProps,
} from "lucide-react";

// Explicit registry keeps the bundle to the icons we actually use (catalog + statuses).
const ICONS: Record<string, LucideIcon> = {
  Apple, Ban, Banana, Bath, Bean, Bike, Brush, Carrot, Cherry, CircleAlert, CircleCheck, CircleX, Citrus, Coffee,
  CookingPot, Cookie, Croissant, CupSoda, Droplet, Droplets, Egg, Flame, GlassWater, Grape, Hourglass, LeafyGreen,
  Milk, Package, PackageCheck, Popcorn, Salad, ShoppingBasket, ShowerHead, Soup, Sparkles, SprayCan, Sprout, Store,
  Undo2, Wheat,
};

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const C = ICONS[name] ?? Package;
  return <C aria-hidden {...props} />;
}
