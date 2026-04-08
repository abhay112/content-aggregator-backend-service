import { Router } from 'express';
import * as ArticleController from '@controllers/article.controller';
import * as SourceController from '@controllers/source.controller';
import { validate } from '@middleware/validate';
import { articleQuerySchema } from '@validators/article.validator';
import { createSourceSchema } from '@validators/source.validator';

const router = Router();

// Article routes
router.get('/articles', validate(articleQuerySchema, 'query'), ArticleController.getArticles);
router.get('/articles/:id', ArticleController.getArticleById);
router.post('/articles/:id/bookmark', ArticleController.toggleBookmark);
router.delete('/articles/bookmarks', ArticleController.clearAllBookmarks);



// Source routes
router.get('/sources', SourceController.getSources);
router.post('/sources', validate(createSourceSchema, 'body'), SourceController.createSource);

// System routes
router.post('/refresh', ArticleController.refreshArticles);
router.get('/health', SourceController.checkHealth);

export default router;
