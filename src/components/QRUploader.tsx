import React from "react";

export default function QRUploader({ onDecode }: { onDecode: (text: string) => void }) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("https://api.qrserver.com/v1/read-qr-code/", {
        method: "POST",
        body: fd,
      });
      const data = await resp.json();
      const text = data?.[0]?.symbol?.[0]?.data || null;
      if (text) onDecode(text);
      else alert("Could not decode QR from image");
    } catch (e: any) {
      alert("Upload failed: " + String(e));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
        onClick={() => fileRef.current?.click()}
      >
        Upload QR image
      </button>
    </div>
  );
}
