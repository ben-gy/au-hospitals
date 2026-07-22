// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
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
