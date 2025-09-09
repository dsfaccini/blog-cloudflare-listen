'use client';

import { BookOpen, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

interface SummaryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    summaries: string[] | null;
    loading: boolean;
    articleTitle: string;
}

export default function SummaryDrawer({
    open,
    onOpenChange,
    summaries,
    loading,
    articleTitle,
}: SummaryDrawerProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Article Summary
                    </SheetTitle>
                    <SheetDescription className="text-left">
                        AI-generated summaries for &quot;{articleTitle}&quot;
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 h-full">
                    {loading ? (
                        <div className="flex h-32 items-center justify-center">
                            <div className="space-y-2 text-center">
                                <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
                                <p className="text-muted-foreground text-sm">
                                    Generating summaries...
                                </p>
                            </div>
                        </div>
                    ) : summaries && summaries.length > 0 ? (
                        <ScrollArea className="h-[calc(100vh-200px)]">
                            <div className="space-y-4 pr-4">
                                {summaries.map((summary, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                Paragraph {index + 1}
                                            </Badge>
                                        </div>
                                        <p className="text-foreground text-sm leading-relaxed">
                                            {summary}
                                        </p>
                                        {index < summaries.length - 1 && (
                                            <Separator className="my-4" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex h-32 items-center justify-center">
                            <div className="space-y-2 text-center">
                                <BookOpen className="text-muted-foreground mx-auto h-8 w-8" />
                                <p className="text-muted-foreground text-sm">
                                    No summaries available
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
