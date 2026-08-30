import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Price, ProductCard, StockBadge } from "@/components/product-card";
import type { ProductListItem } from "@/lib/queries";

const product: ProductListItem = {
  id: "11111111-1111-1111-1111-111111111111",
  brandId: "22222222-2222-2222-2222-222222222222",
  name: "ASUS TUF Gaming F15",
  slug: "asus-tuf-gaming-f15",
  sku: "SST-ASUS-001",
  shortDescription: "Gaming laptop",
  description: null,
  price: 145000,
  compareAtPrice: 159000,
  stock: 7,
  status: "active",
  featured: true,
  processor: "Intel Core i5-12500H",
  processorBrand: "Intel",
  graphics: "RTX 3050",
  ramGb: 16,
  storageGb: 512,
  storageType: "SSD",
  screenSize: null,
  refreshRate: null,
  operatingSystem: null,
  warranty: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  brandName: "ASUS",
  brandSlug: "asus",
  image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
};

describe("ProductCard", () => {
  it("shows name, brand, price and specs", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("ASUS TUF Gaming F15")).toBeInTheDocument();
    expect(screen.getByText("ASUS")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,45,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,59,000")).toBeInTheDocument();
    expect(screen.getByText("Intel Core i5-12500H · 16GB RAM · 512GB SSD")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /asus tuf/i })).toHaveAttribute("href", "/products/asus-tuf-gaming-f15");
  });

  it("renders a fallback image when no image is set", () => {
    render(<ProductCard product={{ ...product, image: null }} />);
    expect(screen.getByRole("img", { name: /asus tuf/i })).toHaveAttribute("src", "/placeholder.svg");
  });
});

describe("StockBadge", () => {
  it("reflects stock levels", () => {
    render(<StockBadge stock={0} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("warns when stock is low", () => {
    render(<StockBadge stock={2} />);
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });

  it("confirms availability", () => {
    render(<StockBadge stock={12} />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });
});

describe("Price", () => {
  it("hides compare-at price when lower than price", () => {
    render(<Price price={100000} compareAtPrice={90000} />);
    expect(screen.queryByText("Rs. 90,000")).not.toBeInTheDocument();
  });
});
