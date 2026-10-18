const MAX_BYTES = 2_000_000;

export async function readTextFile(file) {
  if (file.size > MAX_BYTES) throw new Error('That file is too big. Use one under 2 MB.');
  const name = file.name.toLowerCase();
  let text;
  if (name.endsWith('.txt') || name.endsWith('.md')) {
    text = await file.text();
  } else if (name.endsWith('.docx')) {
    // mammoth's ready-made browser bundle, loaded only when someone uploads a .docx
    // (Vite puts it in its own file). It's an older module format, so it arrives
    // as the "default" export.
    const mod = await import('mammoth/mammoth.browser');
    const mammoth = mod.default ?? mod;
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = value;
  } else {
    throw new Error('Upload a .txt or .docx file.');
  }
  return text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}