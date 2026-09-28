import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

export default function CirclePreview() {
  return (
    <section id="circle" className="scroll-mt-24 border-t border-surface-border bg-white/60 backdrop-blur-[2px]">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="CIRCLE"
          title="Find your people."
          description="A directory of students across colleges and courses — by students, for students."
          viewAllHref="/circle"
          viewAllLabel="Explore CIRCLE"
        />
        <div className="mt-6">
          <EmptyState
            icon="users"
            title="The student directory is live"
            description="CIRCLE lists real JAVLIN students — names, colleges and courses — so it stays behind your sign-in. Create your profile to appear, then browse your people."
            ctaLabel="Sign in to browse"
            ctaHref="/login"
          />
        </div>
      </div>
    </section>
  );
}
