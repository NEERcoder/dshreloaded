import CategorySelector from "./home/CategorySelector";

export default function Hero() {
  return (
    <section className="on-navy relative overflow-hidden pt-24 pb-4 sm:pt-28 sm:pb-6 lg:pt-32">
      <div className="container-px">
        <CategorySelector />
      </div>
    </section>
  );
}
