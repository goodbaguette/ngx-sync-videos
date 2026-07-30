import { ElementRef } from '@angular/core';
import { SyncVideoConfig } from '../models/sync-video-config';
import { PlaybackState, SyncService } from '../services/sync.service';
import { SyncVideoDirective } from './sync-video.directive';

describe('SyncVideoDirective', () => {
  let service: SyncService;
  let video: HTMLVideoElement;
  let directive: SyncVideoDirective;

  beforeEach(() => {
    service = new SyncService();
    video = document.createElement('video');
    directive = new SyncVideoDirective(new ElementRef(video), service);
    directive.syncVideo = { id: 'master', master: true };
    directive.ngOnInit();
  });

  afterEach(() => {
    directive.ngOnDestroy();
  });

  it('does not turn native media events into new playback intent', () => {
    service.updatePlaybackState(PlaybackState.PLAYING);

    video.dispatchEvent(new Event('pause'));
    video.dispatchEvent(new Event('play'));

    let intent: PlaybackState | undefined;
    service.masterIntent$.subscribe(state => intent = state);

    expect(intent).toBe(PlaybackState.PLAYING);
  });

  it('reapplies an explicit seek within the readiness tolerance', () => {
    const target = 1 / 30;
    const fakeVideo = {
      currentTime: 0.038,
      readyState: 4,
      seeking: false
    } as HTMLVideoElement;
    const applyTarget = (directive as unknown as {
      applyTarget(video: HTMLVideoElement, target: number, force?: boolean): void;
    }).applyTarget.bind(directive);

    applyTarget(fakeVideo, target, true);

    expect(fakeVideo.currentTime).toBe(target);
  });

  it('accepts a slave config with an offset', () => {
    const slaveVideo = document.createElement('video');
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = { id: 'slave', offset: 3.5 };

    expect(() => slaveDirective.ngOnInit()).not.toThrow();

    slaveDirective.ngOnDestroy();
  });

  it('applies defaults for omitted optional config values', () => {
    const defaultVideo = document.createElement('video');
    const defaultDirective = new SyncVideoDirective(new ElementRef(defaultVideo), service);
    defaultDirective.syncVideo = { id: 'default' };

    defaultDirective.ngOnInit();

    expect((defaultDirective as unknown as { syncConfig: Required<SyncVideoConfig> }).syncConfig)
      .toEqual({ id: 'default', offset: 0, master: false });

    defaultDirective.ngOnDestroy();
  });

  [
    {
      config: undefined,
      message: 'expected an object with a non-empty string "id".'
    },
    {
      config: null,
      message: 'expected an object with a non-empty string "id".'
    },
    {
      config: [],
      message: 'expected an object with a non-empty string "id".'
    },
    {
      config: { id: '' },
      message: '"id" must be a non-empty string.'
    },
    {
      config: { id: 1 },
      message: '"id" must be a non-empty string.'
    },
    {
      config: { id: 'video', offset: NaN },
      message: '"offset" must be a finite number.'
    },
    {
      config: { id: 'video', offset: Infinity },
      message: '"offset" must be a finite number.'
    },
    {
      config: { id: 'video', offset: '3.5' },
      message: '"offset" must be a finite number.'
    },
    {
      config: { id: 'video', master: 'yes' },
      message: '"master" must be a boolean.'
    }
  ].forEach(({ config, message }) => {
    it(`rejects invalid config: ${message}`, () => {
      const invalidService = new SyncService();
      const invalidDirective = new SyncVideoDirective(
        new ElementRef(document.createElement('video')),
        invalidService
      );
      const registerPlayer = spyOn(invalidService, 'registerPlayer');
      invalidDirective.syncVideo = config as SyncVideoConfig;

      expect(() => invalidDirective.ngOnInit()).toThrowError(
        `[SyncVideoDirective] Invalid syncVideo config: ${message}`
      );
      expect(registerPlayer).not.toHaveBeenCalled();

      invalidDirective.ngOnDestroy();
    });
  });
});