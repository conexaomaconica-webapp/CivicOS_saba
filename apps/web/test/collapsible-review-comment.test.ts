import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('comentario expansivel de avaliacao', () => {
  it('oferece controles acessiveis para expandir e recolher textos longos', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/components/public/business/sections/CollapsibleReviewComment.tsx'), 'utf8');
    expect(source).toContain("'Ver avaliação completa'");
    expect(source).toContain("'Recolher avaliação'");
    expect(source).toContain('aria-expanded={expanded}');
    expect(source).toContain("'line-clamp-3'");
  });

  it('e usado nos dois componentes publicos de avaliacoes', () => {
    for (const file of ['BusinessCommunityReviewsCard.tsx', 'BusinessReviews.tsx']) {
      const source = fs.readFileSync(path.resolve(process.cwd(), `src/components/public/business/sections/${file}`), 'utf8');
      expect(source).toContain('<CollapsibleReviewComment');
    }
  });
});
