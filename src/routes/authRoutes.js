'use strict';

const express = require('express');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { loginRules, changePasswordRules } = require('../validators/common');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginRules, validate, authController.login);
router.get('/me', requireAuth, authController.me);
router.patch('/password', requireAuth, changePasswordRules, validate, authController.changePassword);

module.exports = router;
