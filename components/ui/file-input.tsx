import { ChangeEvent } from "react";
import { Input } from "./input";
import { Label } from "./label";

interface FileInputProps {
  id: string;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function FileInput({ id, label, onChange }: FileInputProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="file" onChange={onChange} />
    </div>
  );
}

export { FileInput };
