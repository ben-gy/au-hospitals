// feedback:begin (managed by hub/scripts/feedback/backfill.mjs)
import { mountFeedback } from './feedback';
mountFeedback();
// feedback:end

import './styles/main.css';
import { App } from './app.ts';
import { initTooltip } from './tooltip.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

initTooltip();
new App(root);
