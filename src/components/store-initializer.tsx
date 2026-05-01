"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";
import { CartItem } from "@/types";
import { syncCart } from "@/app/(storefront)/cart/actions";

interface StoreInitializerProps {
    discountRate: number;
    dbCart?: CartItem[] | null;
    isAuthenticated?: boolean;
}

export function StoreInitializer({ discountRate, dbCart, isAuthenticated }: StoreInitializerProps) {
    const initialized = useRef(false);
    const setItems = useCartStore((state) => state.setItems);
    const setIsAuthenticated = useCartStore((state) => state.setIsAuthenticated);

    const hasHydrated = useCartStore((state) => state._hasHydrated);

    useEffect(() => {
        // Update store with server-side flags
        useCartStore.setState({ discountRate, isAuthenticated });

        if (!hasHydrated) {
            return;
        }

        if (isAuthenticated && !initialized.current) {
            const localItems = useCartStore.getState().items;

            if (dbCart) {
                if (localItems.length === 0) {
                    console.log("STORE_INIT: Local empty, setting items from DB:", dbCart.length);
                    setItems(dbCart);
                } else {
                    console.log("STORE_INIT: Merging local and DB items...");
                    const mergedItems = [...dbCart];

                    localItems.forEach(localItem => {
                        // Apply current user discount rate to local items being merged
                        if (isAuthenticated) {
                            localItem.discountRate = discountRate;
                        }

                        const localKey = localItem.variantId ? `${localItem.productId}-${localItem.variantId}` : localItem.productId;
                        const existingIndex = mergedItems.findIndex(dbItem => {
                            const dbKey = dbItem.variantId ? `${dbItem.productId}-${dbItem.variantId}` : dbItem.productId;
                            return dbKey === localKey;
                        });

                        if (existingIndex >= 0) {
                            // If item exists in DB, keep DB item (which has correct price/discount) but update quantity
                            // Use the maximum quantity to avoid losing items, or sum them? 
                            // Current logic uses Math.max, let's keep it or maybe sum is better? 
                            // Usually for merge, sum is better, but let's stick to existing logic for now unless requested.
                            // However, we must ensure the local quantity isn't lost if it's higher.
                            mergedItems[existingIndex].quantity = Math.max(mergedItems[existingIndex].quantity, localItem.quantity);
                        } else {
                            // If item doesn't exist in DB, add it (with updated discount rate)
                            mergedItems.push(localItem);
                        }
                    });

                    console.log("STORE_INIT: Merge result:", mergedItems.length, "Syncing to DB...");
                    setItems(mergedItems);
                    syncCart(mergedItems);
                }
            } else if (localItems.length > 0) {
                console.log("STORE_INIT: No DB cart, syncing local items to DB:", localItems.length);
                syncCart(localItems);
            }

            initialized.current = true;
        }
    }, [discountRate, dbCart, isAuthenticated, setItems, hasHydrated]);

    return null;
}
