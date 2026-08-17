const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Restaurant Order & Billing API is running!");
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    res.json({ message: "Database connected", result: rows[0].result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/items", async (req, res) => {
  try {
    const [items] = await db.query("SELECT * FROM menu_items ORDER BY id ASC");
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/items", async (req, res) => {
  try {
    const { name, price, stock } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Item name is required" });
    }

    const itemPrice = Number(price);
    const itemStock = Number(stock);

    if (isNaN(itemPrice) || itemPrice <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }

    if (isNaN(itemStock) || itemStock < 0) {
      return res.status(400).json({ error: "Valid stock count is required" });
    }

    const [existing] = await db.query(
      "SELECT id FROM menu_items WHERE LOWER(name) = LOWER(?)",
      [name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "An item with this name already exists" });
    }

    const [result] = await db.query(
      "INSERT INTO menu_items (name, price, stock) VALUES (?, ?, ?)",
      [name.trim(), itemPrice, itemStock]
    );

    const [items] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(items[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/items/:id/stock", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const stock = Number(req.body.stock);

    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({ error: "Valid non-negative stock required" });
    }

    const [items] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    await db.query(
      "UPDATE menu_items SET stock = ? WHERE id = ?",
      [stock, id]
    );

    const [updated] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [items] = await db.query(
      "SELECT * FROM menu_items WHERE id = ?",
      [id]
    );

    if (items.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    await db.query(
      "DELETE FROM menu_items WHERE id = ?",
      [id]
    );

    res.json({ message: "Menu item deleted successfully", id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const [orders] = await db.query(
      "SELECT * FROM orders ORDER BY id DESC"
    );

    for (const order of orders) {
      const [items] = await db.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [order.id]
      );

      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/orders", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { customer_name, items } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: "Customer name is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one item must be selected for the order" });
    }

    await connection.beginTransaction();

    let totalAmount = 0;
    const verifiedItems = [];

    for (const orderItem of items) {
      const [rows] = await connection.query(
        "SELECT * FROM menu_items WHERE id = ? FOR UPDATE",
        [orderItem.item_id]
      );

      if (rows.length === 0) {
        throw new Error(`Item #${orderItem.item_id} does not exist`);
      }

      const item = rows[0];
      const quantity = Number(orderItem.quantity);

      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Invalid quantity for ${item.name}`);
      }

      if (item.stock < quantity) {
        throw new Error(`Insufficient stock for ${item.name} (Available: ${item.stock})`);
      }

      const subtotal = Number(item.price) * quantity;
      totalAmount += subtotal;

      verifiedItems.push({
        item_id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity,
        subtotal,
        newStock: item.stock - quantity
      });
    }

    const [orderResult] = await connection.query(
      "INSERT INTO orders (customer_name, total_amount) VALUES (?, ?)",
      [customer_name.trim(), totalAmount]
    );

    const orderId = orderResult.insertId;

    for (const item of verifiedItems) {
      await connection.query(
        "INSERT INTO order_items (order_id, item_id, item_name, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
        [
          orderId,
          item.item_id,
          item.name,
          item.quantity,
          item.price,
          item.subtotal
        ]
      );

      await connection.query(
        "UPDATE menu_items SET stock = ? WHERE id = ?",
        [item.newStock, item.item_id]
      );
    }

    await connection.commit();

    res.status(201).json({
      id: orderId,
      customer_name: customer_name.trim(),
      total_amount: totalAmount,
      items: verifiedItems
    });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.get("/api/summary", async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue, COUNT(*) AS totalOrders
      FROM orders
    `);

    const [items] = await db.query(`
      SELECT COALESCE(SUM(quantity), 0) AS totalItemsSold
      FROM order_items
    `);

    const [stock] = await db.query(`
      SELECT COUNT(*) AS totalMenuItems,
      SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS outOfStockCount
      FROM menu_items
    `);

    res.json({
      totalRevenue: Number(sales[0].totalRevenue),
      totalOrders: Number(sales[0].totalOrders),
      totalItemsSold: Number(items[0].totalItemsSold),
      totalMenuItems: Number(stock[0].totalMenuItems),
      outOfStockCount: Number(stock[0].outOfStockCount || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Restaurant API running at http://localhost:${PORT}`);
});