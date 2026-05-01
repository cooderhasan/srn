import Head from "next/head";
import Script from "next/script";

type JsonLdProps = {
    data: Record<string, any>;
};

export function JsonLd({ data }: JsonLdProps) {
    return (
        <Script
            id="json-ld"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
            strategy="lazyOnload"
        />
    );
}
