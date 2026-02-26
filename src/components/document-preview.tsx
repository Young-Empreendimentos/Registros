'use client';

import { ExternalLink, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DocumentPreviewProps {
  url: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}

function getEmbedUrl(url: string): string {
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }
  return url;
}

export function DocumentPreview({ url, title, open, onClose }: DocumentPreviewProps) {
  if (!url) return null;

  const embedUrl = getEmbedUrl(url);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-lg border border-zinc-700"
            style={{ minHeight: 'calc(90vh - 80px)' }}
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
