import { getPolicy } from "@/app/actions/policy";
import { notFound } from "next/navigation";

interface PolicyPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function DynamicPolicyPage({ params }: PolicyPageProps) {
    const { slug } = await params;
    const policy = await getPolicy(slug);

    if (!policy) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
                {policy.title}
            </h1>
            <div
                className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: policy.content }}
            />
        </div>
    );
}
