import { CommunityDirectoryTenantConfig } from '../domain/tenant-config';
import { Search, MapPin } from 'lucide-react';
// Assuming we use standard HTML/Tailwind since we don't have direct access to host UI components easily without peer dependencies
// Wait, we have peer dependencies on lucide-react and react.

export function CommunityDashboard({
  tenantName,
  headline,
  categories,
  featuredBusinesses
}: {
  tenantName: string;
  headline: string;
  categories: CommunityDirectoryTenantConfig['categories'];
  featuredBusinesses: CommunityDirectoryTenantConfig['featuredBusinesses'];
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-6 border-b border-border/40">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-2">
          🤝 {tenantName}
        </h1>
        <p className="text-muted-foreground text-lg">{headline}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input 
          type="text"
          placeholder="Buscar empresas, serviços, profissionais..."
          className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Categorias</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map(category => (
            <button 
              key={category.id}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {/* For demo purposes, icon rendering is simplified */}
                <span className="text-xl">{category.label.charAt(0)}</span>
              </div>
              <span className="font-medium text-sm">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Businesses */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-semibold tracking-tight">Empresas em destaque</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredBusinesses.map(business => (
            <div key={business.id} className="flex flex-col p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-base">{business.name}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {business.category}
                </span>
              </div>
              {business.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {business.description}
                </p>
              )}
              <div className="mt-auto flex items-center text-xs text-muted-foreground gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5" /> 
                Atendimento local
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
