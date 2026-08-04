'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@saas/ui/card';
import { Badge } from '@saas/ui/badge';
import { Button } from '@saas/ui/button';
import { Users, ShieldCheck, Award, Building2, TrendingUp } from 'lucide-react';

interface MasonicDashboardProps {
  stats?: {
    totalOrganizations: number;
    pendingVerifications: number;
    totalFounders: number;
    activeBusinesses: number;
  };
}

export function MasonicDashboard({ stats = { totalOrganizations: 0, pendingVerifications: 0, totalFounders: 0, activeBusinesses: 0 } }: MasonicDashboardProps) {
  const statCards = [
    { label: 'Organizações', value: stats.totalOrganizations, icon: Building2, color: 'blue' },
    { label: 'Verificações Pendentes', value: stats.pendingVerifications, icon: ShieldCheck, color: 'yellow' },
    { label: 'Empresas Fundadoras', value: stats.totalFounders, icon: Award, color: 'orange' },
    { label: 'Anunciantes Ativos', value: stats.activeBusinesses, icon: Users, color: 'green' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Painel Maçônico</h1>
        <Button variant="outline" className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Relatório Completo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 text-${stat.color}-500`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-yellow-500" />
              Verificações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Empresa Exemplo Ltda</p>
                  <p className="text-sm text-gray-500">Selo de Regularidade</p>
                </div>
                <Badge variant="secondary">Pendente</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Comércio Maçônico</p>
                  <p className="text-sm text-gray-500">Loja de Artigos Maçônicos</p>
                </div>
                <Badge variant="default">Verificado</Badge>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-2">Ver todas</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-orange-500" />
              Fundadores Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Empresa Fundadora 1</p>
                  <p className="text-sm text-gray-500">Fundador nº 1</p>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Empresa Fundadora 2</p>
                  <p className="text-sm text-gray-500">Fundador nº 2</p>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">Ativo</Badge>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-2">Gerenciar Fundadores</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MasonicDashboard;