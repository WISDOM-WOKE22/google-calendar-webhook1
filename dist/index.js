"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
const errorHandler_1 = require("./middlewares/errorHandler");
const calendar_1 = __importDefault(require("./routes/calendar"));
const auth_1 = __importDefault(require("./routes/auth"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const PORT = config_1.default.port || 5000;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);
// Routes
app.use('/api/calendar', calendar_1.default);
app.use('/api/auth', auth_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/test', async (req, res) => {
    res.status(200).json({ message: 'Welcome to my google calendar webhook ' });
});
// 404 handler - must be before error handler
app.use(errorHandler_1.notFoundHandler);
// Error handling middleware - must be last
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.default.info(`Server is running on port ${PORT}`);
});
