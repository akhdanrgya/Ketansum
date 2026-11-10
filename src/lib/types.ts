export type Product = {
  id: string;
  name: string;
  category: "Ketan Susu" | "Dimsum";
  description: string;
  price: number;
  cost: number | null;
  active: boolean;
  available: boolean;
  art: number;
  image?: string;
};
export type PublicProduct = Omit<Product, "cost">;
export type Item = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
};
export type Order = {
  id: string;
  number: string;
  items: Item[];
  total: number;
  method: "cash" | "qris";
  status: "pending" | "paid" | "cancelled" | "voided";
  createdAt: string;
  paidAt?: string;
  voidedAt?: string;
  reason?: string;
  received: number;
  customer: string;
  cashierId?: string;
  paymentReference?: string;
  confirmedBy?: string;
};
export type Expense = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
};
export type Settings = {
  merchant: string;
  qris: string;
  contact: string;
  story: string;
  reflection: string;
  team: string;
};
export type Workspace = {
  products: Product[];
  orders: Order[];
  expenses: Expense[];
  settings: Settings;
  role: "admin" | "cashier";
  currentUserId?: string;
  userName?: string;
};
export type Command =
  | { type: "product"; product: Product; zeroCostConfirmed?: boolean }
  | { type: "expense"; expense: Expense }
  | { type: "settings"; settings: Settings }
  | {
      type: "create";
      id: string;
      items: { productId: string; quantity: number }[];
      method: "cash" | "qris";
      customer: string;
    }
  | {
      type: "pay";
      id: string;
      received: number;
      paymentVerified?: boolean;
      paymentReference?: string;
    }
  | { type: "cancel"; id: string; reason: string; refundConfirmed?: boolean };
