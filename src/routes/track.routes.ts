import { Router } from 'express';
import { TrackController } from '../controllers/track.controller';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Public routes
router.get('/', TrackController.getAll);
router.get('/:id', TrackController.getOne);
router.post('/:id/play', TrackController.incrementPlayCount);

// Protected routes
router.use(protect);

router.post('/',
  validateRequest({
    body: {
      title: { type: 'string', required: true, min: 1, max: 100 },
      artist: { type: 'string', required: true, min: 1, max: 100 },
      duration: { type: 'number', required: true, min: 0 },
      fileUrl: { type: 'string', required: true, match: /^https?:\/\/.+/ },
      coverArt: { type: 'string', match: /^https?:\/\/.+/ },
      genre: { type: 'string', max: 50 },
      tags: { type: 'array', max: 10 },
      isPublic: { type: 'boolean' }
    }
  }),
  TrackController.create
);

router.put('/:id',
  validateRequest({
    body: {
      title: { type: 'string', max: 100 },
      artist: { type: 'string', max: 100 },
      duration: { type: 'number', min: 0 },
      fileUrl: { type: 'string', match: /^https?:\/\/.+/ },
      coverArt: { type: 'string', match: /^https?:\/\/.+/ },
      genre: { type: 'string', max: 50 },
      tags: { type: 'array', max: 10 },
      isPublic: { type: 'boolean' }
    }
  }),
  TrackController.update
);

router.delete('/:id', TrackController.delete);

export const trackRoutes = router;

