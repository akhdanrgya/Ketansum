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
    case "preorder_update": {
      const o = data.orders.find(
        (o) => o.id === command.id && o.kind === "preorder",
      );
      if (!o?.preorder) throw Error("Preorder tidak ditemukan.");
      if (["cancelled", "voided"].includes(o.status))
        throw Error("Preorder sudah dibatalkan.");
      if (command.version !== o.preorder.version)
        throw Error("Preorder telah diubah. Muat ulang halaman.");
      if (
        !command.customer.trim() ||
        !command.preorder.address.trim() ||
        !Number.isFinite(Date.parse(command.preorder.scheduledAt))
      )
        throw Error("Lengkapi nama, alamat dan jadwal.");
      if (command.preorder.status === "completed" && o.status !== "paid")
        throw Error("Konfirmasi pembayaran sebelum menyelesaikan preorder.");
      if (o.status === "paid" && command.method !== o.method)
        throw Error("Metode pembayaran lunas tidak dapat diubah.");
      o.customer = command.customer;
      o.method = command.method;
      o.preorder = { ...command.preorder, version: o.preorder.version + 1 };
      break;
    }
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
      if (
        command.preorder &&
        (!command.customer.trim() ||
          !command.preorder.address.trim() ||
          !Number.isFinite(Date.parse(command.preorder.scheduledAt)))
      )
        throw Error("Lengkapi nama, alamat dan jadwal.");
      data.orders.unshift({
        ...(command.preorder
          ? {
              kind: "preorder" as const,
              preorder: {
                ...command.preorder,
                status: "pending" as const,
                version: 1,
              },
            }
          : {}),
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
      if (o.preorder) o.preorder.status = "cancelled";
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
