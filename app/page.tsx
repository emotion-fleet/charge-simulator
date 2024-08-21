"use client";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { useState } from "react";
import JSZip from "jszip";
import Papa from "papaparse";
import { EnergyChart } from "@/components/ui/EnergyChart";

export default function Home() {

  const [files, setFiles] = useState<{ [key: string]: File | undefined }>({});
  const [data, setData] = useState(null);

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

      const jsonData = await handleZipResponse(blob);
      if(jsonData){
        setData(jsonData);
      }
    } else {
      console.error("Failed to download the file");
    }
  }

  async function handleZipResponse(blob: Blob) {
    const zip = await JSZip.loadAsync(blob);
    let res: any = {};
    for (const relativePath in zip.files) {
      const file = zip.files[relativePath];

      if (file.name.endsWith(".csv")) {
        const csvData = await file.async("text");

        const parsedData = Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
        });

        res[file.name] = parsedData.data;
      }
    }

    return res;
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
      <div className="mt-16 w-full">
        {data && <EnergyChart chartData={data} />}
      </div>
    </div>
  );
}
