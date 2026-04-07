"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data = {}, meta = undefined, statusCode = 200) => {
    const response = {
        success: true,
        data,
    };
    if (meta) {
        response.meta = meta;
    }
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, code = 'INTERNAL_SERVER_ERROR', statusCode = 500, errors = undefined) => {
    const response = {
        success: false,
        error: {
            message,
            code,
            errors,
        },
    };
    res.status(statusCode).json(response);
};
exports.sendError = sendError;
