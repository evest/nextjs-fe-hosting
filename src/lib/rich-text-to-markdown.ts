/**
 * Convert an Optimizely rich-text Slate JSON tree to Markdown.
 *
 * Used by /llms-full.txt to give LLM crawlers a clean, readable copy of
 * article bodies. Markdown is the convention for the llms.txt family of
 * files (LLMs parse it natively) and is portable enough that a Slate tree
 * with any of the standard editor node types renders sensibly.
 *
 * Unknown node types fall back to walking children + emitting plain text,
 * so newer editor blocks degrade rather than error. Image nodes emit
 * `![alt](url)`; links emit `[label](href)`; lists nest correctly.
 */

type Node = {
  type?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  underline?: boolean;
  children?: Node[];
  url?: string;
  src?: string;
  alt?: string;
};

function escapeMarkdownInline(text: string): string {
  // Backslash-escape characters that would otherwise be parsed as markdown
  // formatting inside an inline context.
  return text.replace(/([\\`*_{}\[\]()#+!|>~-])/g, '\\$1');
}

function renderLeaf(node: Node): string {
  let text = node.text ?? '';
  if (!text) return '';
  text = escapeMarkdownInline(text);
  if (node.code) text = `\`${text}\``;
  if (node.bold) text = `**${text}**`;
  if (node.italic) text = `*${text}*`;
  // Underline has no markdown equivalent — drop the formatting, keep the text.
  return text;
}

function renderInline(children: Node[] | undefined): string {
  if (!children) return '';
  return children.map(renderNode).join('');
}

function renderListItems(children: Node[] | undefined, ordered: boolean, depth: number): string {
  if (!children) return '';
  const indent = '  '.repeat(depth);
  return children
    .map((item, i) => {
      const marker = ordered ? `${i + 1}.` : '-';
      const content = renderInline(item.children).trim();
      return `${indent}${marker} ${content}`;
    })
    .join('\n');
}

function renderNode(node: Node, depth = 0): string {
  if (typeof node.text === 'string') return renderLeaf(node);

  switch (node.type) {
    case 'heading-one':
    case 'h1':
      return `\n# ${renderInline(node.children)}\n\n`;
    case 'heading-two':
    case 'h2':
      return `\n## ${renderInline(node.children)}\n\n`;
    case 'heading-three':
    case 'h3':
      return `\n### ${renderInline(node.children)}\n\n`;
    case 'heading-four':
    case 'h4':
      return `\n#### ${renderInline(node.children)}\n\n`;
    case 'heading-five':
    case 'h5':
      return `\n##### ${renderInline(node.children)}\n\n`;
    case 'heading-six':
    case 'h6':
      return `\n###### ${renderInline(node.children)}\n\n`;
    case 'paragraph':
    case 'p':
      return `${renderInline(node.children)}\n\n`;
    case 'block-quote':
    case 'blockquote': {
      const inner = renderInline(node.children).trim();
      return inner
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n') + '\n\n';
    }
    case 'code-block':
    case 'pre':
      return `\n\`\`\`\n${renderInline(node.children)}\n\`\`\`\n\n`;
    case 'bulleted-list':
    case 'ul':
      return `${renderListItems(node.children, false, depth)}\n\n`;
    case 'numbered-list':
    case 'ol':
      return `${renderListItems(node.children, true, depth)}\n\n`;
    case 'link':
    case 'a': {
      const href = node.url ?? '';
      const label = renderInline(node.children) || href;
      return `[${label}](${href})`;
    }
    case 'image':
    case 'img': {
      const src = node.src ?? node.url ?? '';
      const alt = node.alt ?? '';
      if (!src) return '';
      return `\n![${alt}](${src})\n\n`;
    }
    case 'thematic-break':
    case 'hr':
      return `\n---\n\n`;
    case 'line-break':
    case 'br':
      return `  \n`;
    default:
      // Unknown node — walk children so content isn't lost.
      return renderInline(node.children);
  }
}

export function richTextToMarkdown(root: unknown): string {
  if (!root || typeof root !== 'object') return '';
  const node = root as Node;
  if (Array.isArray(node.children)) {
    return node.children.map((c) => renderNode(c)).join('').replace(/\n{3,}/g, '\n\n').trim();
  }
  return renderNode(node).replace(/\n{3,}/g, '\n\n').trim();
}
