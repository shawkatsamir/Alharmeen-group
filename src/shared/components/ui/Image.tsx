import Image, { type ImageProps } from "next/image";

export function Img({ src, alt, className, ...props }: ImageProps) {
  return <Image src={src} alt={alt} className={className} {...props} />;
}
