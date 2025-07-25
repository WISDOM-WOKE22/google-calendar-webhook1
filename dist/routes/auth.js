"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const router = (0, express_1.Router)();
router.route('/google/url').get(auth_1.getGoogleAuthUrl);
router.route('/google/callback').post(auth_1.handleGoogleAuthCallback);
exports.default = router;
