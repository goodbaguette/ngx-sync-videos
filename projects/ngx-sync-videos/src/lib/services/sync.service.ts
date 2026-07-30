import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

export enum PlaybackState {
  PLAYING,
  PAUSED
}

export interface SeekRequest {
  revision: number;
  time: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private masterTimeSource = new BehaviorSubject<number>(0);
  private masterIntentSource = new BehaviorSubject<PlaybackState>(PlaybackState.PAUSED);
  private masterDurationSource = new BehaviorSubject<number>(0);
  private playersReadyState = new Map<string, BehaviorSubject<boolean>>();
  private registrationChange = new BehaviorSubject<void>(undefined);
  private seekRequestSource = new Subject<SeekRequest>();
  private seekRevision = 0;
  private activeSeek: SeekRequest | null = null;
  private confirmedMasterSeekRevision: number | null = null;

  private readonly timeTolerance = 1 / 31; // Less than 1 frame at 30 FPS
  private readonly readinessTolerance = 1 / 20; // 50 ms.

  public masterTime$ = this.masterTimeSource.asObservable().pipe(distinctUntilChanged());
  public masterIntent$ = this.masterIntentSource.asObservable().pipe(distinctUntilChanged());
  public masterDuration$ = this.masterDurationSource.asObservable().pipe(distinctUntilChanged());
  public seekRequest$ = this.seekRequestSource.asObservable();

  public allReady$: Observable<boolean> = this.registrationChange.pipe(
    map(() => Array.from(this.playersReadyState.values())),
    switchMap(subjects => subjects.length > 0 ? combineLatest(subjects) : [[]]),
    map(readiness => {
      const allReady = readiness.length === 0 || readiness.every(ready => ready);
      return allReady;
    }),
    distinctUntilChanged(),
    shareReplay(1)
  );

  public effectiveState$ = combineLatest([
    this.masterIntentSource.asObservable(),
    this.allReady$
  ]).pipe(
    map(([intent, allReady]) => allReady ? intent : PlaybackState.PAUSED),
    distinctUntilChanged(),
    shareReplay(1)
  );

  registerPlayer(id: string): void {
    if (!this.playersReadyState.has(id)) {
      this.playersReadyState.set(id, new BehaviorSubject<boolean>(false));
      this.registrationChange.next();
    }
  }

  unregisterPlayer(id: string): void {
    if (this.playersReadyState.has(id)) {
      this.playersReadyState.delete(id);
      this.registrationChange.next();
      this.completeSeekIfReady();
    }
  }

  updateReadyState(id: string, isReady: boolean): void {
    const subject = this.playersReadyState.get(id);
    if (subject && subject.value !== isReady) {
      subject.next(isReady);
    }
    this.completeSeekIfReady();
  }

  resetReadiness(): void {
    this.playersReadyState.forEach(subject => subject.next(false));
  }

  updateMasterTime(time: number): void {
    if (this.activeSeek) return;
    this.masterTimeSource.next(time);
  }

  updateMasterDuration(duration: number): void {
    if (this.masterDurationSource.value !== duration) {
      this.masterDurationSource.next(duration);
    }
  }

  updatePlaybackState(state: PlaybackState): void {
    if (state === PlaybackState.PLAYING && this.masterIntentSource.value === PlaybackState.PAUSED) {
      this.masterTimeSource.next(this.masterTimeSource.value);
    }
    this.masterIntentSource.next(state);
  }

  togglePlay(): void {
    const nextState = this.masterIntentSource.value === PlaybackState.PLAYING
      ? PlaybackState.PAUSED
      : PlaybackState.PLAYING;
    this.updatePlaybackState(nextState);
  }

  seek(time: number): void {
    const request: SeekRequest = {
      revision: ++this.seekRevision,
      time
    };

    this.activeSeek = request;
    this.confirmedMasterSeekRevision = null;
    this.resetReadiness();
    this.seekRequestSource.next(request);
    this.masterTimeSource.next(time);
  }

  getActiveSeek(): SeekRequest | null {
    return this.activeSeek;
  }

  confirmMasterSeek(revision: number, time: number): void {
    if (!this.activeSeek || this.activeSeek.revision !== revision || !this.isReadyAtTarget(time, this.activeSeek.time)) {
      return;
    }

    this.confirmedMasterSeekRevision = revision;
    this.completeSeekIfReady();
  }

  isAtTarget(time: number, target: number): boolean {
    return Math.abs(time - target) <= this.timeTolerance;
  }

  isReadyAtTarget(time: number, target: number): boolean {
    return Math.abs(time - target) <= this.readinessTolerance;
  }

  private completeSeekIfReady(): void {
    if (!this.activeSeek || this.confirmedMasterSeekRevision !== this.activeSeek.revision) {
      return;
    }

    const allReady = Array.from(this.playersReadyState.values()).every(subject => subject.value);
    if (allReady) {
      this.activeSeek = null;
      this.confirmedMasterSeekRevision = null;
    }
  }
}
