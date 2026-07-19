const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Regex to match "export interface I[A-Z]"
      // And we want to replace it in the entire file.
      // E.g., IUser -> User
      // Note: we should be careful about words like "Init" or "Item" but wait, they don't start with I + Uppercase usually except "Item" (which is just Item, not IItem). "INotificationPayload" -> "NotificationPayload".
      
      const interfaceNames = [
        'IPermission', 'IRole', 'IRBACProvider', 'ITenant', 'ITenantContext', 'ITenantResolver',
        'IStorageProvider', 'IBucketManager', 'ISchemaRegistryService', 'INotificationPayload',
        'INotificationChannel', 'INotificationPreferences', 'INavigationItem', 'IRouteDefinition',
        'INavigationProvider', 'ISearchResult', 'ISearchProvider', 'IWidget', 'IDashboardCard',
        'INavigationRegistryItem', 'ISettingDefinition', 'IImporterDefinition', 'IExporterDefinition',
        'INotificationTrigger', 'IAIPromptDefinition', 'IMetadataRegistryService', 'ILicenseLimits',
        'ILicensingService', 'IJob', 'IQueueService', 'IUIContext', 'ICommand', 'ICommandPaletteService',
        'IUser', 'ISession', 'IAuthProvider', 'ISubscription', 'IBillingService'
      ];
      
      let changed = false;
      for (const name of interfaceNames) {
        const newName = name.substring(1);
        // Replace exact word matches
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newName);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'packages/core/src'));
processDir(path.join(__dirname, 'packages/sdk/src'));
processDir(path.join(__dirname, 'packages/infrastructure/src'));
processDir(path.join(__dirname, 'packages/app-sdk/src'));
processDir(path.join(__dirname, 'plugins/business-directory/src'));
processDir(path.join(__dirname, 'apps/web/src'));

