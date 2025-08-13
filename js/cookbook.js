// js/cookbook.js — Continuous flow across pages, no scroll, no duplicates
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.recipe-book .book-content');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');

  if (!container) {
    console.error('Missing .recipe-book .book-content container');
    return;
  }

  // Use your local path or raw GitHub URL if needed
  const DATA_URL = 'data/cookbook.json';

  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      const recipes = Array.isArray(data?.recipes) ? data.recipes : [];
      if (!recipes.length) {
        container.innerHTML = `<p style="color:#c00">No recipes found</p>`;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
      }

      // choose via hash-slug or default to 0
      const slugFromHash = window.location.hash.slice(1).toLowerCase();
      const toSlug = s => String(s)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      let recipeIndex = slugFromHash
        ? recipes.findIndex(r => toSlug(r.name) === slugFromHash)
        : 0;
      if (recipeIndex < 0) recipeIndex = 0;

      const recipe = recipes[recipeIndex];
      const spreads = buildSpreadsForRecipe(recipe);

      let currentSpreadIndex = 0;

      const showSpread = (i) => {
        currentSpreadIndex = i;
        renderSpread(container, spreads[currentSpreadIndex]);
        if (prevBtn) prevBtn.disabled = currentSpreadIndex === 0;
        if (nextBtn) nextBtn.disabled = currentSpreadIndex >= spreads.length - 1;
      };

      showSpread(0);

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentSpreadIndex > 0) showSpread(currentSpreadIndex - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentSpreadIndex < spreads.length - 1) showSpread(currentSpreadIndex + 1);
        });
      }
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = `<p style="color:#c00">Error loading recipes</p>`;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    });
});


/* ---------- Pagination: continuous flow across sections ---------- */

function buildSpreadsForRecipe(recipe) {
  const pages = generatePagesContinuous(recipe);
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    const left  = addSideClass(pages[i]     || renderBlankPage(), 'left');
    const right = addSideClass(pages[i + 1] || renderBlankPage(), 'right');
    spreads.push({ left, right });
  }
  return spreads;
}

function generatePagesContinuous(recipe) {
  const name        = recipe?.name ?? 'Untitled Recipe';
  const description = recipe?.description ?? '';
  const ingredients = Array.isArray(recipe?.ingredients)  ? recipe.ingredients.map(formatIngredient) : [];
  const steps       = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];
  const notes       = Array.isArray(recipe?.extra_notes)  ? [...recipe.extra_notes]
                     : (recipe?.extra_notes ? [recipe.extra_notes] : []);

  // Layout constants (match your CSS: 900x600 book => 450px page width)
  const pageInnerHeight  = 600;   // .recipe-book height
  const paddingY         = 2 * 32; // approx for padding: 2em top/bottom at 16px base
  const maxContentHeight = pageInnerHeight - paddingY;

  // Hidden measurer for accurate pagination
  const measurer = document.createElement('div');
  measurer.style.cssText = `
    position:absolute;
    visibility:hidden;
    pointer-events:none;
    left:-9999px; top:-9999px;
    width:450px;               /* half of 900px */
    padding:2em 3em;           /* match .page padding */
    box-sizing:border-box;
    font-family:'Playfair Display', serif;
    font-size:1.1em;
    line-height:1.5;
    background:#fffdfa;
  `;
  document.body.appendChild(measurer);

  const pages = [];
  let pageHtml = '';

  // Header (title + optional description) starts page 1, then content flows after it
  const headerHtml = `<header class="page-header">
    <h2 class="recipe-title">${escapeHtml(name)}</h2>
    ${description ? `<p class="recipe-desc">${escapeHtml(description)}</p>` : ''}
  </header>`;
  pageHtml = headerHtml;

  // Sections in display order
  const sections = [
    { key: 'ingredients',  title: 'Ingredients',  ordered: false, items: ingredients },
    { key: 'instructions', title: 'Instructions', ordered: true,  items: steps },
    { key: 'notes',        title: 'Notes',        ordered: false, items: notes }
  ];

  // List state
  let listOpen = false;
  let listType = null;     // 'ul' | 'ol'
  let containerKey = null; // 'ingredients' | 'instructions' | 'notes'
  let stepCounter = 1;     // next number for ordered steps

  const tailClose = () => (listOpen ? (listType === 'ol' ? '</ol>' : '</ul>') + '</div>' : '');

  const measureWouldFit = (extra) => {
    // Close any currently open structures for a realistic height
    measurer.innerHTML = pageHtml + extra + tailClose();
    return measurer.offsetHeight <= maxContentHeight;
  };

  const pushPage = () => {
    // Close open structures for the saved page
    const saved = listOpen ? pageHtml + tailClose() : pageHtml;
    pages.push(`<section class="page">${saved}</section>`);
    // start a fresh page
    pageHtml = '';
  };

  const ensureListForSection = (key, ordered, startNum) => {
    if (listOpen && containerKey === key && (ordered ? 'ol' : 'ul') === listType) {
      return ''; // already correct list open
    }
    // close any different open list
    if (listOpen) {
      pageHtml += tailClose();
      listOpen = false;
      listType = null;
      containerKey = null;
    }
    const open = `<div class="${key}">` + (ordered
      ? `<ol class="step-list" start="${startNum}">`
      : `<ul class="ingredient-list">`);
    listOpen = true;
    listType = ordered ? 'ol' : 'ul';
    containerKey = key;
    return open;
  };

  const addSectionTitle = (titleHtml) => {
    if (!measureWouldFit(titleHtml)) {
      pushPage();
    }
    pageHtml += titleHtml;
  };

  const splitTextByWordsToFit = (prefix, text, isOrderedContinuation, itemNumber) => {
    // Try to fit as many words as possible into current page as a single <li>
    const words = String(text).split(/\s+/);
    let low = 1, high = words.length, best = 0;
    const liOpen = isOrderedContinuation
      ? `<li value="${itemNumber}" class="continued">`
      : `<li>`;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const chunk = escapeHtml(words.slice(0, mid).join(' ')) + ' …';
      const candidate = prefix + liOpen + chunk + '</li>';
      if (measureWouldFit(candidate)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (best === 0) {
      // Fallback: force a small slice by characters to avoid an infinite loop
      const slice = escapeHtml(words[0]).slice(0, 20) + ' …';
      return { fitsHtml: prefix + liOpen + slice + '</li>', remainder: words.slice(0).join(' ') };
    }
    const first = words.slice(0, best).join(' ');
    const rest  = words.slice(best).join(' ');
    return {
      fitsHtml: prefix + liOpen + escapeHtml(first) + ' …</li>',
      remainder: rest
    };
  };

  for (const sec of sections) {
    if (!Array.isArray(sec.items) || sec.items.length === 0) continue;

    // Section title appears only when the section starts
    addSectionTitle(`<h3 class="section-title">${escapeHtml(sec.title)}</h3>`);

    for (let idx = 0; idx < sec.items.length; idx++) {
      const raw = sec.items[idx] == null ? '' : String(sec.items[idx]);
      const itemNumber = sec.ordered ? stepCounter : null;
      let remaining = raw;
      let continuation = false;

      while (remaining.length > 0) {
        // Open correct container/list if needed
        const openPrefix = ensureListForSection(sec.key, sec.ordered, stepCounter);

        const liOpen = sec.ordered && continuation
          ? `<li value="${itemNumber}" class="continued">`
          : `<li>`;
        const liHtmlFull = openPrefix + liOpen + escapeHtml(remaining) + '</li>';

        if (measureWouldFit(liHtmlFull)) {
          // Place the full item part
          pageHtml += liHtmlFull;
          // If this completes the item, advance the counter for ordered lists
          if (sec.ordered) stepCounter++;
          remaining = '';
        } else {
          // Not fitting as-is: if page has any content, push to new page and try again
          if (pageHtml.trim()) {
            pushPage();
          }

          // Re-open list on the new page
          const reopen = ensureListForSection(sec.key, sec.ordered, stepCounter);
          const liHtmlOnNew = reopen + liOpen + escapeHtml(remaining) + '</li>';

          if (measureWouldFit(liHtmlOnNew)) {
            // Fits now on empty page
            pageHtml += liHtmlOnNew;
            if (sec.ordered) stepCounter++;
            remaining = '';
          } else {
            // Extremely long single item: split across pages by words
            const { fitsHtml, remainder } = splitTextByWordsToFit(reopen, remaining, sec.ordered, itemNumber);
            pageHtml += fitsHtml;
            // Continue on next page with the remainder; mark as continuation (same number)
            continuation = true;
            remaining = remainder;
            pushPage();
            // After pushPage(), loop continues, list will re-open with same start number
          }
        }
      }
    }

    // Close the section container/list before the next section
    if (listOpen && containerKey === sec.key) {
      pageHtml += tailClose();
      listOpen = false;
      listType = null;
      containerKey = null;
    }
  }

  // Flush the last page if it has any content
  if (pageHtml.trim()) {
    pages.push(`<section class="page">${pageHtml}</section>`);
  }

  document.body.removeChild(measurer);
  return pages;
}

function renderSpread(container, spread) {
  const left  = spread?.left  || renderBlankPage();
  const right = spread?.right || renderBlankPage();

  container.innerHTML = `<div class="page-spread active">
    ${left}
    ${right}
  </div>`;
}

/* ---------- Helpers ---------- */

function renderBlankPage() {
  return `<section class="page page-blank"></section>`;
}

function addSideClass(pageHtml, side) {
  const sideClass = side === 'left' ? 'left-page' : 'right-page';
  // Insert side class into the first page class occurrence
  return pageHtml.replace(/class="page(?!-)/, `class="page ${sideClass}"`);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIngredient(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;

  // Handle common shapes like { quantity, unit, name } or { amount, unit, ingredient }
  const qty  = item.quantity ?? item.qty ?? item.amount ?? '';
  const unit = item.unit ?? '';
  const name = item.name ?? item.ingredient ?? item.item ?? '';

  const parts = [];
  if (qty)  parts.push(String(qty));
  if (unit) parts.push(String(unit));
  if (name) parts.push(String(name));

  const line = parts.join(' ').trim();
  return line || JSON.stringify(item);
}
