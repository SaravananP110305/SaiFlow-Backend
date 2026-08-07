import { StatusCodes } from 'http-status-codes';

export const getHealth = (req, res) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message: 'SaiFlow REST API server is healthy',
  });
};