import { Injectable } from '@angular/core';
import { SyncService, PlaybackState } from './sync.service';

/**
 * Public API for building custom UI controls for the video synchronization system.
 * This service abstracts the internal engine logic and provides only what is
 * necessary for UI components (time, status, playback commands).
 */
@Injectable({
  providedIn: 'root'
})
export class VideoService {
  constructor(private readonly syncService: SyncService) {}

  /** Current master time in seconds */
  readonly time$ = this.syncService.masterTime$;

  /** Total duration in seconds */
  readonly duration$ = this.syncService.masterDuration$;

  /** User requested playback state (what the UI should show as active) */
  readonly intent$ = this.syncService.masterIntent$;

  /**
   * Whether all participants are synchronized and ready to play.
   * Can be used to show a "Buffering" or "Loading" indicator.
   */
  readonly isReady$ = this.syncService.allReady$;

  /**
   * The actual playback state of the system.
   * Note: This may be PAUSED even if intent is PLAYING if players are still buffering.
   */
  readonly effectiveState$ = this.syncService.effectiveState$;

  /** Toggles between PLAYING and PAUSED states. */
  togglePlay(): void {
    this.syncService.togglePlay();
  }

  /** Explicitly set playback to PLAYING. */
  play(): void {
    this.syncService.updatePlaybackState(PlaybackState.PLAYING);
  }

  /** Explicitly set playback to PAUSED. */
  pause(): void {
    this.syncService.updatePlaybackState(PlaybackState.PAUSED);
  }

  /**
   * Jump to a specific time.
   * This triggers the "Readiness Barrier" and will pause playback
   * until all players have buffered the new segment.
   */
  seek(time: number): void {
    this.syncService.seek(time);
  }
}
