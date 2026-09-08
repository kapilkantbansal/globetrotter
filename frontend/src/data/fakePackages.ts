import santorini from "@/assets/city-santorini.jpg";
import kyoto from "@/assets/city-kyoto.jpg";
import goa from "@/assets/city-goa.jpg";
import paris from "@/assets/city-paris.jpg";

export interface RecommendedPackage {
  id: number;
  name: string;
  city: string;
  country: string;
  days: number;
  price_from: number;
  tags: string[];
  image: string;
}

export const fakePackages: RecommendedPackage[] = [
  {
    id: 1,
    name: "Island Blues & Sunsets",
    city: "Santorini",
    country: "Greece",
    days: 6,
    price_from: 84000,
    tags: ["Caldera views", "Wine tasting"],
    image: santorini,
  },
  {
    id: 2,
    name: "Temples & Bamboo Trails",
    city: "Kyoto",
    country: "Japan",
    days: 8,
    price_from: 96000,
    tags: ["Heritage", "Autumn leaves"],
    image: kyoto,
  },
  {
    id: 3,
    name: "Konkan Coast Chill",
    city: "Goa",
    country: "India",
    days: 5,
    price_from: 22000,
    tags: ["Beaches", "Seafood"],
    image: goa,
  },
  {
    id: 4,
    name: "Lights of the Seine",
    city: "Paris",
    country: "France",
    days: 7,
    price_from: 112000,
    tags: ["Museums", "Cafés"],
    image: paris,
  },
];

export interface BannerSlide {
  city: string;
  country: string;
  speciality: string;
  image: string;
}

export const bannerSlides: BannerSlide[] = [
  {
    city: "Kyoto",
    country: "Japan",
    speciality: "Vermillion torii gates threading through silent bamboo groves",
    image: kyoto,
  },
  {
    city: "Santorini",
    country: "Greece",
    speciality: "Whitewashed cliffside villages and the world's slowest sunsets",
    image: santorini,
  },
  {
    city: "Goa",
    country: "India",
    speciality: "Palm-lined sands, fishing boats and pepper-fried seafood",
    image: goa,
  },
  {
    city: "Paris",
    country: "France",
    speciality: "Boulevard cafés and an iron tower that catches fire at dusk",
    image: paris,
  },
];
