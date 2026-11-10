import type { Workspace, Command } from "./types";
const money = (value: number) => Number.isSafeInteger(value) && value >= 0;
export function applyCommand(
  source: Workspace,
  command: Command,
  now = new Date().toISOString(),
): Workspace {
  const data = structuredClone(source);
  if (
    ["product", "expense", "settings"].includes(command.type) &&
    data.role !== "admin"
  )
    throw Error("Akses khusus admin.");
  switch (command.type) {
    case "product": {
      const p = command.product;
      if (
        !p.name.trim() ||
        !money(p.price) ||
        (p.cost !== null && !money(p.cost))
      )
        throw Error("Nama, harga, atau HPP tidak valid.");
      const index = data.products.findIndex((x) => x.id === p.id);
      if (index < 0) data.products.push(p);
      else data.products[index] = p;
      break;
    }
    case "expense":
      if (
        !money(command.expense.amount) ||
        command.expense.amount === 0 ||
        !command.expense.description.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(command.expense.date)
      )
        throw Error("Lengkapi pengeluaran dengan nominal positif.");
      if (!data.expenses.some((e) => e.id === command.expense.id))
        data.expenses.unshift(command.expense);
      break;
    case "settings":
      data.settings = command.settings;
      break;
    case "create": {
      if (data.orders.some((o) => o.id === command.id)) return data;
      if (!command.items.length) throw Error("Keranjang masih kosong.");
      if (command.method === "qris" && !data.settings.qris)
        throw Error("QRIS belum tersedia.");
      const items = command.items.map((i) => {
        const p = data.products.find((p) => p.id === i.productId);
        if (!p || !p.active || !p.available || p.cost === null)
          throw Error("Produk tidak tersedia atau HPP belum diisi.");
        if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 999)
          throw Error("Jumlah harus 1–999.");
        return {
          productId: p.id,
          name: p.name,
          quantity: i.quantity,
          price: p.price,
          cost: p.cost,
        };
      });
      data.orders.unshift({
        id: command.id,
        number: `KS-${command.id.slice(0, 8).toUpperCase()}`,
        items,
        total: items.reduce((s, i) => s + i.quantity * i.price, 0),
        method: command.method,
        status: "pending",
        createdAt: now,
        received: 0,
        customer: command.customer,
      });
      break;
    }
    case "pay": {
      const o = data.orders.find((o) => o.id === command.id);
      if (!o) throw Error("Transaksi tidak ditemukan.");
      if (o.status === "paid") return data;
      if (o.status !== "pending")
        throw Error("Status transaksi tidak dapat diubah.");
      if (
        !money(command.received) ||
        (o.method === "cash" && command.received < o.total)
      )
        throw Error("Uang diterima kurang dari total.");
      o.status = "paid";
      o.paidAt = now;
      o.received = o.method === "cash" ? command.received : o.total;
      break;
    }
    case "cancel": {
      const o = data.orders.find((o) => o.id === command.id);
      if (!o) throw Error("Transaksi tidak ditemukan.");
      if (o.status === "voided" || o.status === "cancelled") return data;
      if (!command.reason.trim()) throw Error("Alasan pembatalan wajib diisi.");
      if (o.status === "paid" && data.role !== "admin")
        throw Error("Pembatalan lunas khusus admin.");
      if (o.status === "paid") {
        o.status = "voided";
        o.voidedAt = now;
      } else o.status = "cancelled";
      o.reason = command.reason;
      break;
    }
  }
  return data;
}
