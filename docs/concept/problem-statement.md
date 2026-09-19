# Problem Statement

Documentation is often distributed across many repositories and maintained by different teams or individuals.

This leads to several recurring problems:

- documents are difficult to discover across repository boundaries,
- structure and metadata differ between projects,
- documentation quality is hard to validate consistently,
- relationships between documents are often implicit,
- outdated or incomplete documentation is difficult to detect,
- automated tools and AI systems lack reliable structural context.

AI-assisted workflows amplify this problem. Generating documents, specifications, summaries, and other content is becoming increasingly cheap and common. As the amount of generated content grows, finding relevant and trustworthy information becomes harder.

Markdown and YAML Frontmatter provide open and portable building blocks, but they do not define shared semantics, validation rules, or cross-repository relationships by themselves.

As documentation grows, full-text search alone is not sufficient to reliably answer questions such as:

- What type of document is this?
- Is it complete and valid?
- Which other documents does it reference?
- Which documents belong to a specific domain, system, or process?
- Which information is outdated or inconsistent?

Dokkurator addresses these gaps while keeping documentation in open formats and existing repositories.
