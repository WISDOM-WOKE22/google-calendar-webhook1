import logger from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

const protect = (req: Request, res: Response, next: NextFunction) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  logger.info(`accessToken: ${req.headers.authorization?.split(' ')[1]}`);

  if (!accessToken) {
    return res.status(401).json({
      success: false,
    });
  }

  next();
};

export { protect };
