import { prisma } from "@/lib/prisma";

export default async  function Home() {
  const posts = await prisma.metodoPago.findMany();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Payments - DriveMe</h1>
      <p className="mt-4 text-lg text-gray-600">Módulo de pagos IAW 2026</p>
    </main>
  );
}
