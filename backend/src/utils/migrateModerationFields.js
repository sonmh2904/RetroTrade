const mongoose = require('mongoose');
const User = require('../models/User.model');
const Comment = require('../models/Blog/Comment.model');

/**
 * Migration script để thêm các trường moderation mới
 * Chạy script này một lần khi deploy
 */
const migrateModerationFields = async () => {
  try {
    console.log('Starting moderation fields migration...');

    // 1. Migrate User model - thêm commentBannedUntil (nếu chưa có)
    const userUpdateResult = await User.updateMany(
      { commentBannedUntil: { $exists: false } },
      { $set: { commentBannedUntil: null } }
    );
    console.log(`Updated ${userUpdateResult.modifiedCount} user documents`);

    // 2. Migrate Comment model - thêm moderation fields
    const commentUpdateResult = await Comment.updateMany(
      {
        moderationStatus: { $exists: false }
      },
      {
        $set: {
          moderationStatus: 'pending',
          moderationReason: null,
          moderatedBy: null,
          moderatedAt: null,
          violationType: null,
          aiConfidence: null
        }
      }
    );
    console.log(`Updated ${commentUpdateResult.modifiedCount} comment documents`);

    // 3. Set comments cũ (tạo trước khi có moderation) thành approved
    const oldCommentsResult = await Comment.updateMany(
      {
        createdAt: { $lt: new Date() }, // Tất cả comments cũ
        moderationStatus: 'pending'
      },
      {
        $set: {
          moderationStatus: 'approved'
        }
      }
    );
    console.log(`Approved ${oldCommentsResult.modifiedCount} old comments`);

    console.log('Moderation fields migration completed successfully!');
  } catch (error) {
    console.error('Error during moderation fields migration:', error);
    throw error;
  }
};

/**
 * Script để chạy migration từ command line
 */
if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/db');

  connectDB().then(async () => {
    try {
      await migrateModerationFields();
      console.log('Migration completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }).catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });
}

module.exports = { migrateModerationFields };
