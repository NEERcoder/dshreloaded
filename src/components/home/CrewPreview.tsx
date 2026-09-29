import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import { categoryById } from "../../lib/categories";
import { Link } from "../../lib/router";
import TeamSeekCard, { type TeamSeekItem } from "./TeamSeekCard";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import {
  getOpportunities,
  getCompetitionTeamsForCompetition,
} from "../../lib/dataAccess";

export default function CrewPreview() {
  const [teams, setTeams] = useState<TeamSeekItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOpportunities("competition").then(async (result) => {
      if (cancelled) return;
      const teamComps = result.data.filter((item) => item.teamFormationEnabled);
      const openTeams: TeamSeekItem[] = [];
      await Promise.all(
        teamComps.slice(0, 6).map(async (comp) => {
          const teamResult = await getCompetitionTeamsForCompetition(comp.id);
          for (const team of teamResult.data) {
            if (team.status !== "active") continue;
            if (comp.maxTeamSize !== null && team.memberCount >= comp.maxTeamSize) continue;
            openTeams.push({
              teamId: team.id,
              teamName: team.name,
              competitionTitle: comp.title,
              memberCount: team.memberCount,
              maxTeamSize: comp.maxTeamSize,
            });
          }
        })
      );
      if (cancelled) return;
      setTeams(openTeams.slice(0, 4));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="crew" className="scroll-mt-24 border-t glass-panel">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="CREW"
          title="Teams looking for teammates"
          description="Team up. Win together."
          viewAllHref="/crew"
          viewAllLabel="Find Your Crew"
          iconSrc={categoryById("crew")?.iconSrc}
        />
        <div className="mt-6 space-y-6">
          {loading ? (
            <CardRowSkeleton />
          ) : teams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {teams.map((team) => (
                <TeamSeekCard
                  key={team.teamId}
                  team={team}
                  action={
                    <Link href={`/teams/${team.teamId}`} className="btn-primary min-h-[38px] px-3 text-xs">
                      Join Team
                    </Link>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="users"
              title="No crews recruiting right now"
              description="Teams form as competitions open. Browse FIELD and start your own crew."
              ctaLabel="Explore FIELD"
              ctaHref="/field"
            />
          )}
        </div>
      </div>
    </section>
  );
}
