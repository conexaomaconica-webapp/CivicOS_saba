import { CommunityDashboard } from '@saas/plugin-community-directory/src/presentation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webComponentRegistry: Record<string, React.ComponentType<any>> = {
  'community-directory.dashboard': CommunityDashboard,
};
