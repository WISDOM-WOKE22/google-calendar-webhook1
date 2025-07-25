"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const error_1 = require("../services/error");
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return error_1.errorHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return error_1.notFoundHandler; } });
// Setup global error handlers for unhandled rejections and exceptions
(0, error_1.setupGlobalErrorHandlers)();
