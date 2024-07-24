"use client";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<{ [key: string]: File | undefined }>({});

  function handleFileChange(event: any) {
    const { id, files } = event.target;
    setFiles((prevFiles) => ({
      ...prevFiles,
      [id]: files[0],
    }));
  }

  async function handleUpload() {
    const formData = new FormData();
    formData.append("vehicles_file", files.vehicles!);
    formData.append("routes_file", files.routes!);
    formData.append("base_load_file", files.baseLoad!);

    const response = await fetch("/api/simulate", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "simulation_results.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      console.error("Failed to download the file");
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center space-y-8">
        {["vehicles", "routes", "baseLoad"].map((fileType) => (
          <FileInput
            key={fileType}
            id={fileType}
            label={`Upload the ${fileType} CSV file`}
            onChange={handleFileChange}
          />
        ))}
      </div>
      <Button className="mt-10" variant="default" onClick={handleUpload}>
        Upload
      </Button>
    </div>
  );
}
