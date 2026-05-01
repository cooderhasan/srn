import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/storefront/profile-form";
import { PasswordForm } from "@/components/storefront/password-form";

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login?callbackUrl=/account/profile");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">Profil Bilgilerim</h1>
                <p className="text-gray-500">Kişisel bilgilerinizi ve şifrenizi buradan güncelleyebilirsiniz.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Kişisel Bilgiler</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProfileForm user={user} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Şifre Değiştir</CardTitle>
                </CardHeader>
                <CardContent>
                    <PasswordForm />
                </CardContent>
            </Card>
        </div>
    );
}
