'use client';

import { Copy, ExternalLink } from 'lucide-react';

import React from 'react';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ContentBlock, InlineElement } from '@/lib/article-parser';

interface ArticleContentProps {
    content: ContentBlock[];
}

function renderInlineElements(elements: InlineElement[]) {
    return elements.map((element, index) => {
        switch (element.type) {
            case 'bold':
                return <strong key={index}>{element.content}</strong>;
            case 'italic':
                return <em key={index}>{element.content}</em>;
            case 'underline':
                return <u key={index}>{element.content}</u>;
            case 'link':
                return (
                    <a
                        key={index}
                        href={element.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                        {element.content}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                );
            case 'code':
                return (
                    <code key={index} className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
                        {element.content}
                    </code>
                );
            case 'text':
            default:
                return <span key={index}>{element.content}</span>;
        }
    });
}

function CodeBlock({ text, language }: { text: string; language?: string }) {
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy code:', err);
        }
    };

    return (
        <Card className="group relative">
            <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="sm" variant="ghost" onClick={copyToClipboard} className="h-8 w-8 p-0">
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            {language && (
                <div className="bg-muted/50 border-b px-4 py-2">
                    <Badge variant="secondary" className="text-xs">
                        {language}
                    </Badge>
                </div>
            )}
            <pre className="overflow-x-auto p-4">
                <code className="font-mono text-sm">{text}</code>
            </pre>
        </Card>
    );
}

function renderContentBlock(block: ContentBlock, index: number): React.JSX.Element {
    switch (block.type) {
        case 'heading':
            const HeadingTag =
                `h${Math.min(block.level || 1, 6)}` as keyof React.JSX.IntrinsicElements;
            const headingClasses = {
                1: 'text-4xl font-bold mt-8 mb-4',
                2: 'text-3xl font-bold mt-8 mb-4',
                3: 'text-2xl font-semibold mt-6 mb-3',
                4: 'text-xl font-semibold mt-6 mb-3',
                5: 'text-lg font-semibold mt-4 mb-2',
                6: 'text-base font-semibold mt-4 mb-2',
            };

            return (
                <HeadingTag
                    key={index}
                    id={block.id}
                    className={
                        headingClasses[block.level as keyof typeof headingClasses] ||
                        headingClasses[1]
                    }
                >
                    {block.content ? renderInlineElements(block.content) : ''}
                </HeadingTag>
            );

        case 'paragraph':
            return (
                <p key={index} className="mb-4 leading-relaxed">
                    {block.content ? renderInlineElements(block.content) : ''}
                </p>
            );

        case 'image':
            return (
                <figure key={index} className="my-6">
                    <Image
                        src={block.src || ''}
                        alt={block.alt || ''}
                        width={block.width || 800}
                        height={block.height || 600}
                        className="w-full rounded-lg shadow-lg"
                    />
                    {block.caption && (
                        <figcaption className="text-muted-foreground mt-2 text-center text-sm">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );

        case 'code_block':
            return (
                <div key={index} className="my-6">
                    <CodeBlock text={block.raw || ''} language={block.language} />
                </div>
            );

        case 'blockquote':
            return (
                <blockquote
                    key={index}
                    className="border-primary text-muted-foreground my-6 border-l-4 pl-6 italic"
                >
                    {block.content ? renderInlineElements(block.content) : ''}
                </blockquote>
            );

        case 'list':
            const ListTag = block.ordered ? 'ol' : 'ul';
            const listClasses = block.ordered
                ? 'list-decimal list-inside space-y-2 my-4 ml-4'
                : 'list-disc list-inside space-y-2 my-4 ml-4';

            return (
                <ListTag key={index} className={listClasses}>
                    {block.items?.map((item, itemIndex) => (
                        <li key={itemIndex} className="leading-relaxed">
                            {renderInlineElements(item.content)}
                        </li>
                    ))}
                </ListTag>
            );

        case 'figure':
            return (
                <figure key={index} className="my-8">
                    {/* Note: Figure items would be ContentBlocks, but our current parser may not populate this */}
                    {block.caption && (
                        <figcaption className="text-muted-foreground mt-4 text-center text-sm">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );


        default:
            // Fallback for unknown types
            return (
                <div key={index} className="bg-muted/50 border-muted my-4 rounded border-l-4 p-4">
                    <p className="text-muted-foreground mb-2 text-sm">
                        Unknown content type: {block.type}
                    </p>
                    <pre className="overflow-x-auto text-xs">{JSON.stringify(block, null, 2)}</pre>
                </div>
            );
    }
}

export default function ArticleContent({ content }: ArticleContentProps) {
    if (!content || content.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-muted-foreground">No content available</p>
            </div>
        );
    }

    return (
        <article className="prose prose-lg max-w-none">
            <div className="space-y-1">
                {content.map((block, index) => renderContentBlock(block, index))}
            </div>
        </article>
    );
}
