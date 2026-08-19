import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalItemsSold: 0,
    totalMenuItems: 0,
    outOfStockCount: 0
  });

  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [activePage, setActivePage] = useState("orders");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    stock: ""
  });

  const [stockValues, setStockValues] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, ordersRes, summaryRes, historyRes] = await Promise.all([
        fetch(`${API}/items`),
        fetch(`${API}/orders`),
        fetch(`${API}/summary`),
        fetch(`${API}/history`)
      ]);

      setItems(await itemsRes.json());
      setOrders(await ordersRes.json());
      setSummary(await summaryRes.json());
      setHistory(await historyRes.json());
    } catch {
      setError("Unable to connect to the server.");
    }
  };

  const addToCart = (item) => {
    if (item.stock <= 0) return;

    const existing = cart.find((x) => x.item_id === item.id);

    if (existing) {
      if (existing.quantity >= item.stock) return;

      setCart(
        cart.map((x) =>
          x.item_id === item.id
            ? { ...x, quantity: x.quantity + 1 }
            : x
        )
      );
    } else {
      setCart([
        ...cart,
        {
          item_id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1
        }
      ]);
    }
  };

  const changeQuantity = (id, amount) => {
    const item = items.find((x) => x.id === id);

    setCart(
      cart
        .map((x) =>
          x.item_id === id
            ? { ...x, quantity: x.quantity + amount }
            : x
        )
        .filter((x) => x.quantity > 0)
        .map((x) => {
          if (item && x.quantity > item.stock) {
            return { ...x, quantity: item.stock };
          }
          return x;
        })
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const placeOrder = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    if (cart.length === 0) {
      setError("Please select at least one item.");
      return;
    }

    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          items: cart
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setCart([]);
      setCustomerName("");
      setMessage("Order placed successfully.");
      setError("");
      loadData();
    } catch {
      setError("Unable to place order.");
    }
  };

  const addItem = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setNewItem({ name: "", price: "", stock: "" });
      setMessage("Menu item added.");
      setError("");
      loadData();
    } catch {
      setError("Unable to add item.");
    }
  };

  const updateStock = async (id) => {
    try {
      const response = await fetch(`${API}/items/${id}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: stockValues[id]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setMessage("Stock updated.");
      setError("");
      loadData();
    } catch {
      setError("Unable to update stock.");
    }
  };

  const markServed = async (id) => {
    try {
      const response = await fetch(`${API}/orders/${id}/served`, {
        method: "PUT"
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setMessage("Order marked as served.");
      setError("");
      loadData();
    } catch {
      setError("Unable to update order.");
    }
  };

  const deleteOrder = async (id) => {
    const reason = window.prompt("Why are you deleting this order?");

    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch(`${API}/orders/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setMessage("Order deleted.");
      setError("");
      loadData();
    } catch {
      setError("Unable to delete order.");
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Restaurant Order & Billing</h1>

        <nav>
          <button
            className={activePage === "orders" ? "active" : ""}
            onClick={() => setActivePage("orders")}
          >
            Orders
          </button>

          <button
            className={activePage === "menu" ? "active" : ""}
            onClick={() => setActivePage("menu")}
          >
            Menu
          </button>

          <button
            className={activePage === "stock" ? "active" : ""}
            onClick={() => setActivePage("stock")}
          >
            Stock
          </button>

          <button
            className={activePage === "sales" ? "active" : ""}
            onClick={() => setActivePage("sales")}
          >
            Sales
          </button>

          <button
            className={activePage === "history" ? "active" : ""}
            onClick={() => setActivePage("history")}
          >
            Order History
          </button>
        </nav>
      </header>

      {error && (
        <div className="alert error">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {message && (
        <div className="alert success">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {activePage === "orders" && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Revenue</div>
              <div className="stat-value">৳{summary.totalRevenue.toFixed(2)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Orders</div>
              <div className="stat-value">{summary.totalOrders}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Items Sold</div>
              <div className="stat-value">{summary.totalItemsSold}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Out of Stock</div>
              <div className="stat-value">{summary.outOfStockCount}</div>
            </div>
          </div>

          <div className="ordering-layout">
            <section className="panel-card">
              <div className="panel-header">
                <h2>Menu</h2>
              </div>

              <div className="items-grid">
                {items.map((item) => (
                  <div className="item-card" key={item.id}>
                    <h3>{item.name}</h3>
                    <p>Price: ৳{Number(item.price).toFixed(2)}</p>
                    <p>
                      Stock:{" "}
                      <strong className={item.stock === 0 ? "out-stock" : ""}>
                        {item.stock}
                      </strong>
                    </p>

                    <button
                      onClick={() => addToCart(item)}
                      disabled={item.stock === 0}
                    >
                      {item.stock === 0 ? "Out of Stock" : "Add to Order"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-card">
              <div className="panel-header">
                <h2>Billing</h2>
              </div>

              <form onSubmit={placeOrder}>
                <label>Customer Name</label>

                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />

                <div className="cart">
                  {cart.length === 0 ? (
                    <p className="empty">No items selected.</p>
                  ) : (
                    cart.map((item) => (
                      <div className="cart-row" key={item.item_id}>
                        <div>
                          <strong>{item.name}</strong>
                          <small>
                            ৳{item.price.toFixed(2)} × {item.quantity}
                          </small>
                        </div>

                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() => changeQuantity(item.item_id, -1)}
                          >
                            -
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() => changeQuantity(item.item_id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <hr />

                <div className="bill-total">
                  <span>Total</span>
                  <strong>৳{total.toFixed(2)}</strong>
                </div>

                <button className="place-button" type="submit">
                  Place Order
                </button>
              </form>
            </section>
          </div>

          <section className="panel-card current-orders">
            <div className="panel-header">
              <h2>Current Orders</h2>
              <span>{orders.filter((o) => o.status === "Pending").length} pending</span>
            </div>

            {orders.filter((o) => o.status === "Pending").length === 0 ? (
              <p className="empty">No current orders.</p>
            ) : (
              <div className="orders-list">
                {orders
                  .filter((order) => order.status === "Pending")
                  .map((order) => (
                    <div className="order-card" key={order.id}>
                      <div className="order-info">
                        <strong>Order #{order.id}</strong>
                        <span>{order.customer_name}</span>

                        <div className="order-items">
                          {order.items.map((item) => (
                            <span key={item.id}>
                              {item.item_name} × {item.quantity}
                            </span>
                          ))}
                        </div>

                        <strong>৳{Number(order.total_amount).toFixed(2)}</strong>
                      </div>

                      <div className="order-actions">
                        <button
                          className="served-button"
                          onClick={() => markServed(order.id)}
                        >
                          Served
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => deleteOrder(order.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {activePage === "menu" && (
        <section className="panel-card">
          <div className="panel-header">
            <h2>Add Menu Item</h2>
          </div>

          <form onSubmit={addItem} className="add-item-form">
            <input
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) =>
                setNewItem({ ...newItem, name: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) =>
                setNewItem({ ...newItem, price: e.target.value })
              }
            />

            <input
              type="number"
              placeholder="Stock"
              value={newItem.stock}
              onChange={(e) =>
                setNewItem({ ...newItem, stock: e.target.value })
              }
            />

            <button type="submit">Add Item</button>
          </form>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Stock</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>৳{Number(item.price).toFixed(2)}</td>
                    <td>{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activePage === "stock" && (
        <section className="panel-card">
          <div className="panel-header">
            <h2>Stock Management</h2>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Current Stock</th>
                  <th>New Stock</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={
                          stockValues[item.id] !== undefined
                            ? stockValues[item.id]
                            : item.stock
                        }
                        onChange={(e) =>
                          setStockValues({
                            ...stockValues,
                            [item.id]: e.target.value
                          })
                        }
                      />
                    </td>
                    <td>
                      <button onClick={() => updateStock(item.id)}>
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activePage === "sales" && (
        <section className="panel-card">
          <div className="panel-header">
            <h2>Sales Summary</h2>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">
                ৳{summary.totalRevenue.toFixed(2)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{summary.totalOrders}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Items Sold</div>
              <div className="stat-value">{summary.totalItemsSold}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Menu Items</div>
              <div className="stat-value">{summary.totalMenuItems}</div>
            </div>
          </div>
        </section>
      )}

      {activePage === "history" && (
        <section className="panel-card">
          <div className="panel-header">
            <h2>Order History</h2>
          </div>

          {history.length === 0 ? (
            <p className="empty">No served orders yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.customer_name}</td>
                      <td>
                        {order.items.map((item) => (
                          <div key={item.id}>
                            {item.item_name} × {item.quantity}
                          </div>
                        ))}
                      </td>
                      <td>৳{Number(order.total_amount).toFixed(2)}</td>
                      <td>
                        <span className="status served">Served</span>
                      </td>
                      <td>
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
