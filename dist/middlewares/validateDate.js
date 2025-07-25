"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateParams = void 0;
const validateDateParams = (req, res, next) => {
    const { startTime, endTime } = req.query;
    if (!startTime || !endTime) {
        return res.status(400).json({
            success: false,
            error: 'startTime and endTime are required',
        });
    }
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
            success: false,
            error: 'startTime and endTime must be valid ISO date strings',
        });
    }
    if (startDate >= endDate) {
        return res.status(400).json({
            success: false,
            error: 'startTime must be before endTime',
        });
    }
    next();
};
exports.validateDateParams = validateDateParams;
