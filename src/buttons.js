import { audio } from './audio.js';

export function initButtons() {
  document.querySelectorAll('.btn-bubble').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      audio.ensureResumed();
      audio.hover();
    });
    btn.addEventListener('click', () => {
      audio.ensureResumed();
      audio.click();
    });
  });
}
