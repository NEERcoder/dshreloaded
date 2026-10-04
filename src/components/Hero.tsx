import CategorySelector from "./home/CategorySelector";

export default function Hero() {
  return (
    <section className="on-navy relative overflow-hidden pb-3 pt-20 sm:pb-5 sm:pt-24 lg:pt-28">
      <div className="container-px">
        <CategorySelector />
      </div>
    </section>
  );
}
