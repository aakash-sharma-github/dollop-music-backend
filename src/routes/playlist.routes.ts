import { Router } from 'express';
import { PlaylistController } from '../controllers/playlist.controller';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Public routes
router.get('/', PlaylistController.getAll);
router.get('/:id', PlaylistController.getOne);

// Protected routes
router.use(protect);

// Create playlist
router.post('/',
  validateRequest({
    body: {
      name: { type: 'string', required: true, min: 1, max: 100 },
      description: { type: 'string', max: 500 },
      coverImage: { type: 'string', match: /^https?:\/\/.+/ },
      isPublic: { type: 'boolean' }
    }
  }),
  PlaylistController.create
);

// Update playlist
router.put('/:id',
  validateRequest({
    body: {
      name: { type: 'string', max: 100 },
      description: { type: 'string', max: 500 },
      coverImage: { type: 'string', match: /^https?:\/\/.+/ },
      isPublic: { type: 'boolean' }
    }
  }),
  PlaylistController.update
);

// Delete playlist
router.delete('/:id', PlaylistController.delete);

// Track management
router.post('/:id/tracks',
  validateRequest({
    body: {
      trackId: { type: 'string', required: true }
    }
  }),
  PlaylistController.addTrack
);

router.delete('/:id/tracks/:trackId', PlaylistController.removeTrack);

// Follow management
router.post('/:id/follow', PlaylistController.toggleFollow);

export const playlistRoutes = router;

