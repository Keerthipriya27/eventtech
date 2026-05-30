import React from "react";

export default function QRScanner({ onDecode, onClose }: { onDecode: (text: string) => void; onClose: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const detectorRef = React.useRef<any>(null);

  React.useEffect(() => {
    let mounted = true;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!mounted) return;
        if (videoRef.current) videoRef.current.srcObject = stream;
        await videoRef.current?.play();

        // Create BarcodeDetector if available
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        if (BarcodeDetectorClass) {
          const formats = ["qr_code"];
          detectorRef.current = new BarcodeDetectorClass({ formats });
          const scan = async () => {
            try {
              if (!videoRef.current || videoRef.current.readyState < 2) {
                rafRef.current = requestAnimationFrame(scan);
                return;
              }
              const canvas = document.createElement('canvas');
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) ctx.drawImage(videoRef.current, 0, 0);
              const imageBitmap = await createImageBitmap(canvas);
              const results = await detectorRef.current.detect(imageBitmap);
              if (results && results.length) {
                const raw = results[0]?.rawValue;
                if (raw) {
                  onDecode(raw);
                  stopStream();
                  return;
                }
              }
            } catch (e) {
              // ignore and continue
            }
            rafRef.current = requestAnimationFrame(scan);
          };
          rafRef.current = requestAnimationFrame(scan);
        } else {
          // No BarcodeDetector support — inform user to upload image instead
        }
      } catch (e) {
        console.error('camera error', e);
      }
    }
    start();

    function stopStream() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const s = videoRef.current?.srcObject as MediaStream | null;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
      }
      onClose();
    }

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const s = videoRef.current?.srcObject as MediaStream | null;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, [onDecode, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background border border-border rounded-lg p-4 w-full max-w-md">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Scan QR Code</h4>
          <button className="text-sm text-muted-foreground" onClick={onClose}>Close</button>
        </div>
        <div className="w-full h-64 bg-black flex items-center justify-center overflow-hidden rounded">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Point camera at attendee QR to check in.</p>
      </div>
    </div>
  );
}
