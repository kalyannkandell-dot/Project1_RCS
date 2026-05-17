// ─── XSS PROTECTION ──────────────────────────────────────────────────────────
// TODO: wrap all user-generated content with escapeHtml() before rendering
// Affected: file.name, group.name, email anywhere innerHTML is used
// function escapeHtml(str) {
//     return str
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&#039;')
// }
// ─────────────────────────────────────────────────────────────────────────────