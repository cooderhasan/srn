import { PrismaClient } from '@prisma/client';
import { createHepsiburadaTestOrder } from './src/app/admin/(protected)/integrations/hepsiburada/actions.ts';

const prisma = new PrismaClient();

async function run() {
    console.log('Creating Hepsiburada SIT test order...');
    const result = await createHepsiburadaTestOrder();
    console.log('Result:', result);
}

run().catch(console.error).finally(()=>prisma.$disconnect());
