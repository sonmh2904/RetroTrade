const express = require("express")
const router = express.Router()
const userController = require("../../controller/user/user.controller")
const profileController = require("../../controller/auth/auth.profile.controller")
const userAddressController = require("../../controller/user/userAddress.controller")
const { authenticateToken, authorizeRoles } = require("../../middleware/auth")
const pagination = require("../../middleware/pagination")


// Specific routes must come before parameterized routes
router.get('/profile/me', authenticateToken, profileController.getProfile);
router.put('/profile', authenticateToken, profileController.updateProfile);
router.post('/profile/verify-password', authenticateToken, profileController.verifyPassword);
router.put('/profile/change-password', authenticateToken, profileController.changePassword);
router.put('/profile/id-card-info', authenticateToken, profileController.updateIdCardInfo);

// User Addresses routes - must come before /:id route
router.get('/addresses', authenticateToken, userAddressController.getUserAddresses);
router.post('/addresses', authenticateToken, userAddressController.createUserAddress);
router.put('/addresses/:id', authenticateToken, userAddressController.updateUserAddress);
router.delete('/addresses/:id', authenticateToken, userAddressController.deleteUserAddress);

// Generic routes
router.get('/', pagination(), userController.getAllUsers);
router.get('/moderation', authenticateToken, authorizeRoles('moderator'), pagination(), userController.getUsersForModeration);
router.get('/:id', userController.getUserById);
router.post('/', authenticateToken, authorizeRoles('admin'), userController.createUser);
router.put('/:id', authenticateToken, authorizeRoles('admin'), userController.updateUser);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), userController.deleteUser);
router.put('/role/update', authenticateToken, authorizeRoles('admin'), userController.updateUserRole);
router.post('/:id/ban', authenticateToken, authorizeRoles('admin', 'moderator'), userController.banUser);
router.post('/:id/unban', authenticateToken, authorizeRoles('admin', 'moderator'), userController.unbanUser);

module.exports = router;