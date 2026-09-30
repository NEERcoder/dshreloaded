import CategorySelector from "./home/CategorySelector";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-5 sm:pt-28 sm:pb-8 lg:pt-32">
      <div className="container-px">
        <CategorySelector />
      </div>
    </section>
  );
}
