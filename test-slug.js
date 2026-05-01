const text = "Lada Samara Kalorifer Çıkış Ön (İç) Hortumu, Uzun";

function generateSlug(str) {
    const turkishChars = {
        ğ: "g",
        ü: "u",
        ş: "s",
        ı: "i",
        ö: "o",
        ç: "c",
        Ğ: "g",
        Ü: "u",
        Ş: "s",
        İ: "i",
        Ö: "o",
        Ç: "c",
    };

    return str
        .toLowerCase()
        .replace(/[ğüşıöçĞÜŞİÖÇ]/g, (char) => turkishChars[char] || char)
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

console.log(generateSlug(text));
