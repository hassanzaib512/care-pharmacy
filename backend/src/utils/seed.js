require('dotenv').config();
const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Order = require('../models/Order');
const connectDB = require('../config/db');

const sampleMedicines = [
  {
    name: 'Cold Relief Plus',
    manufacturer: 'Care Labs',
    description: 'Relieves congestion, sore throat, and mild fever quickly.',
    usage: 'Take 1 tablet every 6 hours after meals with water.',
    composition: ['Paracetamol', 'Phenylephrine', 'Vitamin C'],
    category: 'Cold & Flu',
    price: 14.5,
    imageUrls: [
      'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d',
      'https://images.unsplash.com/photo-1763655057880-48a31bbc1398',
    ],
    rating: 4.7,
    reviewsCount: 248,
    tags: ['trending', 'winter'],
    primaryConditions: ['Cold', 'Flu', 'Sore throat'],
  },
  {
    name: 'AquaGuard Hydration',
    manufacturer: 'HydraWell',
    description: 'Electrolyte rich oral rehydration to beat summer heat.',
    usage: 'Mix contents with 200ml water and sip slowly.',
    composition: ['Sodium', 'Potassium', 'Glucose'],
    category: 'Hydration',
    price: 9.99,
    imageUrls: [
      'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d',
      'https://images.unsplash.com/photo-1763655057880-48a31bbc1398',
    ],
    rating: 4.4,
    reviewsCount: 132,
    tags: ['popular', 'summer'],
    primaryConditions: ['Dehydration', 'Heat exhaustion'],
  },
  {
    name: 'Immuno Boost Daily',
    manufacturer: 'HealthPlus Pharma',
    description: 'Daily multivitamin with zinc for immune strength.',
    usage: 'Chew or swallow one tablet daily after breakfast.',
    composition: ['Vitamin C', 'Vitamin D3', 'Zinc'],
    category: 'Vitamins',
    price: 22.0,
    imageUrls: [
      'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d',
      'https://images.unsplash.com/photo-1763655057880-48a31bbc1398',
    ],
    rating: 4.6,
    reviewsCount: 310,
    tags: ['trending', 'popular'],
    primaryConditions: ['Immunity support', 'Fatigue'],
  },
];

const sampleUsers = [
  {
    name: 'Demo User',
    email: 'demo1@carepharmacy.com',
    password: 'password123',
    address: {
      fullName: 'Demo User',
      phone: '+1 222 333 4444',
      line1: '123 Health St',
      line2: '',
      city: 'Wellness City',
      zip: '12345',
    },
    paymentMethod: {
      cardHolderName: 'Demo User',
      maskedCardNumber: '**** **** **** 4242',
      brand: 'Visa',
      expiry: '08/27',
    },
  },
];

const seedData = async () => {
  try {
    await connectDB();
    await User.deleteMany({});
    await Medicine.deleteMany({});
    await Order.deleteMany({});

    const users = await User.insertMany(sampleUsers);
    const meds = await Medicine.insertMany(sampleMedicines);

    // Build a sample order for demo user
    const demoUser = users[0];
    const orderItems = meds.slice(0, 2).map((m) => ({
      medicine: m._id,
      quantity: 1,
      unitPrice: m.price,
    }));
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    await Order.create({
      user: demoUser._id,
      items: orderItems,
      totalAmount,
      status: 'delivered',
      deliveryStatus: 'Delivered',
      addressSnapshot: demoUser.address,
      paymentSnapshot: demoUser.paymentMethod,
    });

    console.log('Users, medicines, and orders seeded');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedData();
