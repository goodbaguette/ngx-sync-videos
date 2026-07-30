import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { fromEvent, merge, Subject } from 'rxjs';
import { distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import { SyncVideoConfig } from '../models/sync-video-config';
import { PlaybackState, SyncService } from '../services/sync.service';

@Directive({
  selector: 'video[syncVideo]'
})
export class SyncVideoDirective implements OnInit, OnDestroy {
  @Input() syncVideo!: SyncVideoConfig;

  constructor(
    private readonly el: ElementRef<HTMLVideoElement>,
    private readonly syncService: SyncService
  ) {}

  private destroy$ = new Subject<void>();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private syncConfig!: Required<SyncVideoConfig>;

  ngOnInit(): void {
    this.syncConfig = this.validateConfig(this.syncVideo);
    const video = this.el.nativeElement;

    if (video.hasAttribute('controls')) {
      console.error(
        `[SyncVideoDirective] Native 'controls' attribute detected on video element. 
        Native controls must be disabled when using synchronization to ensure unidirectional state flow.
        Please remove the 'controls' attribute and use a custom controls component.`
      );
    }

    this.syncService.registerPlayer(this.syncConfig.id);

    merge(
      fromEvent(video, 'waiting'),
      fromEvent(video, 'seeking'),
      fromEvent(video, 'stalled'),
      fromEvent(video, 'loadstart'),
      fromEvent(video, 'error')
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncService.updateReadyState(this.syncConfig.id, false);
    });

    merge(
      fromEvent(video, 'canplay'),
      fromEvent(video, 'canplaythrough'),
      fromEvent(video, 'playing'),
      fromEvent(video, 'seeked'),
      fromEvent(video, 'timeupdate').pipe(filter(() => video.readyState >= 3))
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkReady(video));

    this.pollingInterval = setInterval(() => this.checkReady(video), 500);
    this.checkReady(video);

    if (this.syncConfig.master) {
      this.setupMasterLogic(video);
    } else {
      this.setupSlaveLogic(video);
    }
  }

  private validateConfig(config: unknown): Required<SyncVideoConfig> {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new Error(
        '[SyncVideoDirective] Invalid syncVideo config: expected an object with a non-empty string "id".'
      );
    }

    const candidate = config as Partial<SyncVideoConfig>;

    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
      throw new Error('[SyncVideoDirective] Invalid syncVideo config: "id" must be a non-empty string.');
    }

    if (candidate.offset !== undefined &&
      (typeof candidate.offset !== 'number' || !Number.isFinite(candidate.offset))) {
      throw new Error('[SyncVideoDirective] Invalid syncVideo config: "offset" must be a finite number.');
    }

    if (candidate.master !== undefined && typeof candidate.master !== 'boolean') {
      throw new Error('[SyncVideoDirective] Invalid syncVideo config: "master" must be a boolean.');
    }

    return {
      id: candidate.id,
      offset: candidate.offset ?? 0,
      master: candidate.master ?? false
    };
  }

  private setupMasterLogic(video: HTMLVideoElement): void {
    this.syncService.masterTime$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(time => {
      this.applyTarget(video, time);
    });

    this.syncService.seekRequest$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(request => {
      this.applyTarget(video, request.time, true);
    });

    if (video.duration) {
      this.syncService.updateMasterDuration(video.duration);
    }

    fromEvent(video, 'durationchange').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncService.updateMasterDuration(video.duration);
    });

    this.syncService.effectiveState$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(state => {
      if (state === PlaybackState.PLAYING && video.paused) {
        video.play().catch(err => console.warn('[SyncMaster] Play failed', err));
      } else if (state === PlaybackState.PAUSED && !video.paused) {
        video.pause();
      }
    });

    fromEvent(video, 'timeupdate').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!video.seeking) {
        this.syncService.updateMasterTime(video.currentTime);
      }
    });

    fromEvent(video, 'seeking').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncService.resetReadiness();
    });

    fromEvent(video, 'seeked').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkReady(video));
  }

  private setupSlaveLogic(video: HTMLVideoElement): void {
    this.syncService.masterTime$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(masterTime => {
      this.applyTarget(video, masterTime + this.syncConfig.offset);
    });

    this.syncService.seekRequest$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(request => {
      this.applyTarget(video, request.time + this.syncConfig.offset, true);
    });

    this.syncService.effectiveState$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(state => {
      if (state === PlaybackState.PLAYING && video.paused) {
        video.play().catch(() => {});
      } else if (state === PlaybackState.PAUSED && !video.paused) {
        video.pause();
      }
    });

    merge(
      fromEvent(video, 'waiting'),
      fromEvent(video, 'seeking'),
      fromEvent(video, 'stalled'),
      fromEvent(video, 'loadstart')
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.syncService.updateReadyState(this.syncConfig.id, false);
    });

    merge(
      fromEvent(video, 'canplay'),
      fromEvent(video, 'canplaythrough'),
      fromEvent(video, 'playing'),
      fromEvent(video, 'seeked')
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkReady(video));
  }

  private checkReady(video: HTMLVideoElement): void {
    const activeSeek = this.syncService.getActiveSeek();
    const target = activeSeek ? activeSeek.time + (this.syncConfig.master ? 0 : this.syncConfig.offset) : null;
    const isReady = video.readyState >= 3 &&
      !video.seeking &&
      (target === null || this.syncService.isReadyAtTarget(video.currentTime, target));

    this.syncService.updateReadyState(this.syncConfig.id, isReady);

    if (this.syncConfig.master && activeSeek && isReady) {
      this.syncService.confirmMasterSeek(activeSeek.revision, video.currentTime);
    }
  }

  private applyTarget(video: HTMLVideoElement, target: number, force = false): void {
    if (force || !this.syncService.isAtTarget(video.currentTime, target)) {
      video.currentTime = target;
      this.syncService.updateReadyState(this.syncConfig.id, false);
      return;
    }

    this.checkReady(video);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.syncConfig) {
      this.syncService.unregisterPlayer(this.syncConfig.id);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
