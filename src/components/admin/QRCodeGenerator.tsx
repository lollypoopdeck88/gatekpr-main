import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QrCode, Download, Printer, Copy, Share2 } from 'lucide-react';

export function QRCodeGenerator() {
  const { effectiveHoaId } = useAuth();
  const qrRef = useRef<HTMLDivElement>(null);

  // Get HOA info for display
  const { data: hoa } = useQuery({
    queryKey: ['hoa', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hoas')
        .select('name, id')
        .eq('id', effectiveHoaId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId,
  });

  // Generate the community-wide join URL using the HOA ID
  const getJoinUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/request-join?hoa=${effectiveHoaId}`;
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getJoinUrl());
    toast.success('Link copied to clipboard');
  };

  const downloadQR = () => {
    const svgElement = document.getElementById('community-qr');
    if (!svgElement) return;
    const svg = svgElement as unknown as SVGSVGElement;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // Create larger canvas for print quality
      canvas.width = 400;
      canvas.height = 500;
      
      if (ctx) {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code centered
        ctx.drawImage(img, 50, 30, 300, 300);
        
        // Add text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hoa?.name || 'Join Our Community', canvas.width / 2, 360);
        
        ctx.font = '14px sans-serif';
        ctx.fillText('Scan to join our community', canvas.width / 2, 390);
        
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Powered by GateKpr', canvas.width / 2, 480);
        
        // Download
        const link = document.createElement('a');
        link.download = `${hoa?.name?.replace(/\s+/g, '-') || 'community'}-qr-code.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    const svg = document.getElementById('community-qr');
    if (!svg) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${hoa?.name || 'Community'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px dashed #ccc;
              border-radius: 12px;
            }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 4px 0; color: #666; }
            .subtitle { font-weight: 600; color: #333; margin-top: 16px; }
            .powered { font-size: 12px; color: #999; margin-top: 24px; }
            @media print {
              .qr-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${hoa?.name || 'Join Our Community'}</h1>
            <p>Scan to create your account and join</p>
            <div style="margin: 24px 0;">${svgData}</div>
            <p class="subtitle">Welcome to our community!</p>
            <p class="powered">Powered by GateKpr</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const url = getJoinUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${hoa?.name || 'our community'}`,
          text: `Scan the QR code or click this link to join ${hoa?.name || 'our community'} on GateKpr`,
          url,
        });
      } catch {
        // User cancelled or share failed, fallback to copy
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (!effectiveHoaId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Please select an HOA to generate a QR code.
        </CardContent>
      </Card>
    );
  }

  const joinUrl = getJoinUrl();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Community QR Code
        </CardTitle>
        <CardDescription>
          Share this QR code with residents to let them join your community instantly.
          Post it in common areas, include it in newsletters, or share on social media.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center">
          {/* QR Code Display */}
          <div 
            ref={qrRef} 
            className="bg-white p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 mb-4"
          >
            <QRCodeSVG
              id="community-qr"
              value={joinUrl}
              size={200}
              level="M"
              includeMargin
            />
          </div>
          
          {/* Community Info */}
          <div className="text-center mb-6">
            <h3 className="font-semibold text-lg">{hoa?.name || 'Your Community'}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Scan to join our community
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={downloadQR}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={printQR}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Link Display */}
          <div className="mt-6 w-full max-w-md">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Or share this link directly:
            </p>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <code className="text-xs flex-1 truncate text-muted-foreground">
                {joinUrl}
              </code>
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-secondary/10 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">💡 Tips for sharing</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Post the QR code on bulletin boards in common areas</li>
            <li>• Include it in your community newsletter</li>
            <li>• Share the link in community social media groups</li>
            <li>• Hand out printed copies at community events</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
