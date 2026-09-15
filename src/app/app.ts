import { Component } from '@angular/core';
import type { Observable } from 'rxjs';
import { PlaybackState, SyncVideoConfig, VideoService } from 'ngx-sync-videos';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly PlaybackState = PlaybackState;
  protected readonly title = 'poc-sync-video-player';
  protected readonly allReady$: Observable<boolean> = this.videoService.isReady$;
  protected readonly masterTime$: Observable<number> = this.videoService.time$;
  protected allTimes: number[] = [0,0,0];
  protected readonly userPlaybackState$: Observable<PlaybackState> = this.videoService.effectiveState$;
  constructor(private readonly videoService: VideoService) {
    this.masterTime$.subscribe(() => this.refreshAllTimes());
  }

  protected readonly videoUrl = 'https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_5MB.mp4';

  protected videos: Array<SyncVideoConfig & { src: string }> = [
    { id: 'video-fc', src: this.videoUrl, master: true },
    { id: 'video-context-fc', src: this.videoUrl, offset: -1 },
    { id: 'video-rc', src: this.videoUrl, offset: 1 },
  ];

  protected trackByVideoId(_index: number, video: { id: string }): string {
    return video.id;
  }

  protected updateOffset(video: SyncVideoConfig, event: Event): void {
    const input = event.target as HTMLInputElement;
    const offset = input.valueAsNumber;

    if (!Number.isFinite(offset)) {
      input.value = String(video.offset ?? 0);
      return;
    }

    video.offset = offset;
  }

  refreshAllTimes() {
    const videos = Array.from(document.querySelectorAll('video'));
    this.allTimes = videos.map(video => Math.round(video.currentTime * 100) / 100);
  }
}
