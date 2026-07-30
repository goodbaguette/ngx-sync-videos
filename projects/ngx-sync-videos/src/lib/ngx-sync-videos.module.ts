import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SyncUiComponent } from './components/sync-ui.component';
import { SyncVideoDirective } from './directives/sync-video.directive';

@NgModule({
  declarations: [
    SyncUiComponent,
    SyncVideoDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    SyncUiComponent,
    SyncVideoDirective
  ]
})
export class NgxSyncVideosModule {}
