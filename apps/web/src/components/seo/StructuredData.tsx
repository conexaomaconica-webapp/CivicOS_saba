import React from 'react';

export interface StructuredDataProps {
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function sanitizeJsonLd(data: unknown): string {
  const jsonString = JSON.stringify(data);
  return jsonString
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function StructuredData({ data, schema }: StructuredDataProps) {
  const content = data || schema;
  if (!content) return null;

  const sanitizedJson = sanitizeJsonLd(content);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitizedJson }}
    />
  );
}
