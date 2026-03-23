// TODO: evaluate for packages/lib migration
export function countUp(el: HTMLElement, target: number, duration = 1200) {
  const start = performance.now();
  const update = (time: number) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
