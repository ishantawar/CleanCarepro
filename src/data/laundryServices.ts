export interface LaundryService {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  unit: string;
  description?: string;
  minQuantity?: number;
  icon?: string;
  image?: string;
  popular?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  services: LaundryService[];
}

export const laundryServices: ServiceCategory[] = [
  {
    id: "wash-fold",
    name: "Wash & Fold",
    icon: "👕",
    color: "from-blue-500 to-blue-600",
    description: "Professional washing and folding service",
    services: [
      {
        id: "wf-regular",
        name: "Laundry and Fold",
        category: "Wash & Fold",
        price: 70,
        unit: "per kg",
        description: "Regular wash and fold service",
        minQuantity: 1,
        popular: true,
        image:
          "https://cdn.builder.io/api/v1/image/assets%2F3ed634e80c4f4cd793d62c1354de966f%2F36d1236ed04c4ae0aa24948824cf6f42?format=webp&width=800",
      },
      {
        id: "wf-bulk",
        name: "Laundry and Fold (Bulk)",
        category: "Wash & Fold",
        price: 60,
        unit: "per kg",
        description: "Bulk pricing for 3kg and above",
        minQuantity: 3,
        image:
          "https://images.pexels.com/photos/7245094/pexels-photo-7245094.jpeg",
      },
    ],
  },
  {
    id: "wash-iron",
    name: "Wash & Iron",
    icon: "🏷️",
    color: "from-green-500 to-green-600",
    description: "Washing with professional ironing",
    services: [
      {
        id: "wi-regular",
        name: "Laundry and Iron",
        category: "Wash & Iron",
        price: 120,
        unit: "per kg",
        description: "Professional wash and iron service",
        minQuantity: 1,
        popular: true,
        image:
          "https://cdn.builder.io/api/v1/image/assets%2F3ed634e80c4f4cd793d62c1354de966f%2F61aef7e516b742c1b6fa99edcdcc8c97?format=webp&width=800",
      },
      {
        id: "wi-bulk",
        name: "Laundry and Iron (Bulk)",
        category: "Wash & Iron",
        price: 110,
        unit: "per kg",
        description: "Bulk pricing for 3kg and above",
        minQuantity: 3,
        image:
          "https://images.pexels.com/photos/1682699/pexels-photo-1682699.jpeg",
      },
    ],
  },
  {
    id: "steam-iron",
    name: "Steam Iron Only",
    icon: "🔥",
    color: "from-orange-500 to-orange-600",
    description: "Professional steam ironing service",
    services: [
      {
        id: "si-premium",
        name: "Premium Items (Steam Iron)",
        category: "Steam Iron",
        subcategory: "Premium",
        price: 50,
        unit: "per piece",
        description: "Coat, Lehenga, Sweatshirt, Sweater, Achkan",
        popular: true,
        image:
          "https://images.pexels.com/photos/10558187/pexels-photo-10558187.jpeg",
      },
      {
        id: "si-regular",
        name: "Regular Items (Steam Iron)",
        category: "Steam Iron",
        subcategory: "Regular",
        price: 30,
        unit: "per piece",
        description: "All other garments",
        image:
          "https://images.pexels.com/photos/10558187/pexels-photo-10558187.jpeg",
      },
    ],
  },
  {
    id: "mens-dry-clean",
    name: "Men's Dry Clean",
    icon: "👔",
    color: "from-purple-500 to-purple-600",
    description: "Professional dry cleaning for men's wear",
    services: [
      {
        id: "mdc-shirt",
        name: "Shirt/T-Shirt",
        category: "Men's Dry Clean",
        price: 90,
        unit: "per piece",
        description: "Professional dry cleaning for shirts",
        popular: true,
        image:
          "https://images.pexels.com/photos/834863/pexels-photo-834863.jpeg",
      },
      {
        id: "mdc-trouser",
        name: "Trouser/Jeans",
        category: "Men's Dry Clean",
        price: 120,
        unit: "per piece",
        description: "Dry cleaning for trousers and jeans",
        image:
          "https://images.pexels.com/photos/1682699/pexels-photo-1682699.jpeg",
      },
      {
        id: "mdc-coat",
        name: "Coat",
        category: "Men's Dry Clean",
        price: 220,
        unit: "per piece",
        description: "Professional coat dry cleaning",
        image:
          "https://images.pexels.com/photos/32836867/pexels-photo-32836867.jpeg",
      },
      {
        id: "mdc-suit-2pc",
        name: "Men's Suit (2 Piece)",
        category: "Men's Dry Clean",
        price: 330,
        unit: "per set",
        description: "Complete 2-piece suit cleaning",
        image:
          "https://images.pexels.com/photos/1682699/pexels-photo-1682699.jpeg",
      },
      {
        id: "mdc-suit-3pc",
        name: "Men's Suit (3 Piece)",
        category: "Men's Dry Clean",
        price: 380,
        unit: "per set",
        description: "Complete 3-piece suit cleaning",
        image:
          "https://images.pexels.com/photos/1682699/pexels-photo-1682699.jpeg",
      },
      {
        id: "mdc-kurta-pajama",
        name: "Kurta Pyjama Set",
        category: "Men's Dry Clean",
        price: 220,
        unit: "per set",
        description: "Traditional kurta pyjama set",
        image:
          "https://images.pexels.com/photos/8818660/pexels-photo-8818660.jpeg",
      },
      {
        id: "mdc-achkan",
        name: "Achkan",
        category: "Men's Dry Clean",
        price: 380,
        unit: "per piece",
        description: "Traditional achkan dry cleaning",
        image:
          "https://images.pexels.com/photos/8818660/pexels-photo-8818660.jpeg",
      },
    ],
  },
  {
    id: "womens-dry-clean",
    name: "Women's Dry Clean",
    icon: "👗",
    color: "from-pink-500 to-pink-600",
    description: "Specialized dry cleaning for women's wear",
    services: [
      {
        id: "wdc-kurta",
        name: "Kurta",
        category: "Women's Dry Clean",
        price: 140,
        unit: "per piece",
        description: "Professional kurta dry cleaning",
        popular: true,
        image:
          "https://images.pexels.com/photos/8818660/pexels-photo-8818660.jpeg",
      },
      {
        id: "wdc-salwar",
        name: "Salwar/Plazo/Dupatta",
        category: "Women's Dry Clean",
        price: 120,
        unit: "per piece",
        description: "Bottom wear and dupatta cleaning",
        image:
          "https://images.pexels.com/photos/8818660/pexels-photo-8818660.jpeg",
      },
      {
        id: "wdc-saree-simple",
        name: "Saree (Simple/Silk)",
        category: "Women's Dry Clean",
        price: 210,
        unit: "per piece",
        description: "Regular and silk saree cleaning",
        image:
          "https://cdn.builder.io/api/v1/image/assets%2F3ed634e80c4f4cd793d62c1354de966f%2F36d1236ed04c4ae0aa24948824cf6f42?format=webp&width=800",
      },
      {
        id: "wdc-saree-heavy",
        name: "Saree (Heavy Work)",
        category: "Women's Dry Clean",
        price: 350,
        unit: "per piece",
        description: "Heavy work saree with embellishments",
        image:
          "https://cdn.builder.io/api/v1/image/assets%2F3ed634e80c4f4cd793d62c1354de966f%2F36d1236ed04c4ae0aa24948824cf6f42?format=webp&width=800",
      },
      {
        id: "wdc-blouse",
        name: "Blouse",
        category: "Women's Dry Clean",
        price: 90,
        unit: "per piece",
        description: "Blouse dry cleaning",
        image:
          "https://images.pexels.com/photos/23363993/pexels-photo-23363993.jpeg",
      },
      {
        id: "wdc-dress",
        name: "Dress",
        category: "Women's Dry Clean",
        price: 330,
        unit: "per piece",
        description: "Western dress dry cleaning",
        image:
          "https://images.pexels.com/photos/1200643/pexels-photo-1200643.jpeg",
      },
      {
        id: "wdc-top",
        name: "Top",
        category: "Women's Dry Clean",
        price: 100,
        unit: "per piece",
        description: "Top/shirt dry cleaning",
        image:
          "https://images.pexels.com/photos/23363993/pexels-photo-23363993.jpeg",
      },
      {
        id: "wdc-skirt",
        name: "Skirt (Heavy)",
        category: "Women's Dry Clean",
        price: 200,
        unit: "per piece",
        description: "Heavy skirt dry cleaning",
        image:
          "https://images.pexels.com/photos/297367/pexels-photo-297367.jpeg",
      },
      {
        id: "wdc-lehenga-1pc",
        name: "Lehenga (1 Piece)",
        category: "Women's Dry Clean",
        price: 330,
        unit: "per piece",
        description: "Single piece lehenga",
        image:
          "https://images.pexels.com/photos/27155546/pexels-photo-27155546.jpeg",
      },
      {
        id: "wdc-lehenga-2pc",
        name: "Lehenga (2+ Pieces)",
        category: "Women's Dry Clean",
        price: 450,
        unit: "per set",
        description: "Multi-piece lehenga set",
        popular: true,
        image:
          "https://images.pexels.com/photos/27155546/pexels-photo-27155546.jpeg",
      },
      {
        id: "wdc-lehenga-heavy",
        name: "Lehenga (Heavy Work)",
        category: "Women's Dry Clean",
        price: 700,
        unit: "per set",
        description: "Heavy work lehenga with intricate details",
        image:
          "https://images.pexels.com/photos/27155546/pexels-photo-27155546.jpeg",
      },
    ],
  },
  {
    id: "woolen-dry-clean",
    name: "Woolen Dry Clean",
    icon: "🧥",
    color: "from-indigo-500 to-indigo-600",
    description: "Specialized care for woolen and winter wear",
    services: [
      {
        id: "wol-jacket",
        name: "Jacket (Full/Half Sleeves)",
        category: "Woolen Dry Clean",
        price: 300,
        unit: "per piece",
        description: "Professional jacket cleaning",
        image:
          "https://cdn.builder.io/api/v1/image/assets%2Fc97d5a75b4604b65bd2bd6fccd499b08%2Fb935c8c1aa864281bd31c892116f9719?format=webp&width=800",
        popular: true,
      },
      {
        id: "wol-sweater",
        name: "Sweater/Sweatshirt",
        category: "Woolen Dry Clean",
        price: 200,
        unit: "per piece",
        description: "Sweater and sweatshirt care",
        image:
          "https://images.pexels.com/photos/6996083/pexels-photo-6996083.jpeg",
      },
      {
        id: "wol-long-coat",
        name: "Long Coat",
        category: "Woolen Dry Clean",
        price: 400,
        unit: "per piece",
        description: "Long winter coat cleaning",
        image:
          "https://images.pexels.com/photos/32836867/pexels-photo-32836867.jpeg",
      },
      {
        id: "wol-shawl",
        name: "Shawl",
        category: "Woolen Dry Clean",
        price: 250,
        unit: "per piece",
        description: "Delicate shawl cleaning",
        image:
          "https://images.pexels.com/photos/31617140/pexels-photo-31617140.jpeg",
      },
      {
        id: "wol-pashmina",
        name: "Pashmina",
        category: "Woolen Dry Clean",
        price: 550,
        unit: "per piece",
        description: "Premium pashmina care",
        image:
          "https://images.pexels.com/photos/31617140/pexels-photo-31617140.jpeg",
      },
      {
        id: "wol-leather",
        name: "Leather Jacket",
        category: "Woolen Dry Clean",
        price: 600,
        unit: "per piece",
        description: "Specialized leather jacket cleaning",
        image:
          "https://images.pexels.com/photos/1035685/pexels-photo-1035685.jpeg",
      },
    ],
  },
];

// Helper functions
export const getServiceById = (id: string): LaundryService | undefined => {
  for (const category of laundryServices) {
    const service = category.services.find((s) => s.id === id);
    if (service) return service;
  }
  return undefined;
};

export const getServicesByCategory = (categoryId: string): LaundryService[] => {
  const category = laundryServices.find((c) => c.id === categoryId);
  return category ? category.services : [];
};

export const getPopularServices = (): LaundryService[] => {
  const popular: LaundryService[] = [];
  laundryServices.forEach((category) => {
    popular.push(...category.services.filter((s) => s.popular));
  });
  // Sort popular services alphabetically
  return popular.sort((a, b) => a.name.localeCompare(b.name));
};

export const getSortedServices = (): LaundryService[] => {
  const allServices: LaundryService[] = [];
  laundryServices.forEach((category) => {
    allServices.push(...category.services);
  });

  // Separate popular and regular services
  const popular = allServices
    .filter((s) => s.popular)
    .sort((a, b) => a.name.localeCompare(b.name));
  const regular = allServices
    .filter((s) => !s.popular)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Return popular first, then regular
  return [...popular, ...regular];
};

export const searchServices = (query: string): LaundryService[] => {
  const searchTerm = query.toLowerCase();
  const results: LaundryService[] = [];

  laundryServices.forEach((category) => {
    category.services.forEach((service) => {
      if (
        service.name.toLowerCase().includes(searchTerm) ||
        service.category.toLowerCase().includes(searchTerm) ||
        service.description?.toLowerCase().includes(searchTerm)
      ) {
        results.push(service);
      }
    });
  });

  return results;
};
