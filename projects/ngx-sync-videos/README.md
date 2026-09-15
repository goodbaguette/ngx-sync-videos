# ngx-sync-videos

Angular library for synchronizing multiple video elements with frame-accurate control, readiness barriers, and custom UI controls.

## Installation

```bash
npm install ngx-sync-videos
```

Import `NgxSyncVideosModule` into the Angular module that declares the synchronized videos:

```typescript
import { NgxSyncVideosModule } from 'ngx-sync-videos';

@NgModule({
	imports: [NgxSyncVideosModule]
})
export class AppModule {}
```

## Usage

Bind one `SyncVideoConfig` object to the `syncVideo` directive on each `<video>` element. One video must be designated as the **master**.

```html
<!-- Master video -->
<video
	[syncVideo]="masterVideo"
	src="master-video.mp4">
</video>

<!-- Slave video with a 3.2 second offset -->
<video
	[syncVideo]="sideVideo"
	src="slave-video.mp4">
</video>

<!-- Optional default controls -->
<sync-ui></sync-ui>
```

```typescript
import { SyncVideoConfig } from 'ngx-sync-videos';

masterVideo: SyncVideoConfig = {
	id: 'main-view',
	master: true
};

sideVideo: SyncVideoConfig = {
	id: 'side-view',
	offset: 3.2
};
```

## Directive API (`[syncVideo]`)

The directive accepts one synchronization configuration object:

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | **Required.** A unique identifier for the player. |
| `master` | `boolean` | Designates the primary video that drives the global timeline. Defaults to `false`. |
| `offset` | `number` | Time offset in seconds relative to the master timeline. Defaults to `0`. |

The library validates the configuration at runtime before registering the video. The video source remains a regular native binding, so `src` does not belong in `SyncVideoConfig`.

The directive also reconciles runtime configuration changes, whether the bound object is replaced or its properties are mutated. Offset changes are applied on the next synchronization update. ID changes update player registration, and master-role changes rebuild the synchronization logic and readiness state.

Native `controls` should be disabled on all synchronized videos to prevent state conflicts:

```html
<video [syncVideo]="masterVideo" src="master-video.mp4" controls="false"></video>
```

## Custom Controls

Build custom controls with the public `VideoService` API:

```typescript
import { Component, inject } from '@angular/core';
import { VideoService } from 'ngx-sync-videos';

@Component({
	selector: 'my-custom-btn',
	template: `
		<button (click)="video.togglePlay()">
			Play/Pause
		</button>
	`
})
export class CustomButtonComponent {
	protected video = inject(VideoService);
}
```

`VideoService` also exposes observables and commands for readiness, playback state, seeking, current time, and duration.
