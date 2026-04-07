"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSourceSchema = void 0;
const zod_1 = require("zod");
exports.createSourceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Source name is required'),
    url: zod_1.z.string().url('Invalid URL format')
});
