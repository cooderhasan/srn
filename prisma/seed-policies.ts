import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const policies = [
        {
            slug: 'kvkk',
            title: 'KVKK Metni',
            content: '<h1>KVKK Metni</h1><p>Kişisel verilerin korunması kanunu hakkında detaylar...</p>'
        },
        {
            slug: 'privacy',
            title: 'Gizlilik Sözleşmesi',
            content: '<h1>Gizlilik Sözleşmesi</h1><p>Gizlilik politikamız...</p>'
        },
        {
            slug: 'distance-sales',
            title: 'Mesafeli Satış Sözleşmesi',
            content: '<h1>Mesafeli Satış Sözleşmesi</h1><p>Mesafeli satış sözleşmesi detayları...</p>'
        },
        {
            slug: 'cancellation',
            title: 'İptal ve İade',
            content: '<h1>İptal ve İade Koşulları</h1><p>İptal ve iade süreçleri...</p>'
        },
        {
            slug: 'cookies',
            title: 'Çerez Politikası',
            content: '<h1>Çerez Politikası</h1><p>Çerez kullanım detayları...</p>'
        },
        {
            slug: 'membership',
            title: 'Üyelik Sözleşmesi',
            content: '<h1>Üyelik Sözleşmesi</h1><p>Üyelik koşulları...</p>'
        }
    ]

    for (const policy of policies) {
        await prisma.policy.upsert({
            where: { slug: policy.slug },
            update: {},
            create: policy,
        })
        console.log(`Upserted policy: ${policy.title}`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
