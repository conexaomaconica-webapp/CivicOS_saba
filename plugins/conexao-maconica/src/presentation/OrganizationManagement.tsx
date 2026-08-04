'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@saas/ui/card';
import { Button } from '@saas/ui/button';
import { Input } from '@saas/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@saas/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@saas/ui/table';
import { Badge } from '@saas/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@saas/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@saas/ui/form';
import { Plus, Search, Filter, Building2, Users, ShieldCheck, MoreHorizontal } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  code_number: number | null;
  potency: string;
  rite: string | null;
  is_active: boolean;
  created_at: string;
}

export function OrganizationManagement() {
  const [search, setSearch] = useState('');
  const [potencyFilter, setPotencyFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const mockOrganizations: Organization[] = [
    { id: '1', name: 'Loja União e Fraternidade', code_number: 123, potency: 'GOB-SP', rite: 'Escocês', is_active: true, created_at: '2024-01-15' },
    { id: '2', name: 'Loja Luz do Oriente', code_number: 456, potency: 'GLMERGS', rite: 'York', is_active: true, created_at: '2024-02-20' },
    { id: '3', name: 'Grande Oriente do Brasil - SP', code_number: 1, potency: 'GOB', rite: 'Escocês', is_active: true, created_at: '2023-01-01' },
  ];

  const handleSubmit = (data: any) => {
    console.log('Save organization', data);
    setDialogOpen(false);
    setEditingOrg(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizações Maçônicas</h1>
          <p className="text-gray-500">Gerencie Lojas Simbólicas, Potências e estruturas organizacionais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Organização
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingOrg ? 'Editar Organização' : 'Nova Organização'}</DialogTitle>
            </DialogHeader>
            <Form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <FormField
                  control={({ register }) => register()}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Organização</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Loja União e Fraternidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={({ register }) => register()}
                  name="potency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potência</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a potência" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="GOB">Grande Oriente do Brasil</SelectItem>
                          <SelectItem value="GOB-SP">GOB - São Paulo</SelectItem>
                          <SelectItem value="GLMERGS">Grande Loja Maçônica do RS</SelectItem>
                          <SelectItem value="GLESP">Grande Loja do Estado de SP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={({ register }) => register()}
                  name="code_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número na Potência</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={({ register }) => register()}
                  name="rite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rito</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o rito" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Escocês">Rito Escocês Antigo e Aceito</SelectItem>
                          <SelectItem value="York">Rito de York</SelectItem>
                          <SelectItem value="Frances">Rito Francês</SelectItem>
                          <SelectItem value="Brasileiro">Rito Brasileiro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingOrg(null); }}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lista de Organizações</CardTitle>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Buscar organizações..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={potencyFilter} onValueChange={setPotencyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por potência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="GOB">Grande Oriente do Brasil</SelectItem>
                <SelectItem value="GOB-SP">GOB - São Paulo</SelectItem>
                <SelectItem value="GLMERGS">Grande Loja Maçônica do RS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Potência</TableHead>
                <TableHead>Rito</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-gray-500">Criada em {new Date(org.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{org.code_number || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{org.potency}</Badge>
                  </TableCell>
                  <TableCell>{org.rite || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={org.is_active ? 'default' : 'secondary'}>
                      {org.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingOrg(org); setDialogOpen(true); }}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default OrganizationManagement;