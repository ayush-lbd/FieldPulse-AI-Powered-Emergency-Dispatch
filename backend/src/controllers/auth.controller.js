import { Dispatcher } from '../models/dispatcher.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

// Utility function to generate both tokens and save the refresh token to the DB
const generateAccessAndRefreshTokens = async (dispatcherId) => {
    try {
        const dispatcher = await Dispatcher.findById(dispatcherId);
        const accessToken = dispatcher.generateAccessToken();
        const refreshToken = dispatcher.generateRefreshToken();

        dispatcher.refreshToken = refreshToken;
        await dispatcher.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error("Something went wrong while generating tokens");
    }
};

export const loginDispatcher = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json(new ApiResponse(400, null, "Email and password are required"));
        }

        const dispatcher = await Dispatcher.findOne({ email });
        if (!dispatcher) {
            return res.status(404).json(new ApiResponse(404, null, "Dispatcher does not exist"));
        }

        const isPasswordValid = await dispatcher.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(401).json(new ApiResponse(401, null, "Invalid user credentials"));
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(dispatcher._id);

        const loggedInDispatcher = await Dispatcher.findById(dispatcher._id).select("-password -refreshToken");

        // Secure Cookie Options
        const options = {
            httpOnly: true, // Cannot be accessed by client-side JS
            secure: true // Send over HTTPS only
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { user: loggedInDispatcher, accessToken, refreshToken }, "Dispatcher logged in successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, null, error.message));
    }
};

export const logoutDispatcher = async (req, res) => {
    try {
        // Clear the refresh token from the database
        await Dispatcher.findByIdAndUpdate(
            req.user._id,
            { $unset: { refreshToken: 1 } }, // Remove the field
            { new: true }
        );

        const options = { httpOnly: true, secure: true };

        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, {}, "Dispatcher logged out successfully"));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, null, "Error during logout"));
    }
};

export const refreshAccessToken = async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json(new ApiResponse(401, null, "Unauthorized request"));
        }

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const dispatcher = await Dispatcher.findById(decodedToken?._id);

        if (!dispatcher || incomingRefreshToken !== dispatcher?.refreshToken) {
            return res.status(401).json(new ApiResponse(401, null, "Refresh token is expired or used"));
        }

        // Issue new tokens
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(dispatcher._id);

        const options = { httpOnly: true, secure: true };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"));
    } catch (error) {
        return res.status(401).json(new ApiResponse(401, null, "Invalid refresh token"));
    }
};