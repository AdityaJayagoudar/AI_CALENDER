const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const path     = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;