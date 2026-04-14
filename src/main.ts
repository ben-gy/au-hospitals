import './styles/main.css';
import { App } from './app.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');

new App(root);
