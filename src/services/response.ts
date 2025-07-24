// Success Response Formatter
export const formatSuccessResponse = (
  data: any,
  message?: string,
  meta?: any,
) => {
  return {
    success: true,
    data,
    message,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  };
};
