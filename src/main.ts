import { mount } from 'svelte';
import App from './App.svelte';

// Apply theme before rendering to prevent flash
const theme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
