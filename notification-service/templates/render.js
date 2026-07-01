const render = (template, vars) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

module.exports = { render };
