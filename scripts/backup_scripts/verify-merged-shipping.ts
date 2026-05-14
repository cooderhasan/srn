import { calculateDesi, getNextShippingDay, calculateTotalDesi } from "./src/lib/shipping";

console.log("--- Desi Calculation Test ---");
const desi = calculateDesi(10, 20, 30);
console.log("10x20x30 Box Desi:", desi); // (10*20*30)/3000 = 2
if (desi === 2) {
    console.log("✅ calculateDesi works!");
} else {
    console.log("❌ calculateDesi FAILED!");
}

console.log("\n--- Total Desi Logic Test ---");
const items = [
    { weight: 1.5, desi: 2.0, quantity: 2 }, // Effective 2.0 * 2 = 4.0
    { weight: 5.0, desi: 3.0, quantity: 1 }  // Effective 5.0 * 1 = 5.0
];
const totalDesi = calculateTotalDesi(items);
console.log("Total Desi:", totalDesi); // Expected 9.0
if (totalDesi === 9) {
    console.log("✅ calculateTotalDesi works!");
} else {
    console.log("❌ calculateTotalDesi FAILED!");
}

console.log("\n--- Dynamic Shipping Day Test ---");
const shippingDay = getNextShippingDay();
console.log("Current Shipping Day Output:", shippingDay);
if (shippingDay) {
    console.log("✅ getNextShippingDay works!");
}

console.log("\n--- Verification Completed ---");
