import jwt from 'jsonwebtoken';
import { Dispatcher } from '../models/dispatcher.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const verifyJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json(new ApiResponse(401, null, "Unauthorized request"));
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const dispatcher = await Dispatcher.findById(decodedToken?._id).select("-password -refreshToken");

        if (!dispatcher) {
            return res.status(401).json(new ApiResponse(401, null, "Invalid Access Token"));
        }

        req.user = dispatcher;
        next();
    } catch (error) {
        return res.status(401).json(new ApiResponse(401, null, error.message || "Invalid Access Token"));
    }
};