(function () {
  'use strict';

  // CONFIG
  const MIN_REM = 1.0;      // smallest allowed
  const MAX_REM = 1.4;      // largest allowed
  const START_REM = 1.2;    // your current base in .poem-container
  const STEP = 0.02;        // font-size adjustment step
  const SMALL_OVERFLOW_RATIO = 1.08; // <= 8% overflow => shrink to fit one page
  const PADDING_SAFETY = 6; // px margin to avoid last-line clipping

  function select(el, sel) { return el ? el.querySelector(sel) : null; }

  function setup() {
    const page = document.querySelector('[data-poem-page]');
    if (!page) return; // Only run on pages that opt-in

    const container = page.querySelector('.poem-container');
    const content = container && container.querySelector('.poem-content');
    if (!container || !content) return;

    const originalHTML = content.innerHTML; // source of truth for reflows

    function setFont(rem) {
      container.style.fontSize = rem.toFixed(2) + 'rem';
    }

    function resetToSingle() {
      container.classList.remove('two-page');
      container.innerHTML = '';
      const single = document.createElement('div');
      single.className = 'poem-content';
      single.innerHTML = originalHTML;
      container.appendChild(single);
      return single;
    }

    function buildTwoColumns() {
      container.classList.add('two-page');
      container.innerHTML = '';

      const columns = document.createElement('div');
      columns.className = 'poem-columns';

      const left = document.createElement('div');
      left.className = 'poem-col poem-left';

      const right = document.createElement('div');
      right.className = 'poem-col poem-right';

      columns.appendChild(left);
      columns.appendChild(right);
      container.appendChild(columns);

      return { left, right };
    }

    function distributeToTwoColumns(availableHeight) {
      const temp = document.createElement('div');
      temp.innerHTML = originalHTML;

      const { left, right } = buildTwoColumns();
      const nodes = Array.from(temp.childNodes);

      for (let i = 0; i < nodes.length; i++) {
        left.appendChild(nodes[i].cloneNode(true));

        if (left.scrollHeight > availableHeight - PADDING_SAFETY) {
          const moved = left.lastChild;
          if (moved) {
            left.removeChild(moved);
            right.appendChild(moved);
          }
          for (let j = i + 1; j < nodes.length; j++) {
            right.appendChild(nodes[j].cloneNode(true));
          }
          break;
        }
      }
      return { left, right };
    }

    function adjust() {
      // Reset to single-page mode at baseline size
      resetToSingle();
      setFont(START_REM);

      const availableHeight = container.clientHeight;
      const single = select(container, '.poem-content');
      if (!single) return;

      // Case A: It fits—gently scale up to fill the page without overflow
      if (single.scrollHeight <= availableHeight - PADDING_SAFETY) {
        let rem = START_REM;
        while (
          rem + STEP <= MAX_REM &&
          single.scrollHeight <= availableHeight - PADDING_SAFETY
        ) {
          rem += STEP;
          setFont(rem);
        }
        if (single.scrollHeight > availableHeight - PADDING_SAFETY) {
          setFont(rem - STEP);
        }
        return;
      }

      // Case B: Slight overflow—shrink a bit to keep one page
      const overflowRatio = single.scrollHeight / Math.max(availableHeight, 1);
      if (overflowRatio <= SMALL_OVERFLOW_RATIO) {
        let rem = START_REM;
        while (
          single.scrollHeight > availableHeight - PADDING_SAFETY &&
          rem - STEP >= MIN_REM
        ) {
          rem -= STEP;
          setFont(rem);
        }
        return;
      }

      // Case C: It's clearly too long—use two columns and find the biggest readable size
      let lo = Math.max(START_REM, MIN_REM);
      let hi = MAX_REM;
      let best = lo;

      // Initial split at baseline
      distributeToTwoColumns(availableHeight);

      // Search for the largest size that keeps both columns within height
      for (let iter = 0; iter < 20; iter++) {
        const test = (lo + hi) / 2;
        setFont(test);
        const { left, right } = distributeToTwoColumns(availableHeight);

        const leftOK = left.scrollHeight <= availableHeight - PADDING_SAFETY;
        const rightOK = right.scrollHeight <= availableHeight - PADDING_SAFETY;

        if (leftOK && rightOK) {
          best = test;
          lo = test + 0.0001; // nudge up
        } else {
          hi = test - 0.0001; // nudge down
        }
      }

      setFont(Math.max(best, START_REM));
      distributeToTwoColumns(availableHeight);
    }

    // Debounced resize handler
    let t;
    function onResize() {
      clearTimeout(t);
      t = setTimeout(adjust, 80);
    }

    window.addEventListener('load', adjust, { once: true });
    window.addEventListener('resize', onResize);
  }

  // Safe init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
