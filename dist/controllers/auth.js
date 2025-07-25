"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGoogleAuthCallback = exports.getGoogleAuthUrl = void 0;
const error_1 = require("../services/error");
const googleCalendar_1 = __importDefault(require("../services/googleCalendar"));
const response_1 = require("../services/response");
exports.getGoogleAuthUrl = (0, error_1.asyncHandler)(async (req, res) => {
    const authUrl = googleCalendar_1.default.getAuthUrl();
    res.json((0, response_1.formatSuccessResponse)(authUrl, 'Google auth URL generated successfully'));
});
exports.handleGoogleAuthCallback = (0, error_1.asyncHandler)(async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({
            success: false,
            error: 'Authorization code is required',
        });
    }
    const tokens = await googleCalendar_1.default.getTokensFromCode(code);
    console.log(tokens);
    res.json((0, response_1.formatSuccessResponse)(tokens, 'Google auth callback successful'));
});
