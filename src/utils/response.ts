import { Response } from 'express';

export interface ApiResponse {
    success: boolean;
    data?: any;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        message?: string;
    };

    error?: {
        message: string;
        code: string;
        errors?: any;
    };
}

export const sendSuccess = (
    res: Response,
    data: any = {},
    meta: ApiResponse['meta'] = undefined,
    statusCode: number = 200
): void => {
    const response: ApiResponse = {
        success: true,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    res.status(statusCode).json(response);
};

export const sendError = (
    res: Response,
    message: string,
    code: string = 'INTERNAL_SERVER_ERROR',
    statusCode: number = 500,
    errors: any = undefined
): void => {
    const response: ApiResponse = {
        success: false,
        error: {
            message,
            code,
            errors,
        },
    };

    res.status(statusCode).json(response);
};
