const formatHBDate = (date) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    console.log("Parts:", parts);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    console.log("PartMap:", partMap);
    return `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}`;
};

const date = new Date("2026-05-21T16:22:50Z");
console.log("Formatted Date for UTC 16:22 (Turkey 19:22):", formatHBDate(date));
