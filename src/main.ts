#!/usr/bin/env node
import { dispatch } from './cli/index.js';

await dispatch(process.argv);
