import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { schoolPlanRouter } from './features/school-plan/school-plan.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/school-plan', schoolPlanRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
