const { templates } = require("../templates");
const { render } = require("../templates/render");

const createEmailService = ({ sender, emailFrom, linkBuilder }) => {
  const send = async (templateId, email, rawData) => {
    const template = templates[templateId];
    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }
    const vars = template.enrich
      ? template.enrich(rawData, linkBuilder)
      : rawData;
    const subject = render(template.subject, vars);
    const html = render(template.html, vars);
    await sender.send({ from: emailFrom, to: email, subject, html });
  };

  return { send };
};

module.exports = createEmailService;
