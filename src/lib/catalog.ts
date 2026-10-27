import type { Category, Product, Tint } from "./types";

/*
 * Starter catalog, loaded into an empty database by the seed. After that the database is the source of truth
 * and the owner edits products in the console.
 * Prices are realistic placeholders; HSN codes and GST rates must be confirmed by the store's CA.
 */

export const CATEGORIES: Category[] = [
  { id: "veg", slug: "vegetables", name: "Vegetables", nameHi: "सब्ज़ियाँ", icon: "LeafyGreen", tint: "green" },
  { id: "fruit", slug: "fruits", name: "Fruits", nameHi: "फल", icon: "Apple", tint: "red" },
  { id: "dairy", slug: "dairy-bread-eggs", name: "Dairy, Bread & Eggs", nameHi: "दूध, ब्रेड और अंडे", icon: "Milk", tint: "blue" },
  { id: "staples", slug: "atta-rice-dal", name: "Atta, Rice & Dal", nameHi: "आटा, चावल और दाल", icon: "Wheat", tint: "yellow" },
  { id: "oil", slug: "oil-ghee", name: "Oil & Ghee", nameHi: "तेल और घी", icon: "Droplet", tint: "orange" },
  { id: "masala", slug: "masala-spices", name: "Masala & Spices", nameHi: "मसाले", icon: "Flame", tint: "red" },
  { id: "snacks", slug: "snacks-biscuits", name: "Snacks & Biscuits", nameHi: "नमकीन और बिस्कुट", icon: "Cookie", tint: "brown" },
  { id: "drinks", slug: "tea-coffee-drinks", name: "Tea, Coffee & Drinks", nameHi: "चाय, कॉफ़ी", icon: "Coffee", tint: "teal" },
  { id: "home", slug: "cleaning-household", name: "Cleaning & Household", nameHi: "सफ़ाई", icon: "SprayCan", tint: "purple" },
  { id: "care", slug: "personal-care", name: "Personal Care", nameHi: "पर्सनल केयर", icon: "Bath", tint: "blue" },
];

const CAT_DEFAULTS: Record<string, { aisle: number; gst: Product["gstRate"]; hsn: string }> = {
  veg: { aisle: 1, gst: 0, hsn: "0709" },
  fruit: { aisle: 1, gst: 0, hsn: "0810" },
  dairy: { aisle: 2, gst: 5, hsn: "0401" },
  staples: { aisle: 3, gst: 5, hsn: "1101" },
  oil: { aisle: 4, gst: 5, hsn: "1512" },
  masala: { aisle: 5, gst: 5, hsn: "0910" },
  snacks: { aisle: 6, gst: 5, hsn: "1905" },
  drinks: { aisle: 7, gst: 5, hsn: "0902" },
  home: { aisle: 8, gst: 18, hsn: "3402" },
  care: { aisle: 9, gst: 5, hsn: "3401" },
};

type Seed = {
  name: string;
  nameHi: string;
  brand?: string;
  unit: string;
  /** rupees (per kg for loose items) */
  price: number;
  mrp?: number;
  loose?: boolean;
  icon?: string;
  tint?: Tint;
  aliases?: string[];
  tags?: Product["tags"];
  stock?: number;
  gst?: Product["gstRate"];
  hsn?: string;
  desc?: string;
};

/** Which products can replace each other. Anything not listed has no automatic substitute. */
const GROUPS: [RegExp, string][] = [
  [/atta/i, "atta"],
  [/rice/i, "rice"],
  [/toor dal/i, "toor-dal"],
  [/moong dal/i, "moong-dal"],
  [/chana dal/i, "chana-dal"],
  [/toned milk|cream milk/i, "milk"],
  [/sunflower oil|edible oil|mustard oil/i, "cooking-oil"],
  [/biscuits|good day|marie/i, "biscuits"],
  [/bhujia|chips/i, "namkeen"],
  [/ tea$|^premium tea$/i, "tea"],
];

function parseGrams(unit: string): number | undefined {
  const m = unit.match(/([\d.]+)\s*(kg|g|l|ml)\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return /^(kg|l)$/i.test(m[2]) ? n * 1000 : n;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function build(categoryId: string, seeds: Seed[]): Product[] {
  const cat = CATEGORIES.find((c) => c.id === categoryId)!;
  const d = CAT_DEFAULTS[categoryId];
  return seeds.map((s, i) => {
    const slug = slugify(`${s.brand ? s.brand + " " : ""}${s.name}${s.loose ? "" : " " + s.unit}`);
    return {
      id: `${categoryId}-${i + 1}`,
      slug,
      name: s.name,
      nameHi: s.nameHi,
      brand: s.brand,
      categoryId,
      unitType: s.loose ? "weight" : "piece",
      unitLabel: s.loose ? "per kg" : s.unit,
      price: Math.round(s.price * 100),
      mrp: Math.round((s.mrp ?? s.price) * 100),
      hsn: s.hsn ?? d.hsn,
      gstRate: s.gst ?? d.gst,
      aisle: d.aisle,
      aliases: s.aliases ?? [],
      icon: s.icon ?? cat.icon,
      tint: s.tint ?? cat.tint,
      tags: s.tags,
      group: GROUPS.find(([re]) => re.test(s.name))?.[1],
      netGrams: s.loose ? undefined : parseGrams(s.unit),
      description:
        s.desc ??
        (s.loose
          ? `Weighed fresh at the store. You pay for the exact weight packed, within ±10% of what you order.`
          : `${s.brand ? s.brand + " " : ""}${s.name}, ${s.unit}. Sealed pack, checked for expiry before dispatch.`),
      stock: s.stock ?? 40,
    } satisfies Product;
  });
}

export const PRODUCTS: Product[] = [
  ...build("veg", [
    { name: "Tomato", nameHi: "टमाटर", unit: "kg", price: 40, mrp: 48, loose: true, icon: "Cherry", tint: "red", aliases: ["tamatar", "tamater"], tags: ["fresh", "bestseller"], stock: 30 },
    { name: "Onion", nameHi: "प्याज़", unit: "kg", price: 45, mrp: 52, loose: true, icon: "Citrus", tint: "purple", aliases: ["pyaz", "kanda", "kaanda"], tags: ["fresh", "bestseller", "essential"], stock: 60 },
    { name: "Potato", nameHi: "आलू", unit: "kg", price: 35, mrp: 40, loose: true, icon: "Bean", tint: "brown", aliases: ["aloo", "alu", "batata"], tags: ["fresh", "essential"], stock: 60 },
    { name: "Lady Finger (Bhindi)", nameHi: "भिंडी", unit: "kg", price: 60, mrp: 72, loose: true, icon: "Sprout", aliases: ["bhindi", "okra", "bhendi"], tags: ["fresh"], stock: 12 },
    { name: "Green Chilli", nameHi: "हरी मिर्च", unit: "kg", price: 80, loose: true, icon: "Flame", aliases: ["mirchi", "hari mirch"], tags: ["fresh"], stock: 8 },
    { name: "Ginger", nameHi: "अदरक", unit: "kg", price: 120, mrp: 140, loose: true, icon: "Sprout", tint: "yellow", aliases: ["adrak", "adrakh"], stock: 6 },
    { name: "Garlic", nameHi: "लहसुन", unit: "kg", price: 200, mrp: 240, loose: true, icon: "Citrus", tint: "brown", aliases: ["lahsun", "lasun"], stock: 10 },
    { name: "Carrot", nameHi: "गाजर", unit: "kg", price: 60, loose: true, icon: "Carrot", tint: "orange", aliases: ["gajar"], tags: ["fresh"], stock: 15 },
    { name: "Cucumber", nameHi: "खीरा", unit: "kg", price: 40, loose: true, icon: "Salad", aliases: ["kheera", "kakdi"], stock: 14 },
    { name: "Coriander Bunch", nameHi: "धनिया", unit: "1 bunch", price: 15, icon: "LeafyGreen", aliases: ["dhaniya", "kothimbir", "cilantro"], tags: ["fresh"], stock: 25 },
    { name: "Spinach (Palak)", nameHi: "पालक", unit: "1 bunch", price: 20, icon: "LeafyGreen", aliases: ["palak"], tags: ["fresh"], stock: 3 },
    { name: "Cauliflower", nameHi: "फूलगोभी", unit: "1 pc (approx 500 g)", price: 35, icon: "Salad", tint: "yellow", aliases: ["gobi", "phool gobhi"], stock: 10 },
    { name: "Lemon", nameHi: "नींबू", unit: "4 pcs", price: 20, icon: "Citrus", tint: "yellow", aliases: ["nimbu", "limbu"], stock: 30 },
  ]),
  ...build("fruit", [
    { name: "Banana (Robusta)", nameHi: "केला", unit: "12 pcs", price: 60, mrp: 70, icon: "Banana", tint: "yellow", aliases: ["kela", "keli"], tags: ["fresh", "bestseller"], stock: 20 },
    { name: "Apple (Shimla)", nameHi: "सेब", unit: "kg", price: 180, mrp: 210, loose: true, icon: "Apple", aliases: ["seb", "safarchand"], tags: ["fresh"], stock: 18 },
    { name: "Pomegranate", nameHi: "अनार", unit: "kg", price: 160, mrp: 190, loose: true, icon: "Apple", tint: "purple", aliases: ["anar", "dalimb"], stock: 9 },
    { name: "Orange (Nagpur)", nameHi: "संतरा", unit: "kg", price: 100, loose: true, icon: "Citrus", tint: "orange", aliases: ["santra", "santara"], stock: 16 },
    { name: "Papaya", nameHi: "पपीता", unit: "kg", price: 40, loose: true, icon: "Citrus", tint: "orange", aliases: ["papita"], stock: 7 },
    { name: "Green Grapes", nameHi: "अंगूर", unit: "kg", price: 120, mrp: 140, loose: true, icon: "Grape", tint: "green", aliases: ["angoor", "draksh"], stock: 0 },
  ]),
  ...build("dairy", [
    { name: "Taaza Toned Milk", nameHi: "टोंड दूध", brand: "Amul", unit: "500 ml", price: 28, icon: "Milk", aliases: ["doodh", "dudh", "milk"], tags: ["essential", "bestseller"], stock: 50, gst: 0 },
    { name: "Gold Full Cream Milk", nameHi: "फुल क्रीम दूध", brand: "Amul", unit: "500 ml", price: 34, icon: "Milk", aliases: ["doodh", "dudh"], tags: ["essential"], stock: 40, gst: 0 },
    { name: "Masti Dahi", nameHi: "दही", brand: "Amul", unit: "400 g", price: 35, icon: "Soup", aliases: ["dahi", "curd", "yogurt"], tags: ["bestseller"], stock: 24, hsn: "0403" },
    { name: "Fresh Paneer", nameHi: "पनीर", brand: "Amul", unit: "200 g", price: 90, mrp: 95, icon: "Package", aliases: ["paneer", "cottage cheese"], stock: 12, hsn: "0406" },
    { name: "Butter", nameHi: "मक्खन", brand: "Amul", unit: "100 g", price: 58, mrp: 60, icon: "Package", tint: "yellow", aliases: ["makhan", "loni"], stock: 20, hsn: "0405", gst: 12 },
    { name: "Brown Bread", nameHi: "ब्राउन ब्रेड", brand: "Britannia", unit: "400 g", price: 50, icon: "Croissant", tint: "brown", aliases: ["bread", "pav"], stock: 10, hsn: "1905", gst: 0 },
    { name: "Farm Eggs", nameHi: "अंडे", unit: "6 pcs", price: 48, icon: "Egg", tint: "yellow", aliases: ["anda", "ande", "egg"], tags: ["essential"], stock: 30, hsn: "0407", gst: 0 },
  ]),
  ...build("staples", [
    { name: "Shudh Chakki Atta", nameHi: "गेहूं आटा", brand: "Aashirvaad", unit: "5 kg", price: 285, mrp: 330, icon: "Wheat", aliases: ["aata", "atta", "gehu", "gehun", "flour"], tags: ["essential", "bestseller"], stock: 25 },
    { name: "Chakki Atta (Loose)", nameHi: "चक्की आटा", unit: "kg", price: 42, loose: true, icon: "Wheat", aliases: ["aata", "atta", "gehu", "khula atta"], tags: ["essential"], stock: 80, gst: 0 },
    { name: "Classic Basmati Rice", nameHi: "बासमती चावल", brand: "India Gate", unit: "1 kg", price: 175, mrp: 210, icon: "Wheat", tint: "brown", aliases: ["chawal", "chaval", "basmati", "rice"], tags: ["bestseller"], stock: 20, hsn: "1006" },
    { name: "Kolam Rice (Loose)", nameHi: "कोलम चावल", unit: "kg", price: 62, mrp: 70, loose: true, icon: "Wheat", tint: "brown", aliases: ["chawal", "chaval", "rice", "kolam"], tags: ["essential"], stock: 90, hsn: "1006", gst: 0 },
    { name: "Toor Dal (Loose)", nameHi: "तूर दाल", unit: "kg", price: 150, mrp: 170, loose: true, icon: "Bean", tint: "yellow", aliases: ["arhar", "tuvar", "toor", "daal", "dal"], tags: ["essential", "bestseller"], stock: 50, hsn: "0713", gst: 0 },
    { name: "Moong Dal", nameHi: "मूंग दाल", brand: "Tata Sampann", unit: "1 kg", price: 140, mrp: 170, icon: "Bean", tint: "green", aliases: ["moong", "mung", "daal", "dal"], stock: 15, hsn: "0713" },
    { name: "Chana Dal (Loose)", nameHi: "चना दाल", unit: "kg", price: 95, loose: true, icon: "Bean", tint: "yellow", aliases: ["chana", "daal", "dal"], stock: 40, hsn: "0713", gst: 0 },
    { name: "Sugar (Loose)", nameHi: "चीनी", unit: "kg", price: 46, loose: true, icon: "Sparkles", tint: "blue", aliases: ["cheeni", "chini", "shakkar", "sakhar"], tags: ["essential"], stock: 100, hsn: "1701" },
    { name: "Iodised Salt", nameHi: "नमक", brand: "Tata", unit: "1 kg", price: 28, icon: "Sparkles", tint: "blue", aliases: ["namak", "mith"], tags: ["essential"], stock: 40, hsn: "2501", gst: 0 },
    { name: "Thick Poha", nameHi: "पोहा", unit: "500 g", price: 38, icon: "Wheat", aliases: ["poha", "chivda", "flattened rice"], stock: 20, hsn: "1904" },
    { name: "Besan", nameHi: "बेसन", unit: "500 g", price: 55, mrp: 60, icon: "Wheat", tint: "yellow", aliases: ["besan", "gram flour"], stock: 18, hsn: "1106" },
  ]),
  ...build("oil", [
    { name: "Sunflower Oil", nameHi: "सूरजमुखी तेल", brand: "Fortune", unit: "1 L", price: 155, mrp: 185, icon: "Droplet", aliases: ["tel", "sunflower", "refined oil"], tags: ["essential", "bestseller"], stock: 30 },
    { name: "Gold Edible Oil", nameHi: "खाद्य तेल", brand: "Saffola", unit: "1 L", price: 185, mrp: 210, icon: "Droplet", aliases: ["tel", "oil"], stock: 12 },
    { name: "Kachi Ghani Mustard Oil", nameHi: "सरसों तेल", brand: "Dhara", unit: "1 L", price: 160, mrp: 180, icon: "Droplet", tint: "yellow", aliases: ["sarson", "mustard", "tel"], stock: 10, hsn: "1514" },
    { name: "Pure Ghee", nameHi: "घी", brand: "Amul", unit: "500 ml", price: 305, mrp: 320, icon: "Droplets", tint: "yellow", aliases: ["ghee", "tup", "desi ghee"], tags: ["bestseller"], stock: 14, hsn: "0405" },
  ]),
  ...build("masala", [
    { name: "Turmeric Powder", nameHi: "हल्दी", brand: "Everest", unit: "100 g", price: 35, mrp: 38, icon: "Flame", tint: "yellow", aliases: ["haldi", "halad"], tags: ["essential"], stock: 30 },
    { name: "Kashmiri Red Chilli Powder", nameHi: "लाल मिर्च", brand: "Everest", unit: "100 g", price: 45, mrp: 48, icon: "Flame", aliases: ["lal mirch", "mirchi powder", "tikhat"], stock: 25 },
    { name: "Garam Masala", nameHi: "गरम मसाला", brand: "MDH", unit: "100 g", price: 80, mrp: 92, icon: "Flame", tint: "brown", aliases: ["masala"], stock: 20 },
    { name: "Jeera (Cumin)", nameHi: "जीरा", unit: "100 g", price: 42, icon: "Sprout", tint: "brown", aliases: ["jeera", "jira", "cumin"], stock: 22 },
    { name: "Mustard Seeds", nameHi: "राई", unit: "100 g", price: 18, icon: "Sprout", tint: "brown", aliases: ["rai", "mohri", "sarson"], stock: 26 },
    { name: "Hing", nameHi: "हींग", brand: "LG", unit: "50 g", price: 85, mrp: 95, icon: "Package", tint: "yellow", aliases: ["hing", "asafoetida"], stock: 2 },
  ]),
  ...build("snacks", [
    { name: "Parle-G Biscuits", nameHi: "पारले-जी", brand: "Parle", unit: "800 g", price: 80, mrp: 85, icon: "Cookie", aliases: ["biscuit", "biskut", "parle g"], tags: ["bestseller"], stock: 30 },
    { name: "Good Day Cashew", nameHi: "गुड डे", brand: "Britannia", unit: "200 g", price: 40, icon: "Cookie", aliases: ["biscuit", "biskut", "cookies"], stock: 24 },
    { name: "Marie Gold", nameHi: "मैरी गोल्ड", brand: "Britannia", unit: "250 g", price: 35, icon: "Cookie", aliases: ["biscuit", "marie"], stock: 20 },
    { name: "Aloo Bhujia", nameHi: "आलू भुजिया", brand: "Haldiram's", unit: "400 g", price: 105, mrp: 115, icon: "Popcorn", tint: "yellow", aliases: ["namkeen", "bhujia", "farsan"], tags: ["bestseller"], stock: 18, hsn: "2106" },
    { name: "Classic Salted Chips", nameHi: "चिप्स", brand: "Lay's", unit: "52 g", price: 20, icon: "Popcorn", tint: "yellow", aliases: ["chips", "wafers"], stock: 40, hsn: "2005" },
    { name: "Masala Noodles (4 pack)", nameHi: "मैगी", brand: "Maggi", unit: "280 g", price: 56, mrp: 60, icon: "CookingPot", tint: "yellow", aliases: ["maggi", "noodles"], tags: ["bestseller"], stock: 35, hsn: "1902" },
  ]),
  ...build("drinks", [
    { name: "Premium Tea", nameHi: "चाय पत्ती", brand: "Tata Tea", unit: "500 g", price: 270, mrp: 300, icon: "Coffee", aliases: ["chai", "chaha", "tea", "patti"], tags: ["essential", "bestseller"], stock: 20 },
    { name: "Red Label Tea", nameHi: "चाय", brand: "Brooke Bond", unit: "500 g", price: 285, mrp: 300, icon: "Coffee", tint: "red", aliases: ["chai", "chaha", "tea"], stock: 14 },
    { name: "Classic Instant Coffee", nameHi: "कॉफ़ी", brand: "Nescafé", unit: "50 g", price: 180, mrp: 195, icon: "Coffee", tint: "brown", aliases: ["coffee", "kaafi"], stock: 10, hsn: "2101" },
    { name: "Bournvita", nameHi: "बोर्नविटा", brand: "Cadbury", unit: "500 g", price: 245, mrp: 260, icon: "CupSoda", tint: "brown", aliases: ["health drink", "malt"], stock: 9, hsn: "1806", gst: 18 },
    { name: "Mixed Fruit Juice", nameHi: "फ्रूट जूस", brand: "Real", unit: "1 L", price: 120, mrp: 135, icon: "GlassWater", tint: "orange", aliases: ["juice", "ras"], stock: 12, hsn: "2009" },
  ]),
  ...build("home", [
    { name: "Easy Wash Detergent", nameHi: "डिटर्जेंट", brand: "Surf Excel", unit: "1 kg", price: 140, mrp: 155, icon: "Sparkles", aliases: ["surf", "washing powder", "detergent"], tags: ["essential"], stock: 20 },
    { name: "Dishwash Bar (3 x 200 g)", nameHi: "बर्तन साबुन", brand: "Vim", unit: "600 g", price: 40, icon: "Sparkles", tint: "green", aliases: ["vim", "bartan", "dish soap"], stock: 25 },
    { name: "Toilet Cleaner", nameHi: "टॉयलेट क्लीनर", brand: "Harpic", unit: "500 ml", price: 105, mrp: 112, icon: "SprayCan", tint: "blue", aliases: ["harpic", "toilet"], stock: 15, hsn: "3808" },
    { name: "Floor Cleaner", nameHi: "फ़र्श क्लीनर", brand: "Lizol", unit: "500 ml", price: 110, mrp: 119, icon: "SprayCan", aliases: ["lizol", "phenyl", "floor"], stock: 15, hsn: "3808" },
    { name: "Garbage Bags (Medium, 30 pcs)", nameHi: "कचरा थैली", unit: "30 pcs", price: 99, mrp: 120, icon: "Package", tint: "teal", aliases: ["dustbin bag", "garbage", "kachra"], stock: 18, hsn: "3923" },
  ]),
  ...build("care", [
    { name: "Original Soap (4 x 125 g)", nameHi: "साबुन", brand: "Dettol", unit: "500 g", price: 210, mrp: 240, icon: "Bath", tint: "green", aliases: ["sabun", "soap"], stock: 16 },
    { name: "Strong Teeth Toothpaste", nameHi: "टूथपेस्ट", brand: "Colgate", unit: "200 g", price: 110, mrp: 120, icon: "Brush", tint: "red", aliases: ["paste", "toothpaste", "manjan"], tags: ["essential"], stock: 20, hsn: "3306" },
    { name: "Clinic Plus Shampoo", nameHi: "शैम्पू", brand: "Clinic Plus", unit: "340 ml", price: 190, mrp: 230, icon: "ShowerHead", tint: "blue", aliases: ["shampoo"], stock: 10, hsn: "3305" },
    { name: "Coconut Oil", nameHi: "नारियल तेल", brand: "Parachute", unit: "250 ml", price: 110, mrp: 120, icon: "Droplets", tint: "teal", aliases: ["nariyal tel", "khobrel", "hair oil"], stock: 14, hsn: "1513" },
  ]),
];

/** Weight options offered for loose items, in grams. */
export const WEIGHT_STEP = 250;
export const DEFAULT_WEIGHT = 500;

/** Group for a product name, used when the owner adds or imports products. */
export function inferGroup(name: string): string | undefined {
  return GROUPS.find(([re]) => re.test(name))?.[1];
}

export { parseGrams, slugify };

/** Price per kg where the weight is known, so a 5 kg pack and loose atta compare fairly. */
export function comparablePrice(p: Pick<Product, "unitType" | "price" | "netGrams">): number {
  if (p.unitType === "weight") return p.price;
  return p.netGrams ? (p.price * 1000) / p.netGrams : p.price;
}

/** Items in `list` that can genuinely replace `p`: same group, closest price per kg first. */
export function substitutesFor<T extends Product>(p: Product, list: T[], excludeIds: string[] = []): T[] {
  if (!p.group) return [];
  const base = comparablePrice(p);
  return list
    .filter((x) => x.group === p.group && x.id !== p.id && !excludeIds.includes(x.id))
    .sort((a, b) => Math.abs(comparablePrice(a) - base) - Math.abs(comparablePrice(b) - base));
}

/** For browsing: true substitutes first, then the rest of the category by price. */
export function similarTo<T extends Product>(p: Product, list: T[], n = 6, excludeIds: string[] = []): T[] {
  const subs = substitutesFor(p, list, excludeIds);
  const rest = list
    .filter((x) => x.categoryId === p.categoryId && x.id !== p.id && !excludeIds.includes(x.id) && !subs.includes(x))
    .sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price));
  return [...subs, ...rest].slice(0, n);
}

/** Quantity to send when replacing a line with a different kind of unit (5 kg pack → 5000 g loose). */
export function convertQty(from: Pick<Product, "unitType" | "netGrams">, qty: number, to: Pick<Product, "unitType" | "netGrams">): number {
  if (from.unitType === to.unitType) {
    if (from.unitType === "piece" && from.netGrams && to.netGrams) return Math.max(1, Math.round((qty * from.netGrams) / to.netGrams));
    return qty;
  }
  if (to.unitType === "weight") return from.netGrams ? qty * from.netGrams : DEFAULT_WEIGHT;
  return to.netGrams ? Math.max(1, Math.round(qty / to.netGrams)) : 1;
}
