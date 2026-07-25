import { definePlugin } from '@saas/sdk';

export const communityDirectoryConfig = definePlugin({
  manifest: {
    id: "community-directory",
    name: "Community Directory",
    version: "0.1.0"
  },
  navigation: [
    {
      id: "community-directory.home",
      label: "Comunidade",
      path: "/comunidade",
      icon: "users",
      placement: "primary",
      permission: "community-directory.view"
    }
  ],
  routes: [
    {
      path: "/comunidade",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/require-await
      component: async () => ({ default: (() => null) as any }),
      permissions: ["community-directory.view"]
    }
  ]
});
