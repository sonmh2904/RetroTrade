"use client";

import { useEffect, useState } from "react";
import { getCurrentEvent, Event } from "@/services/event/event.api";
import Snowfall from "@/components/ui/common/snowfall";
import Decoration from "@/components/ui/common/decoration";
import { CountdownSection } from "@/components/ui/common/countdown/CountdownSection";
import { ChristmasCard } from "@/components/ui/common/christmas";
import { ChristmasButton } from "@/components/ui/common/christmas";
import { ChristmasBadge } from "@/components/ui/common/christmas";
import EventDisplay from "@/components/ui/common/event-display";
import { Container } from "@/components/layout/Container";
import Image from "next/image";

export function EventThemeSection() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentEvent()
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !event) return null;

  const { theme } = event;

  return (
    <>
      {theme.snowfall && <Snowfall />}

      {theme.decorations &&
        theme.decorationEmojis &&
        theme.decorationEmojis.length > 0 && (
          <Decoration emojis={theme.decorationEmojis} />
        )}

      {/* Countdown linh hoạt theo countdownType */}
      {theme.countdownEnabled && event && (
        <CountdownSection
          targetDate={theme.countdownTargetDate || event.endDate}
          eventName={event.name}
          countdownType={theme.countdownType || "default"}
        />
      )}

      <section className="py-16 bg-white">
        <Container>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <ChristmasCard
                title={theme.cardTitle || event.name}
                message={theme.cardMessage}
              >
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <ChristmasButton
                    variant="default"
                    size="md"
                    onClick={() =>
                      (window.location.href = theme.buttonLink1 || "/products")
                    }
                  >
                    {theme.buttonText1}
                  </ChristmasButton>
                  {theme.buttonText2 && (
                    <ChristmasButton
                      variant="outline"
                      size="md"
                      onClick={() =>
                        (window.location.href = theme.buttonLink2 || "/about")
                      }
                    >
                      {theme.buttonText2}
                    </ChristmasButton>
                  )}
                </div>
              </ChristmasCard>
            </div>

            <div className="flex flex-col items-center justify-center gap-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  <ChristmasBadge variant="gold" size="lg">
                    {theme.badgeText || event.name}
                  </ChristmasBadge>
                </h3>

                {theme.featureImageUrl ? (
                  <div className="relative w-full max-w-lg aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                    <Image
                      src={theme.featureImageUrl}
                      alt={event.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <EventDisplay
                    displayType={theme.displayType}
                    size="md"
                    animated={true}
                  />
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
