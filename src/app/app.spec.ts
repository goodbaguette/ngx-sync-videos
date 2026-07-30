import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { NgxSyncVideosModule } from 'ngx-sync-videos';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [App],
      imports: [CommonModule, NgxSyncVideosModule]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
