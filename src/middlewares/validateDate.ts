import { Request, Response, NextFunction } from 'express';

const validateDateParams = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { startTime, endTime } = req.query;

  if (!startTime || !endTime) {
    return res.status(400).json({
      success: false,
      error: 'startTime and endTime are required',
    });
  }

  const startDate = new Date(startTime as string);
  const endDate = new Date(endTime as string);

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

export { validateDateParams };
