/**
 * Article Content Parser for Blog Cloudflare Listen
 * 
 * Parses HTML from Cloudflare blog articles and converts them to structured data
 * that can be rendered as React components.
 * 
 * @example
 * ```typescript
 * import { parseArticle, extractTextForAudio, extractParagraphsForSummary } from './article-parser';
 * 
 * // Parse HTML content
 * const articleContent = parseArticle(htmlString);
 * 
 * // Extract text for TTS generation
 * const audioText = extractTextForAudio(articleContent);
 * 
 * // Extract paragraphs for AI summarization
 * const paragraphs = extractParagraphsForSummary(articleContent);
 * ```
 */
import { JSDOM } from 'jsdom';

export enum BlockType {
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  IMAGE = 'image',
  CODE_BLOCK = 'code_block',
  CODE_INLINE = 'code_inline',
  LIST = 'list',
  BLOCKQUOTE = 'blockquote',
  FIGURE = 'figure'
}

export interface InlineElement {
  type: 'text' | 'link' | 'bold' | 'italic' | 'underline' | 'code';
  content: string;
  href?: string;
}

export interface ListItem {
  content: InlineElement[];
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  level?: number; // For headings (1-6)
  content?: InlineElement[];
  src?: string; // For images
  alt?: string; // For images
  caption?: string; // For images/figures
  language?: string; // For code blocks
  raw?: string; // For code blocks
  items?: ListItem[]; // For lists
  ordered?: boolean; // For lists
  width?: number; // For images
  height?: number; // For images
  loading?: string; // For images
}

export interface AuthorInfo {
  name: string;
  href: string;
  avatarSrc: string;
}

export interface ArticleContent {
  title: string;
  date: string;
  readTime?: string;
  description?: string;
  publishDate?: string;
  readingTime?: number;
  authors: AuthorInfo[];
  heroImage?: {
    src: string;
    alt: string;
  };
  content: ContentBlock[];
  blocks: ContentBlock[];
  tags: string[];
}

/**
 * Main parsing function that takes HTML from Cloudflare blog articles
 * and converts it to structured data for React rendering
 */
export function parseArticle(html: string): ArticleContent {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const article = document.querySelector('article');
    
    if (!article) {
      throw new Error('No article element found in HTML');
    }

    // Extract title
    const titleElement = article.querySelector('h1');
    const title = titleElement?.textContent?.trim() || 'Untitled Article';

    // Extract date
    const dateElement = article.querySelector('p.f3.fw5.gray5');
    const date = dateElement?.textContent?.trim() || '';

    // Extract read time
    const readTimeElement = article.querySelector('.mb2.gray5');
    const readTime = readTimeElement?.textContent?.trim();

    // Extract authors
    const authors = extractAuthors(article);

    // Extract hero image
    const heroImage = extractHeroImage(article);

    // Extract content blocks from post-content
    const contentContainer = article.querySelector('.post-content');
    const blocks = contentContainer ? extractContentBlocks(contentContainer) : [];

    // Extract tags
    const tags = extractTags(document);

    return {
      title,
      date,
      readTime,
      authors,
      heroImage,
      content: blocks,
      blocks,
      tags
    };
  } catch (error) {
    console.error('Error parsing article:', error);
    return {
      title: 'Error parsing article',
      date: '',
      authors: [],
      content: [],
      blocks: [],
      tags: []
    };
  }
}

/**
 * Extract plain text from article content for TTS generation
 */
export function extractTextForAudio(content: ArticleContent): string {
  const textParts: string[] = [];
  
  // Add title
  textParts.push(content.title);
  
  // Add content from blocks
  for (const block of content.blocks) {
    switch (block.type) {
      case BlockType.HEADING:
        if (block.content) {
          textParts.push(inlineElementsToText(block.content));
        }
        break;
      case BlockType.PARAGRAPH:
        if (block.content) {
          textParts.push(inlineElementsToText(block.content));
        }
        break;
      case BlockType.LIST:
        if (block.items) {
          for (const item of block.items) {
            textParts.push(inlineElementsToText(item.content));
          }
        }
        break;
      case BlockType.BLOCKQUOTE:
        if (block.content) {
          textParts.push(inlineElementsToText(block.content));
        }
        break;
      case BlockType.CODE_BLOCK:
        // Skip code blocks for audio as they're not meaningful when spoken
        break;
      case BlockType.IMAGE:
        // Add alt text if available
        if (block.alt) {
          textParts.push(`Image: ${block.alt}`);
        }
        break;
      case BlockType.FIGURE:
        // Add caption if available
        if (block.caption) {
          textParts.push(block.caption);
        }
        break;
    }
  }
  
  return textParts.join('\n\n');
}

/**
 * Extract paragraphs for summarization
 */
export function extractParagraphsForSummary(content: ArticleContent): string[] {
  const paragraphs: string[] = [];
  
  for (const block of content.blocks) {
    if (block.type === BlockType.PARAGRAPH && block.content) {
      const text = inlineElementsToText(block.content);
      if (text.trim().length > 0) {
        paragraphs.push(text);
      }
    }
  }
  
  return paragraphs;
}

// Helper functions

function extractAuthors(article: Element): AuthorInfo[] {
  const authors: AuthorInfo[] = [];
  const authorElements = article.querySelectorAll('.author-lists li');
  
  for (const authorElement of authorElements) {
    const linkElement = authorElement.querySelector('a[href^="/author/"]');
    const imgElement = authorElement.querySelector('img.author-profile-image');
    const nameElement = authorElement.querySelector('.author-name-tooltip a');
    
    if (linkElement && imgElement && nameElement) {
      authors.push({
        name: nameElement.textContent?.trim() || '',
        href: linkElement.getAttribute('href') || '',
        avatarSrc: imgElement.getAttribute('src') || ''
      });
    }
  }
  
  return authors;
}

function extractHeroImage(article: Element): { src: string; alt: string } | undefined {
  // Look for the main article image (outside of post-content)
  const heroImg = article.querySelector('img.mr2');
  if (heroImg) {
    return {
      src: heroImg.getAttribute('src') || '',
      alt: heroImg.getAttribute('alt') || ''
    };
  }
  return undefined;
}

function extractContentBlocks(container: Element): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const children = Array.from(container.children);
  
  for (let i = 0; i < children.length; i++) {
    const element = children[i];
    const block = parseElement(element, i);
    if (block) {
      blocks.push(block);
    }
  }
  
  return blocks;
}

function parseElement(element: Element, index: number): ContentBlock | null {
  const tagName = element.tagName.toLowerCase();
  const id = `block-${index}`;
  
  switch (tagName) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        id,
        type: BlockType.HEADING,
        level: parseInt(tagName.charAt(1)),
        content: parseInlineElements(element)
      };
    
    case 'p':
      return {
        id,
        type: BlockType.PARAGRAPH,
        content: parseInlineElements(element)
      };
    
    case 'ul':
    case 'ol':
      return {
        id,
        type: BlockType.LIST,
        ordered: tagName === 'ol',
        items: parseListItems(element)
      };
    
    case 'blockquote':
      return {
        id,
        type: BlockType.BLOCKQUOTE,
        content: parseInlineElements(element)
      };
    
    case 'pre':
      const codeElement = element.querySelector('code');
      return {
        id,
        type: BlockType.CODE_BLOCK,
        language: extractCodeLanguage(codeElement),
        raw: element.textContent || ''
      };
    
    case 'figure':
      return parseFigure(element, id);
    
    case 'div':
      // Handle special div containers like flex anchor relative (headings)
      if (element.classList.contains('flex') && element.classList.contains('anchor')) {
        const heading = element.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) {
          return parseElement(heading, index);
        }
      }
      return null;
    
    default:
      return null;
  }
}

function parseFigure(element: Element, id: string): ContentBlock {
  const img = element.querySelector('img');
  const caption = element.querySelector('figcaption');
  
  if (img) {
    return {
      id,
      type: BlockType.FIGURE,
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      caption: caption?.textContent?.trim(),
      width: img.getAttribute('width') ? parseInt(img.getAttribute('width')!) : undefined,
      height: img.getAttribute('height') ? parseInt(img.getAttribute('height')!) : undefined,
      loading: img.getAttribute('loading') || undefined
    };
  }
  
  return {
    id,
    type: BlockType.FIGURE,
    caption: caption?.textContent?.trim() || ''
  };
}

function parseListItems(listElement: Element): ListItem[] {
  const items: ListItem[] = [];
  const liElements = listElement.querySelectorAll('li');
  
  for (const li of liElements) {
    items.push({
      content: parseInlineElements(li)
    });
  }
  
  return items;
}

function parseInlineElements(element: Element): InlineElement[] {
  const inlineElements: InlineElement[] = [];
  
  function processNode(node: Node) {
    if (node.nodeType === 3) { // Text node
      const text = node.textContent || '';
      if (text.trim() || (text.length > 0 && inlineElements.length > 0)) {
        inlineElements.push({
          type: 'text',
          content: text
        });
      }
    } else if (node.nodeType === 1) { // Element node
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      switch (tagName) {
        case 'a':
          const linkText = el.textContent || '';
          if (linkText.trim()) {
            inlineElements.push({
              type: 'link',
              content: linkText,
              href: el.getAttribute('href') || ''
            });
          }
          break;
        
        case 'strong':
        case 'b':
          const boldText = el.textContent || '';
          if (boldText.trim()) {
            inlineElements.push({
              type: 'bold',
              content: boldText
            });
          }
          break;
        
        case 'em':
        case 'i':
          const italicText = el.textContent || '';
          if (italicText.trim()) {
            inlineElements.push({
              type: 'italic',
              content: italicText
            });
          }
          break;
        
        case 'u':
          const underlineText = el.textContent || '';
          if (underlineText.trim()) {
            inlineElements.push({
              type: 'underline',
              content: underlineText
            });
          }
          break;
        
        case 'code':
          const codeText = el.textContent || '';
          if (codeText.trim()) {
            inlineElements.push({
              type: 'code',
              content: codeText
            });
          }
          break;
        
        default:
          // For other elements, process their children
          for (const child of Array.from(el.childNodes)) {
            processNode(child);
          }
          break;
      }
    }
  }
  
  for (const child of Array.from(element.childNodes)) {
    processNode(child);
  }
  
  return inlineElements;
}

function extractCodeLanguage(codeElement: Element | null): string | undefined {
  if (!codeElement) return undefined;
  
  const className = codeElement.getAttribute('class') || '';
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : undefined;
}

function extractTags(document: Document): string[] {
  const tags: string[] = [];
  const tagElements = document.querySelectorAll('a[href^="/tag/"]');
  
  for (const tagElement of tagElements) {
    const tagText = tagElement.textContent?.trim();
    if (tagText) {
      tags.push(tagText);
    }
  }
  
  return tags;
}

function inlineElementsToText(elements: InlineElement[]): string {
  return elements.map(el => cleanText(el.content)).join(' ').trim();
}

// Utility function to clean HTML entities and normalize whitespace
export function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Validate parsed content
export function validateArticleContent(content: ArticleContent): boolean {
  return !!(
    content.title &&
    content.title !== 'Error parsing article' &&
    content.blocks.length > 0
  );
}

// Convert inline elements back to HTML for rendering
export function inlineElementsToHtml(elements: InlineElement[]): string {
  return elements.map(el => {
    const cleanContent = cleanText(el.content);
    
    switch (el.type) {
      case 'link':
        return `<a href="${el.href || '#'}">${cleanContent}</a>`;
      case 'bold':
        return `<strong>${cleanContent}</strong>`;
      case 'italic':
        return `<em>${cleanContent}</em>`;
      case 'underline':
        return `<u>${cleanContent}</u>`;
      case 'code':
        return `<code>${cleanContent}</code>`;
      case 'text':
      default:
        return cleanContent;
    }
  }).join('');
}

// Get content summary for meta descriptions, etc.
export function getContentSummary(content: ArticleContent, maxLength: number = 160): string {
  const paragraphs = extractParagraphsForSummary(content);
  const summary = paragraphs.join(' ').substring(0, maxLength);
  const lastSpaceIndex = summary.lastIndexOf(' ');
  
  if (lastSpaceIndex > maxLength - 20) {
    return summary.substring(0, lastSpaceIndex) + '...';
  }
  
  return summary + (summary.length >= maxLength ? '...' : '');
}

// Extract all images from content for preloading or processing
export function extractImages(content: ArticleContent): Array<{ src: string; alt: string; caption?: string }> {
  const images: Array<{ src: string; alt: string; caption?: string }> = [];
  
  if (content.heroImage) {
    images.push({
      src: content.heroImage.src,
      alt: content.heroImage.alt
    });
  }
  
  for (const block of content.blocks) {
    if ((block.type === BlockType.IMAGE || block.type === BlockType.FIGURE) && block.src) {
      images.push({
        src: block.src,
        alt: block.alt || '',
        caption: block.caption
      });
    }
  }
  
  return images;
}

// Get reading time estimate based on content
export function estimateReadingTime(content: ArticleContent, wordsPerMinute: number = 200): number {
  const text = extractTextForAudio(content);
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}