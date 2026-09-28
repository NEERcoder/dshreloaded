import { useEffect, useState } from "react";
import SectionHeader from "./SectionHeader";
import { categoryById } from "../../lib/categories";
import CompactOpportunityCard from "./CompactOpportunityCard";
import TeamSeekCard, { type TeamSeekItem } from "./TeamSeekCard";
import EmptyState from "./EmptyState";
import CardRowSkeleton from "./CardRowSkeleton";
import {
  getOpportunities,
  getCompetitionTeamsForCompetition,
  type OpportunityRecord,
} from "../../lib/dataAccess";

export default function CrewPreview() {
  const [competitions, setCompetitions] = useState<OpportunityRecord[]>([]);
  const [teams, setTeams] = useState<TeamSeekItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOpportunities("competition").then(async (result) => {
      if (cancelled) return;
      const teamComps = result.data.filter((item) => item.teamFormationEnabled);
      setCompetitions(teamComps.slice(0, 4));

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

  const showCompetitions = !loading && competitions.length > 0;

  return (
    <section id="crew" className="scroll-mt-24 border-t glass-panel">
      <div className="container-px py-10 sm:py-14">
        <SectionHeader
          eyebrow="CREW"
          title="Team up. Win together."
          description="Trending team competitions and crews already looking for members."
          viewAllHref="/crew"
          viewAllLabel="Find Your Crew"
          iconSrc={categoryById("crew")?.iconSrc}
        />
        <div className="mt-6 space-y-6">
          {loading ? (
            <CardRowSkeleton />
          ) : (
            <>
              {showCompetitions && (
                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
                  {competitions.map((item) => (
                    <CompactOpportunityCard key={item.id} item={item} href="/crew" />
                  ))}
                </div>
              )}
              {teams.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
                  {teams.map((team) => (
                    <TeamSeekCard key={team.teamId} team={team} />
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
