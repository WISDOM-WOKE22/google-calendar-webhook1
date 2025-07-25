"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const protect = (req, res, next) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    logger_1.default.info(`accessToken: ${req.headers.authorization?.split(' ')[1]}`);
    if (!accessToken) {
        return res.status(401).json({
            success: false,
        });
    }
    next();
};
exports.protect = protect;
