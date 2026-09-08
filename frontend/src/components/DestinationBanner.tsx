import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { bannerSlides } from "@/data/fakePackages";

export function DestinationBanner() {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % bannerSlides.length),
      4500,
    );
    return () => window.clearInterval(id);
  }, [isHovered]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-[420px] w-full overflow-hidden rounded-[24px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all sm:h-[480px] lg:h-[500px] lg:[mask-image:linear-gradient(90deg,#000_82%,transparent_100%)] lg:[-webkit-mask-image:linear-gradient(90deg,#000_82%,transparent_100%)] cursor-pointer"
    >
      {bannerSlides.map((slide, i) => (
        <img
          key={slide.city}
          src={slide.image}
          alt={`${slide.city}, ${slide.country}`}
          width={1600}
          height={900}
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out ${
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          } ${isHovered ? "scale-105" : "scale-100"}`}
        />
      ))}

      {/* Dark gradient overlay for bottom text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Top right indicator dots */}
      <div className="absolute top-5 right-6 z-20 flex gap-2">
        {bannerSlides.map((s, i) => (
          <button
            key={s.city}
            onClick={(e) => {
              e.stopPropagation();
              setIndex(i);
            }}
            aria-label={`Show ${s.city}`}
            className={`size-2 rounded-full transition-all duration-300 ${
              i === index
                ? "scale-125 bg-primary ring-2 ring-primary/40"
                : "bg-white/35 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      {/* Bottom info */}
      <div className="relative flex h-full flex-col justify-end gap-2.5 p-6 sm:p-8">
        <span className="inline-block w-fit rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-primary backdrop-blur-md">
          Featured Destination
        </span>
        <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
          {bannerSlides[index]!.city}
          <span className="ml-3 text-lg font-normal text-gray-400">
            {bannerSlides[index]!.country}
          </span>
        </h2>
        <p className="max-w-md text-xs leading-relaxed text-gray-300 sm:text-sm">
          {bannerSlides[index]!.speciality}
        </p>
      </div>
    </div>
  );
}
