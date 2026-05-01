import { PolicyEditor } from "@/components/admin/policy-editor";

export default function NewPolicyPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Yeni Politika Oluştur</h1>
            </div>
            <PolicyEditor isNew={true} />
        </div>
    );
}
