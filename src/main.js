import './styles.css';
import { createApp } from './app.js';
import { mountOverlay } from './ui/overlay.js';
import { mountToolbar } from './ui/toolbar.js';
import { mountSidebar } from './ui/sidebar.js';
import { mountInspector } from './ui/inspector.js';
import { mountDialogs } from './ui/dialogs.js';

const stage = document.getElementById('stage');
const app = createApp(stage);

mountOverlay(stage);
mountToolbar(stage);
mountSidebar(document.getElementById('left'));
mountInspector(document.getElementById('right'));
mountDialogs();

app.boot();

// Handy for debugging in the console.
window.buildAnything = app;
