"use client";

import type { ReactNode } from "react";
import {
  CodeIcon,
  CompanyIcon,
  type IconType,
  ProfileIcon,
} from "@/components/app/ui/icons";
import { Chip } from "@/components/app/ui/chip";
import { type CompanyProfile } from "@/lib/api";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: IconType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="text-neutral-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function CompanyDetailBody({ company }: { company: CompanyProfile }) {
  const techs = company.tech_stack
    ? company.tech_stack.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const hasContent =
    company.description || company.hiring_patterns || techs.length > 0;

  return (
    <div className="space-y-6">
      {company.description && (
        <Section icon={CompanyIcon} title="Description">
          <p className="text-sm leading-relaxed text-neutral-600">
            {company.description}
          </p>
        </Section>
      )}

      {company.hiring_patterns && (
        <Section icon={ProfileIcon} title="Hiring patterns">
          <p className="text-sm leading-relaxed text-neutral-600">
            {company.hiring_patterns}
          </p>
        </Section>
      )}

      {techs.length > 0 && (
        <Section icon={CodeIcon} title="Tech stack">
          <div className="flex flex-wrap gap-1.5">
            {techs.map((tech, i) => (
              <Chip key={i}>{tech}</Chip>
            ))}
          </div>
        </Section>
      )}

      {!hasContent && (
        <p className="text-sm text-neutral-500">
          No additional details for this company yet.
        </p>
      )}
    </div>
  );
}
