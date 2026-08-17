import { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

const bdt = amount => `৳${Number(amount || 0).toFixed(2)}`;

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function QuickStats({ summary }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Total Revenue</div>
        <div className="stat-value">{bdt(summary.totalRevenue)}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Orders Placed</div>
        <div className="stat-value">{summary.totalOrders || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Items Sold</div>
        <div className="stat-value">{summary.totalItemsSold || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Out of Stock</div>
        <div className="stat-value">{summary.outOfStockCount || 0}</div>
      </div>
    </div>
  );
}

function MenuItem({ item, quantity, onChange }) {
  const outOfStock = item.stock === 0;

  return (
    <div className="item-card">
      <h3>{item.name}</h3>
      <p>{bdt(item.price)}</p>
      <p>{outOfStock ? "Stock Out" : `${item.stock} in stock`}</p>

      <div className="quantity">
        <button onClick={() => onChange(item.id, quantity - 1)} disabled={quantity === 0}>-</button>
        <span>{quantity}</span>
        <button onClick={() => onChange(item.id, quantity + 1)} disabled={outOfStock || quantity >= item.stock}>+</button>
      </div>
    </div>
  );
}

function BillingCart({ items, cart, customerName, setCustomerName, onOrder, onClear, submitting }) {
  const selectedItems = Object.entries(cart).map(([id, quantity]) => {
    const item = items.find(item => item.id === Number(id));
    if (!item || quantity <= 0) return null;
    return { ...item, quantity, subtotal: item.price * quantity };
  }).filter(Boolean);

  const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);

  function handleSubmit(event) {
    event.preventDefault();

    if (!customerName.trim() || selectedItems.length === 0) return;

    onOrder({
      customer_name: customerName.trim(),
      items: selectedItems.map(item => ({ item_id: item.id, quantity: item.quantity }))
    });
  }

  return (
    <div className="panel-card">
      <h2>Current Order & Bill</h2>

      <form onSubmit={handleSubmit}>
        <label>Customer Name</label>
        <input value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Enter customer name" required />

        <h3>Selected Items</h3>

        {selectedItems.length === 0 ? (
          <p>No items selected.</p>
        ) : (
          selectedItems.map(item => (
            <div className="cart-row" key={item.id}>
              <span>{item.name}<br />{item.quantity} × {bdt(item.price)}</span>
              <strong>{bdt(item.subtotal)}</strong>
            </div>
          ))
        )}

        <hr />
        <h2>Total: {bdt(total)}</h2>

        {selectedItems.length > 0 && (
          <>
            <button type="submit" disabled={submitting || !customerName.trim()}>
              {submitting ? "Processing..." : "Place Order & Bill"}
            </button>

            <button type="button" onClick={onClear}>Clear Cart</button>
          </>
        )}
      </form>
    </div>
  );
}

function SalesHistory({ orders, onRefresh }) {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2>Sales & Order History</h2>
        <button onClick={onRefresh}>Refresh</button>
      </div>

      {orders.length === 0 ? (
        <p>No orders recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Date</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.customer_name}</td>
                <td>
                  {order.items?.map(item => (
                    <div key={item.id}>{item.quantity} × {item.item_name}</div>
                  ))}
                </td>
                <td>{order.created_at ? new Date(order.created_at).toLocaleString() : ""}</td>
                <td>{bdt(order.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ManagerView({ items, onAdd, onStockChange, onDelete, onBack }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    onAdd({
      name: name.trim(),
      price: Number(price),
      stock: Number(stock)
    });

    setName("");
    setPrice("");
    setStock("");
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2>Manager / Inventory</h2>
        <button onClick={onBack}>Back to Ordering</button>
      </div>

      <form onSubmit={handleSubmit}>
        <h3>Add Menu Item</h3>

        <input placeholder="Item name" value={name} onChange={e => setName(e.target.value)} required />
        <input type="number" placeholder="Price" min="1" value={price} onChange={e => setPrice(e.target.value)} required />
        <input type="number" placeholder="Stock" min="0" value={stock} onChange={e => setStock(e.target.value)} required />

        <button type="submit">Add Item</button>
      </form>

      <h3>Inventory</h3>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{bdt(item.price)}</td>
              <td>{item.stock}</td>
              <td>
                <button onClick={() => onStockChange(item.id, Math.max(0, item.stock - 1))}>-1</button>
                <button onClick={() => onStockChange(item.id, item.stock + 5)}>+5</button>
                <button onClick={() => onStockChange(item.id, item.stock + 10)}>+10</button>
                <button onClick={() => onDelete(item.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("ordering");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({});
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      const [itemData, orderData, summaryData] = await Promise.all([
        api("/items"),
        api("/orders"),
        api("/summary")
      ]);

      setItems(itemData);
      setOrders(orderData);
      setSummary(summaryData);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function changeQuantity(id, quantity) {
    setCart(oldCart => {
      const newCart = { ...oldCart };

      if (quantity <= 0) {
        delete newCart[id];
      } else {
        newCart[id] = quantity;
      }

      return newCart;
    });
  }

  async function placeOrder(order) {
    setSubmitting(true);
    setMessage("");

    try {
      const newOrder = await api("/orders", {
        method: "POST",
        body: order
      });

      setMessage(`Order #${newOrder.id} placed successfully. Total: ${bdt(newOrder.total_amount)}`);
      setCart({});
      setCustomerName("");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addItem(item) {
    try {
      await api("/items", {
        method: "POST",
        body: item
      });

      setMessage("Menu item added.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStock(id, stock) {
    try {
      await api(`/items/${id}/stock`, {
        method: "PUT",
        body: { stock }
      });

      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteItem(id) {
    try {
      await api(`/items/${id}`, {
        method: "DELETE"
      });

      setMessage("Menu item deleted.");
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🍔 Restaurant Order & Billing</h1>

        <nav>
          <button onClick={() => setPage("ordering")}>Order & Billing</button>
          <button onClick={() => setPage("manager")}>Manager</button>
        </nav>
      </header>

      {message && (
        <div className="alert">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      <QuickStats summary={summary} />

      {page === "ordering" ? (
        <>
          <main className="ordering-layout">
            <section className="panel-card">
              <div className="panel-header">
                <h2>Menu Items</h2>
                <button onClick={() => setPage("manager")}>+ Add Item</button>
              </div>

              <div className="items-grid">
                {items.length === 0 ? (
                  <p>No menu items found.</p>
                ) : (
                  items.map(item => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      quantity={cart[item.id] || 0}
                      onChange={changeQuantity}
                    />
                  ))
                )}
              </div>
            </section>

            <BillingCart
              items={items}
              cart={cart}
              customerName={customerName}
              setCustomerName={setCustomerName}
              onOrder={placeOrder}
              onClear={() => setCart({})}
              submitting={submitting}
            />
          </main>

          <SalesHistory orders={orders} onRefresh={loadData} />
        </>
      ) : (
        <ManagerView
          items={items}
          onAdd={addItem}
          onStockChange={updateStock}
          onDelete={deleteItem}
          onBack={() => setPage("ordering")}
        />
      )}
    </div>
  );
}