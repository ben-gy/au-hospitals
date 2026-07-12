import './styles/main.css';
import { App } from './app.ts';
import { initTooltip } from './tooltip.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

initTooltip();
new App(root);
