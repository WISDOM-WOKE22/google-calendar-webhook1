"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSuccessResponse = void 0;
// Success Response Formatter
const formatSuccessResponse = (data, message, meta) => {
    return {
        success: true,
        data,
        message,
        ...(meta && { meta }),
        timestamp: new Date().toISOString(),
    };
};
exports.formatSuccessResponse = formatSuccessResponse;
