export interface FurnitureItem {
  id: string;
  label: string;
  icon: string;
  iconType: 'lucide' | 'emoji';
  essential?: boolean;
}

export const ROOM_FURNITURE: Record<string, FurnitureItem[]> = {
  'Living Room': [
    { id: 'sofa',         label: 'Sofa',         icon: 'Sofa',       iconType: 'lucide', essential: true },
    { id: 'armchair',     label: 'Armchair',      icon: 'Armchair',   iconType: 'lucide', essential: true },
    { id: 'coffee-table', label: 'Coffee Table',  icon: 'Coffee',     iconType: 'lucide', essential: true },
    { id: 'tv-unit',      label: 'TV Unit',       icon: 'Tv',         iconType: 'lucide', essential: true },
    { id: 'floor-lamp',   label: 'Floor Lamp',    icon: 'LampFloor',  iconType: 'lucide', essential: true },
    { id: 'rug',          label: 'Rug',           icon: 'LayoutGrid', iconType: 'lucide' },
    { id: 'bookshelf',    label: 'Bookshelf',     icon: 'Library',    iconType: 'lucide' },
    { id: 'table-lamp',   label: 'Table Lamp',    icon: 'Lamp',       iconType: 'lucide' },
    { id: 'curtains',     label: 'Curtains',      icon: '🪟',         iconType: 'emoji' },
    { id: 'plants',       label: 'Plants',        icon: 'Flower2',    iconType: 'lucide' },
    { id: 'wall-art',     label: 'Wall Art',      icon: 'Frame',      iconType: 'lucide' },
    { id: 'mirror',       label: 'Mirror',        icon: '🪞',         iconType: 'emoji' },
  ],

  'Bedroom': [
    { id: 'bed',            label: 'Bed',            icon: 'BedDouble',  iconType: 'lucide', essential: true },
    { id: 'nightstands',    label: 'Nightstands',    icon: 'Lamp',       iconType: 'lucide', essential: true },
    { id: 'wardrobe',       label: 'Wardrobe',       icon: 'Shirt',     iconType: 'lucide', essential: true },
    { id: 'dresser',        label: 'Dresser',        icon: 'Layers',     iconType: 'lucide', essential: true },
    { id: 'dressing-table', label: 'Dressing Table', icon: 'Sparkles',   iconType: 'lucide' },
    { id: 'mirror',         label: 'Mirror',         icon: '🪞',         iconType: 'emoji' },
    { id: 'curtains',       label: 'Curtains',       icon: '🪟',         iconType: 'emoji' },
    { id: 'rug',            label: 'Rug',            icon: 'LayoutGrid', iconType: 'lucide' },
    { id: 'floor-lamp',     label: 'Floor Lamp',     icon: 'LampFloor',  iconType: 'lucide' },
    { id: 'plants',         label: 'Plants',         icon: 'Flower2',    iconType: 'lucide' },
    { id: 'accent-chair',   label: 'Accent Chair',   icon: 'Armchair',   iconType: 'lucide' },
    { id: 'bench',          label: 'Foot Bench',     icon: 'Sofa',       iconType: 'lucide' },
  ],

  'Kids Bedroom': [
    { id: 'bed',         label: 'Bed',           icon: 'BedSingle',  iconType: 'lucide', essential: true },
    { id: 'study-desk',  label: 'Study Desk',    icon: 'Monitor',    iconType: 'lucide', essential: true },
    { id: 'wardrobe',    label: 'Wardrobe',      icon: 'Shirt',     iconType: 'lucide', essential: true },
    { id: 'bookshelf',   label: 'Bookshelf',     icon: 'Library',    iconType: 'lucide' },
    { id: 'toy-storage', label: 'Toy Storage',   icon: 'Package',    iconType: 'lucide' },
    { id: 'desk-lamp',   label: 'Desk Lamp',     icon: 'LampDesk',   iconType: 'lucide' },
    { id: 'rug',         label: 'Rug',           icon: 'LayoutGrid', iconType: 'lucide' },
    { id: 'curtains',    label: 'Curtains',      icon: '🪟',         iconType: 'emoji' },
  ],

  'Kitchen': [
    { id: 'fridge',     label: 'Refrigerator',   icon: '🧊',           iconType: 'emoji',  essential: true },
    { id: 'stove',      label: 'Oven / Stove',   icon: 'Flame',        iconType: 'lucide', essential: true },
    { id: 'cabinets',   label: 'Cabinets',       icon: 'Package',      iconType: 'lucide', essential: true },
    { id: 'island',     label: 'Kitchen Island', icon: 'Utensils',     iconType: 'lucide' },
    { id: 'bar-stools', label: 'Bar Stools',     icon: 'Armchair',     iconType: 'lucide' },
    { id: 'microwave',  label: 'Microwave',      icon: '📦',           iconType: 'emoji' },
    { id: 'plants',     label: 'Plants',         icon: 'Flower2',      iconType: 'lucide' },
    { id: 'lighting',   label: 'Lighting',       icon: 'Lamp',         iconType: 'lucide' },
  ],

  'Dining Room': [
    { id: 'dining-table',    label: 'Dining Table',    icon: 'Utensils',   iconType: 'lucide', essential: true },
    { id: 'dining-chairs',   label: 'Dining Chairs',   icon: 'Armchair',   iconType: 'lucide', essential: true },
    { id: 'chandelier',      label: 'Chandelier',      icon: 'Lamp',       iconType: 'lucide', essential: true },
    { id: 'sideboard',       label: 'Sideboard',       icon: 'Layers',     iconType: 'lucide' },
    { id: 'display-cabinet', label: 'Display Cabinet', icon: 'Library',    iconType: 'lucide' },
    { id: 'rug',             label: 'Rug',             icon: 'LayoutGrid', iconType: 'lucide' },
    { id: 'curtains',        label: 'Curtains',        icon: '🪟',         iconType: 'emoji' },
    { id: 'plants',          label: 'Plants',          icon: 'Flower2',    iconType: 'lucide' },
  ],

  'Bathroom': [
    { id: 'vanity',     label: 'Vanity Unit',     icon: 'ShowerHead', iconType: 'lucide', essential: true },
    { id: 'mirror',     label: 'Mirror',          icon: '🪞',         iconType: 'emoji',  essential: true },
    { id: 'bathtub',    label: 'Bathtub',         icon: 'Bath',       iconType: 'lucide', essential: true },
    { id: 'shower',     label: 'Shower',          icon: 'ShowerHead', iconType: 'lucide' },
    { id: 'towel-rail', label: 'Towel Rail',      icon: 'Layers',     iconType: 'lucide' },
    { id: 'storage',    label: 'Storage Cabinet', icon: 'Package',    iconType: 'lucide' },
    { id: 'plants',     label: 'Plants',          icon: 'Flower2',    iconType: 'lucide' },
    { id: 'mat',        label: 'Bath Mat',        icon: 'LayoutGrid', iconType: 'lucide' },
  ],

  'Home Office': [
    { id: 'desk',         label: 'Desk',           icon: 'Monitor',  iconType: 'lucide', essential: true },
    { id: 'office-chair', label: 'Office Chair',   icon: 'Armchair', iconType: 'lucide', essential: true },
    { id: 'monitor',      label: 'Monitor',        icon: 'Monitor',  iconType: 'lucide', essential: true },
    { id: 'bookshelf',    label: 'Bookshelf',      icon: 'Library',  iconType: 'lucide' },
    { id: 'desk-lamp',    label: 'Desk Lamp',      icon: 'LampDesk', iconType: 'lucide' },
    { id: 'filing',       label: 'Filing Cabinet', icon: 'Layers',   iconType: 'lucide' },
    { id: 'plants',       label: 'Plants',         icon: 'Flower2',  iconType: 'lucide' },
    { id: 'curtains',     label: 'Curtains',       icon: '🪟',       iconType: 'emoji' },
  ],

  'Hallway': [
    { id: 'console-table', label: 'Console Table', icon: 'Lamp',       iconType: 'lucide', essential: true },
    { id: 'mirror',        label: 'Mirror',        icon: '🪞',         iconType: 'emoji',  essential: true },
    { id: 'shoe-cabinet',  label: 'Shoe Cabinet',  icon: 'Package',    iconType: 'lucide' },
    { id: 'coat-rack',     label: 'Coat Rack',     icon: 'Shirt',     iconType: 'lucide' },
    { id: 'bench',         label: 'Storage Bench', icon: 'Sofa',       iconType: 'lucide' },
    { id: 'plants',        label: 'Plants',        icon: 'Flower2',    iconType: 'lucide' },
    { id: 'lighting',      label: 'Lighting',      icon: 'LampFloor',  iconType: 'lucide' },
  ],

  'Balcony': [
    { id: 'outdoor-sofa', label: 'Outdoor Sofa',  icon: 'Sofa',       iconType: 'lucide', essential: true },
    { id: 'bistro-table', label: 'Bistro Table',  icon: 'Coffee',     iconType: 'lucide', essential: true },
    { id: 'chairs',       label: 'Chairs',        icon: 'Armchair',   iconType: 'lucide', essential: true },
    { id: 'parasol',      label: 'Parasol',       icon: 'Umbrella',   iconType: 'lucide' },
    { id: 'planters',     label: 'Planters',      icon: 'Flower2',    iconType: 'lucide' },
    { id: 'outdoor-rug',  label: 'Outdoor Rug',   icon: 'LayoutGrid', iconType: 'lucide' },
    { id: 'lighting',     label: 'Lighting',      icon: 'LampFloor',  iconType: 'lucide' },
  ],

  'Garage': [
    { id: 'shelving',  label: 'Shelving',      icon: 'Library',  iconType: 'lucide', essential: true },
    { id: 'workbench', label: 'Workbench',     icon: 'Wrench',   iconType: 'lucide' },
    { id: 'storage',   label: 'Storage Bins',  icon: 'Package',  iconType: 'lucide' },
    { id: 'car',       label: 'Car',           icon: 'Car',      iconType: 'lucide' },
    { id: 'lighting',  label: 'Lighting',      icon: 'Lamp',     iconType: 'lucide' },
  ],

  'Exterior': [
    { id: 'garden-sofa',   label: 'Garden Sofa',  icon: 'Sofa',       iconType: 'lucide', essential: true },
    { id: 'planters',      label: 'Planters',     icon: 'Flower2',    iconType: 'lucide', essential: true },
    { id: 'outdoor-table', label: 'Dining Table', icon: 'Utensils',   iconType: 'lucide' },
    { id: 'bbq',           label: 'BBQ Grill',    icon: 'Flame',      iconType: 'lucide' },
    { id: 'parasol',       label: 'Parasol',      icon: 'Umbrella',   iconType: 'lucide' },
    { id: 'lighting',      label: 'Lighting',     icon: 'LampFloor',  iconType: 'lucide' },
  ],
};

export function getRoomFurniture(roomType: string | null): { room: string; items: FurnitureItem[] } {
  if (!roomType) return { room: 'Living Room', items: ROOM_FURNITURE['Living Room'] };
  const s = roomType.toLowerCase().trim();
  if (/living|lounge|sitting|family|reception/.test(s))          return { room: 'Living Room',  items: ROOM_FURNITURE['Living Room'] };
  if (/kid|child|nursery/.test(s))                               return { room: 'Kids Bedroom', items: ROOM_FURNITURE['Kids Bedroom'] };
  if (/bed/.test(s) && !/bath/.test(s))                          return { room: 'Bedroom',      items: ROOM_FURNITURE['Bedroom'] };
  if (/kitchen|cook|pantry/.test(s))                             return { room: 'Kitchen',      items: ROOM_FURNITURE['Kitchen'] };
  if (/dining|dinner/.test(s))                                   return { room: 'Dining Room',  items: ROOM_FURNITURE['Dining Room'] };
  if (/bath|toilet|shower|wc/.test(s))                           return { room: 'Bathroom',     items: ROOM_FURNITURE['Bathroom'] };
  if (/office|study|work/.test(s))                               return { room: 'Home Office',  items: ROOM_FURNITURE['Home Office'] };
  if (/hall|foyer|entry|corridor|entrance|lobby/.test(s))        return { room: 'Hallway',      items: ROOM_FURNITURE['Hallway'] };
  if (/balcony|patio|terrace|veranda/.test(s))                   return { room: 'Balcony',      items: ROOM_FURNITURE['Balcony'] };
  if (/garage|parking|carport/.test(s))                          return { room: 'Garage',       items: ROOM_FURNITURE['Garage'] };
  if (/exterior|garden|yard|outdoor|outside/.test(s))            return { room: 'Exterior',     items: ROOM_FURNITURE['Exterior'] };
  return { room: 'Living Room', items: ROOM_FURNITURE['Living Room'] };
}

export const STAGING_STYLES = [
  { id: 'modern',       label: 'Modern' },
  { id: 'scandinavian', label: 'Scandinavian' },
  { id: 'minimalist',   label: 'Minimalist' },
  { id: 'cozy',         label: 'Cozy' },
  { id: 'japandi',      label: 'Japandi' },
  { id: 'industrial',   label: 'Industrial' },
  { id: 'classic',      label: 'Classic' },
  { id: 'bohemian',     label: 'Bohemian' },
] as const;

export type StagingStyleId = (typeof STAGING_STYLES)[number]['id'];
