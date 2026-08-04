import React from 'react';

export interface StructuredDataProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>;
}

/**
 * Reusable JSON-LD Structured Data component for SEO (SABA-seo.md Section 4).
 * Supports SoftwareApplication, Product, Service, FAQPage, BreadcrumbList, etc.
 */
export function StructuredData({ schema }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
