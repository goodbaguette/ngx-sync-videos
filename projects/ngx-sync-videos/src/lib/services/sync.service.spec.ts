import { PlaybackState, SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;
  let effectiveStates: PlaybackState[];
  let intents: PlaybackState[];

  beforeEach(() => {
    service = new SyncService();
    effectiveStates = [];
    intents = [];
    service.effectiveState$.subscribe(state => effectiveStates.push(state));
    service.masterIntent$.subscribe(state => intents.push(state));
    service.registerPlayer('master');
    service.registerPlayer('slave');
    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);
    service.updatePlaybackState(PlaybackState.PLAYING);
  });

  it('preserves playing intent while a seek waits for the readiness barrier', () => {
    service.seek(10);

    expect(service.getActiveSeek()).toEqual({ revision: 1, time: 10 });
    expect(intents[intents.length - 1]).toBe(PlaybackState.PLAYING);
    expect(effectiveStates[effectiveStates.length - 1]).toBe(PlaybackState.PAUSED);
  });

  it('lets the newest seek supersede an older seek', () => {
    const times: number[] = [];
    service.masterTime$.subscribe(time => times.push(time));

    service.seek(10);
    service.seek(20);
    service.updateMasterTime(12);

    expect(service.getActiveSeek()).toEqual({ revision: 2, time: 20 });
    expect(times).toEqual([0, 10, 20]);
  });

  it('ignores a stale seek confirmation', () => {
    service.seek(10);
    service.seek(20);

    service.confirmMasterSeek(1, 10);

    expect(service.getActiveSeek()).toEqual({ revision: 2, time: 20 });
  });

  it('completes the current seek only after the master and all players are ready', () => {
    service.seek(10);
    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);

    service.confirmMasterSeek(1, 10);

    expect(service.getActiveSeek()).toBeNull();
    expect(effectiveStates[effectiveStates.length - 1]).toBe(PlaybackState.PLAYING);
  });

  it('accepts the first decoded frame when seeking to zero', () => {
    service.seek(0);
    service.updateReadyState('master', true);
    service.updateReadyState('slave', true);

    service.confirmMasterSeek(1, 0.038);

    expect(service.isAtTarget(0.038, 0)).toBeFalse();
    expect(service.isReadyAtTarget(0.038, 0)).toBeTrue();
    expect(service.getActiveSeek()).toBeNull();
  });

  it('clamps finite seeks to the master timeline bounds', () => {
    service.updateMasterDuration(10);

    service.seek(-5);
    expect(service.getActiveSeek()).toEqual({ revision: 1, time: 0 });

    service.seek(20);
    expect(service.getActiveSeek()).toEqual({ revision: 2, time: 10 });
  });

  it('keeps the upper bound open until the master duration is known', () => {
    service.seek(20);

    expect(service.getActiveSeek()).toEqual({ revision: 1, time: 20 });
  });

  it('ignores invalid seek values and warns', () => {
    const warning = spyOn(console, 'warn');

    service.seek(NaN);
    service.seek(Infinity);
    service.seek('10' as unknown as number);

    expect(warning).toHaveBeenCalledTimes(3);
    expect(service.getActiveSeek()).toBeNull();
  });

  it('confirms a seek against an effective target when duration metadata arrives late', () => {
    service.seek(20);

    service.confirmMasterSeek(1, 10, 10);

    expect(service.getActiveSeek()).toEqual({ revision: 1, time: 10 });
  });
});