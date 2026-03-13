require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/risk-checker';

async function seedAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas for Seeding Admin');

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
      process.exit(1);
    }
    
    // Check if THIS specific admin exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists. Updating password...');
      const salt = await bcrypt.genSalt(12);
      existingAdmin.passwordHash = await bcrypt.hash(adminPassword, salt);
      await existingAdmin.save();
      console.log('✅ Admin password updated successfully.');
    } else {
      console.log('Creating new admin user...');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await Admin.create({
        name: 'Super Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin'
      });
      console.log(`✅ Default admin seeded successfully.`);
    }

    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err);
    process.exit(1);
  }
}

seedAdmin();
