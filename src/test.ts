import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

declare const require: {
  context(path: string, recursive: boolean, pattern: RegExp): {
    keys(): string[];
    <T>(id: string): T;
  };
};

const context = require.context('./', true, /\.spec\.ts$/);
context.keys().map(context);
