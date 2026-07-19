// ============================================================================
// Metadata Registry Contract — Core SaaS Framework
// ============================================================================
// Sub-registry declarations covering Search, Widgets, Dashboard, Navigation,
// Settings, Permissions, Import, Export, Notification, and AI Prompts.
// ============================================================================

export interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly url: string;
}

export interface SearchProvider {
  readonly pluginId: string;
  search(query: string, limit?: number): Promise<SearchResult[]>;
}

export interface Widget {
  readonly id: string;
  readonly name: string;
  readonly component: string;
  readonly defaultLayout?: { w: number; h: number };
}

export interface DashboardCard {
  readonly id: string;
  readonly title: string;
  readonly component: string;
}

export interface NavigationRegistryItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly path: string;
  readonly order?: number;
  readonly featureFlag?: string;
}

export interface SettingDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean';
  readonly default: unknown;
}

export interface ImporterDefinition {
  readonly entity: string;
  readonly parse: (row: unknown[]) => Record<string, unknown>;
}

export interface ExporterDefinition {
  readonly entity: string;
  readonly format: 'csv' | 'xlsx' | 'pdf' | 'json';
}

export interface NotificationTrigger {
  readonly eventName: string;
  readonly channels: ('email' | 'push' | 'whatsapp' | 'in_app')[];
}

export interface AIPromptDefinition {
  readonly id: string;
  readonly systemPrompt: string;
  readonly parameters: readonly string[];
}

export interface MetadataRegistryService {
  registerSearchProvider(provider: SearchProvider): void;
  getSearchProviders(): SearchProvider[];
  
  registerWidget(widget: Widget): void;
  getWidgets(): Widget[];
  
  registerDashboardCard(card: DashboardCard): void;
  getDashboardCards(): DashboardCard[];

  registerNavigation(nav: NavigationRegistryItem): void;
  getNavigationItems(): NavigationRegistryItem[];

  registerSettings(setting: SettingDefinition): void;
  getSettings(): SettingDefinition[];

  registerImporter(importer: ImporterDefinition): void;
  getImporter(entity: string): ImporterDefinition | undefined;

  registerExporter(exporter: ExporterDefinition): void;
  getExporter(entity: string): ExporterDefinition | undefined;

  registerNotification(notification: NotificationTrigger): void;
  getNotificationTriggers(): NotificationTrigger[];

  registerAIPrompt(prompt: AIPromptDefinition): void;
  getAIPrompt(id: string): AIPromptDefinition | undefined;
}
