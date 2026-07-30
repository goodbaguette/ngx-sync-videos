import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { App } from './app';
import { NgxSyncVideosModule } from 'ngx-sync-videos';

@NgModule({
  declarations: [
    App
  ],
  imports: [
    BrowserModule,
    NgxSyncVideosModule
  ],
  bootstrap: [App]
})
export class AppModule {}
