const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

const render = (template, vars) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

const renderHtml = (template, vars) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] === null || vars[k] === undefined ? "" : escapeHtml(vars[k]),
  );

module.exports = { render, renderHtml };
