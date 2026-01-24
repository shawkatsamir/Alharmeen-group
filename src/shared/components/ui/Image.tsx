import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

export function Img({ src, alt, className, ...props }: ImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      {...props}
    />
  );
}
