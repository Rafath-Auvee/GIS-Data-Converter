import { Converter } from "@/components/converter/converter";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
      <Converter />
    </main>
  );
}
