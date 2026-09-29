import CategorySelector from "./home/CategorySelector";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-8 sm:pt-28 sm:pb-12 lg:pt-32">
      <div className="container-px">
        <CategorySelector />
      </div>
    </section>
  );
}
