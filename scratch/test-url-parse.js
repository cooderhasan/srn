try {
    const url = new URL("https://example.com/orders?begindate=2026-05-20 19:21&enddate=2026-05-21 19:21");
    console.log("Parsed URL href:", url.href);
    console.log("begindate:", url.searchParams.get("begindate"));
    console.log("enddate:", url.searchParams.get("enddate"));
} catch (e) {
    console.error("URL parsing failed:", e.message);
}
