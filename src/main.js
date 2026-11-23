import './styles.css';
import './styles-extra.css';
import { createApp } from './app.js';
import { mountOverlay } from './ui/overlay.js';
import { mountToolbar } from './ui/toolbar.js';
import { mountSidebar } from './ui/sidebar.js';
import { mountInspector } from './ui/inspector.js';
import { mountDialogs } from './ui/dialogs.js';
import { mountTopbar, mountBlender } from './ui/blender.js';

const stage = document.getElementById('stage');
const app = createApp(stage);

mountOverlay(stage);
mountToolbar(stage);
mountSidebar(document.getElementById('left'));
mountInspector(document.getElementById('right'));
mountDialogs();
mountTopbar(document.getElementById('topbar'));
mountBlender(document.getElementById('blender'));

app.boot();

// Handy for debugging in the console.
window.buildAnything = app;
