import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: React.ReactNode;
}

export const SalesPageIntro: React.FC<Props> = ({ eyebrow, title, description, icon: Icon, meta }) => (
  <section className="sales-page-intro">
    <div className="sales-page-intro-icon"><Icon size={22} /></div>
    <div className="sales-page-intro-copy">
      <span className="sales-page-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {meta && <div className="sales-page-intro-meta">{meta}</div>}
  </section>
);
