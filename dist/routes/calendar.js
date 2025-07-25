"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const calendar_1 = require("../controllers/calendar");
const router = (0, express_1.Router)();
// Public routes
router.route('/webhook/notification').post(calendar_1.pushWebhookNotification);
// Protected routes
// router.use(protect)
router.route('/events').get(calendar_1.getEvents);
router.route('/subscription').post(calendar_1.createWebhookSubscription);
exports.default = router;
