import { Router } from 'express';
import { parseSchoolPlan } from './school-plan.service.js';

export const schoolPlanRouter = Router();

schoolPlanRouter.post('/parse', async (req, res) => {
  try {
    const { frontImage, gridImageTop, gridImageBottom, backImage, weekOverride, yearOverride } = req.body;

    if (!frontImage) {
      return res.status(400).json({ error: 'frontImage er påkrevd' });
    }

    const result = await parseSchoolPlan(frontImage, backImage, { weekOverride, yearOverride, gridImageTop, gridImageBottom });
    res.json(result);
  } catch (err) {
    console.error('Feil ved parsing av ukeplan:', err);
    if (err.rawAiText) {
      console.error('Rå AI-tekst:', err.rawAiText);
    }
    res.status(500).json({
      error: 'Kunne ikke tolke ukeplanen',
      details: err.message,
      rawAiText: err.rawAiText || null,
    });
  }
});
