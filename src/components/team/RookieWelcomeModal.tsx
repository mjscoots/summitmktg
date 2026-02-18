import { useState } from 'react';
import { Copy, Check, MessageSquare, Phone, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RookieWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  repName: string;
  repPhone: string;
}

export function RookieWelcomeModal({ isOpen, onClose, repName, repPhone }: RookieWelcomeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyNumber = async () => {
    if (!repPhone) return;
    
    try {
      await navigator.clipboard.writeText(repPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleText = () => {
    if (!repPhone) return;
    // Clean phone number for SMS link
    const cleanPhone = repPhone.replace(/\D/g, '');
    window.open(`sms:${cleanPhone}`, '_blank');
  };

  const handleCall = () => {
    if (!repPhone) return;
    // Clean phone number for tel link
    const cleanPhone = repPhone.replace(/\D/g, '');
    window.open(`tel:${cleanPhone}`, '_blank');
  };

  // Extract first name
  const firstName = repName.split(' ')[0] || repName;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
            <PartyPopper className="w-8 h-8 text-success" />
          </div>
          <DialogTitle className="text-xl">
            Welcome {repName}!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Phone number display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Phone Number</p>
            <p className="text-2xl font-bold text-foreground tracking-wide">
              {repPhone || 'Not available'}
            </p>
          </div>

          {/* Copy button */}
          {repPhone && (
            <Button
              onClick={handleCopyNumber}
              variant="outline"
              className={cn(
                "w-full h-12 text-base transition-all",
                copied && "bg-success/20 border-success text-success"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Number
                </>
              )}
            </Button>
          )}

          {/* Mobile action buttons */}
          {repPhone && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleText}
                variant="outline"
                className="h-12"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Text {firstName}
              </Button>
              <Button
                onClick={handleCall}
                variant="outline"
                className="h-12"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call {firstName}
              </Button>
            </div>
          )}

          {/* Encouraging message */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Reach out and welcome them to the squad!
            </p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Pro tip: Introduce yourself and offer to grab coffee or answer any questions they have.
            </p>
          </div>
        </div>

        {/* Close button */}
        <Button
          onClick={onClose}
          className="w-full"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
