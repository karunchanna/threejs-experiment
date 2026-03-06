/**
 * Screen Manager
 *
 * Manages title, loading, and completion screen transitions.
 */

export class ScreenManager {
  private titleScreen: HTMLElement;
  private loadingScreen: HTMLElement;
  private completionScreen: HTMLElement;
  private loadingBar: HTMLElement;
  private loadingStatus: HTMLElement;

  constructor() {
    this.titleScreen = document.getElementById('title-screen')!;
    this.loadingScreen = document.getElementById('loading-screen')!;
    this.completionScreen = document.getElementById('completion-screen')!;
    this.loadingBar = document.getElementById('loading-bar')!;
    this.loadingStatus = document.getElementById('loading-status')!;
  }

  /** Show loading screen, hide title */
  showLoading(): void {
    this.titleScreen.classList.add('hidden');
    this.loadingScreen.classList.add('active');
    this.updateLoading(0, 'Initializing...');
  }

  /** Update loading progress */
  updateLoading(progress: number, status: string): void {
    this.loadingBar.style.width = `${Math.round(progress * 100)}%`;
    this.loadingStatus.textContent = status;
  }

  /** Hide loading screen */
  hideLoading(): void {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      this.loadingScreen.classList.remove('active');
    }, 1000);
  }

  /** Hide title screen */
  hideTitle(): void {
    this.titleScreen.classList.add('hidden');
  }

  /** Show completion screen */
  showCompletion(): void {
    this.completionScreen.classList.add('active');
  }

  /** Hide completion screen */
  hideCompletion(): void {
    this.completionScreen.classList.remove('active');
  }

  /** Reset all screens to initial state */
  reset(): void {
    this.titleScreen.classList.remove('hidden');
    this.loadingScreen.classList.remove('active', 'hidden');
    this.completionScreen.classList.remove('active');
    this.loadingBar.style.width = '0%';
  }
}
