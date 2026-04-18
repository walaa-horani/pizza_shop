import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './store';
import type { CartItem } from './types';

const sample: Omit<CartItem, 'lineId'> = {
  productId: 'p1',
  productSlug: 'margherita',
  productTitle: 'Margherita',
  imageUrl: '',
  basePrice: 1800,
  size: { name: 'Medium', priceModifier: 0 },
  crust: { name: 'Neapolitan', priceModifier: 0 },
  toppings: [],
  quantity: 1,
};

beforeEach(() => {
  useCartStore.getState().clear();
});

describe('cart store', () => {
  it('adds an item with a generated lineId', () => {
    useCartStore.getState().addItem(sample);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].lineId).toBeTruthy();
    expect(items[0].productSlug).toBe('margherita');
  });

  it('adds a second distinct item as a separate line', () => {
    useCartStore.getState().addItem(sample);
    useCartStore.getState().addItem({ ...sample, productId: 'p2' });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('updateQuantity updates the given line', () => {
    useCartStore.getState().addItem(sample);
    const lineId = useCartStore.getState().items[0].lineId;
    useCartStore.getState().updateQuantity(lineId, 4);
    expect(useCartStore.getState().items[0].quantity).toBe(4);
  });

  it('updateQuantity clamps to at least 1', () => {
    useCartStore.getState().addItem(sample);
    const lineId = useCartStore.getState().items[0].lineId;
    useCartStore.getState().updateQuantity(lineId, 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('removeItem removes the matching line', () => {
    useCartStore.getState().addItem(sample);
    const lineId = useCartStore.getState().items[0].lineId;
    useCartStore.getState().removeItem(lineId);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('itemCount returns total quantity', () => {
    useCartStore.getState().addItem({ ...sample, quantity: 2 });
    useCartStore.getState().addItem({ ...sample, productId: 'p2', quantity: 3 });
    expect(useCartStore.getState().itemCount()).toBe(5);
  });

  it('clear empties the cart', () => {
    useCartStore.getState().addItem(sample);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
