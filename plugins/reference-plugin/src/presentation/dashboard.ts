import { defineWidget, defineRoute } from '@saas/sdk';

export const referenceDashboardWidget = defineWidget({
  id: 'reference.dashboard.widget',
  slot: 'dashboard.top',
  component: 'ReferenceMetric',
  order: 10,
  props: {
    title: 'Reference Plugin',
    value: 10
  }
});

export const referenceRoute = defineRoute({
  path: '/reference',
  permissions: ['reference:execute'],
  component: async () => ({ default: () => null })
});
