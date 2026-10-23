import { Seo } from '@/components/ui/Seo';
import { Hero } from './Hero';
import { AboutSection } from './AboutSection';
import { GoalsSection } from './GoalsSection';
import { EarthsSection } from './EarthsSection';
import { AnthonySection } from './AnthonySection';
import { JoinSection } from './JoinSection';

export default function HomePage() {
  return (
    <>
      <Seo />
      <Hero />
      <AboutSection />
      <GoalsSection />
      <EarthsSection />
      <AnthonySection />
      <JoinSection />
    </>
  );
}
