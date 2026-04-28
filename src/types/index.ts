export type Locale = "zh" | "en";

export interface I18nText {
  zh: string;
  en: string;
}

export interface ProductSpec {
  name: I18nText;
  options: string[];
}

export interface Product {
  id: string;
  name: I18nText;
  description: I18nText;
  price: number;
  images: string[];
  category: string;
  specs: ProductSpec[];
  stock: number;
  createdAt: Date;
}

export interface CartItem {
  id: string;
  sessionId: string;
  productId: string;
  quantity: number;
  specs: Record<string, string>;
  createdAt: Date;
  product?: Product;
}

export interface Recommendation {
  id: string;
  productId: string;
  relatedId: string;
  score: number;
  relatedProduct?: Product;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ApiPanelPosition = "top" | "bottom" | "left" | "right";

export interface ApiPanelTab {
  key: "request" | "response" | "suggestions" | "nextSteps";
  staticContent?: string;
}

export interface ApiPanelConfig {
  id: string;
  title: string;
  /** Default position — overridden by user's saved preference */
  defaultPosition?: ApiPanelPosition;
  defaultOpen?: boolean;
  suggestions?: string;
  nextSteps?: string;
}

export interface ApiPanelEntry {
  request: unknown;
  response: unknown;
  isOpen: boolean;
  timestamp: number;
}

export type ApiPanelStore = Record<string, ApiPanelEntry>;

export interface CartState {
  items: CartItem[];
  sessionId: string;
  setItems: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalCount: () => number;
  totalPrice: () => number;
}
