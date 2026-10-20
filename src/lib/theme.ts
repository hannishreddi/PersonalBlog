/**
 * Colour theme preference. With no stored value the site is light, whatever
 * the OS prefers; an explicit choice is stored in localStorage and applied as
 * `data-theme` on <html>. Only this key is stored, and it never leaves the browser.
 */
export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

/** Runs in <head> before first paint so a stored theme never flashes. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
