"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articleQuerySchema = void 0;
const zod_1 = require("zod");
exports.articleQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(val => (val ? parseInt(val, 10) : 1)),
    limit: zod_1.z.string().optional().transform(val => (val ? parseInt(val, 10) : 10)),
    source: zod_1.z.string().optional(),
    q: zod_1.z.string().optional()
});
