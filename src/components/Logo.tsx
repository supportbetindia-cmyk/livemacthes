import Image from "next/image";
import { optimizable } from "@/lib/images";

// Team logo / player photo at a fixed pixel size. next/image serves a copy resized to `size`
// (logos come as 100–500px originals but show at 16–64px), lazy-loads it, and reserves the box so nothing shifts.
export function Logo({ src, size, round = true, className = "" }: { src?: string; size: number; round?: boolean; className?: string }) {
  const box = `shrink-0 ${round ? "rounded-full" : "rounded-[2px]"} ${className}`;
  if (!src) return <span className={`${box} bg-raised`} style={{ width: size, height: size }} />;
  return <Image src={src} alt="" width={size} height={size} unoptimized={!optimizable(src)} className={`${box} object-contain`} />;
}
