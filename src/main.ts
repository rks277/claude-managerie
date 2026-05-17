#!/usr/bin/env node
import { ManagerieApp } from './tui/app.js';

const app = new ManagerieApp();

process.on('SIGINT', () => {
  void app.stop().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void app.stop().then(() => process.exit(0));
});

await app.start();
