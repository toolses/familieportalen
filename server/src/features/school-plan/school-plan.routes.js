import { Router } from 'express';
import { parseSchoolPlan } from './school-plan.service.js';

export const schoolPlanRouter = Router();

schoolPlanRouter.post('/parse', async (req, res) => {
  try {
    const { frontImage, backImage } = req.body;

    if (!frontImage) {
      return res.status(400).json({ error: 'frontImage er påkrevd' });
    }

    const result = await parseSchoolPlan(frontImage, backImage);
    res.json(result);
  } catch (err) {
    console.error('Feil ved parsing av ukeplan:', err);
    res.status(500).json({ error: 'Kunne ikke tolke ukeplanen', details: err.message });
  }
});
