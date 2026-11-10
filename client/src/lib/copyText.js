// Copies text, and says whether it worked. The clipboard API only exists on https or localhost;
// opened over plain http (a phone at http://192.168.x.x) it falls back to the older copy command.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(box);
    box.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    box.remove();
    return ok;
  }
}
