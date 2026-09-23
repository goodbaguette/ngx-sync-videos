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

  it('clamps a target to the local video duration', () => {
    const fakeVideo = {
      currentTime: 5,
      duration: 10,
      readyState: 4,
      seeking: false
    } as HTMLVideoElement;
    const applyTarget = (directive as unknown as {
      applyTarget(video: HTMLVideoElement, target: number, force?: boolean): void;
    }).applyTarget.bind(directive);

    applyTarget(fakeVideo, -5, true);
    expect(fakeVideo.currentTime).toBe(0);

    applyTarget(fakeVideo, 20, true);
    expect(fakeVideo.currentTime).toBe(10);
  });

  it('clamps an offset slave target to the slave duration', () => {
    const slaveVideo = document.createElement('video');
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = { id: 'slave', offset: 3.5 };
    slaveDirective.ngOnInit();

    const fakeVideo = {
      currentTime: 0,
      duration: 10,
      readyState: 4,
      seeking: false
    } as HTMLVideoElement;
    const applyTarget = (slaveDirective as unknown as {
      applyTarget(video: HTMLVideoElement, target: number, force?: boolean): void;
    }).applyTarget.bind(slaveDirective);

    applyTarget(fakeVideo, 8 + 3.5, true);

    expect(fakeVideo.currentTime).toBe(10);
    slaveDirective.ngOnDestroy();
  });

  it('confirms a master seek using its locally bounded target', () => {
    const fakeVideo = {
      currentTime: 10,
      duration: 10,
      readyState: 4,
      seeking: false
    } as HTMLVideoElement;
    service.seek(20);

    const checkReady = (directive as unknown as {
      checkReady(video: HTMLVideoElement): void;
    }).checkReady.bind(directive);
    const confirmMasterSeek = spyOn(service, 'confirmMasterSeek').and.callThrough();

    checkReady(fakeVideo);

    expect(confirmMasterSeek).toHaveBeenCalledWith(1, 10, 10);
    expect(service.getActiveSeek()).toEqual({ revision: 1, time: 10 });
  });

  it('waits for a negative-offset slave to reach its playable start', () => {
    Object.defineProperty(video, 'readyState', { value: 4 });
    const slaveVideo = document.createElement('video');
    Object.defineProperty(slaveVideo, 'readyState', { value: 4 });
    const play = spyOn(slaveVideo, 'play').and.returnValue(Promise.resolve());
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = { id: 'slave', offset: -3 };
    slaveDirective.ngOnInit();

    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);
    service.updatePlaybackState(PlaybackState.PLAYING);

    expect(play).not.toHaveBeenCalled();

    service.updateMasterTime(2);
    service.updateReadyState('master', true);
    expect(play).not.toHaveBeenCalled();

    service.updateMasterTime(3);
    service.updateReadyState('master', true);
    expect(play).toHaveBeenCalledTimes(1);

    slaveDirective.ngOnDestroy();
  });

  it('keeps an ended slave paused while the master continues', () => {
    Object.defineProperty(video, 'readyState', { value: 4 });
    const slaveVideo = document.createElement('video');
    Object.defineProperties(slaveVideo, {
      readyState: { value: 4 },
      duration: { value: 10 },
      ended: { value: true }
    });
    const play = spyOn(slaveVideo, 'play').and.returnValue(Promise.resolve());
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = { id: 'slave' };
    slaveDirective.ngOnInit();

    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);
    service.updatePlaybackState(PlaybackState.PLAYING);
    service.updateMasterTime(5);

    expect(play).not.toHaveBeenCalled();

    slaveDirective.ngOnDestroy();
  });

  it('removes a failed slave from the readiness barrier', () => {
    const slaveVideo = document.createElement('video');
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = { id: 'slave' };
    slaveDirective.ngOnInit();

    let allReady = false;
    const effectiveStates: PlaybackState[] = [];
    service.allReady$.subscribe(isReady => allReady = isReady);
    service.effectiveState$.subscribe(state => effectiveStates.push(state));
    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);
    expect(allReady).toBeTrue();

    slaveVideo.dispatchEvent(new Event('error'));

    expect(allReady).toBeTrue();
    service.updatePlaybackState(PlaybackState.PLAYING);
    expect(effectiveStates[effectiveStates.length - 1]).toBe(PlaybackState.PLAYING);

    slaveDirective.ngOnDestroy();
  });

  it('keeps a failed master in the readiness barrier', () => {
    service.updateReadyState('master', true);

    let allReady = false;
    service.allReady$.subscribe(isReady => allReady = isReady);
    expect(allReady).toBeTrue();

    video.dispatchEvent(new Event('error'));

    expect(allReady).toBeFalse();
  });

  it('recovers a failed slave with its latest runtime config', () => {
    const slaveVideo = document.createElement('video');
    Object.defineProperty(slaveVideo, 'readyState', { value: 4 });
    const config: SyncVideoConfig = { id: 'slave', offset: 1 };
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    const registerPlayer = spyOn(service, 'registerPlayer').and.callThrough();
    slaveDirective.syncVideo = config;
    slaveDirective.ngOnInit();

    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);
    slaveVideo.dispatchEvent(new Event('error'));

    config.id = 'recovered-slave';
    config.offset = 2;
    slaveDirective.ngDoCheck();
    slaveVideo.dispatchEvent(new Event('canplay'));

    service.updateReadyState('recovered-slave', true);
    expect(registerPlayer).toHaveBeenCalledWith('recovered-slave');
    expect((slaveDirective as unknown as {
      syncConfig: Required<SyncVideoConfig>;
    }).syncConfig).toEqual({ id: 'recovered-slave', offset: 2, master: false });
    expect(service.getActiveSeek()).toBeNull();

    slaveDirective.ngOnDestroy();
  });

  it('accepts a slave config with an offset', () => {
    const slaveVideo = document.createElement('video');
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = { id: 'slave', offset: 3.5 };

    expect(() => slaveDirective.ngOnInit()).not.toThrow();

    slaveDirective.ngOnDestroy();
  });

  it('applies an offset mutation on the next master-time update', () => {
    const slaveVideo = document.createElement('video');
    const config: SyncVideoConfig = { id: 'slave', offset: 1 };
    const slaveDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    slaveDirective.syncVideo = config;
    slaveDirective.ngOnInit();

    service.updateMasterTime(5);
    expect(slaveVideo.currentTime).toBe(6);

    config.offset = 2;
    slaveDirective.ngDoCheck();
    expect(slaveVideo.currentTime).toBe(6);

    service.updateMasterTime(6);
    expect(slaveVideo.currentTime).toBe(8);

    slaveDirective.ngOnDestroy();
  });

  it('re-registers a player when its id is replaced', () => {
    const slaveDirective = new SyncVideoDirective(
      new ElementRef(document.createElement('video')),
      service
    );
    const unregisterPlayer = spyOn(service, 'unregisterPlayer').and.callThrough();
    const registerPlayer = spyOn(service, 'registerPlayer').and.callThrough();
    slaveDirective.syncVideo = { id: 'slave' };
    slaveDirective.ngOnInit();

    slaveDirective.syncVideo = { id: 'renamed-slave' };
    slaveDirective.ngDoCheck();

    expect(unregisterPlayer).toHaveBeenCalledWith('slave');
    expect(registerPlayer).toHaveBeenCalledWith('renamed-slave');

    slaveDirective.ngOnDestroy();
  });

  it('rewires synchronization when the master role changes', () => {
    const slaveVideo = document.createElement('video');
    const config: SyncVideoConfig = { id: 'candidate', offset: 2 };
    const candidateDirective = new SyncVideoDirective(new ElementRef(slaveVideo), service);
    candidateDirective.syncVideo = config;
    candidateDirective.ngOnInit();

    service.updateMasterTime(4);
    expect(slaveVideo.currentTime).toBe(6);

    config.master = true;
    config.offset = 0;
    candidateDirective.ngDoCheck();
    service.updateMasterTime(5);

    expect(slaveVideo.currentTime).toBe(5);

    candidateDirective.ngOnDestroy();
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