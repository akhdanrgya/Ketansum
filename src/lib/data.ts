import type { PublicProduct, Workspace } from "./types";
export const menu: PublicProduct[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ketan Susu",
    category: "Ketan Susu",
    description:
      "Ketan pulen dengan susu yang manis. Simpel, selalu bikin kangen.",
    price: 10000,
    art: 0,
    active: true,
    available: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Ketan Susu Keju",
    category: "Ketan Susu",
    description: "Manisnya susu ketemu gurihnya taburan keju.",
    price: 12000,
    art: 1,
    active: true,
    available: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Ketan Susu Choco Crunch",
    category: "Ketan Susu",
    description: "Cokelat crunchy, keju, dan ketan dalam satu suapan.",
    price: 15000,
    art: 2,
    active: true,
    available: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Ketan Susu Oreo",
    category: "Ketan Susu",
    description: "Ketan susu dengan remahan Oreo dan keju yang melimpah.",
    price: 15000,
    art: 3,
    active: true,
    available: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Dimsum Original",
    category: "Dimsum",
    description: "Dimsum gurih dengan saus pendamping. Teman ngemil yang pas.",
    price: 12000,
    art: 4,
    active: true,
    available: true,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Dimsum Chilli Oil",
    category: "Dimsum",
    description: "Dimsum gurih bertemu chilli oil. Buat tim yang suka pedas!",
    price: 15000,
    art: 5,
    active: true,
    available: true,
  },
];
export const initialSettings = {
  merchant: "Ketansum",
  qris: "",
  contact: "",
  story:
    "Berawal dari tugas kewirausahaan, Ketansum mempertemukan dua rasa favorit: ketan susu yang manis dan dimsum yang gurih. Kami belajar membangun usaha dari ide, membuat produk, sampai melayani pembeli.",
  reflection:
    "Perjalanan kami masih berjalan. Dokumentasi, hasil penjualan, dan cerita pembelajaran akan kami bagikan di sini.",
  team: "",
};
export function initialWorkspace(): Workspace {
  return {
    products: menu.map((p) => ({ ...p, cost: null })),
    orders: [],
    expenses: [],
    settings: { ...initialSettings },
    role: "admin",
  };
}
export const isDemo =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
