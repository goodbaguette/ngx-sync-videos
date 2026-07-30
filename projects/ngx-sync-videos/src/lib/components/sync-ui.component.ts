import { Component } from '@angular/core';
import { PlaybackState } from '../services/sync.service';
import { VideoService } from '../services/video.service';
import type { Observable } from 'rxjs';

@Component({
  selector: 'sync-ui',
  template: `
    <div class="controls-container">
      <div class="main-controls">
        <button (click)="togglePlay()" class="control-button">
          <ng-container *ngIf="(isAllReady$ | async) || (intent$ | async) === PlaybackState.PAUSED; else loading">
            {{ (intent$ | async) === PlaybackState.PLAYING ? 'Pause' : 'Play' }}
          </ng-container>
          <ng-template #loading>Loading...</ng-template>
        </button>

        <div class="time-display">
          <span>{{ currentTime$ | async | number:'1.1-1' }}</span> /
          <span>{{ duration$ | async | number:'1.1-1' }}</span>
        </div>

        <input
          type="range"
          [min]="0"
          [max]="(duration$ | async) || 0"
          [step]="0.1"
          [value]="(currentTime$ | async) || 0"
          (input)="onSeek($event)"
          class="seek-bar"
        >
      </div>

      <button (click)="nextFrame(currentTime)" class="control-button">
          +1f
      </button>
      <button (click)="prevFrame(currentTime)" class="control-button">
          -1f
      </button>

      <div class="status-indicator">
        <span *ngIf="!(isAllReady$ | async)" class="buffering-badge">Buffering players...</span>
      </div>
    </div>
  `,
  styles: [`
    .controls-container {
      background: #222;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      font-family: sans-serif;
    }
    .main-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .control-button {
      padding: 0.5rem 1rem;
      min-width: 80px;
      cursor: pointer;
      background: #444;
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
    }
    .control-button:hover {
      background: #555;
    }
    .seek-bar {
      flex-grow: 1;
      cursor: pointer;
    }
    .time-display {
      font-variant-numeric: tabular-nums;
      min-width: 100px;
    }
    .status-indicator {
      margin-top: 0.5rem;
      font-size: 0.8rem;
    }
    .buffering-badge {
      color: #ffca28;
      font-weight: bold;
    }
  `]
})
export class SyncUiComponent {  
  readonly PlaybackState = PlaybackState;

  readonly intent$: Observable<PlaybackState> = this.videoService.intent$;
  readonly currentTime$: Observable<number> = this.videoService.time$;
  readonly duration$: Observable<number> = this.videoService.duration$;
  readonly isAllReady$: Observable<boolean> = this.videoService.isReady$;
  
  currentTime: number = 0;

  constructor(private readonly videoService: VideoService) {
    this.currentTime$.subscribe(time => {
      this.currentTime = time;
    });
  }

  togglePlay(): void {
    this.videoService.togglePlay();
  }

  onSeek(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.videoService.seek(value);
  }

  nextFrame(currentTime: number): void {
    const newTime = currentTime + (1 / 30); // Assuming 30 FPS
    this.videoService.seek(newTime);
  }

  prevFrame(currentTime: number): void {
    const newTime = Math.max(0, currentTime - (1 / 30)); // Assuming 30 FPS
    this.videoService.seek(newTime);
  }
}
