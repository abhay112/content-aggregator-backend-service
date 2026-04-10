import { Router } from 'express';
import * as ArticleController from '@controllers/article.controller';
import * as SourceController from '@controllers/source.controller';
import { validate } from '@middleware/validate';
import { articleQuerySchema } from '@validators/article.validator';
import { createSourceSchema } from '@validators/source.validator';

const router = Router();

/**
 * @swagger
 * /api/v1/articles:
 *   get:
 *     summary: Retrieve a list of articles
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: saved
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isBookmarked
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of articles
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Article'
 */
router.get('/articles', validate(articleQuerySchema, 'query'), ArticleController.getArticles);

/**
 * @swagger
 * /api/v1/articles/{id}:
 *   get:
 *     summary: Get an article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/articles/:id', ArticleController.getArticleById);

/**
 * @swagger
 * /api/v1/articles/{id}/bookmark:
 *   post:
 *     summary: Toggle bookmark status for an article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bookmark status toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/articles/:id/bookmark', ArticleController.toggleBookmark);

/**
 * @swagger
 * /api/v1/articles/bookmarks:
 *   delete:
 *     summary: Clear all bookmarks
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: All bookmarks cleared
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.delete('/articles/bookmarks', ArticleController.clearAllBookmarks);

/**
 * @swagger
 * /api/v1/sources:
 *   get:
 *     summary: Get all article sources
 *     tags: [Sources]
 *     responses:
 *       200:
 *         description: List of sources
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Source'
 */
router.get('/sources', SourceController.getSources);

/**
 * @swagger
 * /api/v1/sources:
 *   post:
 *     summary: Create a new source
 *     tags: [Sources]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - apiUrl
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               apiUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Source created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Source'
 */
router.post('/sources', validate(createSourceSchema, 'body'), SourceController.createSource);

/**
 * @swagger
 * /api/v1/refresh:
 *   post:
 *     summary: Manually trigger article refresh from sources
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Refresh triggered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/refresh', ArticleController.refreshArticles);

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Check system health
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/health', SourceController.checkHealth);

export default router;

