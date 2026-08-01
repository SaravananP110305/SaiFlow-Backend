import { StatusCodes } from 'http-status-codes';
import ApiResponse from '../utils/ApiResponse.js';

export const getHealth = (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'UP',
    version: '1.0.0'
  };
  
  res.status(StatusCodes.OK).json(
    new ApiResponse(StatusCodes.OK, 'SaiFlow REST API server is healthy', healthData)
  );
};
