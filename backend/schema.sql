CREATE DATABASE IF NOT EXISTS restaurant_db;

USE restaurant_db;


CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0
);

 
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

 
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (item_id)
        REFERENCES menu_items(id)
        ON DELETE SET NULL
);

 
INSERT IGNORE INTO menu_items (name, price, stock)
VALUES
('Classic Beef Burger', 280.00, 15),
('Crispy Chicken Burger', 240.00, 12),
('Pepperoni Pizza (Personal)', 450.00, 8),
('French Fries', 120.00, 20),
('Garlic Bread', 150.00, 10),
('Iced Lemon Tea', 30.00, 25),
('Coca Cola', 50.00, 0);