import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

// Public routes
router.post('/register',
  validateRequest({
    body: {
      username: { type: 'string', required: true, min: 3, max: 30 },
      email: { type: 'string', required: true, email: true },
      password: { type: 'string', required: true, min: 6 }
    }
  }),
  AuthController.register
);

router.post('/login',
  validateRequest({
    body: {
      email: { type: 'string', required: true, email: true },
      password: { type: 'string', required: true }
    }
  }),
  AuthController.login
);

router.post('/refresh-token',
  validateRequest({
    body: {
      refreshToken: { type: 'string', required: true }
    }
  }),
  AuthController.refreshToken
);

// Protected routes
router.use(protect);

router.get('/me', AuthController.getCurrentUser);
router.post('/logout', AuthController.logout);

export const authRoutes = router;

