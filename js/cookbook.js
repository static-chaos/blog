// step1-book-paging.js

// Tunables: pick counts that fit your fixed page height.
export const INGREDIENTS_PER_PAGE = 8;
export const STEPS_PER_PAGE = 5;

/**
 * Public: build two-page spreads for a recipe.
 * Returns: [{ left: "<html>", right: "<html>" }, ...]
 */
export function generateSpreads(recipe) {
  const pages = generatePages(recipe);
  return pairPagesIntoSpreads(pages);
}

/**
 * Build sequential single-page HTML chunks in logical order:
 * 1) Title + image + some/all ingredients
 * 2) Remaining ingredients (if any) + start of instructions
 * 3+) Continue instructions
 * 4+) Optional notes at the end
 */
export function generatePages(recipe) {
  const pages = [];

  const title = recipe?.title ?? "Untitled Recipe";
  const imageUrl = recipe?.image ?? "";
  const ing = Array.isArray(recipe?.ingredients) ? [...recipe.ingredients] : [];
  const steps = Array.isArray(recipe?.instructions) ? [...recipe.instructions] : [];
  const notes = Array.isArray(recipe?.notes)
    ? [...recipe.notes]
    : recipe?.notes
    ? [recipe.notes]
    : [];

  // Page 1: Title + image + initial ingredients
  const page1Ingredients = ing.splice(0, INGREDIENTS_PER_PAGE);
  pages.push(renderTitleImageIngredients(title, imageUrl, page1Ingredients));

  // Page 2: remaining ingredients + start instructions OR just start instructions
  const startSteps = steps.splice(0, STEPS_PER_PAGE);
  if (ing.length > 0) {
    const page2Ingredients = ing.splice(0, INGREDIENTS_PER_PAGE);
    pages.push(renderIngredientsAndInstructions(page2Ingredients, startSteps));
  } else {
    pages.push(renderInstructions(startSteps));
  }

  // Page 3+: continue instructions
  while (steps.length > 0) {
    pages.push(renderInstructions(steps.splice(0, STEPS_PER_PAGE)));
  }

  // Optional notes at the end (use STEPS_PER_PAGE as a rough per-page count)
  while (notes.length > 0) {
    pages.push(renderNotes(notes.splice(0, STEPS_PER_PAGE)));
  }

  return pages;
}

/**
 * Pair single pages into two-page spreads.
 * If odd number of pages, last right page is blank.
 */
export function pairPagesIntoSpreads(pages) {
  const spreads = [];
  for (let i = 0; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i],
      right: pages[i + 1] || renderBlankPage(),
    });
  }
  return spreads;
}

/* -------------------- Render helpers: return valid single-page HTML strings -------------------- */

function renderTitleImageIngredients(title, imageUrl, ingredients) {
  return `
    <section class="page">
      <header class="page-header">
        <h1 class="recipe-title">${escapeHtml(title)}</h1>
      </header>
      ${imageUrl ? `<figure class="recipe-figure"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}"/></figure>` : ""}
      ${renderIngredientsBlock(ingredients)}
    </section>
  `;
}

function renderIngredientsAndInstructions(ingredients, steps) {
  return `
    <section class="page">
      ${renderIngredientsBlock(ingredients)}
      ${renderInstructionsBlock(steps)}
    </section>
  `;
}

function renderInstructions(steps) {
  return `
    <section class="page">
      ${renderInstructionsBlock(steps)}
    </section>
  `;
}

function renderNotes(notes) {
  if (!notes || notes.length === 0) {
    return renderBlankPage();
  }
  return `
    <section class="page">
      <h3 class="section-title">Notes</h3>
      <ul class="notes">
        ${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderIngredientsBlock(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return `
      <div class="ingredients">
        <h3 class="section-title">Ingredients</h3>
        <p class="empty">No ingredients listed.</p>
      </div>
    `;
  }
  return `
    <div class="ingredients">
      <h3 class="section-title">Ingredients</h3>
      <ul class="ingredient-list">
        ${ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderInstructionsBlock(steps) {
  if (!steps || steps.length === 0) {
    return `
      <div class="instructions">
        <h3 class="section-title">Instructions</h3>
        <p class="empty">Continue to the next page.</p>
      </div>
    `;
  }
  return `
    <div class="instructions">
      <h3 class="section-title">Instructions</h3>
      <ol class="step-list">
        ${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
      </ol>
    </div>
  `;
}

function renderBlankPage() {
  return `
    <section class="page blank">
      <div class="blank-content"></div>
    </section>
  `;
}

/* -------------------- Utilities -------------------- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}
