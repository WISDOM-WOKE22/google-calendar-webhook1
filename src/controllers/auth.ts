import { Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../services/error';
import googleCalendarService from '../services/googleCalendar';
import { formatSuccessResponse } from '../services/response';
import logger from '../utils/logger';

export const getGoogleAuthUrl = asyncHandler(
  async (req: Request, res: Response) => {
    const authUrl = googleCalendarService.getAuthUrl();
    res.json(
      formatSuccessResponse(authUrl, 'Google auth URL generated successfully'),
    );
  },
);

export const handleGoogleAuthCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required',
      });
    }
    const tokens = await googleCalendarService.getTokensFromCode(
      code as string,
    );
    console.log(tokens);
    res.json(formatSuccessResponse(tokens, 'Google auth callback successful'));
  },
);
