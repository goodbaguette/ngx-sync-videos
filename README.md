# Synchronized Video Player

A simple Angular library to synchronize multiple video elements with frame-accurate control, a readiness barrier system, and support for custom UI controls.

## Usage

To synchronize multiple videos, bind one `SyncVideoConfig` object to the `syncVideo` directive on each `<video>` element. One video must be designated as the **master**.

### Basic Setup

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

<!-- Global Controls -->
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

The library validates the configuration at runtime before registering the video. It throws a descriptive error when the value is not an object, `id` is missing or blank, `offset` is not a finite number, or `master` is not a boolean. The legacy `syncId`, `syncOffset`, and `isMaster` inputs are not supported.

The video source remains a regular native binding, so `src` does not belong in `SyncVideoConfig`.

> **Important**: Native `controls` must be disabled on all video elements to prevent state conflicts.

## Custom Controls

If you need to build your own control component, interact with the **`VideoService`**.

### Basic Implementation Example

```typescript
import { Component, inject } from '@angular/core';
import { VideoService } from './services/video.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'my-custom-btn',
  template: `
    <button (click)="video.togglePlay()">
      {{ isReady() ? 'Play/Pause' : 'Loading...' }}
    </button>
  `
})
export class CustomButtonComponent {
  protected video = inject(VideoService);
  protected isReady = toSignal(this.video.isReady$);
}
```

For more advanced integrations (seeking, time display, duration), refer to the public members of [VideoService](src/app/services/video.service.ts).

---

## Development

### Build
```bash
npm run build
```

### Test
```bash
npm run test
```
