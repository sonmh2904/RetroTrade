const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderCode: { type: String, required: true , unique: true },
  typeId: { type: String, required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, default: null },
  note: { type: String },
  payUrl: { type: String, default: null },       // Thêm trường payUrl
  qrCode: { type: String, default: null },
  // Thêm các trường cho rút tiền
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  adminNote: { type: String, default: null }, // Ghi chú của admin khi duyệt
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Admin duyệt
  reviewedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
