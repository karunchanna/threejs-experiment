/**
 * HUD Manager
 *
 * Manages all UI overlay elements: objectives, compass, notifications,
 * interact prompts, beacon count, and mode labels.
 */

import type { BeaconDef } from '../game/beacon-system';

export class HUDManager {
  private objectiveList: HTMLElement;
  private beaconCount: HTMLElement;
  private interactPrompt: HTMLElement;
  private notification: HTMLElement;
  private compass: HTMLElement;
  private modeLabel: HTMLElement;
  private playersLabel: HTMLElement;
  private hud: HTMLElement;

  private notificationTimeout: number | null = null;

  constructor() {
    this.objectiveList = document.getElementById('objective-list')!;
    this.beaconCount = document.getElementById('beacon-count')!;
    this.interactPrompt = document.getElementById('interact-prompt')!;
    this.notification = document.getElementById('notification')!;
    this.compass = document.getElementById('compass')!;
    this.modeLabel = document.getElementById('mode-label')!;
    this.playersLabel = document.getElementById('players-label')!;
    this.hud = document.getElementById('hud')!;

    this.setupCompass();
  }

  show(): void {
    this.hud.classList.add('active');
  }

  hide(): void {
    this.hud.classList.remove('active');
  }

  /** Initialize objective list from beacon definitions */
  initObjectives(beacons: BeaconDef[]): void {
    this.objectiveList.innerHTML = '';
    for (const beacon of beacons) {
      const div = document.createElement('div');
      div.className = 'objective';
      div.id = `obj-${beacon.id}`;
      div.innerHTML = `<span class="dot"></span><span>${beacon.name}</span>`;
      this.objectiveList.appendChild(div);
    }
  }

  /** Mark a beacon as completed in the objective list */
  completeObjective(beacon: BeaconDef): void {
    const el = document.getElementById(`obj-${beacon.id}`);
    if (el) el.classList.add('completed');
  }

  /** Update beacon count display */
  updateBeaconCount(activated: number, total: number): void {
    this.beaconCount.textContent = `${activated}/${total}`;
  }

  /** Show/hide the interact prompt */
  showInteractPrompt(show: boolean, text?: string): void {
    if (text) this.interactPrompt.textContent = text;
    this.interactPrompt.classList.toggle('visible', show);
  }

  /** Show a timed notification */
  showNotification(text: string, durationMs = 3000): void {
    this.notification.textContent = text;
    this.notification.classList.add('visible');

    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.notificationTimeout = window.setTimeout(() => {
      this.notification.classList.remove('visible');
    }, durationMs);
  }

  /** Update compass based on player facing angle */
  updateCompass(angle: number): void {
    const dirs = this.compass.querySelectorAll('.dir');
    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const normalized = ((angle * 180 / Math.PI) % 360 + 360) % 360;
    const index = Math.round(normalized / 45) % 8;

    dirs.forEach((dir, i) => {
      dir.classList.toggle('active', i === index);
    });
  }

  /** Update mode label */
  setMode(mode: string): void {
    this.modeLabel.textContent = mode;
  }

  /** Update players display */
  setPlayerCount(count: number): void {
    this.playersLabel.textContent = count > 1 ? `${count} Explorers Online` : '';
  }

  private setupCompass(): void {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    this.compass.innerHTML = dirs.map(d =>
      `<span class="dir">${d}</span>`
    ).join('');
  }
}
