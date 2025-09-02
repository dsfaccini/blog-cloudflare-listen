'use client';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, BookOpen } from 'lucide-react';

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
    articleTitle 
}: SummaryDrawerProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Article Summary
                    </SheetTitle>
                    <SheetDescription className="text-left">
                        AI-generated summaries for &quot;{articleTitle}&quot;
                    </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 h-full">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-center space-y-2">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                                <p className="text-sm text-muted-foreground">
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
                                        <p className="text-sm leading-relaxed text-foreground">
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
                        <div className="flex items-center justify-center h-32">
                            <div className="text-center space-y-2">
                                <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
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