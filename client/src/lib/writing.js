// The title is optional: show "Untitled email" rather than a blank line
export const titleOf = (c) => c.title?.trim() || `Untitled ${c.kind === 'other' ? 'writing' : c.kind}`;

// "email" -> "Email" (only the kind is capitalised: "Email · 37 words", not "37 Words")
export const kindLabel = (kind) => (kind ? kind[0].toUpperCase() + kind.slice(1) : '');
