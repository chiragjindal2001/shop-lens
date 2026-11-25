export interface ProductDto {
  id: string;
  name: string;
  category: string;
  /** One line shown on the product card. */
  tagline: string;
  description: string;
  /** INR, whole rupees */
  price: number;
  features: string[];
  warranty: string;
  /** Free shipping applies from ₹499 (see the shipping policy). */
  freeShipping: boolean;
}

export interface ProductsResponse {
  products: ProductDto[];
}
