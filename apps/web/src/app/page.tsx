'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Calendar, Users, HeartHandshake } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
      {/* Hero Section */}
      <section className="flex flex-col gap-2 pt-4">
        <h2 className="text-3xl font-bold tracking-tight">O que você deseja encontrar?</h2>
        <p className="text-muted-foreground text-lg">
          Explore os serviços e facilidades da sua comunidade.
        </p>
      </section>

      {/* Quick Categories */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-none shadow-sm bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
            <Users className="h-8 w-8 text-primary" />
            <span className="font-medium">Comunidades</span>
          </CardContent>
        </Card>
        
        <Card className="hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-none shadow-sm bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
            <Store className="h-8 w-8 text-primary" />
            <span className="font-medium">Serviços</span>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-none shadow-sm bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <span className="font-medium">Eventos</span>
          </CardContent>
        </Card>

        <Card className="hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors border-none shadow-sm bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
            <HeartHandshake className="h-8 w-8 text-primary" />
            <span className="font-medium">Benefícios</span>
          </CardContent>
        </Card>
      </section>

      {/* Highlights Section */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Destaques da comunidade</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="h-32 w-full bg-muted rounded-t-lg border-b flex items-center justify-center">
              <span className="text-muted-foreground/50">Imagem</span>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Projeto Social Solidário</CardTitle>
                <Badge>Voluntariado</Badge>
              </div>
              <CardDescription>
                Participe da próxima ação conjunta para arrecadação de alimentos.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <div className="h-32 w-full bg-muted rounded-t-lg border-b flex items-center justify-center">
              <span className="text-muted-foreground/50">Imagem</span>
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Novo Convênio Médico</CardTitle>
                <Badge variant="secondary">Benefício</Badge>
              </div>
              <CardDescription>
                Descontos exclusivos para associados em consultas e exames.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="flex flex-col gap-4 mt-4">
        <h3 className="text-xl font-semibold">Atividades recentes</h3>
        <div className="flex flex-col gap-3">
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Evento "Congresso Anual" foi adicionado</p>
                <p className="text-xs text-muted-foreground">Há 2 horas</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Nova empresa no Guia Comercial: "Restaurante Sabor"</p>
                <p className="text-xs text-muted-foreground">Ontem</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
