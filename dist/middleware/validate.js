"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
const validate = (schema, property) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield schema.parseAsync(req[property]);
        next();
    }
    catch (error) {
        if (error instanceof zod_1.ZodError || error.name === 'ZodError') {
            const errors = ((_a = error.errors) === null || _a === void 0 ? void 0 : _a.map((err) => ({
                field: err.path.join('.'),
                message: err.message
            }))) || [];
            (0, response_1.sendError)(res, 'Validation Error', 'VALIDATION_ERROR', 400, errors);
            return;
        }
        next(error);
    }
});
exports.validate = validate;
