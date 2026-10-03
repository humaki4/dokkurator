/** @type {import('@eslint/markdown').MarkdownRuleDefinition} */
const noTodo = {
  meta: {
    type: "problem",
    docs: { description: "Report TODO placeholders in visible Markdown text." },
    schema: [],
    messages: { todo: "Replace the TODO placeholder with documentation." },
  },
  create(context) {
    return {
      text(node) {
        if (/\bTODO\b/u.test(node.value)) {
          context.report({ node, messageId: "todo" });
        }
      },
    };
  },
};

export default { rules: { "no-todo": noTodo } };
