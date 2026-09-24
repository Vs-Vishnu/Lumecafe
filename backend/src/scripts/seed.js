require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const InventoryTransaction = require('../models/InventoryTransaction');
const Expense = require('../models/Expense');
const BusinessSettings = require('../models/BusinessSettings');

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lumebills';
    console.log(`Connecting to MongoDB for seeding: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing database collections...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await InventoryTransaction.deleteMany({});
    await Expense.deleteMany({});
    await BusinessSettings.deleteMany({});

    console.log('Seeding Business Settings...');
    const settings = await BusinessSettings.create({
      businessName: 'LumeBills Cafe',
      address: '123 Fresh Lane, Metro City, IN 560001',
      phone: '+91 99000 88000',
      email: 'hello@lumebills.com',
      website: 'www.lumebills.com',
      gstNumber: '29AAAAA1111A1Z1',
      currency: '₹',
      taxPercentage: 5,
      invoicePrefix: 'LB',
      nextInvoiceNumber: 10001,
      tagline: 'Fast. Simple. Accurate.',
      billingGridColumns: 4,
      billingImage: '',
    });

    console.log('Seeding Users...');
    // Seed admin
    const admin = await User.create({
      name: 'LumeBills Admin',
      email: 'admin@lumebills.com',
      password: 'admin123', // Will be hashed via pre-save hook
      role: 'admin',
      status: 'active',
    });

    // Seed cashier
    const cashier = await User.create({
      name: 'LumeBills Cashier',
      email: 'cashier@lumebills.com',
      password: 'cashier123',
      role: 'cashier',
      status: 'active',
    });

    console.log('Seeding Categories...');
    const categoriesData = [
      { name: 'Pizza', description: 'Freshly baked artisanal pizzas', status: 'active' },
      { name: 'Burger', description: 'Gourmet burgers with crispy fries', status: 'active' },
      { name: 'Fresh Juice', description: '100% fresh cold-pressed fruit juices', status: 'active' },
      { name: 'Tea', description: 'Traditional and herbal teas', status: 'active' },
      { name: 'Coffee', description: 'Espresso, Cappuccino, and Cold brews', status: 'active' },
      { name: 'Snacks', description: 'Quick bites, fries, and finger foods', status: 'active' },
      { name: 'Other', description: 'Miscellaneous menu items', status: 'active' },
    ];
    
    const categoriesMap = {};
    for (const cat of categoriesData) {
      const createdCat = await Category.create(cat);
      categoriesMap[cat.name] = createdCat._id;
    }

    console.log('Seeding Products...');
    const productsData = [
      {
        name: 'Margherita Pizza',
        SKU: 'PIZ001',
        category: categoriesMap['Pizza'],
        description: 'Classic cheese and tomato pizza on sourdough base',
        price: 180,
        costPrice: 100,
        stockQuantity: 50,
        minStockLevel: 10,
        unit: 'pcs',
        taxPercentage: 5,
        status: 'active',
      },
      {
        name: 'Cheese Burger',
        SKU: 'BUR001',
        category: categoriesMap['Burger'],
        description: 'Juicy vegetable/chicken patty with melted cheddar cheese',
        price: 150,
        costPrice: 80,
        stockQuantity: 40,
        minStockLevel: 8,
        unit: 'pcs',
        taxPercentage: 5,
        status: 'active',
      },
      {
        name: 'French Fries',
        SKU: 'FFR001',
        category: categoriesMap['Snacks'],
        description: 'Crispy golden potato fries lightly salted',
        price: 100,
        costPrice: 50,
        stockQuantity: 30,
        minStockLevel: 5,
        unit: 'plate',
        taxPercentage: 5,
        status: 'active',
      },
      {
        name: 'Fresh Orange Juice',
        SKU: 'JUI001',
        category: categoriesMap['Fresh Juice'],
        description: 'Chilled cold pressed orange juice with no added sugar',
        price: 80,
        costPrice: 40,
        stockQuantity: 60,
        minStockLevel: 15,
        unit: 'cup',
        taxPercentage: 0,
        status: 'active',
      },
      {
        name: 'Lemon Juice',
        SKU: 'JUI002',
        category: categoriesMap['Fresh Juice'],
        description: 'Refreshing sweet and sour fresh lemonade',
        price: 50,
        costPrice: 20,
        stockQuantity: 80,
        minStockLevel: 20,
        unit: 'cup',
        taxPercentage: 0,
        status: 'active',
      },
      {
        name: 'Masala Tea',
        SKU: 'TEA001',
        category: categoriesMap['Tea'],
        description: 'Aromatic milk tea brewed with selected Indian spices',
        price: 30,
        costPrice: 10,
        stockQuantity: 100,
        minStockLevel: 25,
        unit: 'cup',
        taxPercentage: 0,
        status: 'active',
      },
      {
        name: 'Filter Coffee',
        SKU: 'COF001',
        category: categoriesMap['Coffee'],
        description: 'Authentic South Indian hot filter coffee',
        price: 50,
        costPrice: 18,
        stockQuantity: 100,
        minStockLevel: 25,
        unit: 'cup',
        taxPercentage: 0,
        status: 'active',
      },
    ];

    for (const prod of productsData) {
      const createdProd = await Product.create(prod);

      // Create initial stock ledger entry
      await InventoryTransaction.create({
        product: createdProd._id,
        type: 'Adjustment',
        quantity: createdProd.stockQuantity,
        previousStock: 0,
        newStock: createdProd.stockQuantity,
        reason: 'Seeded initial stock',
        user: admin._id,
        userName: admin.name,
      });
    }

    console.log('Seeding Customers...');
    await Customer.create([
      { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com', address: 'Apartment A, Sector 4, Metro City' },
      { name: 'Priya Patel', phone: '9123456789', email: 'priya@example.com', address: 'Villa 10, Outer Ring Road, Metro City' },
    ]);

    console.log('Seeding Expenses...');
    await Expense.create([
      { title: 'Store Rent - August', category: 'Rent', amount: 15000, description: 'Monthly space rent payment', paymentMethod: 'Card' },
      { title: 'Electricity Bill', category: 'Electricity', amount: 3200, description: 'Electricity usage for July', paymentMethod: 'UPI' },
    ]);

    console.log('Database seeded successfully!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
